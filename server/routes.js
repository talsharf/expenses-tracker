import express from 'express';
import multer from 'multer';
import fs from 'fs';
import csv from 'csv-parser';
import { GoogleGenerativeAI } from "@google/generative-ai";
import db from './database.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Initialize Gemini API lazily
const getGenAI = () => new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to check for duplicates
const isDuplicate = (transaction) => {
    return new Promise((resolve, reject) => {
        let query = `SELECT id FROM transactions WHERE date = ? AND amount = ? AND category = ?`;
        const params = [transaction.date, transaction.amount, transaction.category];

        if (transaction.bank_account_id) {
            query += ` AND bank_account_id = ?`;
            params.push(transaction.bank_account_id);
        } else {
            query += ` AND bank_account_id IS NULL`;
        }

        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
        });
    });
};

// Helper to insert transaction
const insertTransaction = (transaction) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO transactions (date, amount, category, description, bank_account_id) VALUES (?, ?, ?, ?, ?)`;
        db.run(query, [
            transaction.date,
            transaction.amount,
            transaction.category,
            transaction.description || transaction.category,
            transaction.bank_account_id || null
        ], function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
};

// GET /api/transactions
router.get('/transactions', (req, res) => {
    const { bank_account_id } = req.query;
    let query = "SELECT * FROM transactions";
    const params = [];

    if (bank_account_id) {
        query += " WHERE bank_account_id = ?";
        params.push(bank_account_id);
    }

    query += " ORDER BY date DESC";

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// DELETE /api/transactions (Clear All)
router.delete('/transactions', (req, res) => {
    db.run("DELETE FROM transactions", [], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "All transactions deleted" });
    });
});

// DELETE /api/transactions/:id
router.delete('/transactions/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM transactions WHERE id = ?", [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Transaction deleted", changes: this.changes });
    });
});

// PUT /api/transactions/:id
router.put('/transactions/:id', (req, res) => {
    const { category } = req.body;
    const { id } = req.params;

    // We only support updating category for now
    const query = `UPDATE transactions SET category = ? WHERE id = ?`;
    db.run(query, [category, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Transaction updated", changes: this.changes });
    });
});

// POST /api/upload
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = req.file.path;
    const mimeType = req.file.mimetype;
    const bankAccountId = req.body.bank_account_id ? parseInt(req.body.bank_account_id) : null;
    console.log("Upload Request Body:", req.body);
    console.log("Parsed Bank Account ID:", bankAccountId);
    let transactions = [];

    try {
        if (mimeType === 'application/pdf') {
            // Process PDF with Gemini
            const genAI = getGenAI();
            const modelName = "gemini-flash-latest";
            console.log("Using Gemini Model:", modelName);
            const model = genAI.getGenerativeModel({ model: modelName });

            const fileData = fs.readFileSync(filePath);
            const imageParts = [
                {
                    inlineData: {
                        data: fileData.toString("base64"),
                        mimeType: mimeType,
                    },
                },
            ];

            const prompt = `
                Extract all financial transactions from this bank statement.
                Return ONLY a raw JSON array. Do not include markdown formatting (like \`\`\`json).
                Each object in the array should have:
                - "date" (YYYY-MM-DD format)
                - "amount" (number, positive for expenses)
                - "category" (infer from description, choosing from: Food, Shopping, Transport, Utilities, Housing, Entertainment, Health, Travel, Income, Other)
                - "description" (full description)
            `;

            const result = await model.generateContent([prompt, ...imageParts]);
            const response = await result.response;
            const text = response.text();

            // Clean markdown if present
            const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
            transactions = JSON.parse(jsonStr);

        } else if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
            // Process CSV
            transactions = await new Promise((resolve, reject) => {
                const results = [];
                fs.createReadStream(filePath)
                    .pipe(csv())
                    .on('data', (data) => {
                        const date = data.Date || data.date;
                        const amount = parseFloat(data.Amount || data.amount);
                        const type = data.Category || data.Description || data.description || 'Uncategorized';

                        if (date && !isNaN(amount)) {
                            results.push({
                                date: new Date(date).toISOString().split('T')[0],
                                amount: Math.abs(amount),
                                type: type,
                                description: data.Description || data.description || type
                            });
                        }
                    })
                    .on('end', () => resolve(results))
                    .on('error', (err) => reject(err));
            });
        } else {
            fs.unlinkSync(filePath); // Cleanup
            return res.status(400).json({ error: "Unsupported file type" });
        }

        // Insert unique transactions
        let addedCount = 0;
        for (const t of transactions) {
            if (bankAccountId) {
                t.bank_account_id = bankAccountId;
            }
            console.log("Processing transaction:", t);
            const isDup = await isDuplicate(t);
            if (!isDup) {
                await insertTransaction(t);
                addedCount++;
            } else {
                console.log("Skipping duplicate:", t);
            }
        }

        fs.unlinkSync(filePath); // Cleanup uploaded file
        res.json({ message: "File processed successfully", added: addedCount, totalFound: transactions.length });

    } catch (error) {
        console.error("Processing error:", error);
        if (fs.existsSync(filePath)) {
            try { fs.unlinkSync(filePath); } catch (e) { console.error("Cleanup error (ignored):", e.message); }
        }
        res.status(500).json({ error: "Failed to process file: " + error.message });
    }
});

