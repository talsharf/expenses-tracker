import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import routes from './routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../dist'))); // Serve frontend build

// API Routes
app.use('/api', routes);

// Fallback for SPA
app.use((req, res) => {
    // Only serve index.html for GET requests that accept HTML
    if (req.method === 'GET' && req.accepts('html')) {
        const indexPath = path.join(__dirname, '../dist/index.html');
        if (fs.existsSync(indexPath)) {
            res.sendFile(indexPath);
            return;
        }
    }
    // Otherwise 404
    res.status(404).send('Not Found');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
