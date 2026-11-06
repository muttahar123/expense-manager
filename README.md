# 💰 Personal Wealth & Expense Manager

A next-generation, mobile-first app for tracking income, expenses, and investments with **zero-friction entry** and a financial **X-Ray dashboard**.

> **Status:** ✅ Feature-complete MVP with **real per-user accounts**. Google sign-in, per-user data isolation, Omni-Input entry, Sankey cashflow, Investment & PnL dashboard, and the Zero-API Smart Agent all work end-to-end.

---

## 🧱 Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Database   | **Supabase (Postgres)** with Row-Level Security       |
| Auth       | **Google Sign-In** via Supabase Auth                  |
| Backend    | Node.js + Express.js (runs as a Vercel Serverless Function) |
| Frontend   | React (Vite) + React Hook Form                        |
| Styling    | Tailwind CSS + Framer Motion                          |
| Charts     | Recharts (Sankey + PnL)                               |
| Hosting    | **One Vercel project** — frontend + API deploy together |

---

## ⚡ Quick start — your teammate edits exactly ONE file

Everything the app needs comes from a **single root `.env` file**.

```bash
# 1. Install dependencies (root = backend, client = frontend)
npm run install:all

# 2. Create the one credentials file
cp .env.example .env
#    ...then open .env and fill in the 3 Supabase values. The file itself
#    walks you through creating the Supabase project, running the schema,
#    and turning on Google login. (~5 minutes.)

# 3. Run it (unified, mirrors production):
npx vercel dev
#    Frontend + /api on one URL, just like Vercel.
```

That's the whole setup. No other file needs editing.

### Alternative: classic two-terminal dev

```bash
npm run dev:server    # Express API on http://localhost:5000
npm run dev:client    # Vite app on http://localhost:5173 (proxies /api → 5000)
```

---

## 🔐 How auth & data isolation work

1. The browser signs in with **Google** through Supabase (`Continue with Google`).
2. Every API request carries the user's Supabase **JWT** (`Authorization: Bearer …`).
3. The Express backend verifies the token and runs all queries through a
   **request-scoped Supabase client** bound to that user.
4. Postgres **Row-Level Security** (`auth.uid() = user_id`) guarantees each user
   can only ever read/write their own rows — enforced by the database, not just app code.

A signup trigger auto-creates a `profiles` row on first login, so there's no manual onboarding step.

---

## 📦 One-file credentials

The root **`.env`** is the only place secrets live:

| Variable                     | Used by            | Notes                                  |
| ---------------------------- | ------------------ | -------------------------------------- |
| `SUPABASE_URL`               | server + browser   | Project URL                            |
| `SUPABASE_ANON_KEY`          | server + browser   | Public key (safe in the browser)       |
| `SUPABASE_SERVICE_ROLE_KEY`  | server only        | Secret; used to verify tokens          |

`client/vite.config.js` bridges `SUPABASE_URL` / `SUPABASE_ANON_KEY` into the
frontend bundle, so you never enter the same value twice. The Google OAuth
Client ID/Secret live **inside the Supabase dashboard**, not in this repo.

---

## 🚀 Deploy to Vercel (frontend + backend, one project)

1. Push this repo and import it in Vercel. No framework preset needed — `vercel.json` handles it:
   - builds the client to `client/dist` (served as static files),
   - routes `/api/*` to the Express serverless function in `api/`.
2. In **Vercel → Settings → Environment Variables**, add the **same 3 variables**
   from your `.env` (same names, same values).
3. In **Supabase → Authentication → URL Configuration**, add your
   `https://<app>.vercel.app` URL to the allowed redirect URLs.
4. Deploy. Frontend and API live on the same domain — no separate infra.

---

## 📂 Layout

```
.
├── .env.example          # 👈 the ONLY file to edit (copy to .env)
├── vercel.json           # one project: static client + /api function
├── package.json          # backend deps + build orchestration
├── api/
│   └── index.js          # Vercel serverless entry → wraps the Express app
├── supabase/
│   └── schema.sql         # tables + Row-Level Security + signup trigger
├── server/               # Express API source
│   └── src/
│       ├── app.js
│       ├── config/supabase.js    # Supabase clients (admin + per-user)
│       ├── middleware/auth.js    # verifies Google/Supabase JWT
│       ├── lib/mappers.js        # row ↔ API shape + derived PnL
│       ├── controllers/          # Supabase-backed request handlers
│       ├── routes/
│       ├── services/smartAgent.js # Zero-API rule engine (pure)
│       └── models/constants.js    # shared enums
└── client/               # React + Vite frontend
    └── src/
        ├── context/AuthContext.jsx   # Google sign-in / session
        ├── context/UserContext.jsx   # preferences + currency formatting
        ├── lib/supabase.js           # browser Supabase client
        ├── lib/api.js                # axios + Bearer token interceptor
        ├── components/Login.jsx      # Google sign-in screen
        └── Dashboard.jsx             # the authed app
```

---

## 🔌 API

All endpoints except `/api/health` require a valid Google/Supabase session.

| Method | Endpoint                 | Description                              |
| ------ | ------------------------ | ---------------------------------------- |
| GET    | `/api/health`            | Health check (public)                    |
| GET    | `/api/me`                | Current user profile & preferences       |
| PATCH  | `/api/me`                | Update currency, salary, budget rule     |
| POST   | `/api/transactions`      | Create a transaction (Omni-Input target) |
| GET    | `/api/transactions`      | List the user's transactions             |
| DELETE | `/api/transactions/:id`  | Delete a transaction                     |
| POST   | `/api/investments`       | Create an investment                     |
| GET    | `/api/investments`       | List investments (with PnL + ROI)        |
| PATCH  | `/api/investments/:id`   | Update current value / status            |
| DELETE | `/api/investments/:id`   | Delete an investment                     |
| GET    | `/api/insights`          | Zero-API Smart Agent insights            |

---

## 🧠 Zero-API Smart Agent

A pure Node.js rule engine (no external LLM) that flags categories exceeding the
**50/30/20** benchmarks, computes portfolio **PnL** / **ROI %**, and produces
plain-English wealth insights.
