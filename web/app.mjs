import { inquiries } from './inquiries.mjs';
import { searchInquiries } from './query.mjs';
import { version } from './version.mjs';

const statusLabels = { processing: '처리 중', done: '완료', waiting: '대기' };
const rows = document.querySelector('#inquiry-rows');
const summary = document.querySelector('#result-summary');
const form = document.querySelector('#query-form');
const queryError = document.querySelector('#query-error');
const queryState = document.querySelector('#query-state');

function render(items) {
  rows.replaceChildren();
  for (const item of items) {
    const row = document.createElement('tr');
    for (const value of [item.id, item.title, statusLabels[item.status], item.createdAt]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    rows.append(row);
  }
  summary.textContent = `조회 결과 ${items.length}건`;
  document.querySelector('#empty-result').hidden = items.length !== 0;
}

document.querySelector('#sample-version').textContent = `v${version}`;
render(searchInquiries(inquiries));
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const conditions = Object.fromEntries(new FormData(form));
    render(searchInquiries(inquiries, conditions));
    queryError.hidden = true;
    queryState.textContent = '';
  } catch (error) {
    if (!(error instanceof RangeError)) throw error;
    console.warn('Invalid inquiry conditions:', error.message);
    queryError.textContent = error.message;
    queryError.hidden = false;
    queryState.textContent = '조회하지 않았습니다. 이전 조회 결과를 유지합니다.';
  }
});
form.addEventListener('reset', () => {
  queueMicrotask(() => {
    render(searchInquiries(inquiries));
    queryError.hidden = true;
    queryState.textContent = '';
  });
});
document.querySelector('#sample-app').hidden = false;
