import React from 'react';

export const TransactionList = ({ data, sortConfig, onSort }) => {
    const getSortIndicator = (key) => {
        if (sortConfig.key !== key) return '↕'; // Neutral
        if (sortConfig.direction === 'asc') return '↑';
        return '↓';
    };

    return (
        <div className="transaction-list-section card">
            <h2>Recent Transactions</h2>
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => onSort('date')}>Date {getSortIndicator('date')}</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th onClick={() => onSort('amount')}>Amount {getSortIndicator('amount')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.id}>
                                <td>{item.date}</td>
                                <td>{item.description}</td>
                                <td>{item.category}</td>
                                <td>${item.amount.toFixed(2)}</td>
                            </tr>
                        ))}
                        {data.length === 0 && (
                            <tr>
                                <td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>
                                    No transactions found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
