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
        type TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE
    )`, (err) => {
        if (!err) {
            // Seed categories if empty
            db.get("SELECT count(*) as count FROM categories", (err, row) => {
                if (!err && row.count === 0) {
                    const defaults = [
                        "Food", "Shopping", "Transport", "Utilities", "Housing",
                        "Entertainment", "Health", "Travel", "Income", "Other"
                    ];
                    const stmt = db.prepare("INSERT INTO categories (name) VALUES (?)");
                    defaults.forEach(cat => stmt.run(cat));
                    stmt.finalize();
                    console.log("Seeded default categories.");
                }
            });
        }
    });
});

export default db;
