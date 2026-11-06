// Vercel Serverless Function entry point.
//
// This is what makes the backend deploy *together* with the frontend on a
// single Vercel project: every request to `/api/*` is routed here (see
// vercel.json) and handed straight to the Express app. Locally, the same app
// is run by `server/server.js`.
import 'dotenv/config';
import app from '../server/src/app.js';

export default app;
