import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { swaggerUI } from '@hono/swagger-ui';
import fs from 'fs';
import { api } from './api';

export const app = new Hono();

app.use('*', logger());

app.get('/', (c) => c.text('AI CV Evaluator API is running'));

app.route('/api', api);

app.get('/openapi', (c) =>
  c.json(JSON.parse(fs.readFileSync('docs/openapi.json', 'utf-8')))
);
app.get('/docs', swaggerUI({ url: '/openapi' }));
