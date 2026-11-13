#!/usr/bin/env pwsh
# Copyright (c) 2026 Microsoft Corporation. All rights reserved.
# SPDX-License-Identifier: MIT
#Requires -Version 7.4

<#
.SYNOPSIS
    Copy a public repository branch or analyzed commit without Git Bash.
.DESCRIPTION
    Native PowerShell equivalent of fork.sh. Requires PowerShell 7.4+, Git,
    and GitHub CLI. Uses .NET for gzip, base64, and temporary files.
    Edit the parameter defaults below, use PowerShell named parameters,
    or supply the same --options as fork.sh.
.PARAMETER SourceRepo
    Public source repository in OWNER/REPO form.
.PARAMETER SourceBranch
    Source branch copied to target main before SARIF upload; defaults to handson.
.PARAMETER TargetRepo
    Private or internal target repository in ORG/REPO form.
.PARAMETER AnalyzedSha
    Explicitly supplying this selects fixed-commit copying with SARIF upload.
    Must match the local SARIF when copying an analyzed commit.
.PARAMETER SarifFile
    Existing readable, nonempty SARIF file; never modified.
.PARAMETER LocalDirectory
    New local clone path (may already exist with -UploadOnly).
.PARAMETER ReviewBranch
    Optional review branch descending from the copied commit.
.PARAMETER SettingsConfirmed
    Confirmation that policies, safety settings, licensing, and costs were reviewed.
.PARAMETER ConfirmSettings
    Confirm settings for this invocation.
.PARAMETER UploadOnly
    Skip copying and upload SARIF to current target main.
.PARAMETER Help
    Display usage without contacting GitHub.
.PARAMETER Arguments
    Optional --source, --source-branch, --target, --commit, --sarif, --directory,
    --review-branch, --confirm-settings, --upload-only, or --help arguments.
.EXAMPLE
    ./scripts/win/fork.ps1 -UploadOnly -ConfirmSettings
.NOTES
    Code Security licensing/costs may apply. No force-push or automatic
    repository cleanup. Failed uploads do not roll back copied code.
#>

[CmdletBinding(PositionalBinding = $false)]
param(
    # Edit these defaults before running from the repository root.
    [Parameter(Mandatory = $false)]
    [Alias('source')]
    [string]$SourceRepo = 'hijigoo/github-workflow-sample',
    [Parameter(Mandatory = $false)]
    [Alias('source-branch')]
    [string]$SourceBranch = 'handson',
    [Parameter(Mandatory = $false)]
    [string]$TargetRepo = 'haewons-emu-org/inquiry-training-base',
    # Keep this SHA paired with the local SARIF's analyzed commit.
    [Parameter(Mandatory = $false)]
    [string]$AnalyzedSha = '7e374656389ab24b71af8e409dbd434346278ace',
    [Parameter(Mandatory = $false)]
    [string]$SarifFile = './code-scanning.sarif',
    [Parameter(Mandatory = $false)]
    [string]$LocalDirectory = './inquiry-training-base',
    [Parameter(Mandatory = $false)]
    [string]$ReviewBranch = '',
    # Confirm safety settings and Code Security licensing/costs before setting true.
    [Parameter(Mandatory = $false)]
    [bool]$SettingsConfirmed = $true,
    [Parameter(Mandatory = $false)]
    [switch]$ConfirmSettings,
    [Parameter(Mandatory = $false)]
    [switch]$UploadOnly,
    [Parameter(Mandatory = $false)]
    [switch]$Help,
    [Parameter(Mandatory = $false, ValueFromRemainingArguments = $true)]
    [string[]]$Arguments = @()
)

$ErrorActionPreference = 'Stop'
$CopyAnalyzedCommit = $PSBoundParameters.ContainsKey('AnalyzedSha')

