---
title: Runner 없이 진행하는 GHEC EMU Copilot 핸즈온
description: 조직 기준 저장소를 개인별로 포크하고 기존 CodeQL 결과 등록과 기능 요청·PR 검수를 연습하는 실습 가이드
ms.date: 2026-11-10
ms.topic: tutorial
---

## 실습 목표와 범위

GitHub Enterprise Cloud(GHEC)의 Enterprise Managed Users(EMU) 조직에 준비된 기준 저장소를 각자 포크하고,
Copilot Chat으로 프로젝트 이해, 기능 요청, PR 검수, 보안 결과 해석을 연습합니다.
[기존 실행형 가이드](handson-guide.md)와 달리 실습 저장소에서 runner를 실행하지 않습니다.

공개 원본에서 강사가 미리 실행한 CodeQL 분석 결과를 SARIF 파일로 받아,
각자 PC에서 본인 PAT(Personal Access Token)로 본인의 조직 포크에 업로드합니다.
CodeQL 분석을 다시 실행하는 것이 아니라, 기존 분석 결과를 Code scanning 화면에 등록하는 활동입니다.
기준 저장소에 등록된 Code scanning 결과는 포크에 자동 복사되지 않으므로 각자 업로드합니다.

| 활동                         | 진행 방식                                    |
|------------------------------|----------------------------------------------|
| 프로젝트 질문                | Copilot Chat으로 코드·문서 확인               |
| 기능 요청                    | 이슈 초안 검토 후 등록, 사람 담당자 지정      |
| PR 검수                      | 준비된 PR과 기존 검증 근거 확인               |
| 보안 결과 가져오기           | 본인 PC에서 SARIF 업로드 API 호출             |
| 보안 후속 조치               | 조사·조치 이슈 작성, 사람 담당자 지정         |
| 구현·검사·병합·배포           | 이번 실습에서는 수행하지 않음                |

> [!IMPORTANT]
> runner를 사용하지 않아도 전체 실습이 무료라는 뜻은 아닙니다.
> Copilot 이용 비용과 private/internal 저장소의 GitHub Code Security 이용 권한·비용은 별도입니다.
> SARIF 업로드 API 자체는 Actions runner를 실행하지 않으며, Code Security 활성화가 필요합니다.

## 실행하지 않을 활동

* Copilot 코딩 에이전트에 이슈 할당 또는 구현·보완 작업 지시
* Copilot 자동 PR 리뷰 요청과 자동 리뷰 설정
* `Run workflow`, `Re-run jobs`, `Approve and run workflows` 선택
* 실습 저장소에서 CodeQL, CI, 릴리스·배포 workflow 실행
* 분석 결과를 가져오기 위한 Actions `upload-sarif` workflow 추가
* 보안 경고를 만들기 위한 취약 코드 복원이나 실제 비밀정보 등록

Chat에 질문하는 것과 백그라운드 에이전트 작업을 시작하는 것은 다릅니다.
이슈·PR 댓글에 에이전트를 호출하는 멘션이나 실행 지시를 넣지 않습니다.
수업 중 GitHub-hosted runner뿐 아니라 self-hosted runner와 클라우드 에이전트 환경도 사용하지 않습니다.

## 강사·관리자 사전 준비 확인

<details>
<summary>사전 준비와 자동 실행 차단 안내 펼치기</summary>

### 기준 저장소와 배포 자료

사전 담당자가 [pioneer 가이드](pioneer-guide.md)에 따라 공개 원본을 clone하고,
분석 커밋을 유지한 조직 기준 저장소를 준비합니다.
수강자는 기업 외부 공개 원본을 직접 포크하지 않습니다.

수업 전에 다음을 제공합니다.

* 조직 기준 저장소 링크, 포크 대상 조직과 개인별 저장소 이름 규칙
* 분석한 전체 SHA와 분석 시각·도구·범위·원본 실행 링크
* SARIF 배포 위치·SHA-256 체크섬과 필요한 `checkout_uri`
* 검수용 브랜치와 완료 조건·검증 자료
* 포크별 설정·Issue·PR 준비 담당자와 PAT 승인 담당자

