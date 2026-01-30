import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./server/finance_v2.db', (err) => {
    if (err) {
        console.error("Error opening db:", err.message);
        return;
    }
});

db.all("PRAGMA table_info(rules);", [], (err, rows) => {
    if (err) {
        console.error("Error getting schema:", err.message);
        return;
    }
    if (rows.length === 0) {
        console.log("Table 'rules' does NOT exist yet (or is empty schema).");
    } else {
        console.log("Table 'rules' exists with columns:");
        rows.forEach(row => {
            console.log(`- ${row.name} (${row.type})`);
        });
    }
});
