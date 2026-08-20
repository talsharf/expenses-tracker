import axios from 'axios';

const client = axios.create({
    baseURL: 'http://localhost:3000/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

export const getTransactions = () => client.get('/transactions');
export const clearTransactions = () => client.delete('/transactions');
export const deleteTransaction = (id) => client.delete(`/transactions/${id}`);
export const updateTransaction = (id, data) => client.put(`/transactions/${id}`, data);
export const createRule = (data) => client.post('/rules', data);
export const getBankAccounts = () => client.get('/bank-accounts');
export const uploadFiles = (files) => {
    const formData = new FormData();
    // Multer upload.array('file') expects files under the 'file' key
    if (Array.isArray(files)) {
        files.forEach(file => {
            formData.append('file', file);
        });
    } else {
        formData.append('file', files);
    }
    return client.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const getDocuments = () => client.get('/documents');
export const scanDocument = (id) => client.post(`/documents/${id}/scan`);
export const deleteDocument = (id) => client.delete(`/documents/${id}`);

export const getRules = () => client.get('/rules');
export const runRules = () => client.post('/rules/run');
export const updateRule = (id, data) => client.put(`/rules/${id}`, data);
export const deleteRule = (id) => client.delete(`/rules/${id}`);

// Categories
export const getCategories = () => client.get('/categories');
export const createCategory = (data) => client.post('/categories', data);
export const deleteCategory = (id) => client.delete(`/categories/${id}`);
export const updateCategory = (id, data) => client.put(`/categories/${id}`, data);

export default client;
