import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { expenseData } from '../data/expenses'; // Disabled mock data
import { BarChartComponent, PieChartComponent } from './Charts';
import { TransactionList } from './TransactionList';
import { FileUploader } from './FileUploader';
import RulesModal from './RulesModal';
import AccountsModal from './AccountsModal';
import CategoriesModal from './CategoriesModal';
import { getTransactions, clearTransactions, getBankAccounts, getCategories } from '../api/client';

export const Dashboard = () => {
    // Data State
    const [transactions, setTransactions] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
    const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);

    // Initial sort: Date Descending
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: '',
        bankAccountId: '',
        preset: '' // '1m', '3m', '6m', '1y'
    });

    // Fetch Data
    const fetchData = useCallback(async () => {
        try {
            const response = await getTransactions();
            const data = response.data.map(item => ({
                ...item,
                date: item.date.split('T')[0] // Ensure YYYY-MM-DD
            }));
            setTransactions(data);

            const accountsRes = await getBankAccounts();
            setAccounts(accountsRes.data);

            const categoriesRes = await getCategories();
            setCategories(categoriesRes.data);
        } catch (error) {
            console.error("Failed to fetch transactions:", error);
            // Optionally set error state here
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter Logic
    useEffect(() => {
        let data = [...transactions];

        if (filters.startDate) {
            data = data.filter(item => item.date >= filters.startDate);
        }
        if (filters.endDate) {
            data = data.filter(item => item.date <= filters.endDate);
        }
        if (filters.category) {
            data = data.filter(item => item.category === filters.category);
        }
        if (filters.bankAccountId) {
            data = data.filter(item => item.bank_account_id === parseInt(filters.bankAccountId));
        }

        setFilteredData(data);
    }, [filters, transactions]);

    // Sort Logic
    const sortedData = useMemo(() => {
        let data = [...filteredData];
        if (!sortConfig.key) return data;

        return data.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });
    }, [filteredData, sortConfig]);

    // Handlers
    const handleSort = (key) => {
        setSortConfig(current => {
            if (current.key === key && current.direction === 'asc') {
                return { key, direction: 'desc' };
            }
            return { key, direction: 'asc' };
        });
    };

    const handlePresetChange = (preset) => {
        let startStr = '';
        let endStr = '';

        if (['2024', '2025', '2026'].includes(preset)) {
            startStr = `${preset}-01-01`;
            endStr = `${preset}-12-31`;
        } else {
            const end = new Date();
            const start = new Date();
            endStr = end.toISOString().split('T')[0];

            switch (preset) {
                case '1m':
                    start.setMonth(end.getMonth() - 1);
                    break;
                case '3m':
                    start.setMonth(end.getMonth() - 3);
                    break;
                case '6m':
                    start.setMonth(end.getMonth() - 6);
                    break;
                case '1y':
                    start.setFullYear(end.getFullYear() - 1);
                    break;
                default:
                    return;
            }
            startStr = start.toISOString().split('T')[0];
        }

        setFilters(prev => ({
            ...prev,
            preset,
            startDate: startStr,
            endDate: endStr
        }));
    };

    const handleDateChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({
            ...prev,
            [name]: value,
            preset: '' // Clear preset if manual change
        }));
    };

    const handleCategoryChange = (category) => {
        setFilters(prev => ({ ...prev, category }));
    };

    const handleReset = () => {
        setFilters({
            startDate: '',
            endDate: '',
            category: '',
            bankAccountId: '',
            preset: ''
        });
        setSortConfig({ key: 'date', direction: 'desc' });
    };

    const handleClearAll = async () => {
        if (window.confirm("Are you sure you want to delete ALL transactions? This cannot be undone.")) {
            try {
                await clearTransactions();
                fetchData(); // Refresh to empty state
            } catch (error) {
                console.error("Failed to clear transactions:", error);
                alert("Failed to clear data.");
            }
        }
    };

    // Stats
    const totalAmount = sortedData.reduce((sum, item) => sum + item.amount, 0);

    // Category Breakdown logic
    const categoryBreakdown = useMemo(() => {
        const totals = {};
        sortedData.forEach(item => {
            totals[item.category] = (totals[item.category] || 0) + item.amount;
        });
        return Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => ({ category, amount }));
    }, [sortedData]);


    // Unique Categories for dropdown (from ALL transactions)
    const allCategories = useMemo(() => {
        return [...new Set(transactions.map(i => i.category))].sort();
    }, [transactions]);

    return (
        <div className="dashboard-container">
            {/* Header / Upload Section */}
            <div className="top-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ flex: 1, maxWidth: '600px' }}>
                    <FileUploader onUploadSuccess={fetchData} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setIsRulesModalOpen(true)}
                        style={{
                            backgroundColor: '#03DAC6',
                            color: 'black',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Manage Rules
                    </button>
                    <button
                        onClick={() => setIsAccountsModalOpen(true)}
                        style={{
                            backgroundColor: '#03DAC6',
                            color: 'black',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Manage Accounts
                    </button>
                    <button
                        onClick={() => setIsCategoriesModalOpen(true)}
                        style={{
                            backgroundColor: '#03DAC6',
                            color: 'black',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Manage Categories
                    </button>
                    <button
                        onClick={handleClearAll}
                        style={{
                            backgroundColor: '#CF6679',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem'
                        }}
                    >
                        Clear All Data
                    </button>
                </div>
            </div>

            <RulesModal
                isOpen={isRulesModalOpen}
                onClose={() => setIsRulesModalOpen(false)}
                onRulesApplied={fetchData}
                categories={categories}
            />
            <AccountsModal isOpen={isAccountsModalOpen} onClose={() => setIsAccountsModalOpen(false)} />
            <CategoriesModal isOpen={isCategoriesModalOpen} onClose={() => setIsCategoriesModalOpen(false)} />

            {/* Upper Section */}
            <section className="charts-section">
                <div className="card chart-container-left">
                    <BarChartComponent
                        data={sortedData}
                        dateRange={{
                            start: filters.startDate || '2024-01-01',
                            end: filters.endDate || '2025-12-30'
                        }}
                    />
                </div>
                <div className="right-panel">
                    <div className="card">
                        <PieChartComponent
                            data={sortedData}
                            onCategoryClick={handleCategoryChange}
                        />
                    </div>
                    <div className="card category-list">
                        <h3>Category Breakdown</h3>
                        <div className="category-scroll-area">
                            {categoryBreakdown.map(({ category, amount }) => (
                                <div
                                    key={category}
                                    className={`category-item ${filters.category === category ? 'active' : ''}`}
                                    onClick={() => handleCategoryChange(category === filters.category ? '' : category)}
                                >
                                    <span>{category}</span>
                                    <span>${amount.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Middle Section */}
            <section className="filters-section">
                <div className="filter-group">
                    <label>Account:</label>
                    <select
                        value={filters.bankAccountId}
                        onChange={(e) => setFilters(prev => ({ ...prev, bankAccountId: e.target.value }))}
                    >
                        <option value="">All Accounts</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                    </select>

                    <label>Presets:</label>
                    <select
                        value={filters.preset}
                        onChange={(e) => handlePresetChange(e.target.value)}
                    >
                        <option value="">Select Range...</option>
                        <option value="1m">Last 1 Month</option>
                        <option value="3m">Last 3 Months</option>
                        <option value="6m">Last 6 Months</option>
                        <option value="1y">Last 1 Year</option>
                        <option value="2024">2024</option>
                        <option value="2025">2025</option>
                        <option value="2026">2026</option>
                    </select>

                    <label>From:</label>
                    <input
                        type="date"
                        name="startDate"
                        value={filters.startDate}
                        onChange={handleDateChange}
                    />
                    <label>To:</label>
                    <input
                        type="date"
                        name="endDate"
                        value={filters.endDate}
                        onChange={handleDateChange}
                    />
                </div>

                <div className="filter-group">
                    <label>Category:</label>
                    <select
                        value={filters.category}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                        <option value="">All Categories</option>
                        {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <button className="btn-reset" onClick={handleReset}>Reset Filters</button>
                </div>

                <div className="total-stats">
                    Total: ${totalAmount.toFixed(2)}
                </div>
            </section>

            {/* Lower Section */}
            <TransactionList
                data={sortedData}
                sortConfig={sortConfig}
                onSort={handleSort}
                onTransactionUpdated={fetchData}
                accounts={accounts}
                categories={categories}
            />
        </div >
    );
};
