import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFile } from '../api/client';

export const FileUploader = ({ onUploadSuccess }) => {
    const [status, setStatus] = useState(''); // 'uploading', 'success', 'error'
    const [message, setMessage] = useState('');

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        const file = acceptedFiles[0];
        setStatus('uploading');
        setMessage(`Uploading ${file.name}...`);

        try {
            const response = await uploadFile(file);
            setStatus('success');
            const { added, totalFound } = response.data;
            setMessage(`Success! Added ${added} new transactions (skipped ${totalFound - added} duplicates).`);
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage(error.response?.data?.error || 'Upload failed. Please try again.');
        }
    }, [onUploadSuccess]);

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
        </div>
    );
};
