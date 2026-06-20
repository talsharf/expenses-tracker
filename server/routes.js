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
// Helper to check for duplicates
const isDuplicate = (transaction) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id FROM transactions WHERE date = ? AND amount = ? AND description = ?`;
        const params = [
            transaction.date,
            transaction.amount,
            transaction.description
        ];

        db.get(query, params, (err, row) => {
            if (err) reject(err);
            else resolve(!!row);
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
    const { category, type } = req.body;
    const { id } = req.params;

    let query = `UPDATE transactions SET `;
    const fields = [];
    const params = [];
    if (category) {
        fields.push("category = ?");
        params.push(category);
    }
    if (type) {
        fields.push("type = ?");
        params.push(type);
    }
    if (fields.length === 0) {
        return res.status(400).json({ error: "Nothing to update" });
    }
    query += fields.join(", ") + " WHERE id = ?";
    params.push(id);

    db.run(query, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Transaction updated", changes: this.changes });
    });
});

// Helper to insert transaction
const insertTransaction = (transaction) => {
    return new Promise((resolve, reject) => {
        const query = `INSERT INTO transactions (date, amount, type, category, description, bank_account_id, document_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
        db.run(query, [
            transaction.date,
            transaction.amount,
            transaction.type || 'Expense',
            transaction.category,
            transaction.description || transaction.category,
            transaction.bank_account_id || null,
            transaction.document_id || null
        ], function (err) {
            if (err) reject(err);
            else resolve(this.lastID);
        });
    });
};