현재 결과가 0건이면 그대로 사용합니다.
과거 보고서를 별도로 제공할 경우 현재 커밋의 결과와 구분합니다.

### 조직 정책과 저장소 설정

포크 생성 시점부터 아래 자동 실행 차단이 적용되도록 관리자가 정책을 준비합니다.
기준 저장소 설정이 포크에 그대로 복사된다고 가정하지 않습니다.
수강자에게 설정 권한이 없으면 관리자 또는 강사가 적용하고 확인 결과를 제공합니다.

* 저장소 소유자는 EMU 조직이며 공개가 아닌 private/internal입니다.
* `Settings → Actions → General`에서 `Disable actions`를 적용합니다.
  조직 정책으로 설정이 잠겼다면 관리자가 실습 저장소의 Actions 사용을 차단합니다.
* CodeQL **default setup은 비활성화**합니다.
  default setup이 켜져 있으면 외부 CodeQL SARIF 업로드가 거절됩니다.
  Code Security 활성화와 default setup 활성화는 다른 설정입니다.
* 조직의 보안 구성 정책이 default setup이나 자동 분석을 다시 켜지 않는지 확인합니다.
* Copilot 자동 PR 리뷰와 에이전트 자동 호출 등 별도의 자동화도 차단합니다.
* GitHub Code Security를 활성화하고, 수강자의 Code scanning 열람 권한을 확인합니다.
* 조직의 fine-grained PAT 허용·승인 정책과 승인 담당자를 확인합니다.
* 이슈 생성·PR 댓글 작성 권한을 확인합니다. 업로드할 계정은 대상 저장소에 Write 이상 권한이 필요합니다.
* 기업·조직·기준 저장소에서 해당 조직으로의 포크를 허용하는지 확인합니다.
* 포크의 `Settings → General → Features → Issues`를 활성화합니다.

[CI](../.github/workflows/ci.yml)와 [CodeQL](../.github/workflows/codeql.yml)은 push·PR로 실행되며,
CodeQL에는 주간 일정도 있습니다. 파일이 복사돼도 실행되지 않도록 저장소에서 Actions를 차단합니다.
단순히 수강자가 실행 버튼을 누르지 않는다는 약속만으로 자동 실행을 막지는 못합니다.
이미 실행 중인 작업이 있다면 관리자가 중단하고 원인을 확인합니다.

생성 시점의 자동 실행 차단을 보장하지 못하면 포크 생성을 보류합니다.
생성 후에도 설정을 확인하지 못하면 코드 push·PR 준비·업로드를 보류합니다.
PAT 승인이나 Code Security 이용이 불가능하면 결과를 파일로 읽는 대체 실습으로 진행합니다.
조직의 통제를 풀거나 더 넓은 토큰으로 우회하지 않습니다.

### 검수용 Issue·PR 준비

포크가 만들어진 뒤 각 포크에 강사가 정렬 기능 등의 Issue와 열린 PR을 준비합니다.
Actions가 차단된 상태에서 준비하며, 이 작업을 코딩 에이전트에 맡기지 않습니다.
기준 저장소에 미리 준비한 검수 브랜치가 포크에 포함됐는지 확인합니다.
main은 SARIF 분석 커밋으로 유지하고 검수용 변경은 별도 브랜치에 둡니다.
PR의 base와 head 저장소는 모두 해당 수강자 포크로 선택합니다.
기준 저장소로 보내는 교차 저장소 PR과 혼동하지 않습니다.

예시 완료 조건은 다음과 같습니다.

* 최신순·오래된순 선택
* 상태·기간 검색과 정렬의 동시 적용
* 최초 조회와 초기화 시 최신순(작성일 내림차순) 적용
* 기존 전체·상태·기간 조회와 오류 처리 유지