#region Functions
function Show-Usage {
    <#
    .SYNOPSIS
        Display invocation and safety information.
    #>
    [CmdletBinding()]
    [OutputType([void])]
    param()
    Write-Host @'
Usage (from the repository root): .\scripts\win\fork.ps1
Edit the parameter defaults at the top first. PowerShell overrides:
  .\scripts\win\fork.ps1 -SourceRepo OWNER/REPO -TargetRepo ORG/REPO -SourceBranch BRANCH `
    -LocalDirectory NEW_PATH `
    [-ReviewBranch BRANCH] -ConfirmSettings
  .\scripts\win\fork.ps1 -AnalyzedSha FULL_SHA -SarifFile EXISTING_FILE
  .\scripts\win\fork.ps1 -UploadOnly
The equivalent fork.sh-style --options are also accepted:
  .\scripts\win\fork.ps1 --source OWNER/REPO --target ORG/REPO --source-branch BRANCH `
    --directory NEW_PATH [--review-branch BRANCH] `
    --confirm-settings
  .\scripts\win\fork.ps1 --upload-only

Requires PowerShell 7.4+, Git and GitHub CLI (gh), not Git Bash or Unix tools.
Copy a public github.com repository into an empty GHEC organization repository.
Create a private empty target if missing and disable its Actions and CodeQL
default setup before copying. Enable Code Security on an empty target if needed
(requires permissions and licensing; costs may apply). Existing Actions and
CodeQL default setup settings are not changed.
By default, copy the tip of SourceBranch (handson) to target main and
upload the existing local SARIF.
-AnalyzedSha / --commit overrides branch selection: copy that analyzed SHA
to target main and upload the existing local SARIF. It must match that SARIF.
The local SARIF is not modified or downloaded. Optionally copy one review
branch descending from the copied commit. No source Code scanning API access
or new analysis is required.

--confirm-settings confirms that enterprise/organization fork policies,
new-fork automation restrictions, repository settings, and Code Security
licensing/costs were reviewed.
The script also checks target visibility, Actions, and CodeQL default setup.
Existing local paths and nonempty targets are refused during copying.
--upload-only skips copying and uploads SARIF to current target main.
SARIF upload requires Code scanning write permission.
No force-push or automatic repository cleanup.
'@
}

function Invoke-NativeCommand {
    <#
    .SYNOPSIS
        Capture stdout, preserve visible stderr, and explicitly check native exits.
    #>
    [CmdletBinding()]
    [OutputType([string], [pscustomobject])]
    param(
        [Parameter(Mandatory = $true)]
        [string]$Program,
        [Parameter(Mandatory = $true)]
        [AllowEmptyCollection()]
        [string[]]$ArgumentList,
        [switch]$AllowFailure,
        [string]$FailureMessage = 'Native command failed.'
    )
    # Native stderr is not itself failure; the exit code is authoritative.
    $ErrorActionPreference = 'Continue'
    $PSNativeCommandUseErrorActionPreference = $false
    $global:LASTEXITCODE = $null
    $Lines = @(& $Program @ArgumentList 2>&1)
    $ExitCode = $LASTEXITCODE
    $OutputLines = foreach ($Line in $Lines) {
        if ($Line -is [System.Management.Automation.ErrorRecord]) {
            [Console]::Error.WriteLine($Line.ToString())
        }
        else {
            [string]$Line
        }
    }
    $Output = $OutputLines -join "`n"
    if ($AllowFailure) {
        return [pscustomobject]@{ Output = $Output; ExitCode = $ExitCode }
    }
    if ($ExitCode -ne 0) {
        throw "$FailureMessage ($Program exited $ExitCode)"
    }
    return $Output
}

function Invoke-SafeGit {
    <#
    .SYNOPSIS
        Run Git with local hooks disabled using an empty native directory.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,
        [string]$FailureMessage = 'Native command failed.'
    )
    Invoke-NativeCommand -Program git -ArgumentList (
        @('-c', "core.hooksPath=$script:HooksDirectory") + $ArgumentList
    ) -FailureMessage $FailureMessage
}

