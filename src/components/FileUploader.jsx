import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadFiles } from '../api/client';

export const FileUploader = ({ onUploadSuccess }) => {
    const [status, setStatus] = useState(''); // 'uploading', 'success', 'error'
    const [message, setMessage] = useState('');

    const onDrop = useCallback(async (acceptedFiles) => {
        if (acceptedFiles.length === 0) return;

        setStatus('uploading');
        setMessage(`Uploading ${acceptedFiles.length} file(s)...`);

        try {
            const response = await uploadFiles(acceptedFiles);
            const { uploaded, skipped } = response.data;

            setStatus('success');
            
            let resultMessage = `Successfully uploaded ${uploaded.length} file(s) to repository.`;
            if (skipped.length > 0) {
                resultMessage += ` ${skipped.length} duplicate file(s) skipped.`;
            }
            setMessage(resultMessage);

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
        }
        // maxFiles is omitted to support bulk upload
    });

    return (
        <div className="file-uploader-container" style={{ margin: '1rem 0' }}>
            <div
                {...getRootProps()}
                className={`dropzone ${isDragActive ? 'active' : ''} ${status}`}
                style={{
                    border: '2px dashed #444',
                    borderRadius: '12px',
                    padding: '24px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: isDragActive ? '#333' : '#1e1e1e',
                    transition: 'all 0.2s ease',
                    color: '#b0b0b0'
                }}
            >
                <input {...getInputProps()} />
                {status === 'uploading' ? (
                    <p style={{ color: '#03DAC6' }}>Uploading files directly to the server repository...</p>
                ) : (
                    <p>
                        {isDragActive ? "Drop the files here..." : "Drag & drop PDF statements or CSVs here, or click to select"}
                    </p>
                )}
            </div>
            {message && (
                <div
                    className={`status-message ${status}`}
                    style={{
                        marginTop: '0.5rem',
                        fontSize: '0.9rem',
                        color: status === 'error' ? '#FF6384' : status === 'success' ? '#03DAC6' : '#b0b0b0',
                        fontWeight: '500'
                    }}
                >
                    {message}
                </div>
            )}
        </div>
    );
};
