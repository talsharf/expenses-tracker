import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./server/finance.db', (err) => {
    if (err) {
        console.error("Error opening db:", err.message);
        return;
    }
});

db.all("PRAGMA table_info(transactions);", [], (err, rows) => {
    if (err) {
        console.error("Error getting schema:", err.message);
        return;
    }
    console.log("Current Columns in 'transactions' table:");
    rows.forEach(row => {
        console.log(`- ${row.name} (${row.type})`);
    });
});