// Helper to extract metadata from CSV filename and content snippet
const extractCsvMetadata = async (filePath, filename) => {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    
    // Read the beginning of the file (first 2048 bytes)
    let fileContent = '';
    try {
        const buffer = Buffer.alloc(2048);
        const fd = fs.openSync(filePath, 'r');
        const bytesRead = fs.readSync(fd, buffer, 0, 2048, 0);
        fs.closeSync(fd);
        fileContent = buffer.toString('utf8', 0, bytesRead);
    } catch (e) {
        console.error("Error reading CSV chunk for metadata:", e);
    }

    const prompt = `
        You are analyzing a bank statement CSV file to extract account metadata.
        Filename: ${filename}
        File Snippet:
        ${fileContent}

        Extract:
        1. Bank or financial institution name (e.g., Chase, Wells Fargo, Bank of America, Visa, Mastercard).
        2. Account number or card number ending digits (e.g., last 4 digits). Return ONLY digits. If none found, return "".
        3. Account type (choose one: "Checking", "Savings", "Credit Card", "Investment", "Cash", "Other").

        Return ONLY a raw JSON object with these keys: "bank_name", "account_number", "account_type". Do not include markdown formatting (like \`\`\`json).
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
};

// Helper to parse dates in various formats
const parseCSVDate = (dateStr) => {
    if (!dateStr) return null;
    const cleanStr = String(dateStr).trim();
    
    // Try standard JS parsing first
    let d = new Date(cleanStr);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    
    // Try parsing slash, dash, or dot formats manually
    const parts = cleanStr.split(/[-/.]/);
    if (parts.length === 3) {
        let year = parts[2].trim();
        let month = parts[1].trim();
        let day = parts[0].trim();
        
        if (year.length === 2) {
            year = '20' + year;
        }
        
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        const p2 = parseInt(parts[2], 10);
        
        if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
            if (p0 > 1000) {
                // YYYY-MM-DD or YYYY-DD-MM
                if (p1 > 12) {
                    return `${p0}-${String(p2).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
                } else {
                    return `${p0}-${String(p1).padStart(2, '0')}-${String(p2).padStart(2, '0')}`;
                }
            }
            
            // DD/MM/YYYY or MM/DD/YYYY
            if (p0 > 12) {
                return `${year}-${String(p1).padStart(2, '0')}-${String(p0).padStart(2, '0')}`;
            }
            if (p1 > 12) {
                return `${year}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
            }
            
            // Default to MM/DD/YYYY
            return `${year}-${String(p0).padStart(2, '0')}-${String(p1).padStart(2, '0')}`;
        }
    }
    return null;
};

// Helper to normalize keys of an object to lowercase, removing quotes/BOM/spaces
const normalizeRowKeys = (row) => {
    const normalized = {};
    for (const key of Object.keys(row)) {
        const normalizedKey = key.replace(/^\uFEFF/, '').replace(/['"]/g, '').trim().toLowerCase();
        normalized[normalizedKey] = row[key];
    }
    return normalized;
};

// Helper to find a value from a normalized object using key aliases
const findValueByKeys = (row, aliases) => {
    for (const alias of aliases) {
        if (row[alias] !== undefined && row[alias] !== null && row[alias] !== '') {
            return row[alias];
        }
    }
    return null;
};

// Core function to process document scan and transactions import
const processDocumentScan = async (documentId) => {
    return new Promise((resolve, reject) => {
        db.get("SELECT * FROM documents WHERE id = ?", [documentId], async (err, doc) => {
            if (err) return reject(err);
            if (!doc) return reject(new Error("Document not found"));

            const filePath = doc.storage_path;
            const mimeType = doc.mime_type;
            const filename = doc.filename;

            try {
                // Update status to 'scanning'
                await new Promise((resU, rejU) => {
                    db.run("UPDATE documents SET status = 'scanning', error_message = NULL WHERE id = ?", [documentId], (errU) => {
                        if (errU) rejU(errU);
                        else resU();
                    });
                });

                // Clear any existing transactions for this document (idempotency)
                await new Promise((resD, rejD) => {
                    db.run("DELETE FROM transactions WHERE document_id = ?", [documentId], (errD) => {
                        if (errD) rejD(errD);
                        else resD();
                    });
                });

                let transactions = [];
                let bank_name = '';
                let account_number = '';
                let account_type = 'Checking';

                // Fetch categories from DB for classification
                const categories = await new Promise((resolveCats) => {
                    db.all("SELECT name FROM categories", (errC, rows) => {
                        if (errC || !rows) resolveCats(["Food", "Shopping", "Transport", "Utilities", "Housing", "Entertainment", "Health", "Travel", "Income", "Other"]);
                        else resolveCats(rows.map(r => r.name));
                    });
                });
                const categoryListStr = categories.join(', ');

                if (mimeType === 'application/pdf') {
                    const genAI = getGenAI();
                    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

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
                        Extract all financial transactions and account metadata from this bank statement PDF.
                        Return ONLY a raw JSON object. Do not include markdown formatting (like \`\`\`json).
                        The object must have the following keys:
                        - "bank_name": name of the bank/brand (e.g. Chase, Visa, Mastercard, Leumi)
                        - "account_number": ending digits of the card or account number. Return ONLY the digits. If none found, return "".
                        - "account_type": type of account (choose one of: "Checking", "Savings", "Credit Card", "Investment", "Cash", "Other")
                        - "transactions": a JSON array where each object has:
                          - "date" (YYYY-MM-DD format)
                          - "amount" (number, positive)
                          - "type" (determine if it is: "Income", "Expense", "Transfer", "Reimbursable", "Investment")
                          - "category" (infer from description, choosing from: ${categoryListStr})
                          - "description" (full description)
                    `;

                    const result = await model.generateContent([prompt, ...imageParts]);
                    const response = await result.response;
                    const text = response.text();

                    const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                    const parsed = JSON.parse(jsonStr);

                    bank_name = parsed.bank_name || 'Unknown Bank';
                    account_number = parsed.account_number ? String(parsed.account_number).trim() : '';
                    account_type = parsed.account_type || 'Checking';
                    transactions = parsed.transactions || [];

                } else if (mimeType === 'text/csv' || mimeType === 'application/vnd.ms-excel') {
                    // Extract CSV metadata using Gemini first
                    try {
                        const meta = await extractCsvMetadata(filePath, filename);
                        bank_name = meta.bank_name || 'Unknown Bank';
                        account_number = meta.account_number ? String(meta.account_number).trim() : '';
                        account_type = meta.account_type || 'Checking';
                    } catch (metaErr) {
                        console.error("Gemini failed to extract CSV metadata, using defaults:", metaErr);
                        bank_name = 'CSV Import';
                        account_number = 'CSV';
                        account_type = 'Checking';
                    }

                    // Guess separator
                    let separator = ',';
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const firstLine = content.split('\n')[0];
                        const commaCount = (firstLine.match(/,/g) || []).length;
                        const semicolonCount = (firstLine.match(/;/g) || []).length;
                        const tabCount = (firstLine.match(/\t/g) || []).length;
                        if (semicolonCount > commaCount && semicolonCount > tabCount) {
                            separator = ';';
                        } else if (tabCount > commaCount && tabCount > semicolonCount) {
                            separator = '\t';
                        }
                    } catch (e) {
                        console.error("Failed to guess separator:", e);
                    }

                    // Parse CSV transactions
                    transactions = await new Promise((resolveCsv, rejectCsv) => {
                        const results = [];
                        const DATE_ALIASES = ['transaction date', 'date', 'trans date', 'posting date', 'post date', 'txn date', 'effective date', 'valuta', 'time'];
                        const DESC_ALIASES = ['description 1', 'description 2', 'description', 'desc', 'memo', 'details', 'payee', 'narrative', 'name', 'transaction'];
                        const CATEGORY_ALIASES = ['category', 'cat', 'type', 'classification'];
                        const AMOUNT_ALIASES = ['cad$', 'usd$', 'amount', 'sum', 'value', 'charge', 'payment', 'amount$', 'transaction amount', 'amount cad', 'amount usd'];
                        const DEBIT_ALIASES = ['debit', 'withdrawal', 'withdrawals', 'expense', 'charge'];
                        const CREDIT_ALIASES = ['credit', 'deposit', 'deposits', 'income', 'refund'];

                        fs.createReadStream(filePath)
                            .pipe(csv({ separator }))
                            .on('data', (data) => {
                                const normalized = normalizeRowKeys(data);
                                
                                const rawDate = findValueByKeys(normalized, DATE_ALIASES);
                                const parsedDate = parseCSVDate(rawDate);
                                
                                const desc1 = normalized['description 1'] || '';
                                const desc2 = normalized['description 2'] || '';
                                let desc = '';
                                if (desc1 && desc2) {
                                    desc = `${desc1} - ${desc2}`;
                                } else {
                                    desc = desc1 || desc2 || findValueByKeys(normalized, DESC_ALIASES) || '';
                                }
                                desc = desc.trim();

                                const categoryHeader = findValueByKeys(normalized, CATEGORY_ALIASES) || '';

                                let amount = null;
                                let inferredType = 'Expense';

                                // 1. Try Amount aliases
                                const rawAmount = findValueByKeys(normalized, AMOUNT_ALIASES);
                                if (rawAmount !== null && rawAmount !== '') {
                                    const parsedAmount = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, ''));
                                    if (!isNaN(parsedAmount)) {
                                        amount = Math.abs(parsedAmount);
                                        inferredType = parsedAmount > 0 ? 'Income' : 'Expense';
                                    }
                                }

                                // 2. Try Debit and Credit aliases if Amount is not found
                                if (amount === null) {
                                    const rawDebit = findValueByKeys(normalized, DEBIT_ALIASES);
                                    const rawCredit = findValueByKeys(normalized, CREDIT_ALIASES);

                                    if (rawDebit !== null && rawDebit !== '') {
                                        const parsedDebit = parseFloat(String(rawDebit).replace(/[^0-9.-]/g, ''));
                                        if (!isNaN(parsedDebit) && parsedDebit !== 0) {
                                            amount = Math.abs(parsedDebit);
                                            inferredType = 'Expense';
                                        }
                                    }

                                    if (amount === null && rawCredit !== null && rawCredit !== '') {
                                        const parsedCredit = parseFloat(String(rawCredit).replace(/[^0-9.-]/g, ''));
                                        if (!isNaN(parsedCredit) && parsedCredit !== 0) {
                                            amount = Math.abs(parsedCredit);
                                            inferredType = 'Income';
                                        }
                                    }
                                }

                                if (parsedDate && amount !== null) {
                                    const descLower = desc.toLowerCase();
                                    
                                    if (descLower.includes('transfer') || descLower.includes('savings') || descLower.includes('cc payment') || descLower.includes('credit card payment') || descLower.includes('wire')) {
                                        inferredType = 'Transfer';
                                    } else if (descLower.includes('reimburse') || descLower.includes('expensify') || descLower.includes('corporate refund')) {
                                        inferredType = 'Reimbursable';
                                    } else if (descLower.includes('schwab') || descLower.includes('fidelity') || descLower.includes('vanguard') || descLower.includes('investment') || descLower.includes('buy stock')) {
                                        inferredType = 'Investment';
                                    }

                                    let inferredCategory = categoryHeader || 'Other';
                                    if (inferredType === 'Transfer') {
                                        inferredCategory = 'Bank Transfer';
                                    } else if (inferredType === 'Investment') {
                                        inferredCategory = 'Stocks/Mutual Funds';
                                    } else if (inferredType === 'Reimbursable') {
                                        inferredCategory = 'Business Reimbursement';
                                    } else if (inferredType === 'Income' && (!categoryHeader || categoryHeader.toLowerCase().includes('uncategorized'))) {
                                        inferredCategory = 'Salary';
                                    }

                                    results.push({
                                        date: parsedDate,
                                        amount: amount,
                                        type: inferredType,
                                        category: inferredCategory,
                                        description: desc || inferredCategory
                                    });
                                }
                            })
                            .on('end', () => resolveCsv(results))
                            .on('error', (errC) => rejectCsv(errC));
                    });
                } else {
                    throw new Error("Unsupported file type: " + mimeType);
                }

                // Resolve or create Bank Account
                let bankAccountId = null;
                const searchNum = account_number || 'NONE_AVAILABLE';
                
                const existingAcc = await new Promise((resolveAcc) => {
                    db.get(
                        "SELECT * FROM bank_accounts WHERE (account_number = ? AND account_number IS NOT NULL AND account_number != '') OR (name = ? AND (account_number IS NULL OR account_number = ''))",
                        [searchNum, bank_name],
                        (errA, row) => {
                            if (errA) resolveAcc(null);
                            else resolveAcc(row);
                        }
                    );
                });

                if (existingAcc) {
                    bankAccountId = existingAcc.id;
                } else {
                    // Create new bank account
                    const accName = account_number ? `${bank_name} ending in ${account_number}` : bank_name;
                    const accLabel = account_number ? `${bank_name} ${account_number}` : bank_name;
                    const type = account_type || 'Checking';
                    
                    bankAccountId = await new Promise((resolveNew, rejectNew) => {
                        db.run(
                            "INSERT INTO bank_accounts (name, type, account_number, label) VALUES (?, ?, ?, ?)",
                            [accName, type, account_number || null, accLabel],
                            function(errN) {
                                if (errN) rejectNew(errN);
                                else resolveNew(this.lastID);
                            }
                        );
                    });
                }

                // Insert transactions
                let addedCount = 0;
                const dates = [];
                for (const t of transactions) {
                    t.bank_account_id = bankAccountId;
                    t.document_id = documentId;
                    dates.push(t.date);

                    const isDup = await isDuplicate(t);
                    if (!isDup) {
                        await insertTransaction(t);
                        addedCount++;
                    }
                }

                // Calculate date range
                let dateRangeStart = null;
                let dateRangeEnd = null;
                if (dates.length > 0) {
                    dates.sort();
                    dateRangeStart = dates[0];
                    dateRangeEnd = dates[dates.length - 1];
                }

                const lastScannedAt = new Date().toISOString();

                // Update document record in DB
                await new Promise((resDocUp, rejDocUp) => {
                    const updateQuery = `
                        UPDATE documents 
                        SET status = 'scanned', 
                            bank_account_id = ?, 
                            date_range_start = ?, 
                            date_range_end = ?, 
                            last_scanned_at = ?, 
                            transaction_count = ?,
                            error_message = NULL
                        WHERE id = ?
                    `;
                    db.run(updateQuery, [bankAccountId, dateRangeStart, dateRangeEnd, lastScannedAt, addedCount, documentId], (errU) => {
                        if (errU) rejDocUp(errU);
                        else resDocUp();
                    });
                });

                resolve({
                    added: addedCount,
                    totalFound: transactions.length,
                    dateRangeStart,
                    dateRangeEnd
                });

            } catch (scanError) {
                console.error("Scan error for document ID", documentId, ":", scanError);
                const errMsg = scanError.message || String(scanError);
                await new Promise((resErr) => {
                    db.run("UPDATE documents SET status = 'failed', error_message = ? WHERE id = ?", [errMsg, documentId], () => {
                        resErr();
                    });
                });
                reject(scanError);
            }
        });
    });
};

