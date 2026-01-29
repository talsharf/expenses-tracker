import axios from 'axios';

const client = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getTransactions = () => client.get('/transactions');
export const clearTransactions = () => client.delete('/transactions');
export const uploadFile = (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export default client;