PR 본문은 [저장소 PR 템플릿](../.github/PULL_REQUEST_TEMPLATE)을 사용합니다.
기존 검증 자료에는 실제 실행 저장소, 대상 커밋, 명령, 결과, 시각을 기재합니다.
다른 저장소의 CI 성공을 조직 저장소의 Checks 성공으로 적지 않습니다.
같은 변경을 검증한 자료가 없다면 미검증으로 표시합니다.

Issue·PR·리뷰·Actions 실행 기록·보안 경고 이력은 포크로 복제되지 않습니다.
강사는 필요한 새 Issue·PR 링크를 제공하며, 원본의 경고 번호·Fixed·Dismissed 이력까지 이전된다고
설명하지 않습니다.

</details>

## [준비 실습] 조직 기준 저장소 포크

1. EMU 계정으로 강사가 제공한 **기업 내부 기준 저장소**를 엽니다.
2. 관리자로부터 포크 생성 시점의 자동 실행 차단이 보장됐는지 확인받습니다.
3. `Fork → Create a new fork`를 선택합니다.
4. `Owner`는 강사가 허용한 **기업 내부 조직**으로 정합니다.
   개인 계정이 아니라 조직 소유 포크를 사용합니다.
5. 이름은 `inquiry-training-본인식별자` 등 강사가 정한 개인별 규칙에 맞춥니다.
6. 검수 브랜치도 필요하므로 `Copy the main branch only`를 해제합니다.
   해당 선택이 없다면 강사와 검수 브랜치의 복사 여부를 확인합니다.
7. 포크를 만든 뒤 주소와 상단의 upstream 표시를 확인합니다.
8. 강사와 Actions 차단, default setup 비활성화, Code Security 활성화,
   Write 이상 권한, Issues 활성화를 확인합니다.

같은 조직 내 포크도 정책에 따라 제한될 수 있습니다.
Owner를 선택할 수 없거나 생성이 거절되면 강사에게 알리고 임의의 개인 계정이나 외부 조직으로 우회하지 않습니다.
포크의 main이 분석 SHA와 다른 경우 동기화·병합으로 고치지 말고 기준 저장소를 강사에게 확인받습니다.

다음 명령은 macOS·Linux 또는 Windows WSL의 Bash에서 실행합니다.
Git, GitHub CLI(`gh`), Python 3가 설치돼 있어야 합니다.
clone은 조직이 허용한 Git 인증 방식으로 진행합니다.
뒤에서 만드는 Code scanning 전용 PAT는 코드 clone·push용 토큰이 아닙니다.
모든 예시의 조직·저장소·SHA·경로는 강사가 제공한 실제 값으로 바꿉니다.

```bash
git clone https://github.com/ORG/MY_FORK.git inquiry-wo-runner
cd inquiry-wo-runner
git switch main
git remote -v
git rev-parse HEAD
git ls-remote origin refs/heads/main
git branch --remotes
```

origin이 기준 저장소가 아닌 **본인 포크**이고 로컬·원격 main의 SHA가 분석 SHA와 일치해야 합니다.
검수 브랜치도 원격 브랜치 목록에 있는지 확인합니다.
GitHub에서 기본 브랜치도 main인지 확인합니다.
이력을 새로 만들거나 squash한 다른 커밋에 과거 분석 결과를 붙이지 않습니다.
Actions 화면에서 새 실행이 없고, 설정에서도 차단 상태가 유지되는지 확인합니다.
이 준비 과정에서는 push하지 않습니다.
검수용 Issue·PR은 강사의 준비 후 본인 포크의 링크를 받습니다.

SARIF는 강사가 제공한 배포 위치에서 받습니다. SHA-256 체크섬을 대조하고,
토큰이나 업로드 요청 파일과 함께 커밋하지 않도록 저장소 밖의 개인 작업 폴더에 둡니다.

## PAT 생성과 취급

<details>
<summary>개인별 fine-grained PAT 만드는 방법 펼치기</summary>

PAT는 본인 계정으로 API를 호출하는 인증 수단입니다.
저장소에 없던 권한을 새로 주지 않으며, 본인의 권한과 토큰에 허용된 권한 범위 안에서만 동작합니다.
공개 원본 계정이 아니라 실습 조직에 접근할 수 있는 **본인 EMU 계정**에서 만듭니다.

