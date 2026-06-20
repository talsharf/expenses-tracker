# ExpenseTracker

A simple and elegant application to track and analyze your expenses, income, and transaction flow. Built using a modern React frontend and a robust Node.js/SQLite backend, it offers full visibility into your cash flow, investments, reimbursables, and transfers.

## Key Features

- **Transaction Classification**: First-class support for 5 distinct transaction types:
  - **Expense**: Outgoing costs and general spending.
  - **Income**: Incoming revenues, salary, and side gigs.
  - **Transfer**: Inter-account movements with no net impact on net worth.
  - **Reimbursable**: Outlays expected to be repaid.
  - **Investment**: Portfolio and asset building allocations.
- **Dynamic KPI Dashboard**: Track Total Income, Total Expenses, Net Cash Flow, Investments, Reimbursables, and Transfers dynamically with modern charts and HSL-tailored indicators.
- **Document Management System**: Bulk upload bank and credit card statement documents (PDF and CSV files), scan them for metadata (auto-extracted bank name, account number, date range), and automatically ingest transactions.
- **Interactive Inline Editing**: Quickly adjust transaction dates, descriptions, categories, and accounts directly inside the transaction list table with automated cascading validations.
- **Auto-Categorization Rules**: Set and manage custom rules to auto-assign categories and accounts based on transaction descriptions.
- **Dismissible Overlays & Modals**: Smooth modals for managing accounts, categories, rules, and documents that support Escape key dismissing and click-outside closure.
- **SQLite Database Integration**: Reliable database seeding, automatic category mapping, and a robust ingestion pipeline.

## Tech Stack

- **Frontend**: React, Vite, custom premium styling (Vanilla CSS, custom typography, dark mode, glassmorphism, responsive grids).
- **Backend**: Node.js, Express, SQLite3 (database with automatic schema alignment migrations), PDF parsing engines, and CSV parsers.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm

### Installation & Run

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Start the backend server:
   ```bash
   node server/index.js
   ```

3. Start the frontend developer server in a separate terminal:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.
