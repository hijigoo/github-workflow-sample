function validateDate(value, label) {
  if (value === '') return;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) {
    throw new RangeError(`${label}을 올바른 날짜로 입력해 주세요.`);
  }
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError(`${label}을 올바른 날짜로 입력해 주세요.`);
  }
}

export function searchInquiries(inquiries, { status = 'all', startDate = '', endDate = '' } = {}) {
  if (!['all', 'processing', 'done', 'waiting'].includes(status)) {
    throw new RangeError('지원하지 않는 상태입니다.');
  }
  validateDate(startDate, '시작일');
  validateDate(endDate, '종료일');
  if (startDate && endDate && startDate > endDate) {
    throw new RangeError('시작일이 종료일보다 늦습니다. 기간을 다시 확인해 주세요.');
  }
  return inquiries.filter(item =>
    (status === 'all' || item.status === status) &&
    (!startDate || item.createdAt >= startDate) &&
    (!endDate || item.createdAt <= endDate)
  );
}
