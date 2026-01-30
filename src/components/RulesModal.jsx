import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RulesModal = ({ isOpen, onClose }) => {
    const [rules, setRules] = useState([]);
    const [newRule, setNewRule] = useState({ category: '', description: '' });
    const [editingId, setEditingId] = useState(null);
    const [editingField, setEditingField] = useState(null); // 'category' or 'description'
    const [editForm, setEditForm] = useState({ category: '', description: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchRules();
        }
    }, [isOpen]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:3000/api/rules');
            setRules(res.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch rules');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRule = async () => {
        if (!newRule.category || !newRule.description) return;
        try {
            await axios.post('http://localhost:3000/api/rules', newRule);
            setNewRule({ category: '', description: '' });
            fetchRules();
        } catch (err) {
            setError('Failed to add rule');
            console.error(err);
        }
    };

    const handleDeleteRule = async (id) => {
        try {
            await axios.delete(`http://localhost:3000/api/rules/${id}`);
            fetchRules();
        } catch (err) {
            setError('Failed to delete rule');
            console.error(err);
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
            await axios.put(`http://localhost:3000/api/rules/${id}`, data);
            setEditingId(null);
            setEditingField(null);
            fetchRules();
        } catch (err) {
            setError('Failed to update rule');
            console.error(err);
        }
    };

    const categories = [
        "Food", "Shopping", "Transport", "Utilities", "Housing",
        "Entertainment", "Health", "Travel", "Income", "Other", "Uncategorized"
    ];

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content card" style={{
                width: '600px', maxHeight: '80vh', overflowY: 'auto', position: 'relative'
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
                                style={{ width: '100%', padding: '8px' }}
                            >
                                <option value="">Select Category</option>
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                                style={{ width: '100%', padding: '8px' }}
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

                <div className="rules-list">
                    <h3>Existing Rules</h3>
                    {loading ? <p>Loading...</p> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #eee' }}>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Category</th>
                                    <th style={{ textAlign: 'left', padding: '10px' }}>Description Keyword</th>
                                    <th style={{ width: '50px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {rules.map(rule => (
                                    <tr key={rule.id} style={{ borderBottom: '1px solid #eee' }}>
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
                                                    style={{ width: '100%', padding: '6px' }}
                                                >
                                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
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
                                                            handleUpdateRule(rule.id, editForm);
                                                        }
                                                    }}
                                                    onBlur={() => handleUpdateRule(rule.id, editForm)}
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
