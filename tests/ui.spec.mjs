import { test, expect } from '@playwright/test';
import { startFixtureServer } from './support/server.mjs';

let server;

test.beforeAll(async () => {
  server = await startFixtureServer();
});

test.afterAll(async () => {
  await server.close();
});

test('기존 문의 목록을 열면 여섯 건이 보인다', async ({ page }) => {
  const response = await page.goto(server.url);
  expect(response.status()).toBe(200);
  await expect(page.getByRole('heading', { name: '문의 조회', exact: true })).toBeVisible();
  await expect(page.locator('#inquiry-rows tr')).toHaveCount(6);
  await expect(page.locator('#result-summary')).toContainText('6건');
  await expect(page.locator('#inquiry-rows tr td:first-child')).toHaveText([
    'INQ-001', 'INQ-002', 'INQ-003', 'INQ-004', 'INQ-005', 'INQ-006',
  ]);
});

test('화면 모듈을 읽지 못하면 실패를 알리고 조회 화면을 숨긴다', async ({ page }) => {
  await page.route('**/app.mjs', route => route.abort());
  const response = await page.goto(server.url);
  expect(response.status()).toBe(200);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('alert')).not.toBeEmpty();
  await expect(page.locator('#query-form')).not.toBeVisible();
});