// POST /api/rules/run - Apply rules to all transactions
router.post('/rules/run', (req, res) => {
    db.all("SELECT * FROM rules", [], async (err, rules) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        try {
            let updates = 0;
            for (const rule of rules) {
                // Determine if rule.description is a keyword (user input) or pattern.
                // Assuming simple substring match for now: %keyword%
                const pattern = `%${rule.description}%`;
                const query = `UPDATE transactions SET category = ? WHERE description LIKE ? AND category != ?`;

                await new Promise((resolve, reject) => {
                    db.run(query, [rule.category, pattern, rule.category], function (err) {
                        if (err) reject(err);
                        else {
                            updates += this.changes;
                            resolve();
                        }
                    });
                });
            }
            res.json({ message: "Rules applied successfully", updates });
        } catch (e) {
            res.status(500).json({ error: "Failed to apply rules: " + e.message });
        }
    });
});

export default router;

// Rules API

// GET /api/rules
router.get('/rules', (req, res) => {
    db.all("SELECT * FROM rules", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST /api/rules
router.post('/rules', (req, res) => {
    const { category, description } = req.body;
    if (!category || !description) {
        return res.status(400).json({ error: "Category and description are required" });
    }
    const query = `INSERT INTO rules (category, description) VALUES (?, ?)`;
    db.run(query, [category, description], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, category, description });
    });
});

// PUT /api/rules/:id
router.put('/rules/:id', (req, res) => {
    const { category, description } = req.body;
    const { id } = req.params;
    const query = `UPDATE rules SET category = ?, description = ? WHERE id = ?`;
    db.run(query, [category, description, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Rule updated", changes: this.changes });
    });
});

// DELETE /api/rules/:id
router.delete('/rules/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM rules WHERE id = ?", [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Rule deleted", changes: this.changes });
    });
});

// Bank Accounts API

// GET /api/bank-accounts
router.get('/bank-accounts', (req, res) => {
    db.all("SELECT * FROM bank_accounts", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST /api/bank-accounts
router.post('/bank-accounts', (req, res) => {
    const { name, type } = req.body;
    if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
    }
    const query = `INSERT INTO bank_accounts (name, type) VALUES (?, ?)`;
    db.run(query, [name, type], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, name, type });
    });
});

// PUT /api/bank-accounts/:id
router.put('/bank-accounts/:id', (req, res) => {
    const { name, type } = req.body;
    const { id } = req.params;
    const query = `UPDATE bank_accounts SET name = ?, type = ? WHERE id = ?`;
    db.run(query, [name, type, id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Bank account updated", changes: this.changes });
    });
});

// DELETE /api/bank-accounts/:id
router.delete('/bank-accounts/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM bank_accounts WHERE id = ?", [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Bank account deleted", changes: this.changes });
    });
});
