#!/usr/bin/env bash
# Copyright (c) Microsoft Corporation.
# SPDX-License-Identifier: MIT

set -euo pipefail

# Print command output directly without an interactive pager.
export GH_PAGER=cat
export GIT_PAGER=cat
export PAGER=cat

# Edit these values before running from the repository root.
SOURCE_REPO='hijigoo/github-workflow-sample'
SOURCE_BRANCH='main'
TARGET_REPO='haewons-emu-org/github-workflow-sample'
# Keep this SHA paired with the local SARIF's analyzed commit.
ANALYZED_SHA='7e374656389ab24b71af8e409dbd434346278ace'
SARIF_FILE='./code-scanning.sarif'
LOCAL_DIRECTORY='./github-workflow-sample'
REVIEW_BRANCH=''
# Confirm safety settings and Code Security licensing/costs before setting true.
SETTINGS_CONFIRMED=true

err() {
  printf 'ERROR: %s\n' "$1" >&2
  exit 1
}

usage() {
  cat <<'HELP'
Usage (from the repository root): bash ./scripts/linux/fork.sh
Edit the configuration at the top first. Optional overrides:
  bash ./scripts/linux/fork.sh --source OWNER/REPO --target ORG/REPO \
  --source-branch BRANCH --directory NEW_PATH \
  [--review-branch BRANCH] \
  --confirm-settings
  bash ./scripts/linux/fork.sh --commit FULL_SHA --sarif EXISTING_FILE
  bash ./scripts/linux/fork.sh --upload-only

Copy a public github.com repository into an empty GHEC organization repository.
Create a private empty target if missing and disable its Actions and CodeQL
default setup before copying. Enable Code Security on an empty target if needed
(requires permissions and licensing; costs may apply). Existing Actions and
CodeQL default setup settings are not changed.
By default, copy the tip of SOURCE_BRANCH (main) to target main and
upload the existing local SARIF.
--commit overrides branch selection: copy that analyzed SHA to target main
and upload the existing local SARIF. It must match the SARIF's analyzed commit.
The local SARIF is not modified or downloaded. Optionally copy one review
branch descending from the copied commit. No source Code scanning API access
or new analysis is required.

--confirm-settings confirms that enterprise/organization fork policies,
new-fork automation restrictions, repository settings, and Code Security
licensing/costs were reviewed.
The script also checks target visibility, Actions, and CodeQL default setup.
Existing local paths and nonempty targets are refused during copying.
--upload-only skips copying and uploads SARIF to current target main.
SARIF upload requires Code scanning write permission and gzip, base64, tr,
mktemp, and sleep. No force-push or automatic repository cleanup.
HELP
}

git_safe() {
  git -c core.hooksPath=/dev/null "$@"
}

upload_sarif() (
  local target="$1" sarif_file="$2"
  local commit actions_state codeql_state payload upload_id
  local response state processing_errors attempt

  commit=$(git_safe ls-remote \
    "https://github.com/${target}.git" refs/heads/main)
  commit="${commit%%$'\t'*}"
  [[ "${commit}" =~ ^[0-9a-f]{40}$ ]] ||
    err "Target main is missing or unavailable; refusing SARIF upload."
  actions_state=$(gh api --hostname github.com \
    "repos/${target}/actions/permissions" --jq '.enabled')
  codeql_state=$(gh api --hostname github.com \
    "repos/${target}/code-scanning/default-setup" --jq '.state')
  [[ "${actions_state}" == false && "${codeql_state}" == not-configured ]] ||
    err "Disable target Actions and CodeQL default setup before SARIF upload."

  payload=$(mktemp)
  trap 'rm -f -- "${payload}"' EXIT
  printf '{"commit_sha":"%s","ref":"refs/heads/main","sarif":"' \
    "${commit}" > "${payload}"
  gzip -c -- "${sarif_file}" | base64 | tr -d '\r\n' >> "${payload}"
  printf '","tool_name":"CodeQL"}\n' >> "${payload}"

  printf 'Uploading SARIF to %s for %s...\n' "${target}" "${commit}"
  upload_id=$(gh api --hostname github.com --method POST \
    "repos/${target}/code-scanning/sarifs" \
    -H 'Accept: application/vnd.github+json' \
    --input "${payload}" --jq '.id // ""') ||
    err "SARIF upload failed; check Code scanning write permission and licensing. Copied code is not rolled back."
  [[ -n "${upload_id}" && "${upload_id}" =~ ^[A-Za-z0-9_-]+$ ]] ||
    err "Invalid SARIF upload ID; inspect the target before retrying."
  printf 'SARIF upload ID: %s\n' "${upload_id}"

  for attempt in {1..12}; do
    response=$(gh api --hostname github.com \
      "repos/${target}/code-scanning/sarifs/${upload_id}" \
      --jq '[.processing_status, ((.errors // []) | tojson)] | @tsv') ||
      err "Could not check SARIF upload ${upload_id}; inspect its status before retrying."
    IFS=$'\t' read -r state processing_errors <<< "${response}"
    printf 'SARIF processing: %s\n' "${state}"
    case "${state}" in
      complete)
        printf 'SARIF processing complete: https://github.com/%s/security/code-scanning\n' \
          "${target}"
        return 0
        ;;
      pending)
        if (( attempt < 12 )); then
          sleep 5
        fi
        ;;
      failed)
        err "SARIF processing failed (${upload_id}): ${processing_errors}"
        ;;
      *) err "Unexpected SARIF processing status (${upload_id}): ${response}" ;;
    esac
  done
  err "SARIF upload ${upload_id} is still pending; inspect its status before retrying. Copied code is not rolled back."
)

