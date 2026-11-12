# 00. 실습을 위한 저장소 사전 준비

[전체 목차와 공통 안내](README.md)의 웹 기반·Actions runner 미사용 범위를 따릅니다.
모든 실습자는 같은 절차를 사용하며 별도 기준 저장소를 포크하지 않습니다.

## 1. 웹 실습에 필요한 조건

EMU 계정으로 github.com에 로그인하고 관리자와 다음을 확인합니다.

* 본인 조직의 private/internal 실습 저장소와 Issue·PR 작성 권한
* Copilot Seat와 조직 저장소를 연결한 웹 대화 사용 권한
* 구현 실습을 위한 Cloud 샌드박스 사용 허용 여부·비용·실행 환경 선택 방법
* Code Security 이용 권한·비용과 Code scanning 열람 권한
* Actions·CodeQL default setup·자동 분석·자동 PR 리뷰·에이전트 자동 호출 차단

Cloud를 사용할 수 없으면 설명·Issue 작성·준비된 PR 검수까지만 진행합니다.
Actions 환경을 선택하거나 정책을 바꾸어 우회하지 않습니다.
실습 중 로컬 도구 설치·GitHub CLI 로그인·터미널 명령은 수행하지 않습니다.

## 2. 저장소와 SARIF 준비

GHEC EMU에서는 기업 외부 공개 저장소를 직접 포크할 수 없습니다.
본인 조직에 독립 실습 저장소를 준비하고, 원본의 분석 커밋을 main으로 유지합니다.
Code scanning 결과와 경고 처리 이력은 코드 복사나 포크로 상속되지 않습니다.

준비에 사용하는 자료는 다음과 같습니다.

* 원본: `hijigoo/github-workflow-sample`
* 대상 예시: `ORG/inquiry-training-YOUR_ID`
* 분석 SHA: `7e374656389ab24b71af8e409dbd434346278ace`
* 기존 분석 결과: [code-scanning.sarif](../../code-scanning.sarif)
* 준비 도구: [Bash 스크립트](../../scripts/linux/fork.sh), [PowerShell 스크립트](../../scripts/win/fork.ps1)

기존 스크립트는 독립 저장소 생성·분석 커밋 복사·SARIF 업로드·처리 확인을 수행합니다.
웹 화면에서 실행되는 기능은 아니며, 실습자가 PC 터미널에서 실행하는 과정은 이번 웹 실습에 포함하지 않습니다.
준비용 원본 저장소에 스크립트와 SARIF가 실제로 제공돼 있어야 합니다.

조직이 웹 에이전트에 저장소 생성·설정·SARIF 업로드 도구와 인증을 허용한 경우에만,
Cloud 환경을 확인한 뒤 아래와 같이 자연어로 준비를 요청할 수 있습니다.
이 권한이 없으면 저장소와 SARIF 등록은 실습 시작 전에 완료돼 있어야 합니다.
웹 대화만으로 해당 API 권한이나 업로드 기능이 생기는 것은 아닙니다.

```text
조직/실습저장소를 이번 실습용으로 준비하고 싶어.
준비용 원본 저장소의 fork 스크립트와 code-scanning.sarif를 확인해줘.
원본 분석 커밋은 7e374656389ab24b71af8e409dbd434346278ace야.
먼저 현재 실행 환경이 승인된 Cloud인지,
내 계정으로 대상 조직의 저장소 생성·안전 설정·SARIF 등록을 할 수 있는지 확인해줘.
지금은 실행하지 말고 대상 저장소, 수행할 작업, 권한과 비용 확인 사항을 알려줘.
Actions나 내 PC에서 실행하지 말고, 토큰 입력이나 조직 정책 해제를 요청하지 마.
필요한 도구나 권한이 없으면 준비 대기로 남겨줘.
```

대상 저장소 이름·권한·비용·자동 실행 차단을 확인한 뒤에만 후속 요청을 합니다.

```text
확인한 계획대로 본인 실습 저장소를 준비해줘.
승인된 Cloud 환경과 사용 가능한 인증·도구만 사용하고,
저장소 생성과 자동 실행 차단 후 지정한 분석 커밋을 main으로 복사해줘.
그 커밋의 기존 SARIF를 등록하고 처리 완료 여부와 저장소 링크를 알려줘.
동일한 준비 기능을 중복 실행하거나 기존 저장소를 덮어쓰지 마.
Actions·새 CodeQL 분석은 실행하지 말고 SARIF 내용과 분석 SHA는 바꾸지 마.
권한이나 도구가 부족하면 중단하고 실제 완료한 단계와 남은 작업을 알려줘.
```

