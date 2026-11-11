# 실습을 위한 저장소 사전 준비 가이드

GHEC의 Enterprise Managed Users(EMU) 조직에서는 기업 외부의 공개 저장소를 직접 포크할 수 없습니다.
이 가이드는 공개 원본을 조직 내부의 독립 저장소로 복사해, 실습자가 기업 내부에서 포크할 수 있는 실습 기준 저장소를 사전 준비하는 절차를 안내합니다.

## 진행 순서

Pioneer는 사전 준비를 위해 다음 작업을 수행합니다.
- 조직 저장소 설정 확인
- 사전 설치 준비사항
- 저장소 생성을 위한 스크립트 실행 (별도의 저장소 생성·clone·push·업로드 명령을 실행할 필요 없음)

pioneer는 사전 준비와 GitHub CLI 인증을 마친 뒤 OS에 맞는 스크립트를 한 번 실행합니다. (Windows는 [fork.ps1](../scripts/win/fork.ps1), macOS·Linux는 [fork.sh](../scripts/linux/fork.sh)를 사용)

스크립트가 공개 원본을 조직 기준 저장소로 복사하고, 준비된 SARIF를 Code scanning에 등록합니다.
저장소 생성·clone·push·업로드 명령을 따로 실행할 필요는 없습니다.

> [!IMPORTANT]
> Actions runner는 사용하지 않습니다.
> private/internal Code scanning에는 Code Security 또는 이를 포함하는 기존 GHAS 이용 권한이 필요합니다.
> 활성화에 따른 라이선스·비용은 관리자와 사전에 확인합니다.

## 1. 사전 준비

### 1.1 조직 설정과 권한

관리자와 다음을 확인합니다.

* [ ] pioneer 계정이 대상 GHEC·EMU 조직에 접근하고 저장소 생성·관리·push를 할 수 있습니다.
* [ ] 조직이 GitHub CLI의 OAuth 앱 사용을 허용하고 필요한 조직 승인·SSO 인증을 완료했습니다.
* [ ] Code Security 활성화와 SARIF 업로드에 필요한 권한·라이선스·비용을 승인했습니다.
* [ ] 조직 보안 구성이 CodeQL default setup이나 자동 분석을 강제로 켜지 않습니다.
* [ ] 기준 저장소와 실습자 fork에서 Actions·자동 PR 리뷰·에이전트가 실행되지 않습니다.
* [ ] 기업·조직이 실습자의 내부 fork 생성을 허용하고 fork별 Code Security 사용이 가능해야 합니다.

### 1.2 CLI 설치

| OS      | 설치할 CLI·도구                                                        | 기본 기능·유틸리티                                             |
|---------|------------------------------------------------------------------------|---------------------------------------------------------------|
| Windows | GitHub CLI (`gh`), Git CLI, PowerShell 7.4 이상 (`pwsh`)                 | .NET으로 압축·인코딩·임시 파일 처리. Bash·Unix 유틸리티 불필요   |
| macOS   | GitHub CLI (`gh`), Git CLI (기존 `git --version`이 동작하면 재설치 불필요) | 기본 Bash와 `gzip`, `base64`, `tr`, `mktemp`, `sleep` 사용        |
| Linux   | GitHub CLI (`gh`), Git CLI, 누락된 Bash·`gzip`·coreutils                  | 일반 배포판은 Bash·유틸리티 제공. 최소 설치·컨테이너는 확인 필요 |

### 1.3 파일과 스크립트 설정

SARIF가 분석한 원본 저장소와 전체 커밋 SHA를 확인합니다. 스크립트는 SARIF 파일과 SHA의 일치를 자동 검증하지 않으므로, `ANALYZED_SHA`(PowerShell은 `AnalyzedSha`)는 SARIF 파일이 분석한 커밋 SHA와 동일하게 유지합니다.

<details>
<summary>macOS·Linux (Bash)</summary>

macOS·Linux는 [fork.sh](../scripts/linux/fork.sh) 상단을 설정합니다.

```bash
SOURCE_REPO='hijigoo/github-workflow-sample'
TARGET_REPO='haewons-emu-org/github-workflow-sample'
ANALYZED_SHA='7e374656389ab24b71af8e409dbd434346278ace'
SARIF_FILE='./code-scanning.sarif'
LOCAL_DIRECTORY='./github-workflow-sample'
REVIEW_BRANCH=''
SETTINGS_CONFIRMED=false
```

* `TARGET_REPO`: 실제 대상 조직과 저장소 이름
* `ANALYZED_SHA`: 배포된 SARIF가 분석한 소문자 40자리 SHA. 배포 스크립트에 설정돼 있으면 유지
* `SARIF_FILE`: 기존 SARIF 경로. 파일명을 바꿨다면 수정
* `LOCAL_DIRECTORY`: 아직 존재하지 않는 clone 폴더. 상대 경로는 실행 위치 기준
* `REVIEW_BRANCH`: 원본의 검수용 브랜치. 제공되지 않았다면 빈 값 유지
* `SETTINGS_CONFIRMED`: 사전 설정·권한·라이선스 확인 후 `true`로 변경

