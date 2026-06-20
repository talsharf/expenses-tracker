import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AccountsModal = ({ isOpen, onClose }) => {
    const [accounts, setAccounts] = useState([]);
    const [newAccount, setNewAccount] = useState({ name: '', type: '' });
    const [editingId, setEditingId] = useState(null);
    const [editingField, setEditingField] = useState(null); // 'name' or 'type'
    const [editForm, setEditForm] = useState({ name: '', type: '' });
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
            setError('Failed to fetch accounts');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddAccount = async () => {
        if (!newAccount.name || !newAccount.type) return;
        try {
            await axios.post('http://localhost:3000/api/bank-accounts', newAccount);
            setNewAccount({ name: '', type: '' });
            fetchAccounts();
        } catch (err) {
            setError('Failed to add account');
            console.error(err);
        }
    };

    const handleDeleteAccount = async (id) => {
        try {
            await axios.delete(`http://localhost:3000/api/bank-accounts/${id}`);
            fetchAccounts();
        } catch (err) {
            setError('Failed to delete account');
            console.error(err);
        }
    };

    const startEdit = (account, field) => {
        setEditingId(account.id);
        setEditingField(field);
        setEditForm({ name: account.name, type: account.type });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingField(null);
        setEditForm({ name: '', type: '' });
    };

    const handleUpdateAccount = async (id, data) => {
        try {
            await axios.put(`http://localhost:3000/api/bank-accounts/${id}`, data);
            setEditingId(null);
            setEditingField(null);
            fetchAccounts();
        } catch (err) {
            setError('Failed to update account');
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
                width: '600px', maxHeight: '80vh', overflowY: 'auto', position: 'relative'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'white' }}>&times;</button>
                <h2>Manage Bank Accounts</h2>

                {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

                <div className="add-account-form" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h3>Add New Account</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Account Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Chase Checking"
                                value={newAccount.name}
                                onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                                style={{ width: '100%', padding: '8px' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Type</label>
                            <select
                                value={newAccount.type}
                                onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
                                style={{ width: '100%', padding: '8px' }}
                            >
                                <option value="">Select Type</option>
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
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                opacity: (!newAccount.name || !newAccount.type) ? 0.6 : 1
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div className="accounts-list">
                    <h3>Existing Accounts</h3>
                    {loading ? <p>Loading...</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Name</th>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Type</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map(account => (
                                    <tr key={account.id} style={{ borderBottom: '1px solid #eee' }}>
                                        <td style={{ padding: '10px' }}>
                                            {editingId === account.id && editingField === 'name' ? (
                                                <input
                                                    type="text"
                                                    value={editForm.name}
                                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleUpdateAccount(account.id, editForm);
                                                        }
                                                    }}
                                                    onBlur={() => handleUpdateAccount(account.id, editForm)}
                                                    autoFocus
                                                    onFocus={(e) => e.target.select()}
                                                    style={{ width: '100%', padding: '6px' }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(account, 'name')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
                                                    title="Click to edit"
                                                >
                                                    {account.name}
                                                </span>
                                            )}
                                        </td>
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
                                                    style={{ width: '100%', padding: '6px' }}
                                                >
                                                    {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                                </select>
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(account, 'type')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
                                                    title="Click to edit"
                                                >
                                                    {account.type}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px' }}>
                                            <button
                                                onClick={() => handleDeleteAccount(account.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                title="Delete Account"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {accounts.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No accounts defined yet.</td>
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