// POST /api/upload (handles bulk/single files, runs instantly without scanning)
router.post('/upload', upload.array('file'), async (req, res) => {
    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
    }

    const uploaded = [];
    const skipped = [];

    for (const file of files) {
        const filename = file.originalname;
        const storagePath = file.path;
        const mimeType = file.mimetype;
        const size = file.size;
        const uploadDate = new Date().toISOString();

        try {
            // Check for duplicate document
            const duplicateDoc = await new Promise((resolve, reject) => {
                db.get("SELECT id FROM documents WHERE filename = ? AND size = ?", [filename, size], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            if (duplicateDoc) {
                fs.unlinkSync(storagePath); // Clean up temp file
                skipped.push({ filename, reason: "File already uploaded" });
                continue;
            }

            // Save document record in DB
            const docId = await new Promise((resolve, reject) => {
                const query = `
                    INSERT INTO documents (filename, storage_path, mime_type, size, upload_date, status)
                    VALUES (?, ?, ?, ?, ?, 'uploaded')
                `;
                db.run(query, [filename, storagePath, mimeType, size, uploadDate], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });

            uploaded.push({ id: docId, filename, status: 'uploaded' });

        } catch (err) {
            if (fs.existsSync(storagePath)) {
                try { fs.unlinkSync(storagePath); } catch (e) {}
            }
            skipped.push({ filename, reason: err.message });
        }
    }

    res.json({
        message: `Processed ${files.length} upload(s).`,
        uploaded,
        skipped
    });
});

// GET /api/documents
router.get('/documents', (req, res) => {
    const query = `
        SELECT d.*, b.name as bank_account_name, b.label as bank_account_label, b.account_number as bank_account_number
        FROM documents d
        LEFT JOIN bank_accounts b ON d.bank_account_id = b.id
        ORDER BY d.upload_date DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// POST /api/documents/:id/scan
router.post('/documents/:id/scan', async (req, res) => {
    const { id } = req.params;
    try {
        const scanResult = await processDocumentScan(parseInt(id));
        res.json({
            message: "Document scanned successfully",
            ...scanResult
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to scan document: " + error.message });
    }
});

// DELETE /api/documents/:id
router.delete('/documents/:id', (req, res) => {
    const { id } = req.params;
    
    // Get file path to delete physical file
    db.get("SELECT storage_path FROM documents WHERE id = ?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Document not found" });
        }
        
        const storagePath = row.storage_path;
        
        // Delete transactions, then document record
        db.serialize(() => {
            db.run("DELETE FROM transactions WHERE document_id = ?", [id], (errTx) => {
                if (errTx) console.error("Error deleting transactions for document ID:", id, errTx);
            });
            
            db.run("DELETE FROM documents WHERE id = ?", [id], function(errDoc) {
                if (errDoc) {
                    return res.status(500).json({ error: errDoc.message });
                }
                
                // Delete physical file
                if (fs.existsSync(storagePath)) {
                    try {
                        fs.unlinkSync(storagePath);
                    } catch (fileErr) {
                        console.error("Error deleting document file from disk:", fileErr);
                    }
                }
                
                res.json({ message: "Document and its transactions deleted successfully." });
            });
        });
    });
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
                const query = `
                    UPDATE transactions 
                    SET 
                        category = ?, 
                        type = COALESCE((SELECT type FROM categories WHERE categories.name = ?), 'Expense')
                    WHERE 
                        description LIKE ? AND (category != ? OR category IS NULL)
                `;

                await new Promise((resolve, reject) => {
                    db.run(query, [rule.category, rule.category, pattern, rule.category], function (err) {
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
    const { name, type, account_number, label } = req.body;
    if (!name || !type) {
        return res.status(400).json({ error: "Name and type are required" });
    }
    const query = `INSERT INTO bank_accounts (name, type, account_number, label) VALUES (?, ?, ?, ?)`;
    db.run(query, [name, type, account_number || null, label || name], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, name, type, account_number, label: label || name });
    });
});

// PUT /api/bank-accounts/:id
router.put('/bank-accounts/:id', (req, res) => {
    const { name, type, account_number, label } = req.body;
    const { id } = req.params;
    const query = `UPDATE bank_accounts SET name = ?, type = ?, account_number = ?, label = ? WHERE id = ?`;
    db.run(query, [name, type, account_number || null, label || name, id], function (err) {
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
    
    db.serialize(() => {
        // 1. Delete all transactions linked to this bank account
        db.run("DELETE FROM transactions WHERE bank_account_id = ?", [id], (err1) => {
            if (err1) {
                res.status(500).json({ error: err1.message });
                return;
            }
            
            // 2. Delete the bank account
            db.run("DELETE FROM bank_accounts WHERE id = ?", [id], function (err2) {
                if (err2) {
                    res.status(500).json({ error: err2.message });
                    return;
                }
                
                // 3. Reset documents that were mapped to this bank account
                db.run(
                    "UPDATE documents SET bank_account_id = NULL, status = 'uploaded', transaction_count = 0, date_range_start = NULL, date_range_end = NULL, last_scanned_at = NULL WHERE bank_account_id = ?", 
                    [id], 
                    (err3) => {
                        if (err3) {
                            res.status(500).json({ error: err3.message });
                            return;
                        }
                        res.json({ message: "Bank account and all associated transactions deleted successfully." });
                    }
                );
            });
        });
    });
});

// --- Categories API ---

// GET /api/categories
router.get('/categories', (req, res) => {
    db.all("SELECT * FROM categories ORDER BY type, name", [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// POST /api/categories
router.post('/categories', (req, res) => {
    const { name, type } = req.body;
    if (!name) {
        res.status(400).json({ error: "Name is required" });
        return;
    }
    const query = "INSERT INTO categories (name, type) VALUES (?, ?)";
    db.run(query, [name, type || 'Expense'], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ id: this.lastID, name, type: type || 'Expense' });
    });
});

// DELETE /api/categories/:id
router.delete('/categories/:id', (req, res) => {
    const { id } = req.params;
    db.run("DELETE FROM categories WHERE id = ?", [id], function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Category deleted", changes: this.changes });
    });
});

// PUT /api/categories/:id
router.put('/categories/:id', (req, res) => {
    const { name, type } = req.body;
    const { id } = req.params;
    
    let query = `UPDATE categories SET `;
    const fields = [];
    const params = [];
    if (name) {
        fields.push("name = ?");
        params.push(name);
    }
    if (type) {
        fields.push("type = ?");
        params.push(type);
    }
    if (fields.length === 0) {
        return res.status(400).json({ error: "Nothing to update" });
    }
    query += fields.join(", ") + " WHERE id = ?";
    params.push(id);
    
    db.run(query, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: "Category updated", changes: this.changes });
    });
});
