import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AccountsModal = ({ isOpen, onClose }) => {
    const [accounts, setAccounts] = useState([]);
    const [newAccount, setNewAccount] = useState({ name: '', type: '', account_number: '', label: '' });
    const [editingId, setEditingId] = useState(null);
    const [editingField, setEditingField] = useState(null); // 'name', 'type', 'account_number', 'label'
    const [editForm, setEditForm] = useState({ name: '', type: '', account_number: '', label: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchAccounts();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            onClose();
        }
    };

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3000/api/bank-accounts');
            setAccounts(res.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch bank accounts.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async () => {
        if (!newAccount.name || !newAccount.type) return;
        try {
            // If label is omitted, default it to name
            const payload = {
                ...newAccount,
                label: newAccount.label.trim() || newAccount.name.trim()
            };
            await axios.post('http://localhost:3000/api/bank-accounts', payload);
            setNewAccount({ name: '', type: '', account_number: '', label: '' });
            fetchAccounts();
        } catch (err) {
            setError('Failed to add bank account.');
            console.error(err);
        }
    };

    const handleDeleteAccount = async (id) => {
        if (!window.confirm("Are you sure you want to delete this bank account? This action cannot be undone.")) {
            return;
        }
        try {
            await axios.delete(`http://localhost:3000/api/bank-accounts/${id}`);
            fetchAccounts();
        } catch (err) {
            setError('Failed to delete account. Transactions may be using it.');
            console.error(err);
        }
    };

    const startEdit = (account, field) => {
        setEditingId(account.id);
        setEditingField(field);
        setEditForm({
            name: account.name || '',
            type: account.type || '',
            account_number: account.account_number || '',
            label: account.label || ''
        });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingField(null);
        setEditForm({ name: '', type: '', account_number: '', label: '' });
    };

    const handleUpdateAccount = async (id, data) => {
        try {
            await axios.put(`http://localhost:3000/api/bank-accounts/${id}`, data);
            setEditingId(null);
            setEditingField(null);
            fetchAccounts();
        } catch (err) {
            setError('Failed to update account details.');
            console.error(err);
        }
    };

    const accountTypes = [
        "Checking", "Savings", "Credit Card", "Investment", "Cash", "Other"
    ];

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content card" style={{
                width: '800px', maxHeight: '80vh', overflowY: 'auto', position: 'relative',
                padding: '24px', backgroundColor: '#1e1e1e', borderRadius: '12px', border: '1px solid #333'
            }}>
                <button onClick={onClose} style={{ 
                    position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', 
                    fontSize: '1.5rem', cursor: 'pointer', color: '#b0b0b0' 
                }}>&times;</button>
                <h2>Manage Bank Accounts</h2>

                {error && <div className="error-message" style={{ color: '#cf6679', marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}

                <div className="add-account-form" style={{ 
                    marginBottom: '2rem', padding: '1.25rem', border: '1px solid #333', 
                    borderRadius: '8px', backgroundColor: '#121212' 
                }}>
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#ccc' }}>Add New Account</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem' }}>Name</label>
                            <input
                                type="text"
                                placeholder="Chase Checking"
                                value={newAccount.name}
                                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem' }}>Custom Label</label>
                            <input
                                type="text"
                                placeholder="Tal's Visa"
                                value={newAccount.label}
                                onChange={(e) => setNewAccount({ ...newAccount, label: e.target.value })}
                                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem' }}>Number (digits)</label>
                            <input
                                type="text"
                                placeholder="e.g. 1234"
                                value={newAccount.account_number}
                                onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.8rem' }}>Type</label>
                            <select
                                value={newAccount.type}
                                onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                                style={{ width: '100%', padding: '8px', fontSize: '0.85rem' }}
                            >
                                <option value="">Type</option>
                                {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={handleAddAccount}
                            disabled={!newAccount.name || !newAccount.type}
                            style={{
                                backgroundColor: '#03DAC6',
                                color: 'black',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.85rem',
                                fontWeight: 'bold',
                                opacity: (!newAccount.name || !newAccount.type) ? 0.6 : 1
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div className="accounts-list">
                    <h3 style={{ marginBottom: '1rem', fontSize: '1rem', color: '#ccc' }}>Existing Accounts</h3>
                    {loading ? <p style={{ color: '#888' }}>Loading accounts...</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', color: '#b0b0b0', fontSize: '0.9rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid #333', backgroundColor: '#121212' }}>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Custom Label</th>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Account Number</th>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Type</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(account => (
                                    <tr key={account.id} style={{ borderBottom: '1px solid #222' }}>
                                        {/* Name */}
                                        <td style={{ padding: '10px' }}>
                                            {editingId === account.id && editingField === 'name' ? (
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateAccount(account.id, editForm);
                                                        else if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    onBlur={() => handleUpdateAccount(account.id, editForm)}
                                                    autoFocus
                                                    style={{ width: '100%', padding: '6px', backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #444' }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(account, 'name')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #555', color: 'white' }}
                                                    title="Click to edit"
                                                >
                                                    {account.name}
                                                </span>
                                            )}
                                        </td>

                                        {/* Label */}
                                        <td style={{ padding: '10px' }}>
                                            {editingId === account.id && editingField === 'label' ? (
                                                <input
                                                    type="text"
                                                    value={editForm.label}
                                                    onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateAccount(account.id, editForm);
                                                        else if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    onBlur={() => handleUpdateAccount(account.id, editForm)}
                                                    autoFocus
                                                    style={{ width: '100%', padding: '6px', backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #444' }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(account, 'label')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #555' }}
                                                    title="Click to edit"
                                                >
                                                    {account.label || <span style={{ color: '#555', fontStyle: 'italic' }}>None (using name)</span>}
                                                </span>
                                            )}
                                        </td>

                                        {/* Number */}
                                        <td style={{ padding: '10px' }}>
                                            {editingId === account.id && editingField === 'account_number' ? (
                                                <input
                                                    type="text"
                                                    value={editForm.account_number}
                                                    onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleUpdateAccount(account.id, editForm);
                                                        else if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    onBlur={() => handleUpdateAccount(account.id, editForm)}
                                                    autoFocus
                                                    style={{ width: '100%', padding: '6px', backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #444' }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(account, 'account_number')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #555' }}
                                                    title="Click to edit"
                                                >
                                                    {account.account_number || <span style={{ color: '#555', fontStyle: 'italic' }}>Not set</span>}
                                                </span>
                                            )}
                                        </td>

                                        {/* Type */}
                                        <td style={{ padding: '10px' }}>
                                            {editingId === account.id && editingField === 'type' ? (
                                                <select
                                                    value={editForm.type}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setEditForm({ ...editForm, type: newVal });
                                                        handleUpdateAccount(account.id, { ...editForm, type: newVal });
                                                    }}
                                                    onBlur={() => cancelEdit()}
                                                    autoFocus
                                                    style={{ width: '100%', padding: '6px', backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #444' }}
                                                >
                                                    {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(account, 'type')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #555' }}
                                                    title="Click to edit"
                                                >
                                                    {account.type}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px' }}>
                                            <button
                                                onClick={() => handleDeleteAccount(account.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                                title="Delete Account"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && (
                                    <tr>
                                        <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No accounts defined yet.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AccountsModal;