1. GitHub 프로필 메뉴에서 `Settings`를 엽니다.
2. `Developer settings → Personal access tokens → Fine-grained tokens`로 이동합니다.
3. `Generate new token`을 선택합니다.
4. `Token name`은 `handson-sarif-upload` 등 용도를 알 수 있게 정합니다.
5. `Expiration`은 실습을 마칠 수 있는 짧은 기간으로 설정합니다.
   조직의 최대 유효기간 정책을 따르고 무기한으로 만들지 않습니다.
6. `Resource owner`에 **실습 조직**을 선택합니다.
   조직이 보이지 않으면 계정·조직 가입·PAT 허용 정책을 관리자에게 확인합니다.
7. `Repository access → Only select repositories`에서 **본인의 포크 하나만** 선택합니다.
   기준 저장소를 선택하지 않습니다.
8. `Repository permissions`에서 `Code scanning alerts`를 `Read and write`로 설정합니다.
   기본으로 포함되는 `Metadata: Read-only` 외에 Contents·Actions·Administration 쓰기 권한은
   이 업로드에 필요하지 않습니다.
9. 조직에서 승인 사유를 요구하면 실습 저장소에 기존 CodeQL SARIF를 등록하려는 목적임을 적습니다.
10. `Generate token`을 선택하고 토큰을 조직이 허용한 안전한 장소에 보관합니다.
    토큰 값은 생성 직후에만 표시되므로 분실하면 재발급합니다.
11. `Pending`이면 조직의 승인 담당자에게 요청합니다.
    승인 전에는 비공개 실습 저장소에 업로드할 수 없습니다.
12. 실습이 끝나면 같은 목록에서 토큰을 삭제·폐기합니다.

토큰은 비밀번호처럼 취급합니다.
채팅·Copilot 프롬프트·이슈·PR·코드·스크린샷·공유 터미널 기록에 넣지 않습니다.
아래 업로드 예시는 숨김 입력으로 토큰을 받아 임시 환경변수로만 사용합니다.
화면 녹화·터미널 추적을 끄고 개인 PC에서 진행하며 `set -x`나 `gh --verbose`를 사용하지 않습니다.
노출했다면 파일만 지우지 말고 즉시 토큰을 폐기한 뒤 강사·관리자에게 알립니다.

PAT 사용이 금지되거나 승인을 받지 못하면 실습을 멈추고 파일 기반 해석으로 대체합니다.
classic PAT나 다른 사람의 토큰으로 우회하지 않습니다.
메뉴 이름은 GitHub UI 버전에 따라 다를 수 있습니다.

</details>

## [실습 1] 프로젝트 이해하기 (15분)

Copilot Chat에서 조직 저장소와 분석 SHA를 명시합니다.
원본 문서에 있는 Issue·PR·배포·보안 기록은 참고자료이며 본인 저장소의 기록과 구분합니다.

```text
현재 실습 대상은 조직/저장소, 기준 커밋은 분석 SHA야.
이 프로젝트의 사용자, 해결하려는 문제, 주요 기능을 설명해줘.
상태·기간 검색과 기간 오류 처리의 코드·테스트 근거를 알려줘.
실제 구현, 문서의 설명, 확인하지 못한 사항을 구분해줘.
코드 수정, 테스트 실행, 이슈 등록, 에이전트 작업 시작은 하지 마.
```

완료 기준은 현재 기능 세 가지와 확인되지 않은 사항 한 가지를 자신의 말로 설명하는 것입니다.
답변의 파일 링크를 열어 실제 코드와 대조합니다.

## [실습 2] 기능 이슈 초안·검토·등록 (20분)

제목 검색 등 기존 구현과 겹치지 않는 작은 요청을 작성합니다.
이번에는 Copilot에게 할당하지 않고 사람 담당자와 후속 확인 기준만 정합니다.

