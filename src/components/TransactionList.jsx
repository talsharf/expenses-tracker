import React, { useState } from 'react';
import { deleteTransaction, updateTransaction, createRule } from '../api/client';

export const TransactionList = ({ data, sortConfig, onSort, onTransactionUpdated, accounts = [], categories = [], rules = [] }) => {
    const [editingField, setEditingField] = useState(null); // { id, field: 'category' | 'type' }
    const [editCategory, setEditCategory] = useState('');
    const [editType, setEditType] = useState('Expense');

    const renderDescription = (description, category) => {
        if (!description) return '';
        if (!rules || rules.length === 0 || !category) {
            return description;
        }

        // Find rules where the category matches and description contains the rule keyword
        const matchingRules = rules.filter(r => 
            r.category && 
            r.description && 
            r.description.trim() &&
            r.category.trim().toLowerCase() === category.trim().toLowerCase() && 
            description.toLowerCase().includes(r.description.trim().toLowerCase())
        );

        if (matchingRules.length === 0) {
            return description;
        }

        // Extract unique keywords sorted by length descending
        const keywords = [...new Set(matchingRules.map(r => r.description.trim()))]
            .sort((a, b) => b.length - a.length);

        const escaped = keywords.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
        const parts = description.split(regex);

        return (
            <span>
                {parts.map((part, index) => {
                    const isMatch = keywords.some(k => k.toLowerCase() === part.toLowerCase());
                    if (isMatch) {
                        return (
                            <mark
                                key={index}
                                style={{
                                    backgroundColor: 'rgba(255, 152, 0, 0.28)',
                                    color: '#ffb74d',
                                    padding: '2px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid rgba(255, 152, 0, 0.45)',
                                    fontWeight: '500',
                                    display: 'inline'
                                }}
                                title={`Rule matched keyword "${part}" for category "${category}"`}
                            >
                                {part}
                            </mark>
                        );
                    }
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                })}
            </span>
        );
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        if (sortConfig.direction === 'asc') return '↑';
        return '↓';
    };

    const getAccountName = (id) => {
        if (!id) return '';
        const acc = accounts.find(a => a.id === id);
        return acc ? (acc.label || acc.name) : '';
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this transaction?")) return;
        try {
            await deleteTransaction(id);
            if (onTransactionUpdated) onTransactionUpdated();
        } catch (error) {
            console.error("Failed to delete transaction:", error);
            alert("Failed to delete transaction");
        }
    };

    const startEditing = (transaction, field) => {
        setEditingField({ id: transaction.id, field });
        if (field === 'category') {
            setEditCategory(transaction.category);
        } else if (field === 'type') {
            setEditType(transaction.type || 'Expense');
        }
    };

    const saveCategory = async (transaction, newCategory) => {
        if (newCategory === transaction.category) {
            setEditingField(null);
            return;
        }

        try {
            // 1. Update Transaction Category
            await updateTransaction(transaction.id, { category: newCategory });

            // 2. Create Rule automatically
            const descriptionKeyword = transaction.description;
            if (descriptionKeyword) {
                await createRule({ category: newCategory, description: descriptionKeyword });
            }

            setEditingField(null);
            if (onTransactionUpdated) onTransactionUpdated();
        } catch (error) {
            console.error("Failed to update transaction category:", error);
            alert("Failed to update transaction category");
        }
    };

    const saveType = async (transaction, newType) => {
        if (newType === transaction.type) {
            setEditingField(null);
            return;
        }

        try {
            // Cascading category change: pick first category belonging to the new type
            const availableCategories = categories.filter(c => c.type === newType);
            let newCategory = transaction.category;

            // If current category doesn't fit the new type, we reset it
            const isValid = categories.some(c => c.name === transaction.category && c.type === newType);
            if (!isValid) {
                if (availableCategories.length > 0) {
                    newCategory = availableCategories[0].name;
                } else {
                    // Fallbacks if no categories exist for this type yet
                    if (newType === 'Income') newCategory = 'Salary';
                    else if (newType === 'Transfer') newCategory = 'Bank Transfer';
                    else if (newType === 'Investment') newCategory = 'Stocks/Mutual Funds';
                    else if (newType === 'Reimbursable') newCategory = 'Business Reimbursement';
                    else newCategory = 'Other Expense';
                }
            }

            // Update Transaction Type & Category in database
            await updateTransaction(transaction.id, { type: newType, category: newCategory });

            setEditingField(null);
            if (onTransactionUpdated) onTransactionUpdated();
        } catch (error) {
            console.error("Failed to update transaction type:", error);
            alert("Failed to update transaction type");
        }
    };

    const getCategoryOptions = (type) => {
        const matching = categories.filter(c => c.type === (type || 'Expense'));
        if (matching.length > 0) {
            return matching.map(c => c.name);
        }
        // Fallbacks
        if (type === 'Income') return ['Salary', 'Freelance', 'Bonus', 'Other Income'];
        if (type === 'Transfer') return ['Bank Transfer', 'Credit Card Payment'];
        if (type === 'Investment') return ['Stocks/Mutual Funds', 'Retirement Account'];
        if (type === 'Reimbursable') return ['Business Reimbursement', 'Shared Bill Split'];
        return ['Food', 'Shopping', 'Transport', 'Utilities', 'Housing', 'Entertainment', 'Health', 'Travel', 'Other Expense'];
    };

    const typeColors = {
        'Income': { bg: 'rgba(3, 218, 198, 0.15)', fg: '#03DAC6' },
        'Expense': { bg: 'rgba(187, 134, 252, 0.15)', fg: '#bb86fc' },
        'Transfer': { bg: 'rgba(136, 136, 136, 0.15)', fg: '#888888' },
        'Reimbursable': { bg: 'rgba(255, 159, 64, 0.15)', fg: '#FF9F40' },
        'Investment': { bg: 'rgba(54, 162, 235, 0.15)', fg: '#36A2EB' }
    };

    const formatAmount = (item) => {
        const amtStr = `$${(item.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        if (item.type === 'Income') {
            return <span style={{ color: '#03DAC6', fontWeight: 'bold' }}>+{amtStr}</span>;
        }
        if (item.type === 'Expense') {
            return <span style={{ color: '#CF6679' }}>-{amtStr}</span>;
        }
        if (item.type === 'Reimbursable') {
            return <span style={{ color: '#FF9F40' }}>{amtStr}</span>;
        }
        if (item.type === 'Investment') {
            return <span style={{ color: '#36A2EB' }}>{amtStr}</span>;
        }
        return <span style={{ color: '#888888' }}>{amtStr}</span>;
    };

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
                            <th onClick={() => onSort('type')} style={{ textAlign: 'left', cursor: 'pointer' }}>Type {getSortIndicator('type')}</th>
                            <th onClick={() => onSort('category')} style={{ textAlign: 'left', cursor: 'pointer' }}>Category {getSortIndicator('category')}</th>
                            <th onClick={() => onSort('amount')} style={{ cursor: 'pointer', textAlign: 'right' }}>Amount {getSortIndicator('amount')}</th>
                            <th style={{ width: '50px' }}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => {
                            const badge = typeColors[item.type || 'Expense'] || { bg: '#333', fg: '#fff' };
                            const categoryOptions = getCategoryOptions(item.type);

                            return (
                                <tr key={item.id} style={{ borderBottom: '1px solid #333' }}>
                                    <td style={{ padding: '12px', color: '#b0b0b0' }}>{item.date}</td>
                                    <td style={{ padding: '12px', color: '#888' }}>{getAccountName(item.bank_account_id)}</td>
                                    <td style={{ padding: '12px', color: 'white' }}>{renderDescription(item.description, item.category)}</td>
                                    <td style={{ padding: '12px' }}>
                                        {editingField && editingField.id === item.id && editingField.field === 'type' ? (
                                            <select
                                                value={editType}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setEditType(newVal);
                                                    saveType(item, newVal);
                                                }}
                                                onBlur={() => setEditingField(null)}
                                                autoFocus
                                                style={{ padding: '4px', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                                            >
                                                <option value="Expense">Expense</option>
                                                <option value="Income">Income</option>
                                                <option value="Transfer">Transfer</option>
                                                <option value="Reimbursable">Reimbursable</option>
                                                <option value="Investment">Investment</option>
                                            </select>
                                        ) : (
                                            <span
                                                onClick={() => startEditing(item, 'type')}
                                                style={{
                                                    cursor: 'pointer',
                                                    padding: '4px 8px',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: badge.bg,
                                                    color: badge.fg
                                                }}
                                                title="Click to edit type"
                                            >
                                                {item.type || 'Expense'}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        {editingField && editingField.id === item.id && editingField.field === 'category' ? (
                                            <select
                                                value={editCategory}
                                                onChange={(e) => {
                                                    const newVal = e.target.value;
                                                    setEditCategory(newVal);
                                                    saveCategory(item, newVal);
                                                }}
                                                onBlur={() => setEditingField(null)}
                                                autoFocus
                                                style={{ padding: '4px', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                                            >
                                                {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        ) : (
                                            <span
                                                onClick={() => startEditing(item, 'category')}
                                                style={{ cursor: 'pointer', borderBottom: '1px dashed #555', color: '#e0e0e0' }}
                                                title="Click to edit category"
                                            >
                                                {item.category || 'Other'}
                                            </span>
                                        )}
                                    </td>
                                    <td style={{ padding: '12px', textAlign: 'right' }}>{formatAmount(item)}</td>
                                    <td style={{ padding: '12px', textAlign: 'center' }}>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ff6b6b' }}
                                            title="Delete Transaction"
                                        >
                                            🗑️
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#888' }}>
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