function Invoke-Gh {
    <#
    .SYNOPSIS
        Run GitHub CLI with explicit hostname and checked exit status.
    #>
    [CmdletBinding()]
    [OutputType([string], [pscustomobject])]
    param(
        [Parameter(Mandatory = $true)]
        [string[]]$ArgumentList,
        [switch]$AllowFailure,
        [string]$FailureMessage = 'GitHub CLI request failed.'
    )
    Invoke-NativeCommand -Program gh -ArgumentList $ArgumentList `
        -AllowFailure:$AllowFailure -FailureMessage $FailureMessage
}

function Send-Sarif {
    <#
    .SYNOPSIS
        Verify target safety, upload gzipped local SARIF, and poll completion.
    #>
    [CmdletBinding()]
    [OutputType([void])]
    param(
        [string]$Target,
        [string]$SarifFile
    )
    $Commit = ((Invoke-SafeGit -ArgumentList @(
        'ls-remote', "https://github.com/$Target.git", 'refs/heads/main'
    )) -split "`t")[0]
    if ($Commit -cnotmatch '^[0-9a-f]{40}$') {
        throw 'Target main is missing or unavailable; refusing SARIF upload.'
    }
    $ActionsState = Invoke-Gh -ArgumentList @(
        'api', '--hostname', 'github.com', "repos/$Target/actions/permissions", '--jq', '.enabled'
    )
    $CodeqlState = Invoke-Gh -ArgumentList @(
        'api', '--hostname', 'github.com', "repos/$Target/code-scanning/default-setup", '--jq', '.state'
    )
    if ($ActionsState -cne 'false' -or $CodeqlState -cne 'not-configured') {
        throw 'Disable target Actions and CodeQL default setup before SARIF upload.'
    }

    $PayloadPath = $null
    $Compressed = [System.IO.MemoryStream]::new()
    try {
        $InputStream = [System.IO.File]::OpenRead($SarifFile)
        try {
            $Gzip = [System.IO.Compression.GZipStream]::new(
                $Compressed, [System.IO.Compression.CompressionMode]::Compress, $true
            )
            try { $InputStream.CopyTo($Gzip) }
            finally { $Gzip.Dispose() }
        }
        finally { $InputStream.Dispose() }
        $Payload = @{
            commit_sha = $Commit
            ref = 'refs/heads/main'
            sarif = [Convert]::ToBase64String($Compressed.ToArray())
            tool_name = 'CodeQL'
        } | ConvertTo-Json -Compress
        $PayloadPath = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($PayloadPath, $Payload, [System.Text.UTF8Encoding]::new($false))
        Write-Host "Uploading SARIF to $Target for $Commit..."
        $UploadId = Invoke-Gh -ArgumentList @(
            'api', '--hostname', 'github.com', '--method', 'POST',
            "repos/$Target/code-scanning/sarifs", '-H', 'Accept: application/vnd.github+json',
            '--input', $PayloadPath, '--jq', '.id // ""'
        ) -FailureMessage 'SARIF upload failed; check Code scanning write permission and licensing. Copied code is not rolled back.'
        if ($UploadId -cnotmatch '^[A-Za-z0-9_-]+$') {
            throw 'Invalid SARIF upload ID; inspect the target before retrying.'
        }
        Write-Host "SARIF upload ID: $UploadId"
        for ($Attempt = 1; $Attempt -le 12; $Attempt++) {
            $Response = Invoke-Gh -ArgumentList @(
                'api', '--hostname', 'github.com', "repos/$Target/code-scanning/sarifs/$UploadId",
                '--jq', '[.processing_status, ((.errors // []) | tojson)] | @tsv'
            ) -FailureMessage "Could not check SARIF upload $UploadId; inspect its status before retrying."
            $State, $ProcessingErrors = $Response -split "`t", 2
            Write-Host "SARIF processing: $State"
            switch -CaseSensitive ($State) {
                'complete' {
                    Write-Host "SARIF processing complete: https://github.com/$Target/security/code-scanning"
                    return
                }
                'pending' {
                    if ($Attempt -lt 12) { Start-Sleep -Seconds 5 }
                }
                'failed' { throw "SARIF processing failed (${UploadId}): $ProcessingErrors" }
                default { throw "Unexpected SARIF processing status (${UploadId}): $Response" }
            }
        }
        throw "SARIF upload $UploadId is still pending; inspect its status before retrying. Copied code is not rolled back."
    }
    finally {
        $Compressed.Dispose()
        if ($PayloadPath) { [System.IO.File]::Delete($PayloadPath) }
    }
}

