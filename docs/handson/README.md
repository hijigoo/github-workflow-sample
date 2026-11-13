# 웹 기반 GHEC Copilot 핸즈온

## 실습 목표와 범위

GitHub Enterprise Cloud(GHEC)의 Enterprise Managed Users(EMU) 조직 저장소를 연결한 Copilot 세션에서 자연어로 요청하고, 기능 요청·구현 결과·PR·보안 경고를 확인합니다.
대상은 PM과 업무 담당자이며, 직접 명령을 입력하기보다 요청의 완료 조건과 결과의 근거를 확인합니다.

- 기본 실습은 github.com에서 진행하며, VS Code, 로컬 clone·터미널·테스트와 Codespaces는 사용하지 않습니다.
- 04번의 SARIF 등록 명령은 관심 있는 실습자만 선택해 실행하는 추가 실습이며, 기본 실습의 필수 조건이 아닙니다.
- 실습에 사용하는 '고객 문의 포털'은 이 저장소에 포함된 보안 이슈가 있는 샘플 코드이며, 이 샘플 코드를 기반으로 프로젝트 이해, 기능 개선과 테스트, PR 검수, 보안 이슈 분석을 진행합니다.

## 실습 환경

GitHub 우측 상단의 Copilot 아이콘을 클릭한 뒤 [New Session](https://github.com/copilot) 메뉴를 클릭합니다.
본인의 실습 저장소를 연결하고 자연어로 요청하며 진행합니다.

* Actions runner는 사용하지 않으며 workflow 실행·재실행, CodeQL 재분석 등 runner를 사용하는 작업은 요청하지 않습니다.
* 코드 구현·테스트는 조직이 승인한 `Cloud` 환경에서만 요청합니다. Cloud 사용 권한·비용을 확인하고 `Actions` 환경은 선택하지 않습니다.
* Issue를 Copilot에게 할당할 수도 있지만, 할당은 작업을 바로 시작할 수 있으므로 사전에 `Cloud` 실행 여부를 확인한 경우에만 진행합니다. 확인할 수 없으면 할당하지 않고 [New Session](https://github.com/copilot)에서 `Cloud`를 선택해 요청합니다.
* 자동 리뷰·자동화·병합·배포는 진행하지 않습니다. Cloud를 사용할 수 없으면 질문·초안·기존 자료 검수까지만 진행합니다.

## 실습 순서

00번에서 사전에 제공된 기업 내부 기준 저장소를 포크하고 본인 실습 저장소의 준비 상태를 확인합니다.

기준 저장소 이름은 `github-workflow-sample`, 실습자 포크 이름은 `github-workflow-<USER_ID>`로 지정합니다.
`<USER_ID>`는 본인의 GitHub 사용자 ID로 바꿉니다.

저장소 준비 후 01~04 단계별 권한·실행 환경을 확인하고 실습을 진행합니다.
세션 B에서 생성한 PR을 세션 C에서 검수하므로 별도 검수용 PR은 준비하지 않습니다.

| 실습 문서 | 실습 내용 | 시간 |
|-----------|----------------------|------|
| [00. 실습을 위한 저장소 사전 준비](00-preparation.md) | 내부 기준 저장소 포크, 실습 환경 점검 | 15분 |
| [01. 프로젝트 이해 (세션 A)](01-project-understanding.md) | 저장소에서 Copilot에게 자연어로 질의하며 코드 이해 | 10분 |
| [02. 새 요구사항 요청 (세션 B)](02-feature-request.md) | Issue 작성, 승인된 Cloud 환경에서 구현 요청 | 10분 |
| [03. PR 검수와 보완 (세션 C)](03-pr-review.md) | PR 질문·댓글 게시·같은 PR 보완 요청 | 10분 |
| [04. 보안 경고 해석과 조치 (세션 D)](04-security.md) | 보안 경고 해석 및 조사 Issue 등 조건부 수정 요청 | 15분 |

## 참고

### Copilot과 실행 환경

* [GitHub 웹 Copilot의 대화·에이전트·실행 환경](https://docs.github.com/en/copilot/concepts/copilot-surfaces/copilot-on-github)
* [GitHub 웹에서 Copilot 세션 시작·환경 선택·Issue 할당](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github)
* [Cloud 샌드박스와 Actions 환경 구분](https://docs.github.com/en/copilot/concepts/security-governance-and-network-settings/about-cloud-sandboxes)
* [조직·기업의 Cloud 사용 정책과 예산 관리](https://docs.github.com/en/copilot/how-tos/cloud-and-local-sandboxes/enabling-or-disabling-cloud-sandboxes-for-your-organization)
* [Cloud 샌드박스 사용량과 과금 기준](https://docs.github.com/en/billing/concepts/product-billing/cloud-and-local-sandboxes)

### 저장소 준비와 실행 차단

* [EMU·private·internal 저장소의 포크 정책과 권한](https://docs.github.com/en/enterprise-cloud@latest/pull-requests/reference/forks)
* [저장소 Actions 설정과 비활성화](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/enabling-features-for-your-repository/managing-github-actions-settings-for-a-repository)

### 보안 경고와 SARIF

* [Code scanning 경고 열람 권한과 결과 확인](https://docs.github.com/en/code-security/how-tos/manage-security-alerts/manage-code-scanning-alerts/assess-alerts)
* [기존 SARIF 업로드 요구사항과 등록 방법](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/integrate-with-existing-tools/upload-sarif-file)
* [SARIF 등록·처리 상태 확인 API](https://docs.github.com/en/rest/code-scanning/code-scanning)