```text
조직/저장소에 문의 제목 검색을 요청하고 싶어.
현재 코드와 열린 이슈·PR을 확인해 중복을 피하고 이슈 초안을 작성해줘.
아직 등록하거나 구현하거나 Copilot에게 할당하지 마.

1. 제목 일부로 검색하고 기존 상태·기간 조건과 함께 적용한다.
2. 빈 결과를 안내한다.
3. 초기화하면 검색어도 지우고 전체 조회로 돌아간다.
4. 기간 오류 처리와 기존 조회를 유지한다.
5. 제목 검색과 기존 기간 조건의 빈 결과 UI 시나리오를 각각 검증한다.

가상 데이터만 사용하고 서버·DB·배포 기능은 추가하지 마.
기존 기능이면 새 요청을 억지로 만들지 말고 중복 근거를 알려줘.
```

사람이 범위와 완료 조건을 확인한 뒤 등록합니다.

```text
검토한 초안으로 조직/저장소에 이슈를 등록하고 링크를 알려줘.
등록 기능이 없으면 제출할 제목과 본문만 알려줘.
Copilot에게 할당하거나 구현·workflow를 실행하지 마.
```

GitHub에서 직접 등록해도 됩니다.
등록된 이슈와 강사가 지정한 사람 담당자를 확인합니다.
완료 기준은 검토한 이슈의 실제 등록이며, 구현이나 작업 시작은 완료로 기록하지 않습니다.

## [실습 3] 준비된 PR 검수와 보완 요청 (25분)

강사가 제공한 본인 조직 저장소의 PR을 검토합니다.
PR의 base와 head가 모두 본인 포크인지 확인합니다.
기준 저장소에 준비된 PR이 있더라도 포크에 복사된 것으로 간주하지 않습니다.
Copilot을 자동 PR 리뷰어로 요청하지 말고 Chat에 링크를 지정해 질문합니다.
기존 검증 자료가 있더라도 저장소·커밋이 다르면 적용 가능한 근거인지 따로 판단합니다.

```text
조직/저장소의 PR 링크를 연결된 이슈의 완료 조건과 대조해줘.
조건별로 충족·미충족·확인 불가를 구분하고 코드·테스트 근거를 제시해줘.
정렬 예시라면 최초 조회와 초기화가 최신순(작성일 내림차순)인지 확인해줘.
선택값뿐 아니라 목록 순서를 확인하는 테스트인지도 구분해줘.
기존 회귀 테스트를 새 테스트로 대체하지 않았는지 확인해줘.
구현 결함, 테스트 누락, 실제 실행 근거 부족을 구분해줘.
외부 검증 자료의 저장소·커밋·명령·결과를 대조하고,
현재 조직 저장소에서 CI가 실행됐다고 표현하지 마.
테스트·workflow·에이전트 작업을 시작하거나 파일을 수정하지 마.
```

누락이 있으면 재현 절차, 기대·실제 결과, 필요한 회귀 테스트를 확인한 뒤
사람 담당자에게 보완 댓글을 남깁니다.
미실행인데 실제 결과를 관찰한 것처럼 쓰지 말고, 코드 검토에 근거한 예상과 실행 확인을 구분합니다.
에이전트를 호출하는 멘션이나 자동 구현 지시는 넣지 않습니다.
원래 요구사항의 누락은 같은 PR에서, 새로운 개선은 별도 이슈 초안으로 분리합니다.
새 이슈는 사람이 검토한 뒤 등록하고 사람 담당자를 지정합니다.

완료 기준은 조건별 판정과 근거입니다.
Checks가 없다는 이유만으로 구현 실패라고 단정하지 않으며, 테스트 코드만 보고 통과했다고 하지 않습니다.

## [실습 4] 기존 CodeQL 결과를 내 저장소에 등록 (25분)

### 업로드 전 확인

* [ ] Actions 차단과 CodeQL default setup 비활성화를 확인했습니다.
* [ ] Code Security 활성화와 본인의 Write 이상 권한을 확인했습니다.
* [ ] PAT가 본인 조직 저장소에만 적용되고, 필요한 조직 승인을 받았습니다.
* [ ] 업로드 대상이 기준 저장소가 아니라 본인 포크인지 확인했습니다.
* [ ] 로컬 HEAD와 원격 main이 강사가 제공한 분석 SHA와 같습니다.
* [ ] SARIF 체크섬·출처·분석 시각·경로 매핑 정보를 확인했습니다.

