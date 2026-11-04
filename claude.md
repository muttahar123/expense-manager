Act as an Expert Full-Stack MERN Developer and UI/UX Architect. Your task is to build a next-generation "Personal Wealth & Expense Manager". It must be incredibly fast, mobile-first, and feature a highly modern, minimalist UI (using Tailwind CSS and Framer Motion for smooth micro-interactions).

**Tech Stack:** MongoDB, Express.js, React (Vite/Next.js), Node.js, Tailwind CSS, Recharts (for Sankey and PnL charts).

**Core Philosophy & UX Goals:**
1. **Zero Friction (One-Tab Entry):** The user wants to input data with the absolute minimum number of clicks. There should be a unified "Omni-Input" tab or modal where they can instantly log Salary, an Expense, or an Investment without navigating across multiple pages.
2. **Crystal Clear Visibility:** The dashboard must act as a financial "X-Ray" showing exact money flow and investment health at a glance.

**Key Features & Requirements:**

1. **The "Omni-Input" Quick Action Interface:**
   - A single, highly optimized UI tab/form.
   - Segmented control to quickly switch between: [Expense] | [Income/Salary] | [Investment].
   - Smart defaults (auto-fills today's date, suggests categories based on recent habits).
   - Submit in 1-2 clicks maximum.

2. **Advanced Cashflow & Dashboard Visualization:**
   - **Sankey Diagram:** A dynamic flow chart showing: Total Salary -> Split into Needs, Wants, and Investments -> Remaining Savings.
   - **Investment & PnL Tracker:** A dedicated section showing where money is invested (e.g., Stocks, Crypto, Business). It must calculate and display real-time Profit/Loss (PnL) margins, ROI percentages, and current portfolio value.

3. **"Zero-API" Smart Agent (Rule-Based Insights):**
   - A custom Node.js utility that acts as an AI without external LLMs.
   - **Cashflow Insights:** Warns if spending in a specific category exceeds the 50/30/20 rule benchmarks.
   - **Investment Insights:** Analyzes PnL (e.g., "Your crypto portfolio is down 10%, but your business investments are yielding a 15% profit. Overall wealth is stable.").

4. **Database Models (Mongoose):**
   - `User`: Base currency, salary dates, financial goals.
   - `Transaction`: Amount, Type (Income/Expense/Investment), Category, Date, Notes.
   - `Portfolio/Investment`: Asset Name, Invested Amount, Current Value, Status (Active/Closed), ROI.

**Your Task Right Now:** Let's build this step-by-step. Do NOT write everything at once.
**Step 1:** Define the optimal MERN Folder Structure for this specific app.
**Step 2:** Write the complete Mongoose schemas (`Transaction`, `Investment`, and `User`). Ensure they are linked correctly to calculate PnL.
**Step 3:** Write the React component for the "Omni-Input" unified form using Tailwind CSS and React Hook Form for lightning-fast data entry. Ensure the UI/UX is top-tier.
**Step 4:** Provide the backend logic for the "Zero-API Smart Agent" that calculates PnL and generates text-based insights.

Ask for my confirmation after providing these steps before moving on to the Sankey Diagram and Dashboard UI.



After you done creating the app. Push the code to this repo or raise a PR: https://github.com/muttahar123/expense-manager/tree/main