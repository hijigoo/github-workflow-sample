import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';

const moduleUrl = new URL('../web/query.mjs', import.meta.url);
const inquiries = [
  { id: 'INQ-001', status: 'processing', createdAt: '2026-10-05', title: '문의 조회 화면 개선' },
  { id: 'INQ-002', status: 'done', createdAt: '2026-10-12', title: '알림 문구 정리' },
  { id: 'INQ-003', status: 'done', createdAt: '2026-10-28', title: '답변 템플릿 변경' },
  { id: 'INQ-004', status: 'waiting', createdAt: '2026-09-25', title: '공지 검토' },
  { id: 'INQ-005', status: 'processing', createdAt: '2026-10-20', title: '신청 내역 조회' },
  { id: 'INQ-006', status: 'done', createdAt: '2026-11-03', title: '접수 메뉴 안내' },
];

async function queryModule() {
  assert.ok(existsSync(moduleUrl), '문의 조회 함수가 아직 구현되지 않았습니다.');
  return import(moduleUrl.href);
}

test('기존 전체 조회는 문의의 순서를 유지한다', async () => {
  const { searchInquiries } = await queryModule();
  const result = searchInquiries(inquiries);
  assert.deepEqual(result.map(item => item.id), [
    'INQ-001', 'INQ-002', 'INQ-003', 'INQ-004', 'INQ-005', 'INQ-006',
  ]);
});

test('조회 결과 배열을 바꾸어도 원본 문의 배열은 유지된다', async () => {
  const { searchInquiries } = await queryModule();
  const source = [...inquiries];
  const result = searchInquiries(source);
  result.pop();
  assert.equal(source.length, 6);
});

test('완료 상태를 선택하면 완료 문의만 조회한다', async () => {
  const { searchInquiries } = await queryModule();
  assert.deepEqual(searchInquiries(inquiries, { status: 'done' }).map(item => item.id), [
    'INQ-002', 'INQ-003', 'INQ-006',
  ]);
});

test('처리 중 상태를 선택하면 해당 문의만 조회한다', async () => {
  const { searchInquiries } = await queryModule();
  assert.deepEqual(searchInquiries(inquiries, { status: 'processing' }).map(item => item.id), [
    'INQ-001', 'INQ-005',
  ]);
});

test('알 수 없는 상태 입력은 오류로 알린다', async () => {
  const { searchInquiries } = await queryModule();
  assert.throws(() => searchInquiries(inquiries, { status: 'unknown' }), RangeError);
});
