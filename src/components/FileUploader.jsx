import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../api/client';
import axios from 'axios';

export const FileUploader = ({ onUploadSuccess }) => {
    const [status, setStatus] = useState(''); // 'uploading', 'success', 'error'
    const [message, setMessage] = useState('');
    const [accounts, setAccounts] = useState([]);
    const [showAccountModal, setShowAccountModal] = useState(false);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [pendingFile, setPendingFile] = useState(null);

    useEffect(() => {
        fetchAccounts();
    }, []);

    const fetchAccounts = async () => {
        try {
            const res = await axios.get('http://localhost:3000/api/bank-accounts');
            setAccounts(res.data);
        } catch (err) {
            console.error("Failed to fetch accounts", err);
        }
    };

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length === 0) return;
        const file = acceptedFiles[0];
        setPendingFile(file);
        setSelectedAccountId(''); // Reset selection
        setShowAccountModal(true);
    }, []);

    const handleUpload = async () => {
        if (!pendingFile) return;

        setShowAccountModal(false);
        setStatus('uploading');
        setMessage(`Uploading ${pendingFile.name}...`);

        try {
            const response = await uploadFile(pendingFile, selectedAccountId);
            setStatus('success');
            const { added, totalFound } = response.data;
            setMessage(`Success! Added ${added} new transactions (skipped ${totalFound - added} duplicates).`);
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage(error.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setPendingFile(null);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'text/csv': ['.csv'],
            'application/vnd.ms-excel': ['.csv']
        },
        maxFiles: 1
    });

    return (
        <div className="file-uploader-container" style={{ margin: '1rem 0' }}>
            <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''} ${status}`}
                style={{
                    border: '2px dashed #444',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragActive ? '#333' : '#1e1e1e',
                    transition: 'all 0.2s ease',
                    color: '#b0b0b0'
                }}
            >
                <input {...getInputProps()} />
                {status === 'uploading' ? (
                    <p>Processing... This involves AI analysis and may take a moment.</p>
                ) : (
                    <p>
                        {isDragActive ? "Drop the file here..." : "Drag & drop PDF statement or CSV here, or click to select"}
                    </p>
                )}
            </div>
            {message && (
                <div
                    className={`status-message ${status}`}
                    style={{
                        marginTop: '0.5rem',
                        fontSize: '0.9rem',
                        color: status === 'error' ? '#FF6384' : status === 'success' ? '#4BC0C0' : '#b0b0b0'
                    }}
                >
                    {message}
                </div>
            )}

            {showAccountModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
                }}>
                    <div className="modal-content card" style={{
                        width: '400px', padding: '20px', backgroundColor: '#1e1e1e', borderRadius: '8px', textAlign: 'center'
                    }}>
                        <h3>Select Bank Account</h3>
                        <p style={{ marginBottom: '1rem', color: '#ccc' }}>
                            Which account does this statement belong to?
                        </p>

                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            style={{ width: '100%', padding: '10px', marginBottom: '20px', borderRadius: '4px' }}
                        >
                            <option value="">-- Select Account --</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
                            ))}
                        </select>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                onClick={() => { setShowAccountModal(false); setPendingFile(null); }}
                                style={{
                                    backgroundColor: '#CF6679', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUpload}
                                disabled={!selectedAccountId}
                                style={{
                                    backgroundColor: '#03DAC6', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer',
                                    opacity: !selectedAccountId ? 0.6 : 1
                                }}
                            >
                                Upload
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
