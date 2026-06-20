import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const verboseSqlite = sqlite3.verbose();

// Connect to SQLite database
const dbPath = path.resolve(__dirname, 'finance_v2.db');
const db = new verboseSqlite.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Initialize Database Schema
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL DEFAULT 'Expense',
        category TEXT,
        description TEXT,
        bank_account_id INTEGER
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        description TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS bank_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        account_number TEXT,
        label TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        storage_path TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        upload_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'uploaded',
        bank_account_id INTEGER,
        date_range_start TEXT,
        date_range_end TEXT,
        last_scanned_at TEXT,
        transaction_count INTEGER DEFAULT 0,
        error_message TEXT,
        FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id) ON DELETE SET NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL DEFAULT 'Expense'
    )`, (err) => {
        if (!err) {
            // Apply migrations for existing DBs
            db.run(`ALTER TABLE transactions ADD COLUMN type TEXT NOT NULL DEFAULT 'Expense'`, (errTx) => {
                if (!errTx) console.log("Migration: Added type column to transactions table.");
            });

            db.run(`ALTER TABLE transactions ADD COLUMN document_id INTEGER`, (errTxDoc) => {
                if (!errTxDoc) console.log("Migration: Added document_id column to transactions table.");
            });

            db.run(`ALTER TABLE bank_accounts ADD COLUMN account_number TEXT`, (errAccNum) => {
                if (!errAccNum) console.log("Migration: Added account_number column to bank_accounts table.");
            });

            db.run(`ALTER TABLE bank_accounts ADD COLUMN label TEXT`, (errAccLabel) => {
                if (!errAccLabel) console.log("Migration: Added label column to bank_accounts table.");
            });

            db.run(`ALTER TABLE categories ADD COLUMN type TEXT NOT NULL DEFAULT 'Expense'`, (errCat) => {
                if (!errCat) {
                    console.log("Migration: Added type column to categories table.");
                }
                // Update old 'Income' category type
                db.run(`UPDATE categories SET type = 'Income' WHERE name = 'Income'`);

                // Seed new default categories if they don't exist
                const defaults = [
                    { name: "Food", type: "Expense" },
                    { name: "Shopping", type: "Expense" },
                    { name: "Transport", type: "Expense" },
                    { name: "Utilities", type: "Expense" },
                    { name: "Housing", type: "Expense" },
                    { name: "Entertainment", type: "Expense" },
                    { name: "Health", type: "Expense" },
                    { name: "Travel", type: "Expense" },
                    { name: "Other Expense", type: "Expense" },
                    { name: "Salary", type: "Income" },
                    { name: "Freelance", type: "Income" },
                    { name: "Bonus", type: "Income" },
                    { name: "Other Income", type: "Income" },
                    { name: "Bank Transfer", type: "Transfer" },
                    { name: "Credit Card Payment", type: "Transfer" },
                    { name: "Business Reimbursement", type: "Reimbursable" },
                    { name: "Stocks/Mutual Funds", type: "Investment" },
                    { name: "Retirement Account", type: "Investment" }
                ];
                defaults.forEach(cat => {
                    db.run("INSERT OR IGNORE INTO categories (name, type) VALUES (?, ?)", [cat.name, cat.type]);
                });

                // Update transaction types to match their category's type
                db.run(`UPDATE transactions SET type = (SELECT type FROM categories WHERE categories.name = transactions.category) WHERE category IS NOT NULL AND EXISTS (SELECT 1 FROM categories WHERE categories.name = transactions.category)`, (errAlign) => {
                    if (!errAlign) {
                        console.log("Migration: Aligned transaction types with their category types.");
                    }
                });
            });
        }
    });
});

export default db;
