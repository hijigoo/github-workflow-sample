# 웹 기반 GHEC Copilot 핸즈온

## 실습 목표와 범위

GitHub Enterprise Cloud(GHEC)의 Enterprise Managed Users(EMU) 조직 저장소에서
웹 Copilot에 자연어로 질문하고, 기능 요청·구현 결과·PR·보안 경고를 확인합니다.
대상은 PM과 업무 담당자이며, 직접 명령을 입력하기보다 요청의 완료 조건과 결과의 근거를 확인합니다.

모든 실습은 github.com에서 진행합니다.
VS Code, 로컬 clone·터미널·테스트와 Codespaces는 사용하지 않습니다.
슬라이드의 가상 서비스 '고객 문의 포털'을 이 저장소의 문의 조회 화면에 대응하며,
가상 저장소·Issue·PR 번호는 본인의 실습 저장소 링크로 바꿉니다.

## 웹 Copilot의 실행 환경

웹에서 질문하는 것과 에이전트에게 코드 변경을 맡기는 것은 다릅니다.
현재 제공되는 Copilot 환경은 계정의 플랜과 기업·조직 정책에 따라 다릅니다.

* 설명·초안·검수는 웹 Copilot 대화에서 진행합니다.
* 코드 구현·테스트·PR 보완은 조직에서 허용한 **Cloud 샌드박스** 세션에서만 진행합니다.
  실행 환경 선택에서 `Cloud`를 확인하고, `Actions`나 `Remote`는 선택하지 않습니다.
* Cloud를 사용할 수 없거나 실행 환경을 확인할 수 없으면 코드 작업은 시작하지 않습니다.
  질문·Issue 초안·준비된 PR 검수로 진행하고 구현은 대기로 남깁니다.

> [!IMPORTANT]
> Actions runner는 사용하지 않습니다. Cloud 샌드박스도 원격 실행·과금 대상일 수 있으며 무료를 뜻하지 않습니다.
> 저장소 Actions 비활성화만으로 Cloud 에이전트 실행까지 차단되는 것은 아닙니다.
> Cloud 사용 권한·비용은 별도로 승인받고, 요청 전 실행 환경을 확인합니다.

Issue의 Copilot 담당자 할당이나 새 `@copilot` 댓글은 별도 실행을 시작할 수 있으므로 사용하지 않습니다.
대신 실행 환경을 확인한 웹 세션에 Issue·PR 링크를 붙여 자연어로 요청합니다.
자동 PR 리뷰·Agent Merge·예약 자동화·GitHub Agentic Workflows도 사용하지 않습니다.
`Run workflow`, `Re-run jobs`, `Approve and run workflows`를 선택하지 않습니다.
CodeQL 재분석·병합·배포도 이번 실습 범위에서 제외합니다.

## 실습 순서

모든 실습자는 00번에서 본인 저장소·권한·실행 환경을 확인한 뒤 01~04번을 진행합니다.
별도 기준 저장소를 포크하는 단계는 없습니다.

| 실습 문서 | 웹에서 진행하는 방식 | 시간 |
|-----------|----------------------|------|
| [00. 실습을 위한 저장소 사전 준비](00-preparation.md) | 저장소·SARIF·권한·Cloud 환경 확인 | 10분 |
| [01. 프로젝트 이해 (세션 A)](01-project-understanding.md) | 저장소를 연결해 자연어로 질문 | 10분 |
| [02. 새 요구사항 요청 (세션 B)](02-feature-request.md) | Issue 작성, 승인된 Cloud 환경에서 구현 요청 | 10분 |
| [03. PR 검수와 보완 (세션 C)](03-pr-review.md) | PR 질문·댓글 게시·같은 PR 보완 요청 | 10분 |
| [04. 보안 경고 해석과 조치 (세션 D)](04-security.md) | 기존 경고 해석·조사 Issue·조건부 수정 요청 | 20분 |

## 자연어 요청과 결과 확인

저장소 화면의 Copilot 패널 또는 [웹 Copilot](https://github.com/copilot)을 엽니다.
계정에 Agents 화면이 제공된다면 조직에서 허용한 에이전트와 실행 환경을 선택합니다.
화면 이름·사용 가능한 도구는 계정에 따라 다르므로 특정 에이전트가 있다고 가정하지 않습니다.

각 질문의 `조직/저장소`, `Issue 링크`, `PR 링크`는 실제 값으로 바꿉니다.
선택 저장소와 브랜치를 확인하고, 다른 조직의 문맥을 섞지 않습니다.
코드 변경 전에는 Cloud 환경과 작업 브랜치를 다시 확인합니다.

Issue·댓글·PR 생성 도구가 없으면 Copilot에게 초안을 받고 GitHub 화면에서 직접 제출합니다.
코딩 에이전트로 작업을 넘겨 단순 게시 도구의 부재를 우회하지 않습니다.
답변의 “완료”가 아니라 실제 생성 링크·커밋·변경 파일·실행 기록을 확인합니다.
요청하지 않은 작업이 제안되면 승인하지 않습니다.

## 실습 결과 기록

실습 Issue 또는 지정된 제출 위치에 다음을 남깁니다. 별도 문서 파일은 필요하지 않습니다.

* 세션 A: 현재 기능·집계 기준·확인하지 못한 사항
* 세션 B: 기능 Issue 또는 중복 확인 결과, 구현 PR 또는 구현 대기 사유
* 세션 C: 검수 PR·조건별 판정·보완 댓글·수정 커밋 또는 검증 대기
* 세션 D: 경고 링크·분석 SHA·시각, 조사·조치 Issue, 수정 여부와 재분석 후속 담당자

Cloud에서 테스트했다면 실행 환경·명령·결과·대상 커밋을 PR에 기록합니다.
이는 GitHub Actions Checks나 CodeQL 분석 성공을 뜻하지 않습니다.
Issue 등록·코드 수정·테스트·경고 해소·병합·배포를 서로 구분합니다.
다른 저장소·커밋의 검사 결과를 현재 PR의 성공 근거로 쓰지 않습니다.

## 문제가 생겼을 때

* Cloud 환경이나 도구가 없으면 질문·초안·준비된 자료 검수만 진행하고 실행 제한을 기록합니다.
* 권한이 없으면 관리자에게 확인합니다. 토큰·인증 헤더·실제 개인정보를 대화에 넣지 않습니다.
* 보안 결과를 조회할 수 없으면 준비용 저장소의 SARIF를 GitHub 웹에서 열어 해석합니다.
  실제 Code scanning 조회와 파일 기반 해석을 구분합니다.
* 예상하지 못한 Actions 실행이 시작되면 실습을 멈추고 관리자에게 알려 중단합니다.
  취소 전 사용량이 발생했을 수 있으므로 runner 미사용으로 기록하지 않습니다.
* 코드 수정만으로 보안 경고를 Fixed 처리하지 않습니다. 재분석은 승인된 후속 환경의 담당자에게 남깁니다.

## 참고

* [GitHub 웹 Copilot의 대화·에이전트·실행 환경](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github)
* [Cloud 샌드박스와 Actions 환경 구분](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes)
* [SARIF 등록·처리 상태 확인 API](https://docs.github.com/en/rest/code-scanning/code-scanning)

이 가이드와 요청 예시는 Copilot을 활용해 작성했습니다.
실습 결과는 실제 코드, GitHub 기록, 검증 자료를 사람이 검토하여 확인합니다.
