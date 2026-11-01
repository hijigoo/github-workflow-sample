import { inquiries } from './inquiries.mjs';
import { searchInquiries } from './query.mjs';
import { version } from './version.mjs';

const statusLabels = { processing: '처리 중', done: '완료', waiting: '대기' };
const rows = document.querySelector('#inquiry-rows');
const summary = document.querySelector('#result-summary');

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
document.querySelector('#sample-app').hidden = false;
