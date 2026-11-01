import { Router } from 'express';
import { Pool } from 'pg';

// Code scanning용 격리 예시입니다. 서버를 시작하지 않고 공개 화면·배포 파일에도 포함하지 않습니다.
const pool = new Pool();
export const sampleRouter = Router();

sampleRouter.get('/inquiries/:keyword', async (request, response) => {
  const keyword = request.params.keyword;
  if (typeof keyword !== 'string') {
    response.status(400).json({ error: 'A keyword is required.' });
    return;
  }
  const query = 'SELECT id, title FROM inquiries WHERE status=$1';
  const result = await pool.query(query, [keyword]);
  response.json(result.rows);
});
