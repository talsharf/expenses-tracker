
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const filePath = path.join(__dirname, 'test.pdf');
const fileBlob = new Blob([fs.readFileSync(filePath)], { type: 'application/pdf' });
const formData = new FormData();
formData.append('file', fileBlob, 'test.pdf');

console.log('Uploading test.pdf...');

try {
    const response = await fetch('http://localhost:3000/api/upload', {
        method: 'POST',
        body: formData
    });

    console.log('Status:', response.status);
    console.log('Response:', await response.text());
} catch (error) {
    console.error('Fetch error:', error);
}
