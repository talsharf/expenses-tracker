import React, { useState } from 'react';
import { deleteTransaction, updateTransaction, createRule } from '../api/client';

export const TransactionList = ({ data, sortConfig, onSort, onTransactionUpdated, accounts = [], categories = [] }) => {
    const [editingId, setEditingId] = useState(null);
    const [editCategory, setEditCategory] = useState('');

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        if (sortConfig.direction === 'asc') return '↑';
        return '↓';
    };



    const getAccountName = (id) => {
        if (!id) return '';
        const acc = accounts.find(a => a.id === id);
        return acc ? acc.name : '';
    };

    const handleDelete = async (id) => {
        try {
            await deleteTransaction(id);
            if (onTransactionUpdated) onTransactionUpdated();
        } catch (error) {
            console.error("Failed to delete transaction:", error);
            alert("Failed to delete transaction");
        }
    };

    const startEditing = (transaction) => {
        setEditingId(transaction.id);
        setEditCategory(transaction.category);
    };

    const saveCategory = async (transaction, newCategory) => {
        if (newCategory === transaction.category) {
            setEditingId(null);
            return;
        }

        try {
            // 1. Update Transaction
            await updateTransaction(transaction.id, { category: newCategory });

            // 2. Create Rule automatically
            const descriptionKeyword = transaction.description;
            if (descriptionKeyword) {
                await createRule({ category: newCategory, description: descriptionKeyword });
            }

            setEditingId(null);
            if (onTransactionUpdated) onTransactionUpdated();
        } catch (error) {
            console.error("Failed to update transaction:", error);
            alert("Failed to update transaction");
        }
    };

    const categoryOptions = categories.length > 0
        ? categories.map(c => c.name)
        : ["Food", "Shopping", "Transport", "Utilities", "Housing", "Entertainment", "Health", "Travel", "Income", "Other", "Uncategorized"];

    return (
        <div className="transaction-list-section card">
            <h2>Recent Transactions</h2>
            <div className="table-container">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th onClick={() => onSort('date')} style={{ cursor: 'pointer' }}>Date {getSortIndicator('date')}</th>
                            <th style={{ textAlign: 'left' }}>Account</th>
                            <th onClick={() => onSort('description')} style={{ textAlign: 'left', cursor: 'pointer' }}>Description {getSortIndicator('description')}</th>
                            <th style={{ textAlign: 'left' }}>Category</th>
                            <th onClick={() => onSort('amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Amount {getSortIndicator('amount')}</th>
                            <th style={{ width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '12px' }}>{item.date}</td>
                                <td style={{ padding: '12px', color: '#888' }}>{getAccountName(item.bank_account_id)}</td>
                                <td style={{ padding: '12px' }}>{item.description}</td>
                                <td style={{ padding: '12px' }}>
                                    {editingId === item.id ? (
                                        <select
                                            value={editCategory}
                                            onChange={(e) => {
                                                const newVal = e.target.value;
                                                setEditCategory(newVal);
                                                saveCategory(item, newVal);
                                            }}
                                            onBlur={() => setEditingId(null)}
                                            autoFocus
                                            style={{ padding: '4px' }}
                                        >
                                            {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : (
                                        <span
                                            onClick={() => startEditing(item)}
                                            style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
                                            title="Click to edit category"
                                        >
                                            {item.category}
                                        </span>
                                    )}
                                </td>
                                <td style={{ padding: '12px', textAlign: 'right' }}>${item.amount.toFixed(2)}</td>
                                <td style={{ padding: '12px', textAlign: 'center' }}>
                                    <button
                                        onClick={() => handleDelete(item.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                        title="Delete Transaction"
                                    >
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No transactions found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
