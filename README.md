# 💰 Personal Wealth & Expense Manager

A next-generation, mobile-first MERN application for tracking income, expenses, and investments with **zero-friction entry** and a financial **X-Ray dashboard**.

> **Status:** ✅ Feature-complete MVP. Omni-Input entry, Sankey cashflow, Investment & PnL dashboard, and the Zero-API Smart Agent are all working end-to-end. Currency is driven by the user's `baseCurrency`.

---

## 🧱 Tech Stack

| Layer      | Technology                                            |
| ---------- | ----------------------------------------------------- |
| Database   | MongoDB + Mongoose                                    |
| Backend    | Node.js + Express.js                                  |
| Frontend   | React (Vite) + React Hook Form                        |
| Styling    | Tailwind CSS + Framer Motion (smooth micro-interactions) |
| Charts     | Recharts (Sankey + PnL)                               |

---

## 📂 Monorepo Layout

```
Expense_Manager/
├── client/            # React + Vite frontend (mobile-first)
│   └── src/
│       ├── components/     # UI components (OmniInput, etc.)
│       ├── pages/          # Route-level pages
│       ├── hooks/          # Custom React hooks
│       ├── lib/            # API client, helpers
│       └── constants/      # Categories, buckets, enums
└── server/            # Express + Node backend
    └── src/
        ├── config/         # DB connection
        ├── models/         # Mongoose schemas (User, Transaction, Investment)
        ├── controllers/    # Request handlers
        ├── routes/         # Express routers
        ├── services/       # Zero-API Smart Agent (rule-based insights)
        └── middleware/     # Error handling, etc.
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- A MongoDB instance (local `mongod` or MongoDB Atlas connection string)

### 1. Backend

```bash
cd server
npm install
cp .env.example .env          # then edit MONGO_URI
npm run dev                    # starts on http://localhost:5000
```

### 2. Frontend

```bash
cd client
npm install
npm run dev                    # starts on http://localhost:5173
```

The Vite dev server proxies `/api` → `http://localhost:5000`.

---

## 🔌 API (current)

| Method | Endpoint                     | Description                              |
| ------ | ---------------------------- | ---------------------------------------- |
| GET    | `/api/health`                | Health check                             |
| POST   | `/api/transactions`          | Create a transaction (Omni-Input target) |
| GET    | `/api/transactions`          | List transactions                        |
| POST   | `/api/investments`           | Create an investment                     |
| GET    | `/api/investments`           | List investments (with PnL + ROI)        |
| PATCH  | `/api/investments/:id`       | Update current value / status            |
| GET    | `/api/insights`              | Zero-API Smart Agent insights            |
| GET    | `/api/me`                    | Current user profile & preferences       |
| PATCH  | `/api/me`                    | Update currency, salary, budget rule     |

---

## 🧠 Zero-API Smart Agent

A pure Node.js rule engine (no external LLM) that:
- Flags categories exceeding **50/30/20** benchmarks.
- Computes portfolio **PnL**, **ROI %**, and current value.
- Produces plain-English wealth insights.

---

## 🗺️ Roadmap
- [x] Step 1 — Folder structure
- [x] Step 2 — Mongoose schemas (User, Transaction, Investment)
- [x] Step 3 — Omni-Input unified entry form
- [x] Step 4 — Zero-API Smart Agent
- [x] Step 5 — Sankey cashflow diagram
- [x] Step 6 — Investment & PnL dashboard (+ currency driven by `baseCurrency`)