</details>

<details>
<summary>Windows (PowerShell)</summary>

Windows는 [fork.ps1](../scripts/win/fork.ps1) 상단의 다음 매개변수 기본값을 확인하고 대상 조직·저장소와 로컬 경로를 수정합니다.

```powershell
[CmdletBinding(PositionalBinding = $false)]
param(
    # Edit these defaults before running from the repository root.
    [Parameter(Mandatory = $false)]
    [string]$SourceRepo = 'hijigoo/github-workflow-sample',
    [Parameter(Mandatory = $false)]
    [string]$TargetRepo = 'haewons-emu-org/inquiry-training-base',
    # Keep this SHA paired with the local SARIF's analyzed commit.
    [Parameter(Mandatory = $false)]
    [string]$AnalyzedSha = '7e374656389ab24b71af8e409dbd434346278ace',
    [Parameter(Mandatory = $false)]
    [string]$SarifFile = './code-scanning.sarif',
    [Parameter(Mandatory = $false)]
    [string]$LocalDirectory = './github-workflow-sample',
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
```

* `SourceRepo`: 공개 원본 저장소 이름 (`OWNER/REPO`)
* `TargetRepo`: 실제 대상 조직과 저장소 이름
* `AnalyzedSha`: SARIF 파일이 분석한 소문자 40자리 SHA
* `SarifFile`: 기존 SARIF 경로. 파일명을 바꿨다면 수정
* `LocalDirectory`: 아직 존재하지 않는 clone 폴더. 상대 경로는 실행 위치 기준
* `ReviewBranch`: 원본의 검수용 브랜치. 제공되지 않았다면 빈 값 유지
* `SettingsConfirmed`: 사전 설정·권한·라이선스 확인 후 `$true`로 사용
* `ConfirmSettings`: 기본값 수정 대신 실행 시 `-ConfirmSettings`로 사전 확인 완료를 지정
* `UploadOnly`: `-UploadOnly`로 코드 복사 없이 SARIF 업로드만 실행
* `Help`: `-Help`로 사용법 표시
* `Arguments`: Bash와 같은 `--target`·`--upload-only` 형식의 옵션 전달용. 기본값 유지

</details>

<br/>
> [!NOTE]
> 대상이 없으면 스크립트가 private 빈 저장소를 생성하므로 미리 만들지 않아도 됩니다.
> 스크립트는 기존 대상의 공개 범위·Actions·CodeQL 설정을 변경하지 않습니다.
> 토큰은 스크립트나 원격 URL에 넣지 않습니다.

## 2. 인증 및 실행

### 2.1 GitHub CLI 인증

조직에 접근할 EMU 계정으로 로그인하고 Git 인증을 연결합니다. 브라우저에서 OAuth 인증을 진행하므로 PAT를 미리 발급할 필요는 없습니다.

```bash
gh auth login --hostname github.com --git-protocol https --web --scopes repo,read:org,workflow
gh auth setup-git --hostname github.com
gh auth status --hostname github.com
```

각 Scope의 용도는 다음과 같습니다.

| 범위 | 용도 |
|------|------|
| `repo` | 비공개 저장소 접근·설정·push와 보안 이벤트 접근 |
| `read:org` | 조직 정보 접근 확인 |
| `workflow` | 복사하는 workflow 파일의 push |

이 범위와 별개로 계정의 저장소 생성·관리 권한과 조직 승인은 필요합니다.

계정이 여러 개라면 실제 계정명으로 전환합니다.

```bash
gh auth switch --hostname github.com --user YOUR_EMU_ACCOUNT
```

`GH_TOKEN`·`GITHUB_TOKEN`이 설정돼 있으면 저장된 로그인보다 우선할 수 있습니다.
활성 계정과 조직 접근 권한을 확인하고 토큰 값은 공유하지 않습니다.

### 2.2 스크립트 실행

이 저장소의 루트 디렉터리에서 실행합니다. SARIF 기본 경로 `./code-scanning.sarif`도 실행 위치 기준입니다.
스크립트는 대상 저장소 생성 → 안전 설정·Code Security 확인 → 분석 SHA의 코드 복사 → SARIF 업로드 → 처리 완료 확인 순서로 진행됩니다.

Windows:

```powershell
pwsh -NoProfile -File .\scripts\win\fork.ps1
```

macOS·Linux:

```bash
bash ./scripts/linux/fork.sh
```

> [!NOTE]
> 새 대상의 Actions와 CodeQL default setup은 비활성화, Code Security는 활성화 됩니다.
> 새 CodeQL 분석이나 Actions runner 실행은 하지 않습니다.


### 2.3 저장소 생성 및 구성 확인

* 스크립트 실행 결과에서 `SARIF processing complete:`와 최종 `Copy verified:` 출력을 확인합니다.
* GitHub의 조직 내에 대상 저장소가 생성되었는지 확인하고, main SHA가 설정한 분석 SHA와 일치하는지 확인합니다.
* 저장소의 **Security → Code scanning** 화면에서 업로드한 CodeQL 분석 결과를 확인합니다. (이 내용이 보이지 않으면 sarif 결과가 업로드 되지 않은 것입니다.)
* 저장소의 Actions가 비활성화되어 있는지 확인합니다.

