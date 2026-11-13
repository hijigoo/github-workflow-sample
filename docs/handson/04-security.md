# 04. 보안 경고 해석과 조치 (세션 D)

본 실습에서는 기존 CodeQL 경고 또는 SARIF를 웹에서 읽고, 자연어로 보안 이슈의 의미와 영향·조치 방향을 확인합니다.
조사·조치 Issue를 작성하며, 필요한 경우에만 승인된 Cloud 환경에서 수정을 요청합니다.

## SARIF란

SARIF(Static Analysis Results Interchange Format)는 CodeQL 같은 정적 분석 도구의 결과를 담는 JSON 기반 표준 파일 형식입니다.
경고 종류, 설명과 문제가 발견된 파일·코드 위치 등이 포함됩니다.
GitHub에 업로드하면 기존 결과를 Code scanning 화면에서 조회·분석할 수 있으며, 업로드 자체가 새로운 보안 검사를 실행하는 것은 아닙니다.

<details>
<summary>추가 설명: CodeQL이란</summary>

CodeQL은 소스 코드를 분석해 SQL injection 같은 보안 문제를 찾는 정적 분석 엔진입니다.
CodeQL이 분석을 수행하고, SARIF는 그 결과를 담으며, GitHub의 Code scanning은 결과를 조회·관리하는 기능입니다.

이 저장소의 [CodeQL workflow](../../.github/workflows/codeql.yml)는 분석 실행과 결과 등록을 담당합니다.
[분석 설정](../../.github/codeql/config.yml)은 `web`·`src`를 대상으로 `security-extended` 쿼리를 사용합니다.
본 실습에서는 기존 분석 결과만 해석하며, 이 workflow를 실행하거나 새 분석을 요청하지 않습니다.

</details>

## 웹에서 기존 경고 해석하기

