# 실습 기준 저장소 사전 준비 가이드

GHEC Enterprise Managed Users(EMU) 조직에서는 기업 외부 공개 저장소를 직접 포크할 수 없습니다.
조직 오너가 Pioneer 역할로 실습 정책·권한을 설정하고, 공개 원본의 `handson` 브랜치를 기업 내부 조직의 독립 기준 저장소로 복사합니다.
커밋된 기존 SARIF는 웹에서 읽을 분석 자료로 사용하며, 기준 저장소 생성 시 자동 등록하지 않습니다.
이 가이드의 범위는 실습 환경 설정과 기준 저장소 구성·확인까지입니다.
실습자 저장소 포크·준비와 01~04 실습 권한 확인은
[00. 실습을 위한 저장소 사전 준비](handson/00-preparation.md)에서 진행합니다.

저장소 이름은 다음과 같이 통일합니다. `ORG`는 허용된 기업 내부 조직이며,
`<USER_ID>`는 실습자를 구분하는 GitHub 사용자 ID로 바꿉니다.

* 기준 저장소: `ORG/github-workflow-sample`
* 실습자 저장소: `ORG/github-workflow-<USER_ID>` (예: `ORG/github-workflow-octo`)

## 준비 흐름

1. Pioneer가 조직 설정·권한과 도구를 확인합니다.
2. [Bash](../scripts/linux/fork.sh) 또는 [PowerShell](../scripts/win/fork.ps1) 준비 스크립트로 원본 `handson`을 기준 저장소의 `main`으로 복사합니다.
3. 복사된 커밋·SARIF 파일·자동 실행 차단과 내부 포크 허용 정책을 확인합니다.

> [!IMPORTANT]
> 준비 스크립트와 SARIF 등록에는 Actions runner를 사용하지 않습니다.
> private/internal Code scanning에는 Code Security 또는 이를 포함하는 기존 GHAS 이용 권한이 필요합니다.
> 활성화 비용과 권한은 관리자에게 확인합니다. 구현에 사용하는 Cloud 환경의 비용·권한은 별도입니다.

## 1. 조직 설정과 도구 확인

* [ ] Pioneer 계정으로 대상 조직의 저장소 생성·관리·push가 가능합니다.
* [ ] GitHub CLI 사용과 필요한 조직 인증·승인을 완료했습니다.
* [ ] GHAS 또는 Code Security 이용 권한·비용을 확인하고 기준 저장소와 실습자 포크에 필요한 보안 구성을 적용합니다.
* [ ] 준비 담당자의 SARIF 등록 권한과 실습자의 Code scanning 열람 권한을 확인했습니다.
* [ ] 기업·조직에서 내부 포크를 허용하며 실습자가 포크할 대상 조직을 확인했습니다.
* [ ] 기준 저장소에서 Actions·CodeQL default setup·자동 분석·자동 PR 리뷰·에이전트 자동 호출을 차단합니다.

조직 정책을 먼저 확인하고 기준 저장소 생성 후 저장소별 설정을 확인합니다.
Enterprise 정책으로 잠긴 항목은 기업 관리자에게 요청하며, 다른 업무 저장소의 정책을 임의로 변경하지 않습니다.
아래 두 항목을 클릭해 확인표를 펼칩니다. 메뉴 이름은 GitHub 영문 화면 기준입니다.
조직 설정은 프로필 메뉴의 `Organizations → 대상 조직 → Settings`,
저장소 설정은 `대상 저장소 → Settings`에서 시작합니다.
메뉴가 보이지 않으면 오너·관리 권한, 라이선스와 Enterprise 정책을 확인합니다.

<details>
<summary>조직 오너: 필요한 기능 확인</summary>

