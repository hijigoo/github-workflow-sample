# GitHub Workflow Sample

이 저장소는 GitHub 워크플로를 처음 접하는 사람을 위한 **기록 열람 샘플**입니다.
가상의 고객 문의 기능이 요구사항에서 릴리스까지 이어지는 과정을 살펴보며,
각 단계에서 무엇을 확인하는지 익힐 수 있습니다. 코드를 수정하거나 PR을 만드는 실습은 필요하지 않습니다.

**처음이라면 [요구사항 Issue #2](https://github.com/hijigoo/github-workflow-sample/issues/2)부터 아래 순서로 열어 보세요.**

## 권장 열람 순서

| 순서 | 열어 볼 기록 | 확인할 내용 |
|---|---|---|
| 1. 요구사항 | [Issue #2](https://github.com/hijigoo/github-workflow-sample/issues/2) | 무엇을 바꾸려는지, 완료 조건은 무엇인지 |
| 2. 기능 개발과 리뷰 | [상태 검색 PR #3](https://github.com/hijigoo/github-workflow-sample/pull/3), [기간 검색 PR #4](https://github.com/hijigoo/github-workflow-sample/pull/4) | 변경 내용, 리뷰와 질문·답변, 검증 결과 |
| 3. 검증과 QA | [배포 준비 PR #5](https://github.com/hijigoo/github-workflow-sample/pull/5) | 포함할 변경, 테스트·QA, 미완성 후보를 배포하지 않은 이유 |
| 4. 운영 승인과 배포 | [릴리스 반영 PR #6](https://github.com/hijigoo/github-workflow-sample/pull/6) | 업무 확인, 운영 승인, 배포와 롤백 기준 |
| 5. 릴리스 | [v1.1.0 공지와 파일](https://github.com/hijigoo/github-workflow-sample/releases/tag/v1.1.0) | 최종 배포 버전과 변경 사항 |

흐름은 **요구사항 → 기능 개발·리뷰 → 검증·QA → 운영 승인·배포 → 릴리스**입니다.
각 기록의 자세한 열람 순서와 화면에서 볼 항목은 [GitHub 기록 열람 가이드](docs/reading-guide.md)에 정리했습니다.

## 함께 볼 자료

- [운영 샘플 화면](https://hijigoo.github.io/github-workflow-sample/) · [QA 샘플 화면](https://hijigoo.github.io/github-workflow-sample/qa/): 가상 문의 데이터를 조건별로 조회합니다.
- [요구사항 문서](docs/requirements/v1.1.0.md) · [릴리스 노트](docs/release-notes/v1.1.0.md): Issue와 Release의 세부 내용을 확인합니다.
- [보안 리포트](docs/security-report.md): 보안 경고의 상태·조치와 원본을 볼 수 없을 때의 대체 확인 경로를 안내합니다.
- 배포 파일·증빙·해시는 [기록 열람 가이드](docs/reading-guide.md)에서, 패키지 소스와 업데이트 실패는 [보안 리포트](docs/security-report.md)에서 확인할 수 있습니다.
- [Copilot 핸즈온 안내](docs/handson/README.md): 이 기록 열람 샘플과는 별도로, 승인된 환경에서 진행하는 실습입니다.

## 실제 기록과 샘플 데이터 구분하기

브랜치, Issue, PR, 리뷰, 자동 검증, 승인, 배포와 릴리스는 GitHub에 남은 **실제 기록**입니다.
문의 데이터와 PM·수행사 역할, 업무 판단은 설명을 위한 **가상 예시**입니다.
PR 노트는 GitHub Actions bot이 작성했으며, Copilot이 개발·리뷰한 기록을 뜻하지 않습니다.

보안 예시도 실제 서비스의 안전 보증은 아닙니다. `src/inquiries/repository.ts`는 CodeQL 분석을 보여 주기 위한
비배포 격리 코드이고, `lodash@4.17.20`은 경고를 관찰하는 개발 의존성입니다.
Secret scanning 예시는 미발급 시험 문자열이며 실제 키가 아닙니다.
보안 경고·설정과 Actions 보고서는 로그인 및 계정 권한에 따라 열리지 않을 수 있습니다.
기능별 제한과 상세 증빙은 [보안 리포트](docs/security-report.md)를 참고하세요.

이 샘플의 승인 기록은 실제 기업의 승인 정책을 대표하지 않습니다.
