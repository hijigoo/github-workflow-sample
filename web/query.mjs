export function searchInquiries(inquiries, { status = 'all' } = {}) {
  if (!['all', 'processing', 'done', 'waiting'].includes(status)) {
    throw new RangeError('지원하지 않는 상태입니다.');
  }
  return inquiries.filter(item => status === 'all' || item.status === status);
}