| 확인 | 필요한 기능 | 설정 화면의 메뉴 | 확인할 내용 |
|------|-------------|------------------|-------------|
| [ ] | 기업 내부 포크 | 조직 `Settings → Member privileges → Repository creation / Repository forking`; 기준 저장소 `Settings → General → Features → Allow forking` | 허용된 조직에서 private 저장소 생성과 포크가 가능해야 합니다. 조직의 `Allow forking of private repositories`와 기준 저장소의 `Allow forking`을 확인합니다. Enterprise 정책이 제한하면 기업 관리자에게 요청합니다. |
| [ ] | Copilot Seat | 조직 `Settings → Copilot → Access` | 실습 대상 사용자 또는 팀에 Seat를 부여합니다. 전체 조직에 일괄 구매하지 않고 실습 대상과 승인된 비용을 확인합니다. |
| [ ] | Copilot 새 세션과 Cloud | 조직 `Settings → Copilot → Policies`; `Settings → Copilot → Cloud → Repository access` | `Copilot in the cloud`를 `Enabled`로 설정하고 실습 대상 저장소 접근을 허용합니다. 선택 저장소 방식이면 새 실습자 포크도 목록에 포함해야 합니다. 실습 계정으로 우측 상단의 Copilot 아이콘을 클릭한 뒤 [New Session](https://github.com/copilot) 메뉴를 열고, 실습 저장소를 연결해 `Environment → Cloud` 선택 가능 여부를 확인합니다. |
| [ ] | Issue·PR·댓글 | 저장소 `Settings → General → Features → Issues`; `Settings → Collaborators and teams` | 실습자 포크의 Issues를 활성화하고 포크를 생성한 실습 계정에 작업에 필요한 쓰기 권한이 있는지 확인합니다. 실습 계정으로 GitHub 웹에서 Issue 생성·PR 작성·댓글 게시가 실제로 되는지 사전 검증합니다. 기준 저장소에는 읽기 권한을 제공하며 PR의 base와 head는 실습자 포크를 사용합니다. |
| [ ] | 작업 브랜치 쓰기 | 저장소 `Settings → Rules → Rulesets`와 `Settings → Branches`; 조직 `Settings → Repository → Rulesets` | 실습자 포크의 작업 브랜치 생성·push를 막는 규칙이 없는지 확인합니다. 기준 저장소에서 복사된 `main`은 유지하고, 조직 규칙을 전체 해제하지 말고 실습 대상·브랜치 범위를 확인합니다. |
| [ ] | GHAS·Code Security와 SARIF | 조직 `Settings → Advanced Security → Configurations → Repositories`; 저장소 `Settings → Advanced Security → Code Security` | 기존 GHAS 또는 Code Security 라이선스·비용을 확인하고, Code Security가 활성화되는 보안 구성을 실습 대상 저장소에 적용합니다. 생성된 실습자 포크에도 적용됐는지 확인합니다. CodeQL default setup·자동 분석은 비활성화 상태로 유지하고, 준비 담당자의 SARIF 등록 권한과 실습자의 Code scanning 열람 권한을 확인합니다. |
| [ ] | Cloud 비용 승인 | 조직 또는 Enterprise의 `Settings → Billing and licensing → Budgets and alerts` | Cloud 사용 예산과 과금 주체를 확인합니다. 조직 오너에게 청구 관리 권한이 없으면 해당 청구 관리자에게 승인을 요청합니다. |

게시 동작은 조직 오너 계정이 아니라 실습 계정으로 점검합니다.
실습 전에 기준 저장소의 점검용 포크에서 GitHub 웹으로 Issue 생성·PR 작성·댓글 게시를 직접 수행하고, 실제 페이지에 등록됐는지 확인합니다.
권한·정책 문제가 있으면 실습 전에 조치한 뒤 같은 계정으로 다시 검증합니다.
점검용 Issue·PR은 본 실습에서 생성할 자료와 구분합니다.

조직에서 GHAS 이용을 허용하는 것만으로 모든 저장소의 Code scanning 접근이 보장되지는 않습니다.
저장소별 Code Security 적용과 사용자 권한을 확인하고, 실습 대상 계정으로 본인 포크의
`Security and quality → Code scanning` 메뉴를 열 수 있는지 점검합니다.
경고 결과는 별도 SARIF 등록이 필요하며, 기본 실습에서 포크에 경고가 없어도 준비 실패로 판단하지 않습니다.
경고 목록 열람에는 저장소 쓰기 권한 등 해당 보안 기능 접근 권한이 필요하며, 코드 읽기만으로 충분하다고 가정하지 않습니다.

설정 근거: [Copilot Seat 부여](https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-access/grant-access),
[Cloud 정책·저장소 접근](https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-copilot-in-the-cloud),
[조직 포크 정책](https://docs.github.com/en/organizations/managing-organization-settings/managing-the-forking-policy-for-your-organization),
[보안 구성 적용](https://docs.github.com/en/code-security/how-tos/secure-at-scale/configure-organization-security/establish-complete-coverage/apply-custom-configuration)

</details>

<details>
<summary>조직 오너: 허용하지 않는 기능 확인</summary>

아래 차단 목록은 기본 실습에 적용합니다.

| 확인 | 허용하지 않는 기능 | 설정 화면의 메뉴 | 확인할 내용 |
|------|--------------------|------------------|-------------|
| [ ] | Actions runner·workflow 실행 | 저장소 `Settings → Actions → General → Actions permissions` | `Disable actions`를 선택합니다. 기준 저장소와 실습자 포크에서 각각 확인하고 workflow 실행·재실행을 승인하지 않습니다. 단, 이 설정을 허용하면 02번의 선택 실습이 가능합니다.  |
| [ ] | CodeQL 새 분석·재분석 | 저장소 `Settings → Advanced Security → Code Security → CodeQL analysis` | 활성 상태이면 `… → Disable CodeQL`로 default setup을 끕니다. 조직 보안 구성에서 다시 활성화하도록 강제하지 않는지도 확인합니다. 기존 SARIF만 등록하며 분석 workflow는 실행하지 않습니다. |
| [ ] | 자동 PR 리뷰 | 저장소 `Settings → Rules → Rulesets`; 조직 `Settings → Repository → Rulesets` | 실습 대상에 적용되는 `Automatically request Copilot code review` 규칙을 제거하거나 대상에서 제외합니다. 다른 보호 규칙까지 해제하지 않습니다. EMU에서는 개인 자동 리뷰 설정을 사용할 수 없으므로 조직·저장소 규칙을 확인합니다. |
| [ ] | 자동 에이전트 호출 | 조직 `Settings → Copilot → Cloud → Allow automations`; 저장소 `Agents → Automations` | 조직의 자동화 허용을 차단하고 기존 예약·이벤트 기반 자동화를 확인합니다. 다른 업무 저장소에도 영향을 주는 정책 변경은 승인 후 진행합니다. 수동 Cloud 세션을 허용하는 `Copilot in the cloud` 정책은 유지합니다. GitHub Agentic Workflows는 Actions 비활성화로 실행을 차단합니다. |
| [ ] | Agent Merge | PR 하단 병합 영역의 `Watch and fix`; 개인 `Settings → Copilot → Cloud` | `Watch and fix`를 활성화하지 않습니다. 이미 활성화돼 있으면 PR의 `Unassign Copilot`으로 해제합니다. 개인의 `Enable Agent Merge automatically for pull requests I create`도 꺼야 합니다. Agent Merge의 수정 작업은 Actions 기반 환경에서 실행되므로 이번 실습에서는 금지합니다. |
| [ ] | 자동 병합·배포 | 저장소 `Settings → General → Pull Requests → Allow auto-merge`; `Settings → Actions → General`; `Settings → Environments` | 자동 병합을 비활성화하고 Actions 배포를 실행하지 않습니다. 외부 배포 연동이 있다면 담당자와 자동 트리거를 확인합니다. 수동 병합·배포도 실습에서는 요청하지 않습니다. |
| [ ] | 경고 상태 변경 | 저장소 `Settings → Collaborators and teams`; `Security and quality → Code scanning → 경고 상세` | 실습자와 담당자의 역할을 확인하고 경고의 Dismiss 조작을 실습에서 사용하지 않도록 안내합니다. `Write` 권한으로 가능한 조작을 모두 별도 차단할 수 있다고 가정하지 않습니다. Fixed 확인은 승인된 후속 재분석 담당자에게 남깁니다. |

설정 근거: [자동 PR 리뷰 구성](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review),
[자동화 허용 정책](https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-copilot-in-the-cloud#controlling-automations-in-your-repositories),
[CodeQL default setup 비활성화](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/troubleshoot-sarif-uploads/default-setup-enabled),
[Agent Merge 실행 환경·중지](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/watch-and-fix-pull-requests)

</details>

<br/>
기본 실습에서는 Issue를 Copilot에게 할당하지 않고 우측 상단의 Copilot 아이콘에서 [New Session](https://github.com/copilot) 메뉴를 열어 `Cloud`를 선택해 요청합니다.
Issue 할당은 Actions 기반 실행을 전제로, Runner 사용·비용이 별도로 승인된 [02번의 선택 실습](handson/02-feature-request.md#선택-실습)에서만 진행합니다.
`@copilot` 댓글로 환경을 확인하지 않은 별도 작업을 시작하지 않습니다.
Actions 비활성화만으로 모든 진입점의 실행 환경이 확인되는 것은 아닙니다.

설정으로 차단하는 기능과 권한은 있지만 실습에서 사용하지 않는 기능을 구분해 안내합니다.
위 표는 설정 확인 목록이며, 실습자의 실제 포크 준비는 [00번 가이드](handson/00-preparation.md)에서 진행합니다.
포크에 기준 저장소의 권한·자동 실행 설정·보안 결과가 모두 상속된다고 가정하지 않습니다.

### 준비 담당자 도구

| OS | 설치할 도구 |
|----|-------------|
| Windows | GitHub CLI (`gh`), Git CLI, PowerShell 7.4 이상 (`pwsh`) |
| macOS·Linux | GitHub CLI (`gh`), Git CLI, Bash. SARIF 등록 시에만 `gzip`, `base64`, `tr`, `mktemp`, `sleep` 추가 |

이 저장소의 코드와 커밋된 [code-scanning.sarif](../code-scanning.sarif)를 준비 PC에 내려받습니다.
SARIF는 따로 생성하거나 새 분석으로 만들지 않습니다.
기본 실습은 웹에서 진행하므로 이 설치·인증 작업은 준비 담당자에게 해당합니다.
실습자는 [04번의 선택 SARIF 등록 실습](handson/04-security.md#선택-실습-기존-sarif-등록)에 참여할 때만 로컬 도구를 준비합니다.

## 2. 인증과 기준 저장소 생성

### GitHub CLI 인증

조직에 접근할 EMU 계정으로 로그인합니다. 토큰을 코드나 원격 URL에 넣지 않습니다.

```bash
gh auth login --hostname github.com --git-protocol https --web --scopes repo,read:org,workflow
gh auth setup-git --hostname github.com
gh auth status --hostname github.com
```

계정이 여러 개라면 실제 계정명으로 전환합니다.

```bash
gh auth switch --hostname github.com --user YOUR_EMU_ACCOUNT
```

`repo`는 비공개 저장소·보안 이벤트 접근, `read:org`는 조직 정보 확인,
`workflow`는 기존 workflow 파일을 복사하는 데 사용합니다. workflow 실행을 허용한다는 뜻은 아닙니다.
계정의 조직·저장소 권한도 별도로 필요합니다.
`GH_TOKEN`·`GITHUB_TOKEN`이 설정돼 있다면 저장된 로그인보다 우선할 수 있으므로 활성 계정을 확인합니다.

### 준비 스크립트 실행

[Bash 스크립트](../scripts/linux/fork.sh) 또는
[PowerShell 스크립트](../scripts/win/fork.ps1)를 사용합니다.
이름은 `fork`이지만 공개 원본에서 기준 저장소를 만드는 단계는 독립 저장소로 복사하는 과정입니다.

다음 예시의 `ORG`를 실제 기업 내부 조직으로 바꾸고 이 저장소 루트에서 실행합니다.
대상 저장소가 없으면 스크립트가 private 저장소를 만듭니다.

스크립트의 기본값에 의존하지 않고 대상 저장소와 로컬 경로를 아래 옵션으로 명시합니다.
로컬 대상 폴더 `./github-workflow-sample`은 현재 작업 폴더 아래의 새 폴더이며,
이미 존재하면 `--directory` 또는 `-LocalDirectory`에 다른 미사용 경로를 지정합니다.
`--confirm-settings` 또는 `-ConfirmSettings`는 앞의 정책·권한·비용 확인을 마친 경우에만 지정합니다.

macOS·Linux:

```bash
bash ./scripts/linux/fork.sh \
  --source-branch handson \
  --target ORG/github-workflow-sample \
  --directory ./github-workflow-sample \
  --confirm-settings
```

Windows:

```powershell
pwsh -NoProfile -File .\scripts\win\fork.ps1 `
  -SourceBranch handson `
  -TargetRepo ORG/github-workflow-sample `
  -LocalDirectory ./github-workflow-sample `
  -ConfirmSettings
```

기본 공개 원본은 `hijigoo/github-workflow-sample`이며 기본 원본 브랜치는 `handson`입니다.
스크립트는 clone 시점의 원본 브랜치 커밋을 대상 `main`으로 복사하고, 기존 SARIF의 자동 업로드는 생략합니다.
원본 브랜치에 포함된 변경만 복사되므로 로컬에서 수정한 가이드는 원격 `handson`에 반영돼 있어야 합니다.

기존 분석 커밋의 코드와 SARIF를 함께 준비해야 한다면 별도의 빈 대상 저장소에
`--commit FULL_SHA` 또는 `-AnalyzedSha FULL_SHA`를 명시합니다. 이 옵션은 원본 브랜치 선택보다 우선하며 고정 커밋 복사와 SARIF 업로드를 수행합니다.
기본 실습용 기준 저장소를 이 방식으로 덮어쓰지 않으며, SARIF와 분석 SHA의 짝은 준비 담당자가 확인합니다.

복사된 SARIF를 신규 저장소의 현재 `main`에 바로 표시하려면
[04번의 선택 등록 실습](handson/04-security.md#선택-실습-기존-sarif-등록)의 `--upload-only` 또는 `-UploadOnly`를 사용합니다.

새 대상에는 Actions와 CodeQL default setup을 비활성화하고 필요한 Code Security 설정을 적용합니다.
기존 대상 설정은 임의로 바꾸지 않으며 비어 있지 않은 대상을 덮어쓰지 않습니다.
기존 검수 브랜치 복사 옵션은 이번 실습에 필요하지 않습니다.

### 생성 결과와 포크 정책 확인

* 실행 출력의 `Source branch: handson`, `SARIF upload skipped:`, `Copy verified:` 확인
* 기준 저장소 `main`이 실행 출력의 복사된 커밋과 일치하는지 확인
* 기준 저장소에 복사된 SARIF 파일을 GitHub 웹에서 열 수 있는지 확인
* Actions와 CodeQL 자동 분석이 비활성화돼 있는지 확인
* 기업·조직 정책과 저장소 설정에서 실습 대상 조직으로 private 저장소 포크가 허용되는지 확인

기준 저장소의 `main`에는 추가 커밋하지 않습니다.
기본 준비에서는 SARIF를 자동 등록하지 않으므로 Code scanning 경고 목록이 비어 있어도 정상입니다.
별도로 SARIF를 등록한 경우에만 `SARIF processing complete:`와 웹 결과의 등록 대상 커밋을 확인하며,
API 접수만으로 등록 성공을 판단하지 않습니다.

## 3. 준비 중 문제가 생겼을 때

스크립트는 실패해도 생성한 저장소·로컬 폴더·이미 복사한 코드를 자동 삭제하거나 되돌리지 않습니다.
완료된 단계와 업로드 ID를 확인한 뒤 재시도합니다.

| 문제 | 확인할 것 |
|------|-----------|
| CLI 또는 스크립트 실행 불가 | 도구·PATH와 조직의 스크립트 실행 정책 확인. Windows는 PowerShell 7.4 이상 사용 |
| 조직·저장소 403 또는 404 | 활성 계정, 조직 가입, 생성·관리 권한과 조직 인증 확인 |
| Code Security 활성화·등록 거부 | 라이선스·비용 승인·정책과 Code scanning 쓰기 권한 확인 |
| 내부 포크 허용 설정 불가 | 기업·조직·기준 저장소의 정책과 허용 가능한 대상 조직을 관리자에게 확인 |
| 대상 저장소 또는 로컬 폴더가 이미 있음 | 덮어쓰지 않고 복사 결과 확인. SARIF 등록만 할 때는 `--upload-only` 또는 `-UploadOnly` 사용 |
| 원본 브랜치가 없음 | 원본 저장소의 `handson` 존재 여부와 `--source-branch` 또는 `-SourceBranch` 값 확인 |
| SHA 불일치 | 고정 SHA 복사 모드에서는 대상 `main`과 복사할 SHA의 일치 확인 |
| 업로드 처리 대기·실패 | 업로드 ID의 기존 처리 상태를 확인한 뒤 재시도 |

처리 상태는 실제 저장소와 업로드 ID로 확인합니다.

```bash
gh api --hostname github.com repos/ORG/github-workflow-sample/code-scanning/sarifs/UPLOAD_ID
```

`complete`면 웹 결과를 확인하고, `pending`이면 나중에 다시 조회합니다.
`failed`면 원인을 해결한 뒤 업로드 전용 모드로 재시도합니다. 확인 없이 중복 제출하지 않습니다.

## 참고

### 준비 도구

* [GitHub CLI 설치](https://cli.github.com/)
* [PowerShell 설치](https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows)

### 조직 권한과 Copilot 환경

* [기업 내부 포크 정책](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/reference/forks)
* [조직의 private 저장소 포크 허용 설정](https://docs.github.com/en/organizations/managing-organization-settings/managing-the-forking-policy-for-your-organization)
* [조직 저장소의 역할별 권한](https://docs.github.com/en/organizations/managing-user-access-to-your-organizations-repositories/managing-repository-roles/repository-roles-for-an-organization)
* [실습 대상 사용자·팀의 Copilot Seat 부여](https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-access/grant-access)
* [조직의 Cloud 사용·저장소 접근·자동화 허용 정책](https://docs.github.com/en/copilot/how-tos/administer-copilot/manage-for-organization/manage-copilot-in-the-cloud)
* [Cloud 샌드박스와 Actions 실행 환경 구분](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes)
* [Cloud 샌드박스 사용량과 과금](https://docs.github.com/en/billing/concepts/product-billing/cloud-and-local-sandboxes)
* [사용량 예산과 지출 제한 설정](https://docs.github.com/en/billing/how-tos/set-up-budgets)

### 자동 실행 차단

* [저장소 Actions 비활성화](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
* [Copilot 자동 PR 리뷰 설정과 ruleset](https://docs.github.com/en/copilot/how-tos/copilot-on-github/set-up-copilot/configure-code-review)
* [Agent Merge 실행 환경과 비활성화](https://docs.github.com/en/copilot/how-tos/copilot-on-github/use-copilot-agents/watch-and-fix-pull-requests)

### Code Security와 SARIF

* [조직 보안 구성 적용과 라이선스 영향 확인](https://docs.github.com/en/code-security/how-tos/secure-at-scale/configure-organization-security/establish-complete-coverage/apply-custom-configuration)
* [SARIF 업로드 요구사항](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
* [SARIF 등록을 위한 CodeQL default setup 비활성화](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/troubleshoot-sarif-uploads/default-setup-enabled)
* [SARIF 업로드와 처리 상태 확인 API](https://docs.github.com/en/rest/code-scanning/code-scanning)

