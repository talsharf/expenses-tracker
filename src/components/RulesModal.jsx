import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { runRules } from '../api/client';

const RulesModal = ({ isOpen, onClose, onRulesApplied, onRulesChanged, categories = [] }) => {
    const [rules, setRules] = useState([]);
    const [newRule, setNewRule] = useState({ category: '', description: '' });
    const [editingId, setEditingId] = useState(null);
    const [editingField, setEditingField] = useState(null); // 'category' or 'description'
    const [editForm, setEditForm] = useState({ category: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: '', direction: 'asc' });

    const handleSort = (key) => {
        setSortConfig(current => {
            if (current.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const sortedRules = useMemo(() => {
        if (!sortConfig.key) return rules;
        return [...rules].sort((a, b) => {
            const valA = (a[sortConfig.key] || '').toString().toLowerCase();
            const valB = (b[sortConfig.key] || '').toString().toLowerCase();
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [rules, sortConfig]);

    useEffect(() => {
        if (isOpen) {
            fetchRules(true);
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

    const fetchRules = async (showLoading = false) => {
        if (showLoading) setLoading(true);
        try {
            const res = await axios.get('http://localhost:3000/api/rules');
            setRules(res.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch rules');
            console.error(err);
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleAddRule = async () => {
        if (!newRule.category || !newRule.description) return;
        try {
            await axios.post('http://localhost:3000/api/rules', newRule);
            setNewRule({ category: '', description: '' });
            await fetchRules(false);
            if (onRulesChanged) onRulesChanged();
        } catch (err) {
            setError('Failed to add rule');
            console.error(err);
        }
    };

    const handleDeleteRule = async (id) => {
        try {
            setRules(prev => prev.filter(r => r.id !== id));
            await axios.delete(`http://localhost:3000/api/rules/${id}`);
            await fetchRules(false);
            if (onRulesChanged) onRulesChanged();
        } catch (err) {
            setError('Failed to delete rule');
            console.error(err);
            fetchRules(false);
        }
    };

    const startEdit = (rule, field) => {
        setEditingId(rule.id);
        setEditingField(field);
        setEditForm({ category: rule.category, description: rule.description });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditingField(null);
        setEditForm({ category: '', description: '' });
    };

    const handleUpdateRule = async (id, data) => {
        try {
            setRules(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
            setEditingId(null);
            setEditingField(null);
            await axios.put(`http://localhost:3000/api/rules/${id}`, data);
            await fetchRules(false);
            if (onRulesChanged) onRulesChanged();
        } catch (err) {
            setError('Failed to update rule');
            console.error(err);
            fetchRules(false);
        }
    };

    const renderCategoryDropdownOptions = () => {
        if (categories.length === 0) {
            return (
                <>
                    <option value="Food">Food</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Transport">Transport</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Housing">Housing</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Health">Health</option>
                    <option value="Travel">Travel</option>
                    <option value="Other Expense">Other Expense</option>
                    <option value="Salary">Salary</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Bonus">Bonus</option>
                    <option value="Other Income">Other Income</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card Payment">Credit Card Payment</option>
                    <option value="Business Reimbursement">Business Reimbursement</option>
                    <option value="Stocks/Mutual Funds">Stocks/Mutual Funds</option>
                    <option value="Retirement Account">Retirement Account</option>
                </>
            );
        }

        const groups = {
            'Expense': [],
            'Income': [],
            'Transfer': [],
            'Reimbursable': [],
            'Investment': []
        };
        categories.forEach(c => {
            const t = c.type || 'Expense';
            if (groups[t]) {
                groups[t].push(c.name);
            }
        });

        return Object.entries(groups).map(([type, names]) => {
            if (names.length === 0) return null;
            return (
                <optgroup label={`${type}s`} key={type} style={{ backgroundColor: '#222', color: '#888', fontStyle: 'normal' }}>
                    {names.map(name => (
                        <option value={name} key={name} style={{ backgroundColor: '#1e1e1e', color: 'white' }}>{name}</option>
                    ))}
                </optgroup>
            );
        });
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content card" style={{
                width: '600px', position: 'relative'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'white' }}>&times;</button>
                <h2>Manage Rules</h2>

                {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

                <div className="add-rule-form" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h3>Add New Rule</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '10px', alignItems: 'end' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Category</label>
                            <select
                                value={newRule.category}
                                onChange={(e) => setNewRule({ ...newRule, category: e.target.value })}
                                style={{ width: '100%', padding: '8px', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                            >
                                <option value="">Select Category</option>
                                {renderCategoryDropdownOptions()}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '5px' }}>Description Keyword</label>
                            <input
                                type="text"
                                placeholder="e.g. McDonalds"
                                value={newRule.description}
                                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddRule();
                                }}
                                style={{ width: '100%', padding: '8px', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                            />
                        </div>
                        <button
                            onClick={handleAddRule}
                            disabled={!newRule.category || !newRule.description}
                            style={{
                                backgroundColor: '#03DAC6',
                                color: 'black',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '0.9rem',
                                fontWeight: 'bold',
                                opacity: (!newRule.category || !newRule.description) ? 0.6 : 1
                            }}
                        >
                            Add
                        </button>
                    </div>
                </div>

                <div style={{ marginBottom: '2rem', textAlign: 'center' }}>
                    <button
                        onClick={async () => {
                            setLoading(true);
                            try {
                                const res = await runRules();
                                alert(`Rules applied! ${res.data.updates} transactions updated.`);
                                if (onRulesApplied) onRulesApplied();
                                fetchRules(); // Optional, but good to refresh if anything changed here (unlikely)
                            } catch (err) {
                                console.error(err);
                                alert("Failed to run rules");
                            } finally {
                                setLoading(false);
                            }
                        }}
                        style={{
                            backgroundColor: '#6200ee',
                            color: 'white',
                            border: 'none',
                            padding: '10px 20px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: 'bold',
                            width: '100%'
                        }}
                        disabled={loading}
                    >
                        {loading ? 'Running...' : 'Run All Rules on Existing Transactions'}
                    </button>
                </div>

                <div className="rules-list" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #333', borderRadius: '6px', marginTop: '1rem' }}>
                    <h3>Existing Rules</h3>
                    {loading ? <p>Loading...</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #555' }}>
                                    <th 
                                        onClick={() => handleSort('category')} 
                                        style={{ textAlign: 'left', padding: '10px', color: '#b0b0b0', cursor: 'pointer', userSelect: 'none' }}
                                        title="Sort by Category"
                                    >
                                        Category {getSortIndicator('category')}
                                    </th>
                                    <th 
                                        onClick={() => handleSort('description')} 
                                        style={{ textAlign: 'left', padding: '10px', color: '#b0b0b0', cursor: 'pointer', userSelect: 'none' }}
                                        title="Sort by Description Keyword"
                                    >
                                        Description Keyword {getSortIndicator('description')}
                                    </th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedRules.map(rule => (
                                    <tr key={rule.id} style={{ borderBottom: '1px solid #333' }}>
                                        <td style={{ padding: '10px' }}>
                                            {editingId === rule.id && editingField === 'category' ? (
                                                <select
                                                    value={editForm.category}
                                                    onChange={(e) => {
                                                        const newVal = e.target.value;
                                                        setEditForm({ ...editForm, category: newVal });
                                                        handleUpdateRule(rule.id, { ...editForm, category: newVal });
                                                    }}
                                                    onBlur={() => cancelEdit()}
                                                    autoFocus
                                                    style={{ width: '100%', padding: '6px', backgroundColor: '#1e1e1e', color: 'white', border: '1px solid #444', borderRadius: '4px' }}
                                                >
                                                    {renderCategoryDropdownOptions()}
                                                </select>
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(rule, 'category')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
                                                    title="Click to edit"
                                                >
                                                    {rule.category}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '10px' }}>
                                            {editingId === rule.id && editingField === 'description' ? (
                                                <input
                                                    type="text"
                                                    value={editForm.description}
                                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleUpdateRule(rule.id, editForm);
                                                        } else if (e.key === 'Escape') {
                                                            e.preventDefault();
                                                            cancelEdit();
                                                        }
                                                    }}
                                                    onBlur={() => {
                                                        if (editingId === rule.id) {
                                                            handleUpdateRule(rule.id, editForm);
                                                        }
                                                    }}
                                                    autoFocus
                                                    onFocus={(e) => e.target.select()}
                                                    style={{ width: '100%', padding: '6px' }}
                                                />
                                            ) : (
                                                <span
                                                    onClick={() => startEdit(rule, 'description')}
                                                    style={{ cursor: 'pointer', borderBottom: '1px dashed #ccc' }}
                                                    title="Click to edit"
                                                >
                                                    {rule.description}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ textAlign: 'center', padding: '10px' }}>
                                            <button
                                                onClick={() => handleDeleteRule(rule.id)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                title="Delete Rule"
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {rules.length === 0 && (
                                    <tr>
                                        <td colSpan="3" style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>No rules defined yet.</td>
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

export default RulesModal;