function Invoke-RepositoryCopy {
    <#
    .SYNOPSIS
        Apply configured overrides and perform the verified copy or upload-only.
    #>
    [CmdletBinding()]
    [OutputType([void])]
    param([string[]]$Options)

    $Source = $SourceRepo
    $Branch = $SourceBranch
    $FixedCommit = $CopyAnalyzedCommit
    $Target = $TargetRepo
    $Commit = $AnalyzedSha
    $Directory = $LocalDirectory
    $Confirmed = $SettingsConfirmed -or $ConfirmSettings
    if ($Help) { Show-Usage; return }
    for ($Index = 0; $Index -lt $Options.Count; $Index++) {
        $Option = $Options[$Index]
        switch -CaseSensitive ($Option) {
            { $_ -in '--help', '-h' } { Show-Usage; return }
            '--confirm-settings' { $Confirmed = $true }
            '--upload-only' { $UploadOnly = $true }
            { $_ -in '--source', '--source-branch', '--target', '--commit', '--sarif', '--directory', '--review-branch' } {
                if ($Index + 1 -ge $Options.Count -or
                    [string]::IsNullOrEmpty($Options[$Index + 1]) -or
                    $Options[$Index + 1].StartsWith('--')) {
                    throw "$Option requires a value."
                }
                $Index++
                switch -CaseSensitive ($Option) {
                    '--source' { $Source = $Options[$Index] }
                    '--source-branch' { $Branch = $Options[$Index] }
                    '--target' { $Target = $Options[$Index] }
                    '--commit' { $Commit = $Options[$Index]; $FixedCommit = $true }
                    '--sarif' { $SarifFile = $Options[$Index] }
                    '--directory' { $Directory = $Options[$Index] }
                    '--review-branch' { $ReviewBranch = $Options[$Index] }
                }
            }
            default { throw "Unknown argument: $Option. Use --help." }
        }
    }
    if (-not $Confirmed) {
        throw 'Review docs/handson/00-preparation.md; set SettingsConfirmed=$true or use -ConfirmSettings / --confirm-settings.'
    }
    if ($Source -cnotmatch '^[A-Za-z0-9-]+/[A-Za-z0-9_.-]+$') {
        throw '--source must be OWNER/REPO, not a URL.'
    }
    if ($Target -cnotmatch '^[A-Za-z0-9-]+/[A-Za-z0-9_.-]+$') {
        throw '--target must be ORG/REPO, not a URL.'
    }
    if ($Source -ceq $Target) { throw 'Source and target must differ.' }
    if ($FixedCommit -and -not $UploadOnly -and $Commit -cnotmatch '^[0-9a-f]{40}$') {
        throw '--commit must be the full 40-character lowercase analyzed SHA.'
    }
    if ([string]::IsNullOrEmpty($Directory) -or $Directory.StartsWith('-')) {
        throw '--directory must be a new local path.'
    }
    # Get-Item also recognizes dangling symbolic links, unlike File.Exists.
    if (-not $UploadOnly -and (Get-Item -LiteralPath $Directory -Force -ErrorAction SilentlyContinue)) {
        throw 'Local destination already exists; choose a new path.'
    }
    $SarifItem = Get-Item -LiteralPath $SarifFile -Force -ErrorAction SilentlyContinue
    if ($null -eq $SarifItem -or $SarifItem.PSIsContainer -or $SarifItem.Length -eq 0) {
        throw "Local SARIF must be an existing readable, nonempty file: $SarifFile"
    }
    try {
        $Readable = [System.IO.File]::OpenRead($SarifItem.FullName)
        $Readable.Dispose()
    }
    catch { throw "Local SARIF must be an existing readable, nonempty file: $SarifFile" }
    $SarifFile = $SarifItem.FullName
    foreach ($Tool in @('git', 'gh')) {
        if (-not (Get-Command $Tool -CommandType Application -ErrorAction SilentlyContinue)) {
            throw "Install $Tool first."
        }
        if (-not $FixedCommit -and -not $UploadOnly) {
            if ([string]::IsNullOrEmpty($Branch)) {
                throw '--source-branch must be a valid branch name.'
            }
            $null = Invoke-SafeGit -ArgumentList @('check-ref-format', '--branch', $Branch)
        }
    }
    if ($ReviewBranch) {
        if ($ReviewBranch -ceq 'main') { throw 'The review branch must differ from main.' }
        $null = Invoke-SafeGit -ArgumentList @('check-ref-format', '--branch', $ReviewBranch)
    }

    $AuthStatus = Invoke-Gh -ArgumentList @('auth', 'status', '--hostname', 'github.com')
    if ($AuthStatus) { Write-Host $AuthStatus }
    if ($UploadOnly) {
        Send-Sarif -Target $Target -SarifFile $SarifFile
        return
    }
    $Visibility = Invoke-Gh -ArgumentList @('api', '--hostname', 'github.com', "repos/$Source", '--jq', '.visibility')
    if ($Visibility -cne 'public') { throw 'Source must be a public repository.' }
    $Organization = ($Target -split '/')[0]
    $OwnerType = Invoke-Gh -ArgumentList @('api', '--hostname', 'github.com', "orgs/$Organization", '--jq', '.type')
    if ($OwnerType -cne 'Organization') {
        throw 'Target organization is unavailable; check its name and active gh account.'
    }
    $Lookup = Invoke-Gh -ArgumentList @(
        'api', '--hostname', 'github.com', "repos/$Target", '--include',
        '--jq', '[.owner.type, .visibility, .archived] | @tsv'
    ) -AllowFailure
    $Created = $false
    if ($Lookup.ExitCode -eq 0) {
        $Metadata = ($Lookup.Output -split "`n")[-1]
    }
    elseif ($Lookup.Output -cmatch '^HTTP/\S+\s+404(\s|$)') {
        Write-Host "Target not found; creating private repository: $Target"
        # --field (capital F), not --raw-field, sends JSON booleans.
        $Metadata = Invoke-Gh -ArgumentList @(
            'api', '--hostname', 'github.com', '--method', 'POST', "orgs/$Organization/repos",
            '-f', "name=$(($Target -split '/')[1])", '-F', 'private=true', '-F', 'auto_init=false',
            '--jq', '[.owner.type, .visibility, .archived] | @tsv'
        ) -FailureMessage 'Target creation failed; check organization permissions and active gh account.'
        $Created = $true
        Write-Host "Created: https://github.com/$Target"
    }
    else { throw 'Target lookup failed; no repository was created.' }
    $OwnerType, $Visibility, $Archived = $Metadata -split "`t"
    if ($OwnerType -cne 'Organization') { throw 'Target must be owned by an organization.' }
    if ($Visibility -cne 'private' -and $Visibility -cne 'internal') { throw 'Target must be private or internal.' }
    if ($Archived -cne 'false') { throw 'Target must not be archived.' }
    if ($Created) {
        $null = Invoke-Gh -ArgumentList @(
            'api', '--hostname', 'github.com', '--method', 'PUT', "repos/$Target/actions/permissions", '-F', 'enabled=false'
        ) -FailureMessage 'Could not disable Actions on the new target. No code was pushed.'
    }
    $ActionsState = Invoke-Gh -ArgumentList @(
        'api', '--hostname', 'github.com', "repos/$Target/actions/permissions", '--jq', '.enabled'
    )
    if ($ActionsState -cne 'false') { throw 'Disable target Actions before copying.' }
    $SourceUrl = "https://github.com/$Source.git"
    $TargetUrl = "https://github.com/$Target.git"
    $RemoteRefs = Invoke-SafeGit -ArgumentList @('ls-remote', $TargetUrl)
    if ($RemoteRefs) { throw 'Target is not empty. No remote refs were changed.' }

    $SecurityQuery = '[.security_and_analysis.code_security.status, .security_and_analysis.advanced_security.status] | if index("enabled") != null then "enabled" elif index("disabled") != null then "disabled" else "unavailable" end'
    $SecurityState = Invoke-Gh -ArgumentList @('api', '--hostname', 'github.com', "repos/$Target", '--jq', $SecurityQuery) `
        -FailureMessage 'Could not read Code Security status. No code was pushed.'
    if ($SecurityState -ceq 'disabled') {
        Write-Host "Enabling Code Security for $Target; licensing costs may apply."
        $null = Invoke-Gh -ArgumentList @(
            'api', '--hostname', 'github.com', '--method', 'PATCH', "repos/$Target",
            '-f', 'security_and_analysis[code_security][status]=enabled'
        ) -FailureMessage 'Code Security activation failed; check permissions, license, and policy. No code was pushed.'
        $SecurityState = Invoke-Gh -ArgumentList @('api', '--hostname', 'github.com', "repos/$Target", '--jq', $SecurityQuery) `
            -FailureMessage 'Could not verify Code Security activation. No code was pushed.'
    }
    if ($SecurityState -cne 'enabled') {
        throw 'Code Security is not enabled or status is unavailable; check admin permissions and licensing. No code was pushed.'
    }
    $CodeqlState = Invoke-Gh -ArgumentList @(
        'api', '--hostname', 'github.com', "repos/$Target/code-scanning/default-setup", '--jq', '.state'
    )
    if ($Created -and $CodeqlState -ceq 'configured') {
        $null = Invoke-Gh -ArgumentList @(
            'api', '--hostname', 'github.com', '--method', 'PATCH',
            "repos/$Target/code-scanning/default-setup", '-f', 'state=not-configured'
        ) -FailureMessage 'Could not disable CodeQL on the new target. No code was pushed.'
        $CodeqlState = Invoke-Gh -ArgumentList @(
            'api', '--hostname', 'github.com', "repos/$Target/code-scanning/default-setup", '--jq', '.state'
        )
    }
    if ($CodeqlState -cne 'not-configured') { throw 'Disable target CodeQL default setup before copying.' }
    Write-Host "Source: $SourceUrl`nTarget: $TargetUrl`nLocal path: $Directory"
    if ($FixedCommit) {
        Write-Host "Analyzed SHA: $Commit"
    }
    else { Write-Host "Source branch: $Branch" }
    Write-Host "Using local SARIF: $SarifFile"
    $CloneOutput = Invoke-SafeGit -ArgumentList @('clone', '--no-checkout', '--no-tags', $SourceUrl, $Directory)
    if ($CloneOutput) { Write-Host $CloneOutput }
    if (-not $FixedCommit) {
        $Commit = Invoke-SafeGit -ArgumentList @(
            '-C', $Directory, 'rev-parse', '--verify', "refs/remotes/origin/${Branch}^{commit}"
        ) -FailureMessage "Source branch not found: $Branch. No code was pushed."
    }
    $ActualCommit = Invoke-SafeGit -ArgumentList @('-C', $Directory, 'rev-parse', '--verify', "${Commit}^{commit}")
    if ($ActualCommit -cne $Commit) { throw 'Copy commit did not resolve exactly.' }
    $null = Invoke-SafeGit -ArgumentList @('-C', $Directory, 'checkout', '--detach', $Commit)
    $Refspecs = @('HEAD:refs/heads/main')
    if ($ReviewBranch) {
        $ReviewCommit = Invoke-SafeGit -ArgumentList @(
            '-C', $Directory, 'rev-parse', '--verify', "refs/remotes/origin/${ReviewBranch}^{commit}"
        )
        try {
            $null = Invoke-SafeGit -ArgumentList @('-C', $Directory, 'merge-base', '--is-ancestor', $Commit, $ReviewCommit)
        }
        catch { throw 'Review branch must descend from the copied commit.' }
        if ($ReviewCommit -ceq $Commit) { throw 'Review branch has no commits beyond the copied commit.' }
        $Refspecs += "${ReviewCommit}:refs/heads/$ReviewBranch"
    }
    $null = Invoke-SafeGit -ArgumentList @('-C', $Directory, 'remote', 'set-url', 'origin', $TargetUrl)
    $RemoteRefs = Invoke-SafeGit -ArgumentList @('ls-remote', $TargetUrl)
    if ($RemoteRefs) { throw 'Target changed during preparation; refusing to push.' }
    $ActionsState = Invoke-Gh -ArgumentList @(
        'api', '--hostname', 'github.com', "repos/$Target/actions/permissions", '--jq', '.enabled'
    )
    $CodeqlState = Invoke-Gh -ArgumentList @(
        'api', '--hostname', 'github.com', "repos/$Target/code-scanning/default-setup", '--jq', '.state'
    )
    if ($ActionsState -cne 'false' -or $CodeqlState -cne 'not-configured') {
        throw 'Automation settings changed; refusing to push.'
    }
    $PushOutput = Invoke-SafeGit -ArgumentList (@('-C', $Directory, 'push', '--atomic', 'origin') + $Refspecs)
    if ($PushOutput) { Write-Host $PushOutput }
    $RemoteSha = ((Invoke-SafeGit -ArgumentList @('ls-remote', $TargetUrl, 'refs/heads/main')) -split "`t")[0]
    if ($RemoteSha -cne $Commit) { throw 'Remote main does not match the copied SHA; inspect the target.' }
    $DefaultBranch = Invoke-Gh -ArgumentList @('api', '--hostname', 'github.com', "repos/$Target", '--jq', '.default_branch')
    if ($DefaultBranch -cne 'main') { throw 'Copy completed, but set the target default branch to main manually.' }
    Send-Sarif -Target $Target -SarifFile $SarifFile
    Write-Host "`nCopy verified: https://github.com/$Target`nmain: $RemoteSha"
    Write-Host "Local SARIF file (unchanged): $SarifFile"
    if ($ReviewBranch) { Write-Host "Review branch: $ReviewBranch ($ReviewCommit)" }
    Write-Host 'Keep Actions disabled. Verify fork policies and Code scanning results.'
}
#endregion Functions

#region Main Execution
if ($MyInvocation.InvocationName -ne '.') {
    $script:HooksDirectory = $null
    try {
        # Empty pager values disable gh's pager without needing a Unix `cat`.
        $env:GH_PAGER = ''
        $env:GIT_PAGER = ''
        $env:PAGER = ''
        $script:HooksDirectory = Join-Path ([System.IO.Path]::GetTempPath()) (
            'fork-hooks-' + [guid]::NewGuid().ToString('N')
        )
        $null = [System.IO.Directory]::CreateDirectory($script:HooksDirectory)
        Invoke-RepositoryCopy -Options $Arguments
        exit 0
    }
    catch {
        [Console]::Error.WriteLine("ERROR: $($_.Exception.Message)")
        exit 1
    }
    finally {
        if ($script:HooksDirectory -and [System.IO.Directory]::Exists($script:HooksDirectory)) {
            [System.IO.Directory]::Delete($script:HooksDirectory, $true)
        }
    }
}
#endregion Main Execution