SARIF를 문서 파일로 커밋하는 것만으로 Security 화면에 등록되지는 않습니다.
아래는 개인 PC에서 REST API로 등록하는 예시입니다.
다운로드한 SARIF는 수정하지 않으며, GitHub Actions나 CodeQL CLI 분석 명령을 실행하지 않습니다.

### API로 등록하고 처리 상태 확인

다음 블록 전체를 Bash에서 실행합니다.
`TARGET_REPO`, `ANALYZED_SHA`, `SARIF_FILE`을 실제 값으로 바꿉니다.
`TARGET_REPO`에는 기준 저장소가 아니라 본인 포크의 `조직/저장소`를 넣습니다.
`CHECKOUT_URI`는 강사가 제공한 값이 있을 때만 채우며, 임의의 본인 PC 경로를 넣지 않습니다.
PAT 값은 명령에 적지 말고 실행 중 숨김 입력 요청이 나오면 입력합니다.

```bash
(
  set +x
  set -euo pipefail
  unset GH_DEBUG
  TARGET_REPO='ORG/MY_FORK'
  ANALYZED_SHA='REPLACE_WITH_FULL_ANALYZED_COMMIT_SHA'
  SARIF_FILE='/absolute/path/to/results.sarif'
  CHECKOUT_URI=''
  payload=$(mktemp)
  trap 'unset GH_TOKEN; rm -f "$payload"' EXIT

  python3 - "$SARIF_FILE" "$ANALYZED_SHA" "$CHECKOUT_URI" > "$payload" <<'PY'
import base64
import gzip
import json
from pathlib import Path
import re
import sys

sarif_path, commit_sha, checkout_uri = sys.argv[1:]
if not re.fullmatch(r"[0-9a-fA-F]{40}", commit_sha):
    raise SystemExit("Set the full analyzed commit SHA before uploading.")
raw = Path(sarif_path).read_bytes()
document = json.loads(raw)
if document.get("version") != "2.1.0" or not document.get("runs"):
    raise SystemExit("Expected a SARIF 2.1.0 file with analysis runs.")
request = {
    "commit_sha": commit_sha,
    "ref": "refs/heads/main",
    "sarif": base64.b64encode(gzip.compress(raw)).decode("ascii"),
    "tool_name": "CodeQL",
}
if checkout_uri:
    request["checkout_uri"] = checkout_uri
json.dump(request, sys.stdout)
PY

  read -r -s -p 'PAT: ' GH_TOKEN
  printf '\n'
  test -n "$GH_TOKEN"
  export GH_TOKEN
  upload_id=$(gh api --hostname github.com --method POST \
    "repos/$TARGET_REPO/code-scanning/sarifs" \
    -H 'Accept: application/vnd.github+json' \
    --input "$payload" --jq '.id')
  printf 'SARIF upload ID: %s\n' "$upload_id"

  for attempt in {1..12}; do
    status=$(gh api --hostname github.com --method GET \
      "repos/$TARGET_REPO/code-scanning/sarifs/$upload_id")
    state=$(printf '%s' "$status" | python3 -c \
      'import json, sys; print(json.load(sys.stdin)["processing_status"])')
    printf 'Processing: %s\n' "$state"
    case "$state" in
      complete)
        printf 'View: https://github.com/%s/security/code-scanning\n' "$TARGET_REPO"
        exit 0
        ;;
      pending) sleep 5 ;;
      *)
        printf '%s\n' "$status" >&2
        exit 1
        ;;
    esac
  done
  printf 'Still pending. Keep the upload ID and check with your instructor.\n' >&2
  exit 1
)
```