### 2.4 실습자에게 전달

실습자에게 다음을 안내합니다.

* 기준 저장소 링크와 포크가 허용된 조직
* [실습자 가이드](handson-guide-wo-runner.md)
* 이 저장소에 커밋된 [SARIF 파일](../code-scanning.sarif) 링크와 해당 파일이 분석한 커밋 SHA
* 검수용 브랜치를 복사했다면 해당 브랜치 이름

SARIF는 별도 파일로 배포하지 않고 위 링크를 안내합니다.
기준 main에 추가 커밋하지 않고 분석 SHA를 유지합니다.

Code scanning 결과는 포크에 자동 복사되지 않습니다.
실습자는 위 SARIF 링크에서 파일을 받아 포크별로 업로드합니다.
실습 전에 시험 포크로 자동 실행 차단·main SHA·검수 브랜치·SARIF 업로드를 확인합니다.
Issue·PR은 별도로 준비하며, PR의 base와 head는 모두 실습자 포크로 지정합니다.
Dependabot·Secret scanning은 이 SARIF나 스크립트의 대상이 아닙니다.

## 3. Workaround

스크립트는 실패해도 생성한 저장소·clone·이미 push한 코드를 자동 삭제하거나 되돌리지 않습니다.
오류 단계와 업로드 ID를 확인한 뒤 재시도합니다.

| 오류 | 대응 |
|------|------|
| CLI 없음 | 1.2의 도구와 PATH 확인. Windows는 PowerShell 7의 `pwsh`로 실행 |
| Windows 실행 정책에 의해 차단 | 조직의 스크립트 서명·실행 정책에 따라 승인받아 실행. 정책을 무조건 우회하지 않음 |
| SARIF 파일·SHA 오류 | 실행 위치, 파일 경로와 배포받은 분석 SHA 확인 |
| 조직·저장소 403 또는 404 | 활성 계정·조직명·조직 가입·SSO·생성 및 관리 권한 확인 |
| Code Security 활성화·업로드 거부 | 라이선스·조직 정책·대상 Code scanning 권한 확인 |
| Actions·CodeQL 설정 오류 | 관리자와 Actions 및 CodeQL default setup 비활성화 확인 |
| clone 폴더가 이미 있음 | 복사 전 실패였다면 새 `LOCAL_DIRECTORY` 지정 |
| 대상이 비어 있지 않음 | 덮어쓰지 않음. 이미 복사한 main SHA가 맞으면 업로드 전용 모드 사용 |

OAuth 인증 Scope가 부족하다면 다음 명령어를 사용해서 조직이 허용한 범위를 갱신합니다.

```bash
gh auth refresh --hostname github.com --scopes repo,read:org,workflow
gh auth setup-git --hostname github.com
```

각 Scope의 용도는 다음과 같습니다.

| 범위 | 용도 |
|------|------|
| `repo` | 비공개 저장소 접근·설정·push와 보안 이벤트 접근 |
| `read:org` | 조직 정보 접근 확인 |
| `workflow` | 복사하는 workflow 파일의 push |

fine-grained PAT는 대상 조직·저장소와 API별 권한·조직 승인을 확인합니다.
SARIF 업로드에는 `Code scanning alerts: Read and write`가 필요하며,
이 권한만으로 저장소 생성·설정·코드 push까지 가능한 것은 아닙니다.

이미 코드를 복사했고 SARIF만 업로드해야 한다면 다음 명령을 사용합니다.
대상 main이 `ANALYZED_SHA`와 같아야 하며 Code Security 활성화,
Actions·CodeQL default setup 비활성화가 완료돼 있어야 합니다.
이 모드는 저장소 생성·설정 변경·Git push를 하지 않습니다.

Windows:

```powershell
pwsh -NoProfile -File .\scripts\win\fork.ps1 -UploadOnly
```

macOS·Linux:

```bash
bash ./scripts/linux/fork.sh --upload-only
```

처리 대기 한도 초과나 상태 조회 오류가 나면 업로드 ID로 기존 작업부터 확인합니다.
`ORG`와 `UPLOAD_ID`는 실제 값으로 바꿉니다.

```bash
gh api --hostname github.com \
  repos/ORG/inquiry-training-base/code-scanning/sarifs/UPLOAD_ID
```

`complete`면 웹 결과를 확인하고, `pending`이면 나중에 다시 조회합니다.
`failed`면 출력된 원인을 해결한 뒤 업로드 전용 모드로 재시도합니다.
확인 없이 중복 제출하지 않습니다.

## 참고

* [GitHub CLI 설치](https://cli.github.com/)
* [PowerShell 7 설치](https://learn.microsoft.com/en-us/powershell/scripting/install/install-powershell-on-windows)
* [GitHub CLI 인증](https://cli.github.com/manual/gh_auth_login)
* [기업 내부 포크 정책](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/reference/forks)
* [SARIF 업로드 요구사항](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
