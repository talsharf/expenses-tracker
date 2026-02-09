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
export const uploadFile = (file, bankAccountId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('bank_account_id', bankAccountId);
    return client.post('/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const runRules = () => client.post('/rules/run');

// Categories
export const getCategories = () => client.get('/categories');
export const createCategory = (data) => client.post('/categories', data);
export const deleteCategory = (id) => client.delete(`/categories/${id}`);
export const updateCategory = (id, data) => client.put(`/categories/${id}`, data);

export default client;
