<!-- sample-note:security-fix -->
## Code scanning 조치 기록

관련 원본 경고: {{alert_url}}

격리된 `src/inquiries/repository.ts` 예시의 조회문에 쿼리 파라미터를 적용합니다.
이 코드는 공개 정적 사이트에 포함되지 않습니다.

PR 병합 이후 **동일 대상의 최신 CodeQL 분석과 원본 경고 상태**를 확인합니다.
분석 작업이 초록색인 것과 경고가 Fixed인 것은 별개의 정보입니다.

이 PR은 교육용 격리 예시의 실제 코드 변경입니다. 실제 서비스의 보안 완료 증빙을 뜻하지 않습니다.
