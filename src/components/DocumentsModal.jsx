import React, { useState, useEffect } from 'react';
import { getDocuments, scanDocument, deleteDocument } from '../api/client';
import { FileUploader } from './FileUploader';

const DocumentsModal = ({ isOpen, onClose, onTransactionsUpdated }) => {
    const [documents, setDocuments] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Status tracking for individual document actions
    const [activeActions, setActiveActions] = useState({}); // { [docId]: 'scanning' | 'deleting' }

    useEffect(() => {
        if (isOpen) {
            fetchDocuments();
            setSelectedIds(new Set());
            setError(null);
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
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const fetchDocuments = async () => {
        setLoading(true);
        try {
            const res = await getDocuments();
            setDocuments(res.data);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch documents:", err);
            setError("Failed to load documents from the repository.");
        } finally {
            setLoading(false);
        }
    };

    const handleOverlayClick = (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            onClose();
        }
    };

    // Format file size
    const formatSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = 2;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    // Format date string
    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        const date = new Date(isoString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Individual Row Actions
    const handleScan = async (id) => {
        setActiveActions(prev => ({ ...prev, [id]: 'scanning' }));
        try {
            await scanDocument(id);
            await fetchDocuments();
            if (onTransactionsUpdated) onTransactionsUpdated();
        } catch (err) {
            console.error(`Failed to scan document ${id}:`, err);
            setError(`Failed to scan document: ${err.response?.data?.error || err.message}`);
            // Re-fetch documents to display updated error state
            await fetchDocuments();
        } finally {
            setActiveActions(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this document? All transactions imported by this statement will be deleted permanently.")) {
            return;
        }
        setActiveActions(prev => ({ ...prev, [id]: 'deleting' }));
        try {
            await deleteDocument(id);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
            await fetchDocuments();
            if (onTransactionsUpdated) onTransactionsUpdated();
        } catch (err) {
            console.error(`Failed to delete document ${id}:`, err);
            setError(`Failed to delete document: ${err.response?.data?.error || err.message}`);
        } finally {
            setActiveActions(prev => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
            });
        }
    };

    // Bulk Actions
    const handleBulkScan = async () => {
        const idsToScan = Array.from(selectedIds);
        if (idsToScan.length === 0) return;

        setError(null);
        // Set all selected IDs to 'scanning'
        const bulkStatus = {};
        idsToScan.forEach(id => { bulkStatus[id] = 'scanning'; });
        setActiveActions(prev => ({ ...prev, ...bulkStatus }));

        // Scan sequentially to avoid overloading Gemini API limits
        for (const id of idsToScan) {
            try {
                await scanDocument(id);
            } catch (err) {
                console.error(`Failed to scan document ${id} during bulk scan:`, err);
                setError(`Bulk scan finished with some errors. Last error: ${err.response?.data?.error || err.message}`);
            } finally {
                setActiveActions(prev => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                });
            }
        }

        await fetchDocuments();
        if (onTransactionsUpdated) onTransactionsUpdated();
    };

    const handleBulkDelete = async () => {
        const idsToDelete = Array.from(selectedIds);
        if (idsToDelete.length === 0) return;

        if (!window.confirm(`Are you sure you want to delete the ${idsToDelete.length} selected documents? All transactions associated with these statements will be deleted permanently.`)) {
            return;
        }

        setError(null);
        const bulkStatus = {};
        idsToDelete.forEach(id => { bulkStatus[id] = 'deleting'; });
        setActiveActions(prev => ({ ...prev, ...bulkStatus }));

        for (const id of idsToDelete) {
            try {
                await deleteDocument(id);
                setSelectedIds(prev => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            } catch (err) {
                console.error(`Failed to delete document ${id} during bulk delete:`, err);
                setError(`Bulk delete finished with some errors.`);
            } finally {
                setActiveActions(prev => {
                    const copy = { ...prev };
                    delete copy[id];
                    return copy;
                });
            }
        }

        await fetchDocuments();
        if (onTransactionsUpdated) onTransactionsUpdated();
    };

    // Selection helper handlers
    const handleSelectRow = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(new Set(documents.map(doc => doc.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const isAllSelected = documents.length > 0 && selectedIds.size === documents.length;

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={handleOverlayClick} style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
            <div className="modal-content card" style={{
                width: '1000px', maxWidth: '95vw', maxHeight: '85vh', overflowY: 'auto', position: 'relative',
                padding: '24px', backgroundColor: '#1e1e1e', borderRadius: '16px', border: '1px solid #333'
            }}>
                {/* Close Button */}
                <button 
                    onClick={onClose} 
                    style={{ 
                        position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', 
                        fontSize: '1.8rem', cursor: 'pointer', color: '#b0b0b0', transition: 'color 0.2s' 
                    }}
                    onMouseEnter={(e) => e.target.style.color = '#ffffff'}
                    onMouseLeave={(e) => e.target.style.color = '#b0b0b0'}
                >
                    &times;
                </button>

                <h2 style={{ color: 'white', marginBottom: '8px', fontSize: '1.4rem' }}>Document Repository</h2>
                <p style={{ color: '#888', marginBottom: '20px', fontSize: '0.9rem' }}>
                    Manage uploaded Visa PDFs or regular CSV bank statements. Select documents to scan or delete in bulk.
                </p>

                <div style={{ marginBottom: '20px' }}>
                    <FileUploader onUploadSuccess={fetchDocuments} />
                </div>

                {error && (
                    <div className="error-message" style={{ 
                        color: '#cf6679', backgroundColor: 'rgba(207, 102, 121, 0.1)', 
                        padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem',
                        border: '1px solid rgba(207, 102, 121, 0.2)'
                    }}>
                        {error}
                    </div>
                )}

                {/* Bulk Actions Bar */}
                <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    marginBottom: '16px', padding: '12px', backgroundColor: '#121212', borderRadius: '8px',
                    border: '1px solid #333'
                }}>
                    <div style={{ color: '#ccc', fontSize: '0.9rem' }}>
                        {selectedIds.size} of {documents.length} document(s) selected
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            onClick={handleBulkScan}
                            disabled={selectedIds.size === 0}
                            style={{
                                backgroundColor: '#03dac6', color: 'black', border: 'none', 
                                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                                opacity: selectedIds.size === 0 ? 0.5 : 1, transition: 'opacity 0.2s'
                            }}
                        >
                            ⚡ Scan Selected
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={selectedIds.size === 0}
                            style={{
                                backgroundColor: '#cf6679', color: 'white', border: 'none', 
                                padding: '8px 16px', borderRadius: '6px', cursor: 'pointer',
                                fontSize: '0.85rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px',
                                opacity: selectedIds.size === 0 ? 0.5 : 1, transition: 'opacity 0.2s'
                            }}
                        >
                            🗑️ Delete Selected
                        </button>
                    </div>
                </div>

                {/* Documents Table */}
                <div style={{ overflowX: 'auto', border: '1px solid #333', borderRadius: '8px', backgroundColor: '#121212' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: '#b0b0b0' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #333', backgroundColor: '#181818' }}>
                                <th style={{ padding: '12px', width: '40px', textAlign: 'center' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={isAllSelected}
                                        onChange={handleSelectAll}
                                        disabled={documents.length === 0}
                                        style={{ cursor: 'pointer' }}
                                    />
                                </th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>File Details</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Uploaded</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Account Mapping</th>
                                <th style={{ textAlign: 'left', padding: '12px' }}>Date Range</th>
                                <th style={{ textAlign: 'center', padding: '12px', width: '110px' }}>Status</th>
                                <th style={{ textAlign: 'center', padding: '12px', width: '80px' }}>Tx Count</th>
                                <th style={{ textAlign: 'center', padding: '12px', width: '160px' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {documents.map(doc => {
                                const action = activeActions[doc.id];
                                const isScanning = action === 'scanning';
                                const isDeleting = action === 'deleting';
                                const isRowLoading = isScanning || isDeleting;
                                
                                return (
                                    <tr key={doc.id} style={{ 
                                        borderBottom: '1px solid #222',
                                        backgroundColor: selectedIds.has(doc.id) ? 'rgba(3, 218, 198, 0.04)' : 'transparent',
                                        transition: 'background-color 0.2s'
                                    }}>
                                        {/* Selection Checkbox */}
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <input 
                                                type="checkbox"
                                                checked={selectedIds.has(doc.id)}
                                                onChange={() => handleSelectRow(doc.id)}
                                                style={{ cursor: 'pointer' }}
                                                disabled={isRowLoading}
                                            />
                                        </td>

                                        {/* File Details (Filename & Size) */}
                                        <td style={{ padding: '12px' }}>
                                            <div style={{ color: 'white', fontWeight: '500', wordBreak: 'break-all' }}>
                                                {doc.filename}
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#666', marginTop: '2px' }}>
                                                {formatSize(doc.size)} • {doc.mime_type === 'application/pdf' ? 'PDF' : 'CSV'}
                                            </div>
                                        </td>

                                        {/* Upload Date */}
                                        <td style={{ padding: '12px', fontSize: '0.8rem' }}>
                                            {formatDate(doc.upload_date)}
                                        </td>

                                        {/* Bank Account Details */}
                                        <td style={{ padding: '12px' }}>
                                            {doc.bank_account_id ? (
                                                <div>
                                                    <div style={{ color: '#ccc', fontSize: '0.85rem', fontWeight: '500' }}>
                                                        {doc.bank_account_label || doc.bank_account_name}
                                                    </div>
                                                    {doc.bank_account_number && (
                                                        <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '1px' }}>
                                                            Account: {doc.bank_account_number}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#555', fontSize: '0.8rem', fontStyle: 'italic' }}>Pending Scan</span>
                                            )}
                                        </td>

                                        {/* Date Range */}
                                        <td style={{ padding: '12px', fontSize: '0.8rem' }}>
                                            {doc.date_range_start && doc.date_range_end ? (
                                                <div style={{ color: '#aaa' }}>
                                                    <div>From: {doc.date_range_start}</div>
                                                    <div>To: {doc.date_range_end}</div>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#555', fontStyle: 'italic' }}>—</span>
                                            )}
                                        </td>

                                        {/* Status Badge */}
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            {isScanning ? (
                                                <span style={{
                                                    display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                                                    fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: 'rgba(3, 218, 198, 0.1)', color: '#03dac6',
                                                    border: '1px solid rgba(3, 218, 198, 0.2)'
                                                }}>
                                                    Scanning...
                                                </span>
                                            ) : doc.status === 'scanned' ? (
                                                <span style={{
                                                    display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                                                    fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: 'rgba(75, 192, 192, 0.1)', color: '#4bc0c0',
                                                    border: '1px solid rgba(75, 192, 192, 0.2)'
                                                }}>
                                                    Scanned
                                                </span>
                                            ) : doc.status === 'failed' ? (
                                                <span 
                                                    title={doc.error_message || "Scan failed"}
                                                    style={{
                                                        display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                                                        fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: 'rgba(207, 102, 121, 0.1)', color: '#cf6679',
                                                        border: '1px solid rgba(207, 102, 121, 0.2)', cursor: 'help'
                                                    }}
                                                >
                                                    Failed ⚠️
                                                </span>
                                            ) : (
                                                <span style={{
                                                    display: 'inline-block', padding: '4px 8px', borderRadius: '4px',
                                                    fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: '#2c2c2c', color: '#aaa',
                                                    border: '1px solid #333'
                                                }}>
                                                    Uploaded
                                                </span>
                                            )}
                                        </td>

                                        {/* Imported Transactions Count */}
                                        <td style={{ padding: '12px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>
                                            {doc.status === 'scanned' ? doc.transaction_count : '—'}
                                        </td>

                                        {/* Actions */}
                                        <td style={{ padding: '12px', textAlign: 'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleScan(doc.id)}
                                                    disabled={isRowLoading}
                                                    title={doc.status === 'scanned' ? "Re-scan Statement" : "Scan Statement"}
                                                    style={{
                                                        background: 'none', border: '1px solid #444', color: '#03dac6',
                                                        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                                        fontSize: '0.8rem', opacity: isRowLoading ? 0.5 : 1, transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => { if (!isRowLoading) { e.target.style.backgroundColor = 'rgba(3, 218, 198, 0.1)'; } }}
                                                    onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                                                >
                                                    {doc.status === 'scanned' ? '🔄 Re-scan' : '⚡ Scan'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    disabled={isRowLoading}
                                                    title="Delete Document"
                                                    style={{
                                                        background: 'none', border: '1px solid #444', color: '#cf6679',
                                                        padding: '4px 8px', borderRadius: '4px', cursor: 'pointer',
                                                        fontSize: '0.8rem', opacity: isRowLoading ? 0.5 : 1, transition: 'all 0.2s'
                                                    }}
                                                    onMouseEnter={(e) => { if (!isRowLoading) { e.target.style.backgroundColor = 'rgba(207, 102, 121, 0.1)'; } }}
                                                    onMouseLeave={(e) => { e.target.style.backgroundColor = 'transparent'; }}
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            
                            {documents.length === 0 && !loading && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#666', fontSize: '0.95rem' }}>
                                        📂 No documents uploaded yet. Close this modal and drop statements to begin!
                                    </td>
                                </tr>
                            )}
                            
                            {loading && documents.length === 0 && (
                                <tr>
                                    <td colSpan="8" style={{ textAlign: 'center', padding: '36px', color: '#888' }}>
                                        🔄 Loading repository files...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: '#2c2c2c', color: 'white', border: '1px solid #444',
                            padding: '8px 20px', borderRadius: '6px', cursor: 'pointer',
                            fontSize: '0.85rem', fontWeight: 'bold', transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#383838'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#2c2c2c'}
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DocumentsModal;
