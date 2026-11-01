import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import express from 'express';
import { Pool } from 'pg';
import { sampleRouter } from '../src/inquiries/repository.ts';

test('조회문에서 검색값을 SQL 파라미터로 분리한다', async context => {
  const queries = [];
  const originalQuery = Pool.prototype.query;
  Pool.prototype.query = function (query, values) {
    queries.push(typeof query === 'string' ? { text: query, values } : {
      text: query.text, values: query.values,
    });
    return Promise.resolve({ command: 'SELECT', rowCount: 0, oid: null, rows: [], fields: [] });
  };
  context.after(() => { Pool.prototype.query = originalQuery; });

  const app = express();
  app.use(sampleRouter);
  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  context.after(() => new Promise(resolve => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  const response = await fetch(`http://127.0.0.1:${address.port}/inquiries/done`);
  assert.equal(response.status, 200);
  assert.deepEqual(queries, [{
    text: 'SELECT id, title FROM inquiries WHERE status=$1',
    values: ['done'],
  }]);
});
