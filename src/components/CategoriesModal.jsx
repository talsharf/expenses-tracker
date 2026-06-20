import React, { useState, useEffect, useMemo } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/client';

const CategoriesModal = ({ isOpen, onClose }) => {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [newCategoryType, setNewCategoryType] = useState('Expense');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState('Expense');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
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

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await getCategories();
            setCategories(res.data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch categories');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        try {
            await createCategory({ name: newCategory.trim(), type: newCategoryType });
            setNewCategory('');
            fetchCategories();
        } catch (err) {
            setError('Failed to add category');
            console.error(err);
        }
    };

    const handleDeleteCategory = async (id) => {
        if (!window.confirm("Delete this category? Transactions using it will remain unchanged but it won't appear in lists.")) return;
        try {
            await deleteCategory(id);
            fetchCategories();
        } catch (err) {
            setError('Failed to delete category');
            console.error(err);
        }
    };

    const startEdit = (category) => {
        setEditingId(category.id);
        setEditName(category.name);
        setEditType(category.type || 'Expense');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleUpdateCategory = async (id) => {
        if (!editName.trim()) return;
        try {
            await updateCategory(id, { name: editName.trim(), type: editType });
            setEditingId(null);
            setEditName('');
            fetchCategories();
        } catch (err) {
            setError('Failed to update category');
            console.error(err);
        }
    };

    // Group categories by their type
    const groupedCategories = useMemo(() => {
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
                groups[t].push(c);
            } else {
                groups[t] = [c];
            }
        });
        return groups;
    }, [categories]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content card" style={{
                width: '500px', maxHeight: '85vh', overflowY: 'auto', position: 'relative'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'white' }}>&times;</button>
                <h2>Manage Categories</h2>

                {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

                <div className="add-category-form" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h3>Add New Category</h3>
                    <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <input
                                type="text"
                                placeholder="e.g. Groceries"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                style={{ flex: 1, padding: '8px' }}
                            />
                            <select
                                value={newCategoryType}
                                onChange={(e) => setNewCategoryType(e.target.value)}
                                style={{ padding: '8px', minWidth: '120px', borderRadius: '4px', border: '1px solid #ccc' }}
                            >
                                <option value="Expense">Expense</option>
                                <option value="Income">Income</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Reimbursable">Reimbursable</option>
                                <option value="Investment">Investment</option>
                            </select>
                            <button
                                onClick={handleAddCategory}
                                disabled={!newCategory.trim()}
                                style={{
                                    backgroundColor: '#03DAC6',
                                    color: 'black',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold'
                                }}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                <div className="categories-list">
                    <h3>Existing Categories</h3>
                    {loading ? <p>Loading...</p> : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {Object.entries(groupedCategories).map(([type, list]) => {
                                if (list.length === 0) return null;
                                return (
                                    <div key={type} style={{ border: '1px solid #333', borderRadius: '6px', padding: '10px', backgroundColor: '#1e1e1e' }}>
                                        <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #444', paddingBottom: '4px', color: '#b0b0b0' }}>
                                            {type}s
                                        </h4>
                                        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                                            {list.map(category => (
                                                <li key={category.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #222' }}>
                                                    {editingId === category.id ? (
                                                        <div style={{ display: 'flex', gap: '8px', flex: 1, marginRight: '10px', alignItems: 'center' }}>
                                                            <input
                                                                type="text"
                                                                value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleUpdateCategory(category.id);
                                                                    if (e.key === 'Escape') cancelEdit();
                                                                }}
                                                                autoFocus
                                                                style={{ flex: 1, padding: '4px' }}
                                                            />
                                                            <select
                                                                value={editType}
                                                                onChange={(e) => setEditType(e.target.value)}
                                                                style={{ padding: '4px' }}
                                                            >
                                                                <option value="Expense">Expense</option>
                                                                <option value="Income">Income</option>
                                                                <option value="Transfer">Transfer</option>
                                                                <option value="Reimbursable">Reimbursable</option>
                                                                <option value="Investment">Investment</option>
                                                            </select>
                                                            <button onClick={() => handleUpdateCategory(category.id)} style={{ backgroundColor: '#03DAC6', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', color: 'black', fontSize: '0.8rem', fontWeight: 'bold' }}>Save</button>
                                                            <button onClick={cancelEdit} style={{ backgroundColor: '#555', border: 'none', padding: '4px 8px', borderRadius: '3px', cursor: 'pointer', color: 'white', fontSize: '0.8rem' }}>Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            onClick={() => startEdit(category)}
                                                            style={{ cursor: 'pointer', flex: 1, color: 'white' }}
                                                            title="Click to edit"
                                                        >
                                                            {category.name}
                                                        </span>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteCategory(category.id)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: '#ff6b6b' }}
                                                        title="Delete Category"
                                                    >
                                                        🗑️
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoriesModal;