이 블록은 종료할 때 임시 파일과 토큰 환경변수를 제거합니다.
API의 접수 성공(HTTP 202)은 분석 결과의 처리 완료가 아닙니다.
`Processing: complete`와 Security 화면의 표시까지 확인합니다.
처리가 계속 대기 중이면 같은 파일을 반복 업로드하지 말고 업로드 ID를 강사에게 전달합니다.

### 결과 확인과 해석

1. 본인 저장소의 `Security → Code scanning`을 엽니다.
2. main과 분석 SHA를 확인하고, 결과의 규칙·파일·행이 제공된 자료와 맞는지 대조합니다.
3. 결과의 업로드 시각과 원본의 분석 시각을 구분해 기록합니다.
4. 경고가 0건이면 분석 등록 내역과 처리 상태를 확인합니다.
   빈 경고 목록만 보고 업로드 성공이나 전체 안전을 단정하지 않습니다.
5. Actions에서 업로드 때문에 새 workflow 실행이 생기지 않았는지 확인합니다.

```text
조직/저장소에 가져온 CodeQL 결과를 쉽게 설명해줘.
원본 분석 SHA·시각과 조직 저장소의 업로드 시각을 구분해줘.
규칙, 대상 코드, 탐지 사실, 실제 영향, 확인하지 못한 사항을 나눠줘.
이 결과는 기존 SARIF를 등록한 것이며 여기서 CodeQL을 새로 실행한 것이 아니야.
원본 경고 번호·댓글·Fixed·Dismissed 이력이 그대로 복제됐다고 설명하지 마.
접근하지 못한 결과는 확인 불가로 표시해줘.
코드 수정, 경고 종료, 검사·에이전트 실행은 하지 마.
```

완료 기준은 처리 완료와 해당 커밋의 결과를 확인하는 것입니다.
새 코드의 보안 검사나 취약점 수정 완료를 뜻하지 않습니다.
CodeQL 결과로 Dependabot·Secret scanning의 경고나 이력이 복사되지는 않습니다.
[기존 보안 보고서](security-report.md)는 과거 참고자료로만 사용합니다.

## [실습 5] 보안 후속 요청과 결과 기록 (15분)

가져온 결과 중 조사할 대상이 있다면 초안을 작성합니다.
현재 코드에서 결과가 없으면 그 사실과 분석 범위를 정리하고, 별도 과거 사례는 참고자료로만 토론합니다.

```text
확인한 결과 한 건을 기준으로 조사 또는 조치 이슈 초안을 작성해줘.
탐지 사실, 실제 영향 판단, 확인하지 못한 사항을 분리해줘.
가져온 분석 결과의 저장소·SHA·시각·현재 조직 저장소 링크를 포함해줘.
수정 필요성이 불명확하면 먼저 조사할 일을 적어줘.
수정이 필요하면 코드 변경, 회귀 테스트, 이후 재분석의 완료 조건을 제안해줘.
이번 수업에서는 구현·재분석하지 않으므로 후속 사람 담당자와 미검증 항목을 명시해줘.
아직 등록하거나 Copilot에게 할당하거나 경고를 종료하지 마.
```

사람이 검토한 후 실습 2와 같은 방식으로 이슈를 등록하고 사람 담당자를 정합니다.
CodeQL은 코드 문제, Dependabot은 의존성 문제를 다룹니다. 조치 이슈의 도구명을 맞춥니다.
의존성 변경을 논의한다면 선언·잠금 파일 버전과 조직이 승인한 다운로드 출처를 확인 기준에 포함합니다.
공식 npm이라는 이유만으로 조직 승인 여부를 단정하지 않습니다.
Secret scanning의 `unknown`은 무효 증거가 아니며, 실제 토큰은 회수·교체가 필요합니다.
이번 실습의 PAT를 시험 데이터로 저장소에 넣지 않습니다.

수업 마지막에 다음을 실습 이슈 또는 강사가 지정한 제출 위치에 남깁니다.

* 조직 저장소와 생성한 기능·조사·조치 이슈 링크
* PR 완료 조건별 판정과 실제로 확인한 근거
* SARIF 출처·체크섬·원본 분석 SHA·시각·업로드 ID와 처리 결과
* CodeQL 재실행·구현·테스트·보안 경고 해소는 수행하지 않았다는 구분
* 미검증 항목과 후속 사람 담당자, PAT 폐기 확인