SARIF 업로드가 막히면 실습 중 Actions workflow로 대신 등록하지 않습니다.
준비된 SARIF를 GitHub 웹에서 읽는 대체 실습으로 진행하고 업로드 미완료를 기록합니다.

## 3. GitHub 웹에서 준비 결과 확인

* 본인 조직의 실습 저장소 주소와 main의 전체 SHA를 확인합니다.
* `Settings → Actions → General`에서 Actions 비활성화를 확인합니다.
  설정을 볼 수 없으면 관리자에게 확인받습니다.
* CodeQL default setup·자동 분석·자동 PR 리뷰·에이전트 자동 호출이 꺼져 있는지 확인합니다.
* Issues가 활성화돼 있고 Issue·PR 댓글 작성이 가능한지 확인합니다.
* `Security and quality → Code scanning`에서 main의 경고 규칙·파일·라인을 확인합니다.
* 원본 분석 시각과 업로드 시각을 구분하고, API 접수가 아니라 SARIF 처리 완료 여부를 확인합니다.

SARIF에는 다음 CodeQL 경고 두 건이 포함돼 있습니다.

* `js/sql-injection`: Database query built from user-controlled sources
* `js/missing-rate-limiting`: Missing rate limiting

슬라이드의 `js/path-injection`은 가상 예시이며 이 저장소의 실제 경고가 아닙니다.
원본의 경고 번호·Fixed·Dismissed 상태·종료 사유는 복제되지 않습니다.
경고가 보이지 않으면 분석 등록 내역·처리 상태·필터·권한을 확인합니다.
빈 목록만 보고 업로드 성공이나 전체 안전을 단정하지 않습니다.
기존 보안 리포트나 다른 저장소의 기록을 본인 저장소의 현재 결과로 해석하지 않습니다.

## 4. 검수용 PR과 웹 세션 준비

본인 저장소에 기간 검색·0건 안내와 관련 테스트를 확인할 수 있는 PR을 준비합니다.
기존 검수 브랜치가 있다면 GitHub 웹의 `Compare & pull request`로 열 수 있습니다.
PR의 base와 head 저장소는 모두 본인 실습 저장소로 지정합니다.
main은 분석 SHA로 유지하고 구현·검수 변경은 별도 작업 브랜치에 둡니다.
검수 브랜치·PR이 없으면 Cloud 사용이 가능한 경우에만 별도 작업으로 준비합니다.
Cloud도 사용할 수 없으면 제공된 PR·변경 자료로 검수하고 대체 실습임을 기록합니다.

관련 Issue·완료 조건·검증 자료를 PR에 연결합니다.
[PR 템플릿](../../.github/PULL_REQUEST_TEMPLATE)에 따라 실행 환경·명령·결과·대상 커밋을 기록합니다.
검사가 실행되지 않았다면 미실행으로 표시하고, GitHub Checks 실행을 승인하지 않습니다.
슬라이드의 저장소·브랜치·PR 번호는 실제 링크로 바꿉니다.

본인 저장소에서 Copilot 패널 또는 [웹 Copilot](https://github.com/copilot)을 엽니다.
선택 저장소·브랜치를 확인하고, 사용할 에이전트와 도구가 조직 정책상 허용되는지 확인합니다.
실행 요청 전에는 환경이 `Cloud`인지 확인합니다.
Issue 담당자 할당이나 `@copilot` 댓글로 별도 작업을 시작하지 않습니다.

## 실습자 시작 확인

* [ ] EMU 계정으로 본인 조직의 실습 저장소를 열었습니다.
* [ ] 웹 Copilot의 선택 저장소·브랜치가 실습 대상을 가리킵니다.
* [ ] Actions·CodeQL default setup·자동 호출이 차단돼 있습니다.
* [ ] Cloud 사용 가능 여부와 비용을 확인했고, 불가능할 때의 대체 자료를 확보했습니다.
* [ ] 검수 PR·완료 조건·검증 자료와 Code scanning 결과 또는 웹 열람용 SARIF를 확인했습니다.
* [ ] 실제 토큰·개인정보를 프롬프트에 넣지 않습니다.

## 다음 단계

[01. 프로젝트 이해 (세션 A)](01-project-understanding.md)로 이동합니다.