main() {
  local source="${SOURCE_REPO}" target="${TARGET_REPO}"
  local source_branch="${SOURCE_BRANCH}" fixed_commit=false
  local commit="${ANALYZED_SHA}" directory="${LOCAL_DIRECTORY}"
  local review_branch="${REVIEW_BRANCH}" confirmed="${SETTINGS_CONFIRMED}"
  local option metadata owner_type visibility archived response
  local created=false organization
  local source_url target_url remote_refs actions_state codeql_state
  local security_state security_query
  local actual_commit review_commit remote_sha default_branch
  local sarif_file="${SARIF_FILE}"
  local upload_only=false tool
  local -a refspecs

  while (( $# > 0 )); do
    option="$1"
    case "${option}" in
      --help|-h)
        usage
        return 0
        ;;
      --confirm-settings)
        confirmed=true
        shift
        ;;
      --upload-only)
        upload_only=true
        shift
        ;;
      --source|--source-branch|--target|--commit|--sarif|--directory|--review-branch)
        if (( $# < 2 )) || [[ -z "$2" || "$2" == --* ]]; then
          err "${option} requires a value."
        fi
        case "${option}" in
          --source) source="$2" ;;
          --source-branch) source_branch="$2" ;;
          --target) target="$2" ;;
          --commit) commit="$2"; fixed_commit=true ;;
          --sarif) sarif_file="$2" ;;
          --directory) directory="$2" ;;
          --review-branch) review_branch="$2" ;;
        esac
        shift 2
        ;;
      *) err "Unknown argument: ${option}. Use --help." ;;
    esac
  done

  [[ "${confirmed}" == true ]] ||
    err "Review docs/handson/00-preparation.md; set SETTINGS_CONFIRMED=true or use --confirm-settings."
  [[ "${source}" =~ ^[A-Za-z0-9-]+/[A-Za-z0-9_.-]+$ ]] ||
    err "--source must be OWNER/REPO, not a URL."
  [[ "${target}" =~ ^[A-Za-z0-9-]+/[A-Za-z0-9_.-]+$ ]] ||
    err "--target must be ORG/REPO, not a URL."
  [[ "${source}" != "${target}" ]] || err "Source and target must differ."
  if [[ "${fixed_commit}" == true && "${upload_only}" == false ]]; then
    [[ "${commit}" =~ ^[0-9a-f]{40}$ ]] ||
      err "--commit must be the full 40-character lowercase analyzed SHA."
  fi
  [[ -n "${directory}" && "${directory}" != -* ]] ||
    err "--directory must be a new local path."
  if [[ "${upload_only}" == false ]]; then
    [[ ! -e "${directory}" && ! -L "${directory}" ]] ||
      err "Local destination already exists; choose a new path."
  fi
  [[ -f "${sarif_file}" && -r "${sarif_file}" && -s "${sarif_file}" ]] ||
    err "Local SARIF must be an existing readable, nonempty file: ${sarif_file}"

  command -v git >/dev/null || err "Install Git first."
  command -v gh >/dev/null || err "Install GitHub CLI (gh) first."
  for tool in gzip base64 tr mktemp sleep; do
    command -v "${tool}" >/dev/null || err "Install ${tool} first."
  done
  if [[ "${fixed_commit}" == false && "${upload_only}" == false ]]; then
    [[ -n "${source_branch}" ]] ||
      err "--source-branch must be a valid branch name."
    git_safe check-ref-format --branch "${source_branch}" >/dev/null ||
      err "--source-branch must be a valid branch name."
  fi
  if [[ -n "${review_branch}" ]]; then
    [[ "${review_branch}" != main ]] ||
      err "The review branch must differ from main."
    git_safe check-ref-format --branch "${review_branch}" >/dev/null
  fi

  gh auth status --hostname github.com
  if [[ "${upload_only}" == true ]]; then
    upload_sarif "${target}" "${sarif_file}"
    return 0
  fi
  [[ "$(gh api --hostname github.com "repos/${source}" \
    --jq '.visibility')" == public ]] ||
    err "Source must be a public repository."
  organization="${target%%/*}"
  [[ "$(gh api --hostname github.com "orgs/${organization}" \
    --jq '.type')" == Organization ]] ||
    err "Target organization is unavailable; check its name and active gh account."
  if response=$(gh api --hostname github.com "repos/${target}" --include \
    --jq '[.owner.type, .visibility, .archived] | @tsv'); then
    metadata="${response##*$'\n'}"
  elif [[ "${response}" =~ ^HTTP/[^[:space:]]+[[:space:]]+404([[:space:]]|$) ]]; then
    printf 'Target not found; creating private repository: %s\n' "${target}"
    metadata=$(gh api --hostname github.com --method POST \
      "orgs/${organization}/repos" -f "name=${target#*/}" \
      -F private=true -F auto_init=false \
      --jq '[.owner.type, .visibility, .archived] | @tsv') ||
      err "Target creation failed; check organization permissions and active gh account."
    created=true
    printf 'Created: https://github.com/%s\n' "${target}"
  else
    err "Target lookup failed; no repository was created."
  fi
  IFS=$'\t' read -r owner_type visibility archived <<< "${metadata}"
  [[ "${owner_type}" == Organization ]] ||
    err "Target must be owned by an organization."
  [[ "${visibility}" == private || "${visibility}" == internal ]] ||
    err "Target must be private or internal."
  [[ "${archived}" == false ]] || err "Target must not be archived."

  if [[ "${created}" == true ]]; then
    gh api --hostname github.com --method PUT \
      "repos/${target}/actions/permissions" -F enabled=false ||
      err "Could not disable Actions on the new target. No code was pushed."
  fi
  actions_state=$(gh api --hostname github.com \
    "repos/${target}/actions/permissions" --jq '.enabled')
  [[ "${actions_state}" == false ]] ||
    err "Disable target Actions before copying."

  source_url="https://github.com/${source}.git"
  target_url="https://github.com/${target}.git"
  remote_refs=$(git_safe ls-remote "${target_url}")
  [[ -z "${remote_refs}" ]] ||
    err "Target is not empty. No remote refs were changed."

  security_query='[.security_and_analysis.code_security.status,
    .security_and_analysis.advanced_security.status] |
    if index("enabled") != null then "enabled"
    elif index("disabled") != null then "disabled"
    else "unavailable" end'
  security_state=$(gh api --hostname github.com "repos/${target}" \
    --jq "${security_query}") ||
    err "Could not read Code Security status. No code was pushed."
  if [[ "${security_state}" == disabled ]]; then
    printf 'Enabling Code Security for %s; licensing costs may apply.\n' "${target}"
    gh api --hostname github.com --method PATCH "repos/${target}" \
      -f 'security_and_analysis[code_security][status]=enabled' >/dev/null ||
      err "Code Security activation failed; check permissions, license, and policy. No code was pushed."
    security_state=$(gh api --hostname github.com "repos/${target}" \
      --jq "${security_query}") ||
      err "Could not verify Code Security activation. No code was pushed."
  fi
  [[ "${security_state}" == enabled ]] ||
    err "Code Security is not enabled or status is unavailable; check admin permissions and licensing. No code was pushed."

  codeql_state=$(gh api --hostname github.com \
    "repos/${target}/code-scanning/default-setup" --jq '.state')
  if [[ "${created}" == true && "${codeql_state}" == configured ]]; then
    gh api --hostname github.com --method PATCH \
      "repos/${target}/code-scanning/default-setup" -f state=not-configured ||
      err "Could not disable CodeQL on the new target. No code was pushed."
    codeql_state=$(gh api --hostname github.com \
      "repos/${target}/code-scanning/default-setup" --jq '.state')
  fi
  [[ "${codeql_state}" == not-configured ]] ||
    err "Disable target CodeQL default setup before copying."

  printf 'Source: %s\nTarget: %s\nLocal path: %s\n' \
    "${source_url}" "${target_url}" "${directory}"
  if [[ "${fixed_commit}" == true ]]; then
    printf 'Analyzed SHA: %s\n' "${commit}"
  else
    printf 'Source branch: %s\n' "${source_branch}"
  fi
  printf 'Using local SARIF: %s\n' "${sarif_file}"
  git_safe clone --no-checkout --no-tags "${source_url}" "${directory}"
  if [[ "${fixed_commit}" == false ]]; then
    commit=$(git_safe -C "${directory}" rev-parse \
      --verify "refs/remotes/origin/${source_branch}^{commit}") ||
      err "Source branch not found: ${source_branch}. No code was pushed."
  fi
  actual_commit=$(git_safe -C "${directory}" rev-parse \
    --verify "${commit}^{commit}")
  [[ "${actual_commit}" == "${commit}" ]] ||
    err "Copy commit did not resolve exactly."
  git_safe -C "${directory}" checkout --detach "${commit}"

  refspecs=('HEAD:refs/heads/main')
  if [[ -n "${review_branch}" ]]; then
    review_commit=$(git_safe -C "${directory}" rev-parse \
      --verify "refs/remotes/origin/${review_branch}^{commit}")
    if ! git_safe -C "${directory}" merge-base --is-ancestor \
      "${commit}" "${review_commit}"; then
      err "Review branch must descend from the copied commit."
    fi
    [[ "${review_commit}" != "${commit}" ]] ||
      err "Review branch has no commits beyond the copied commit."
    refspecs+=(
      "${review_commit}:refs/heads/${review_branch}"
    )
  fi

  git_safe -C "${directory}" remote set-url origin "${target_url}"
  remote_refs=$(git_safe ls-remote "${target_url}")
  [[ -z "${remote_refs}" ]] ||
    err "Target changed during preparation; refusing to push."
  actions_state=$(gh api --hostname github.com \
    "repos/${target}/actions/permissions" --jq '.enabled')
  codeql_state=$(gh api --hostname github.com \
    "repos/${target}/code-scanning/default-setup" --jq '.state')
  [[ "${actions_state}" == false && "${codeql_state}" == not-configured ]] ||
    err "Automation settings changed; refusing to push."
  git_safe -C "${directory}" push --atomic origin "${refspecs[@]}"
  remote_sha=$(git_safe ls-remote "${target_url}" refs/heads/main)
  remote_sha="${remote_sha%%$'\t'*}"
  [[ "${remote_sha}" == "${commit}" ]] ||
    err "Remote main does not match the copied SHA; inspect the target."
  default_branch=$(gh api --hostname github.com "repos/${target}" \
    --jq '.default_branch')
  [[ "${default_branch}" == main ]] ||
    err "Copy completed, but set the target default branch to main manually."

  upload_sarif "${target}" "${sarif_file}"

  printf '\nCopy verified: https://github.com/%s\nmain: %s\n' \
    "${target}" "${remote_sha}"
  printf 'Local SARIF file (unchanged): %s\n' "${sarif_file}"
  if [[ -n "${review_branch}" ]]; then
    printf 'Review branch: %s (%s)\n' "${review_branch}" "${review_commit}"
  fi
  printf 'Keep Actions disabled. Verify fork policies and Code scanning results.\n'
}

main "$@"
