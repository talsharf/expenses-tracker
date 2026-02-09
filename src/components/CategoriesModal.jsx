import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/client';

const CategoriesModal = ({ isOpen, onClose }) => {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editName, setEditName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

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
            await createCategory({ name: newCategory.trim() });
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
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditName('');
    };

    const handleUpdateCategory = async (id) => {
        if (!editName.trim()) return;
        try {
            await updateCategory(id, { name: editName.trim() });
            setEditingId(null);
            setEditName('');
            fetchCategories();
        } catch (err) {
            setError('Failed to update category');
            console.error(err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content card" style={{
                width: '500px', maxHeight: '80vh', overflowY: 'auto', position: 'relative'
            }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'white' }}>&times;</button>
                <h2>Manage Categories</h2>

                {error && <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

                <div className="add-category-form" style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #eee', borderRadius: '8px' }}>
                    <h3>Add New Category</h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            placeholder="e.g. Groceries"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                            style={{ flex: 1, padding: '8px' }}
                        />
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

                <div className="categories-list">
                    <h3>Existing Categories</h3>
                    {loading ? <p>Loading...</p> : (
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                            {categories.map(category => (
                                <li key={category.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderBottom: '1px solid #eee' }}>
                                    {editingId === category.id ? (
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onBlur={() => handleUpdateCategory(category.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleUpdateCategory(category.id);
                                                if (e.key === 'Escape') cancelEdit();
                                            }}
                                            autoFocus
                                            style={{ flex: 1, padding: '6px', marginRight: '10px' }}
                                        />
                                    ) : (
                                        <span
                                            onClick={() => startEdit(category)}
                                            style={{ cursor: 'pointer', flex: 1 }}
                                            title="Click to edit"
                                        >
                                            {category.name}
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleDeleteCategory(category.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                        title="Delete Category"
                                    >
                                        🗑️
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CategoriesModal;