제공된 기준 저장소의 `Security and quality → Code scanning`에서 등록된 CodeQL 경고를 열거나,
커밋된 [SARIF](../../code-scanning.sarif)를 GitHub 웹에서 엽니다.
기준 저장소에는 준비 과정에서 기존 SARIF가 등록됩니다. 경고를 조회할 수 없으면 파일을 사용합니다.
본인 포크에 이미 경고가 등록돼 있으면 그 결과를 사용해도 됩니다.
GitHub 우측 상단의 Copilot 아이콘을 클릭한 뒤 [New Session](https://github.com/copilot) 메뉴를 클릭합니다.
본인의 실습 저장소를 연결하고 경고 또는 SARIF 파일 링크를 붙여 자연어로 요청합니다.
직접 조회 도구가 없으면 화면의 비민감 경고 설명을 제공합니다.
자료의 출처가 기준 저장소인지 본인 포크인지, 파일 기반 해석인지 구분합니다.
현재 결과는 과거 분석 SHA의 결과이며 새로 수행한 보안 검사가 아닙니다.

SARIF에는 다음 CodeQL 경고 두 건이 포함돼 있습니다.

* `js/sql-injection`: Database query built from user-controlled sources
* `js/missing-rate-limiting`: Missing rate limiting

원본의 경고 번호·Fixed·Dismissed 상태·종료 사유는 포크에 복제되지 않습니다.
경고가 보이지 않으면 분석 등록 내역·처리 상태·필터·권한을 확인합니다.
빈 목록만 보고 업로드 성공이나 전체 안전을 단정하지 않습니다.

```text
현재 연결된 실습 저장소의 code-scanning.sarif를 읽고, 경고 내용을 업무 담당자가 이해할 수 있게 설명해줘.
제공한 Code scanning 경고 링크가 있으면 함께 참고해줘.
js/sql-injection 또는 js/missing-rate-limiting 중 실제 경고 한 건을 기준으로,
어떤 입력이 어떤 코드로 전달돼 문제가 될 수 있는지 근거 링크와 함께 알려줘.
탐지 사실, 실제 서비스 영향, 확인하지 못한 사항과 권장 조치를 구분해줘.
규칙·파일·라인·상태·분석 커밋과 시각도 확인해줘.
직접 조회하지 못하면 그 사실을 알려주고 제공된 경고 내용이나 code-scanning.sarif에만 근거해줘.
새 분석·코드 수정·경고 종료는 하지 마.
```

답변을 경고 원문과 코드 링크에 대조합니다.
슬라이드의 `js/path-injection`은 가상 예시이며 이 저장소의 실제 경고가 아닙니다.
기존 보안 리포트나 다른 저장소의 기록을 본인 저장소의 현재 결과로 해석하지 않습니다.
Open은 악용 가능성 확정이 아니며, Fixed와 Dismissed도 같은 의미가 아닙니다.
교육용 격리 코드라는 이유만으로 오탐 처리하지 않습니다.

## 조사·조치 Issue 작성

```text
현재 연결된 실습 저장소의 code-scanning.sarif에서 확인한 경고 한 건을 조사·조치하는 Issue 초안을 작성해줘.
탐지된 사실, 영향 판단, 확인하지 못한 사항과 근거가 되는 경고 또는 파일 링크를 구분해줘.
수정 필요성을 판단할 조사 항목과, 수정한다면 필요한 변경·테스트 범위를 적어줘.
code-scanning.sarif에서 확인되는 분석 SHA와 시각을 기록하고, SARIF 업로드는 새 검사가 아님을 명시해줘.
CodeQL 재분석은 이번 실습에서 실행하지 않으므로 후속 확인 항목으로 남겨줘.
기존 Issue·PR과 중복되지 않게 하고 아직 등록하거나 구현하지 마.
```

초안을 경고 원문과 대조한 뒤 요청합니다.

```text
검토한 조사·조치 Issue를 조직/저장소에 등록하고 링크를 알려줘.
등록 도구가 없으면 GitHub에 직접 제출할 제목과 본문만 작성해줘.
Copilot 담당자 할당이나 경고 상태 변경, 수정 작업은 시작하지 마.
```

도구가 없으면 GitHub 웹에서 직접 등록합니다.
조사만 필요한 상황에서 구현이나 PR 생성을 억지로 요청하지 않습니다.

## 수정이 필요한 경우의 후속 요청

수정 필요성을 확인했고 Copilot 세션에서 승인된 **Cloud** 환경을 사용할 수 있을 때만 진행합니다.
사용할 수 없으면 Issue에 구현 대기와 후속 담당자를 기록합니다.

```text
조직/저장소의 조사·조치 Issue 링크에서 합의한 수정만 준비해줘.
승인된 Cloud 환경에서 수정과 회귀 테스트를 수행해줘.
현재 연결된 실습 저장소의 code-scanning.sarif를 참고하고 이 파일은 수정하지 마.
Actions·CodeQL 분석·자동 리뷰는 실행하지 마.
경고를 Fixed나 Dismissed로 처리하지 마.
아직 push나 PR 생성은 하지 말고 변경 내용과 실제 Cloud 테스트 결과,
CodeQL 재분석 등 아직 확인하지 못한 사항을 알려줘.
환경이나 권한을 확인할 수 없으면 중단해줘.
```

수정 결과를 PR로 남기려면
[02. 새 요구사항 요청 (세션 B)](02-feature-request.md)의 Actions 차단 확인·PR 생성 절차를 따릅니다.
코드 수정이나 Cloud 회귀 테스트, 기존 SARIF 재등록만으로 경고 해소를 선언하지 않습니다.
CodeQL 재분석과 Fixed 전환 확인은 승인된 후속 환경의 담당자에게 남깁니다.
Dependabot·Secret scanning은 이번 CodeQL SARIF의 대상이 아닙니다.

완료 기준은 경고 또는 웹 자료에 근거한 조사·조치 Issue와 후속 담당자 지정입니다.
수정 결과가 있어도 재분석 전에는 보안 검증 대기로 기록합니다.

## 선택 실습: 기존 SARIF 등록

기본 웹 실습을 마친 뒤, 관심 있는 실습자만 함께 복사된 SARIF를 본인 실습 저장소에 등록해 봅니다.
이 단계는 필수가 아니며 건너뛰어도 기본 실습을 완료할 수 있습니다. Actions runner나 새 CodeQL 분석은 사용하지 않습니다.

<details>
<summary>로컬 명령으로 SARIF 등록해 보기</summary>

### 실행 전 확인

* [Pioneer 가이드의 준비 도구와 CLI 인증](../pioneer-guide.md)을 참고해 Git·GitHub CLI와 OS별 도구를 준비합니다.
* EMU 계정으로 GitHub CLI에 로그인하고 본인 포크에 SARIF를 등록할 권한을 확인합니다.
* 관리자에게 포크의 Code Security 이용 권한·비용 승인을 확인받습니다. 이 명령은 Code Security를 활성화하지 않습니다.
* 포크의 Actions·CodeQL default setup이 비활성화돼 있고 자동 실행이 차단돼 있는지 확인합니다.
* 같은 결과가 이미 등록돼 있다면 중복 제출하지 않고 웹 결과만 확인합니다.

아래 `ORG`와 `<USER_ID>`를 본인의 실제 대상 조직·GitHub 사용자 ID로 바꿉니다.
따옴표는 유지하고 `<USER_ID>`의 꺾쇠까지 바꿉니다.
`--confirm-settings` 또는 `-ConfirmSettings`는 위 정책·권한·비용을 확인한 뒤에만 지정합니다.

macOS·Linux:

```bash
bash ./scripts/linux/fork.sh \
  --target 'ORG/github-workflow-<USER_ID>' \
  --sarif ./code-scanning.sarif \
  --upload-only \
  --confirm-settings
```

Windows:

```powershell
pwsh -NoProfile -File .\scripts\win\fork.ps1 `
  -TargetRepo 'ORG/github-workflow-<USER_ID>' `
  -SarifFile ./code-scanning.sarif `
  -UploadOnly `
  -ConfirmSettings
```

### 등록 결과 확인

업로드 전용 모드는 저장소 생성·설정 변경·Git push를 하지 않으며 로컬 대상 디렉터리 지정도 필요하지 않습니다.
실행 출력의 `SARIF processing complete:`를 확인한 뒤,
본인 포크의 `Security and quality → Code scanning`에서 규칙·파일·라인·등록 대상 커밋을 확인합니다.
API 접수만으로 등록 완료를 판단하지 않습니다.

실패하면 출력된 오류와 업로드 ID의 처리 상태를 확인하고, 확인 없이 중복 제출하지 않습니다.
권한·도구·설정이 준비되지 않았다면 명령 실행을 건너뛰고 기본 웹 실습 결과를 사용합니다.
Actions workflow로 대신 등록하거나, 기존 SARIF 등록을 새 검사·경고 해소로 기록하지 않습니다.
Dependabot·Secret scanning은 이 SARIF의 등록 대상이 아닙니다.

</details>

## 참고

### CodeQL과 SARIF

* [CodeQL의 역할과 분석 결과](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning)
* [SARIF 파일의 형식과 GitHub에서의 활용](https://docs.github.com/en/code-security/concepts/code-scanning/sarif-files)

### 이 실습의 경고 규칙

* [SQL injection 경고의 원인과 권장 조치](https://codeql.github.com/codeql-query-help/javascript/js-sql-injection/)
* [Rate limiting 누락 경고의 원인과 권장 조치](https://codeql.github.com/codeql-query-help/javascript/js-missing-rate-limiting/)

### 경고 조회와 선택 등록 실습

* [Code scanning 경고 조회·평가](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/assess-alerts)
* [기존 SARIF 파일 업로드](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)

## 실습 마무리

조사·조치 Issue에 결과와 후속 담당자를 남기고 [전체 실습 목차](README.md#실습-순서)로 돌아갑니다.