SARIF 등록 성공, 취약점 수정, 재검사 성공, 경고 해소, 병합·배포는 서로 다른 결과입니다.
이슈 등록이나 수정 후보 PR만으로 해결을 선언하지 않습니다.

## 문제가 생겼을 때

### 포크 생성·Issues·검수 브랜치가 보이지 않음

포크 허용 정책, 대상 조직의 저장소 생성 권한, 개인별 이름 중복을 강사와 확인합니다.
Issues는 포크에서 별도로 활성화해야 할 수 있습니다.
검수 브랜치를 복사하지 않았다면 강사가 Actions 차단 상태에서 준비하며,
수강자는 기준 main을 동기화하거나 에이전트에 복원을 요청하지 않습니다.
설정 권한이 없으면 관리자에게 요청하고 완료 전까지 해당 활동을 보류합니다.

### PAT 승인 대기 또는 HTTP 401·403·404

토큰 만료·폐기 여부, Resource owner, 선택 저장소, Code scanning alerts 쓰기 권한,
조직 승인·접근 정책과 Code Security 활성화를 확인합니다.
404는 비공개 저장소의 접근 권한 부족일 수도 있습니다.
원시 토큰이나 인증 헤더를 공유하지 말고 HTTP 상태와 민감 값 없는 오류 설명만 강사에게 전달합니다.
관리자 확인이 필요하면 업로드를 보류하고 파일로 해석합니다.

### Default setup 때문에 업로드 거절

관리자에게 CodeQL default setup 상태와 조직 보안 정책을 확인받습니다.
수업에서는 default setup이나 분석 workflow를 켜서 해결하지 않습니다.
외부 결과 업로드가 허용되지 않으면 파일 해석으로 대체하고 업로드 미완료로 기록합니다.

### 파일·커밋·코드 위치 불일치 또는 처리 실패

SARIF 체크섬과 버전, 분석 SHA, 대상 main, `checkout_uri`를 강사의 자료와 대조합니다.
과거 결과를 최신 커밋의 검사처럼 보이게 하려고 SHA·경로·결과를 임의로 바꾸지 않습니다.
반환된 오류와 업로드 ID를 강사에게 전달하고, 수정된 배포 자료를 받습니다.
처리가 pending인 것과 실패한 것을 구분하고 완료 전까지 확인 대기로 기록합니다.

### Code scanning을 사용할 수 없음

SARIF와 요약 보고서를 로컬에서 읽고 같은 분석 질문·이슈 작성 활동을 진행합니다.
제출물에 파일 기반 대체 실습임을 적고 Security 화면 등록이나 실제 경고 해소를 완료로 표시하지 않습니다.

### 예상하지 못한 Actions 실행

실습을 멈추고 강사·관리자에게 알립니다.
관리자가 진행 중인 실행과 Actions·default setup·자동 리뷰 설정을 확인합니다.
실행 취소 전 사용량은 이미 발생했을 수 있으므로 runner 미사용으로 기록하지 않습니다.

## 공식 문서

* [EMU와 기업 내부 포크 정책](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/reference/forks)
* [Fine-grained PAT 생성과 관리](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
* [SARIF 업로드와 Code Security 요구사항](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
* [SARIF 등록·처리 상태 확인 API](https://docs.github.com/en/rest/code-scanning/code-scanning)
* [Default setup의 외부 CodeQL 결과 업로드 제한](https://docs.github.com/en/code-security/reference/code-scanning/sarif-files/troubleshoot-sarif-uploads/default-setup-enabled)
* [저장소의 Actions 사용 설정](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)
* [GitHub Actions 과금](https://docs.github.com/en/billing/concepts/product-billing/github-actions)

이 가이드와 요청 예시는 Copilot을 활용해 작성했습니다.
실습 결과는 실제 코드, 업로드 처리 상태, GitHub 화면을 사람이 대조해 확인합니다.
