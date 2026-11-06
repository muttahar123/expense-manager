import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import errorHandler, { notFound } from './middleware/errorHandler.js';

const app = express();

// On Vercel the frontend and API are same-origin, so CORS is a no-op there.
// For local two-terminal dev (Vite proxy) it's also unnecessary, but we keep a
// configurable allow-list for flexibility. Auth uses Bearer tokens, not cookies.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
  })
);
app.use(express.json());

// Friendly root — this is an API-only server; the UI runs on the Vite dev server.
app.get('/', (req, res) => {
  res.json({
    name: 'Wealth & Expense Manager API',
    status: 'running',
    hint: 'This is the API. Open the app UI at http://localhost:5173',
    endpoints: ['/api/health', '/api/me', '/api/transactions', '/api/investments', '/api/insights'],
  });
});

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
