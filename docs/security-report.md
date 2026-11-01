# 보안 리포트와 원본 확인

**가상 서비스의 실제 GitHub 보안 기록을 읽는 공개 샘플입니다.**
2026-11-01에 확인한 상태를 민감 값 없이 남겼습니다. 실제 서비스의 보안점검 결과나 안전 보증이 아닙니다.
GitHub의 현재 원본 상태는 이후 변경될 수 있습니다.

## 세 가지 기능을 구분하기

| 순서 | 기능 | 발견하는 대상 | 이 저장소의 예 |
|---|---|---|---|
| 1 | Dependabot | 의존성의 알려진 취약점 | 관찰용 개발 의존성 `lodash@4.17.20` |
| 2 | Code scanning | 분석 도구가 발견한 코드 문제 | CodeQL의 SQL 조회문 구성 경고 |
| 3 | Secret scanning | 지원 패턴과 일치하는 중요정보 | 미발급 시험 문자열의 실제 탐지·차단 |

**Code scanning은 GitHub 기능·메뉴 이름이고, CodeQL은 여기에서 사용하는 분석 엔진입니다.**
다른 분석 도구의 결과를 Code scanning에 연결할 수도 있습니다.

## 공개 상태 요약

| 기능·원본 | 확인 상태 | 조치·남은 일 |
|---|---|---|
| Dependabot [#1](https://github.com/hijigoo/github-workflow-sample/security/dependabot/1), [#5](https://github.com/hijigoo/github-workflow-sample/security/dependabot/5) | Open · High | 관찰용 의존성의 미해결 경고 |
| Dependabot [#3](https://github.com/hijigoo/github-workflow-sample/security/dependabot/3), [#4](https://github.com/hijigoo/github-workflow-sample/security/dependabot/4) | Open · Medium | 관찰용 의존성의 미해결 경고 |
| Dependabot [#2](https://github.com/hijigoo/github-workflow-sample/security/dependabot/2) | Auto-dismissed | 자동 종료 상태만 확인; 사유를 임의로 추정하지 않음 |
| Code scanning [#1](https://github.com/hijigoo/github-workflow-sample/security/code-scanning/1) | Fixed | [조치 PR #8](https://github.com/hijigoo/github-workflow-sample/pull/8) → main 분석으로 확인 |
| Code scanning [#2](https://github.com/hijigoo/github-workflow-sample/security/code-scanning/2) | Dismissed · used in tests | 비배포 격리 예시라는 근거를 남김; 실제 서비스 문제를 고친 것과 다름 |
| Secret scanning [#1](https://github.com/hijigoo/github-workflow-sample/security/secret-scanning/1) | Resolved · used_in_tests | 미발급 시험 데이터 예외·종료; 실제 키 회수가 아님 |

[민감 값 없는 원본 메타데이터 요약](security/evidence/security-snapshot.json)도 함께 볼 수 있습니다.
경고 번호는 도구마다 별개입니다. 서로 다른 도구의 `#1`을 같은 경고로 대조하지 않습니다.

## Dependabot: 경고와 두 종류의 업데이트

원본의 **패키지·현재 버전·취약점·영향 범위·조치 버전·관련 PR**을 봅니다.
이 저장소의 미해결 경고는 `package-lock.json`의 관찰용 lodash 의존성입니다.
공개 문의 화면은 이 의존성을 불러오지 않으며, 오래된 버전 사용을 권장하는 예가 아닙니다.

[Dependabot이 실제로 작성한 PR #1](https://github.com/hijigoo/github-workflow-sample/pull/1)은 GitHub Actions 버전 업데이트입니다.
lodash 보안 조치를 완료한 PR이 아닙니다.

| 구분 | 목적·동작 |
|---|---|
| 취약점 경고 | 알려진 취약점과 저장소의 의존성 정보를 대조 |
| 보안 업데이트 | 취약점을 해결하는 변경 PR 생성; 생성·검증·병합은 별도 |
| 버전 업데이트 | 설정한 일정에 따라 최신 버전 변경 PR 생성; 취약점이 없어도 가능 |

[dependabot.yml](../.github/dependabot.yml)의 버전 확인 일정은 월요일 03:00, `Asia/Seoul`입니다.
이것이 모든 보안 경고가 주 1회만 탐지된다는 뜻은 아닙니다.

### 자동 업데이트가 막힌 실제 예

보안 업데이트 기능은 켜져 있지만, [npm 보안 업데이트 실행](https://github.com/hijigoo/github-workflow-sample/actions/runs/41293406345)은 실패했습니다.
로그의 표면 오류는 `private_source_authentication_failure`였고, 실제 proxy 원인은
`egress not allowlisted ms-feed-25.pkgs.visualstudio.com`이었습니다.

기존 공개 미러와 패키지 proxy를 설정 파일에 선언한 뒤에도 이 job에서 차단이 발생했습니다.
자동 보안 PR 생성·병합이 완료되었다고 표시하지 않습니다.
레지스트리 인증 키를 추가하거나 TLS 검증을 끄거나, 잠금 파일 URL·무결성 값을 임의로 고쳐 우회하지 않았습니다.

수행사와는 코드 조치뿐 아니라 **업데이트 job의 네트워크 접근·패키지 소스·재실행 결과**를 함께 확인하는 예입니다.

## Code scanning: 수정과 원본 Fixed 확인

원본 #1의 규칙은 `js/sql-injection`이고 대상은 `src/inquiries/repository.ts`입니다.
[실제 실패한 회귀 검증](https://github.com/hijigoo/github-workflow-sample/actions/runs/41296501776) 뒤,
[PR #8](https://github.com/hijigoo/github-workflow-sample/pull/8)에서 조회문과 검색값을 SQL 파라미터로 분리했습니다.

[main의 조치 확인 분석](https://github.com/hijigoo/github-workflow-sample/actions/runs/41297134848)은
커밋 `1fcb9808da565e9356d87446af73123a84842c36`, `refs/heads/main`을 분석했습니다.
원본 #1은 **2026-11-01 10:22:22 UTC에 Fixed**로 확인됐습니다.

분석의 원시 결과 수는 1건입니다. #2의 rate limiting 격리 예시 결과가 남아 있으나 상태는 Dismissed입니다.
**분석 결과 수, Open 경고 수, 실행 성공 여부를 같은 정보로 읽지 않습니다.**

이 코드는 실제 서비스 서버를 시작하지 않으며 QA·운영·Release 정적 파일에 포함되지 않습니다.
이 샘플에서는 쿼리 경계 회귀 테스트만 loopback에서 실행하고 데이터베이스를 연결하지 않습니다.
공개 서비스 전체를 분석한 결과라는 의미가 아닙니다.

## Secret scanning: 시험 데이터 차단과 종료

실제 키를 발급·노출하지 않았습니다.
[시험 문자열 증빙](security/evidence/never-issued-token.json)의 데이터는 미발급이며, GitHub `/user` 요청에서 HTTP 401을 확인했습니다.

Push protection이 해당 데이터의 push를 **실제로 차단**했습니다.
저장소 소유자 권한으로 **그 시험 문자열 하나에만 `used_in_tests` 예외**를 기록한 뒤 push했습니다.
보호 기능 전체를 끄지 않았습니다.

원본 #1은 `github_personal_access_token` 유형, `push_protection_bypassed: true`,
`Resolved / used_in_tests` 상태입니다. GitHub의 validity 값은 `unknown`입니다.
실제 provider 키를 회수하거나 교체했다는 증빙으로 사용하지 않습니다.

실제 중요정보가 발견된 경우에는 발급처에서 회수·교체하고 영향 범위와 사용처를 확인해야 합니다.
파일 삭제, PR 병합, CodeQL 재실행만으로 중요정보가 회수되지 않습니다.

## “고쳤는데, 왜 또 나오나요?”

먼저 **도구·원본 번호·대상 브랜치·분석 또는 보고서 시각·현재 상태**를 맞춥니다.

| 이 샘플의 대조 | 읽을 의미 |
|---|---|
| SQL #1은 09:16:25 UTC에 처음 생성, 이후 실제 조치와 main 분석으로 Fixed | 과거 보고서의 Open과 현재 Fixed는 시점이 다를 수 있음 |
| Fixed 원본의 마지막 탐지 커밋은 `7e37465…`, 조치 확인 분석은 `1fcb980…` | 마지막 발견 위치와 수정 확인 분석은 다를 수 있음 |
| 기능·release 브랜치는 과거 내용을 유지 | main과 다른 브랜치를 비교하면 결과가 다를 수 있음 |
| Code scanning은 Fixed지만 Dependabot Open 경고는 남음 | 다른 도구의 조치 완료로 대체할 수 없음 |

Dependabot에는 main 의존성 조치와 해당 원본 상태, Code scanning에는 같은 대상의 분석,
실제 중요정보에는 발급처 회수·교체를 대조합니다. 모두에게 CodeQL 재실행을 요구하지 않습니다.

## 어디에서 확인하고 설정하나요?

| 기능 | 결과 확인 | 이 샘플의 실행·설정 |
|---|---|---|
| Dependabot | `Security → Dependabot alerts` | [설정 파일](../.github/dependabot.yml), 보안 업데이트 enabled |
| Code scanning | `Security → Code scanning` | [CodeQL workflow](../.github/workflows/codeql.yml), [분석 범위](../.github/codeql/config.yml) |
| Secret scanning | `Security → Secret scanning` | Secret scanning·Push protection enabled |

소유자·관리자는 [저장소 보안 설정](https://github.com/hijigoo/github-workflow-sample/settings/security_analysis)에서 확인합니다.
설정 메뉴 표기는 GitHub UI 버전·계정·계약에 따라 달라질 수 있습니다.

이 샘플의 CodeQL은 설정한 push·PR·주간 일정 또는 수동 실행으로 동작합니다.
Secret scanning은 지원 패턴과 저장소 변경에 따라 탐지하며 Push protection은 push 시점에 검사합니다.
Secret scanning에 별도의 Actions 주간 job을 설정한 것은 아닙니다.
현재 validity checks와 non-provider patterns는 disabled입니다.

보안 원본·설정은 권한 있는 로그인 계정이 필요할 수 있습니다.
원본이 열리지 않으면 이 공개 요약을 사용하되, 실제 기업의 기능·권한·정책과 같다고 해석하지 않습니다.
**경고 0건도 점검하지 않은 범위까지 안전하다는 뜻은 아닙니다.**

이 문서와 가상 문안은 Copilot을 활용해 작성했습니다. 상태·분석·조치·배포 범위는 실제 기록과 대조했습니다.
