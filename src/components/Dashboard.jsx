import React, { useState, useEffect, useMemo, useCallback } from 'react';
// import { expenseData } from '../data/expenses'; // Disabled mock data
import { BarChartComponent, PieChartComponent } from './Charts';
import { TransactionList } from './TransactionList';
import RulesModal from './RulesModal';
import AccountsModal from './AccountsModal';
import CategoriesModal from './CategoriesModal';
import DocumentsModal from './DocumentsModal';
import { getTransactions, clearTransactions, getBankAccounts, getCategories, getRules } from '../api/client';

export const Dashboard = () => {
    // Data State
    const [transactions, setTransactions] = useState([]);
    const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
    const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
    const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
    const [isCategoriesModalOpen, setIsCategoriesModalOpen] = useState(false);
    const [accounts, setAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [rules, setRules] = useState([]);

    // Initial sort: Date Descending
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        type: '', // Income, Expense, Transfer, Reimbursable, Investment
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

            const rulesRes = await getRules();
            setRules(rulesRes.data);
        } catch (error) {
            console.error("Failed to fetch dashboard data:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Filter base transactions (by date range, bank account)
    const baseTransactions = useMemo(() => {
        let data = [...transactions];
        if (filters.startDate) {
            data = data.filter(item => item.date >= filters.startDate);
        }
        if (filters.endDate) {
            data = data.filter(item => item.date <= filters.endDate);
        }
        if (filters.bankAccountId) {
            data = data.filter(item => item.bank_account_id === parseInt(filters.bankAccountId));
        }
        return data;
    }, [filters.startDate, filters.endDate, filters.bankAccountId, transactions]);

    // Apply type and category filters on top of base
    const filteredTransactions = useMemo(() => {
        let data = [...baseTransactions];
        if (filters.type) {
            data = data.filter(item => item.type === filters.type);
        }
        if (filters.category) {
            data = data.filter(item => item.category === filters.category);
        }
        return data;
    }, [baseTransactions, filters.type, filters.category]);

    // Sort Logic
    const sortedData = useMemo(() => {
        let data = [...filteredTransactions];
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
    }, [filteredTransactions, sortConfig]);

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

    const defaultDateRange = useMemo(() => {
        if (transactions.length === 0) {
            const currentYear = new Date().getFullYear();
            return { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` };
        }
        const dates = transactions.map(t => t.date).filter(Boolean).sort();
        if (dates.length === 0) {
            const currentYear = new Date().getFullYear();
            return { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` };
        }
        return {
            start: dates[0],
            end: dates[dates.length - 1]
        };
    }, [transactions]);

    const handleMonthClick = (year, monthIndex) => {
        const formattedMonth = String(monthIndex + 1).padStart(2, '0');
        const startStr = `${year}-${formattedMonth}-01`;
        const lastDay = new Date(year, monthIndex + 1, 0).getDate();
        const endStr = `${year}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`;

        setFilters(prev => ({
            ...prev,
            startDate: startStr,
            endDate: endStr,
            preset: ''
        }));
    };

    const handleCategoryChange = (category) => {
        setFilters(prev => ({ ...prev, category }));
    };

    const handleReset = () => {
        setFilters({
            startDate: '',
            endDate: '',
            type: '',
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

    // KPI Summary Calculations (from baseTransactions, ignoring type filters)
    const kpis = useMemo(() => {
        let income = 0;
        let expense = 0;
        let investment = 0;
        let reimbursable = 0;
        let transfer = 0;

        baseTransactions.forEach(item => {
            const amt = item.amount || 0;
            if (item.type === 'Income') income += amt;
            else if (item.type === 'Expense') expense += amt;
            else if (item.type === 'Investment') investment += amt;
            else if (item.type === 'Reimbursable') reimbursable += amt;
            else if (item.type === 'Transfer') transfer += amt;
        });

        return {
            income,
            expense,
            investment,
            reimbursable,
            transfer,
            net: income - expense - investment
        };
    }, [baseTransactions]);

    // Filtered Total based on currently selected filters (sortedData)
    const totalAmount = useMemo(() => {
        return sortedData.reduce((sum, item) => sum + item.amount, 0);
    }, [sortedData]);

    // Category Breakdown logic (from sortedData)
    const categoryBreakdown = useMemo(() => {
        const totals = {};
        sortedData.forEach(item => {
            totals[item.category] = (totals[item.category] || 0) + item.amount;
        });
        return Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .map(([category, amount]) => ({ category, amount }));
    }, [sortedData]);

    // Dynamic categories for dropdown, filtered by the active transaction type
    const filteredCategoriesForDropdown = useMemo(() => {
        if (!filters.type) {
            return [...new Set(categories.map(c => c.name))].sort();
        }
        return [...new Set(categories.filter(c => c.type === filters.type).map(c => c.name))].sort();
    }, [categories, filters.type]);

    return (
        <div className="dashboard-container">
            {/* Header Controls */}
            <div className="top-controls" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setIsDocumentsModalOpen(true)}
                        style={{
                            backgroundColor: '#bb86fc',
                            color: 'black',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            fontWeight: 'bold'
                        }}
                    >
                        Manage Documents
                    </button>
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
                onRulesChanged={fetchData}
                categories={categories}
            />
            <AccountsModal isOpen={isAccountsModalOpen} onClose={() => setIsAccountsModalOpen(false)} onAccountsChanged={fetchData} />
            <CategoriesModal 
                isOpen={isCategoriesModalOpen} 
                onClose={() => setIsCategoriesModalOpen(false)} 
                onCategoriesChanged={fetchData} 
            />
            <DocumentsModal 
                isOpen={isDocumentsModalOpen} 
                onClose={() => setIsDocumentsModalOpen(false)} 
                onTransactionsUpdated={fetchData}
            />

            {/* KPI Summary Cards */}
            <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '1.5rem' }}>
                <div 
                    className={`kpi-card ${filters.type === 'Income' ? 'active' : ''}`} 
                    onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'Income' ? '' : 'Income', category: '' }))}
                    style={{
                        padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #333', cursor: 'pointer',
                        borderColor: filters.type === 'Income' ? '#03DAC6' : '#333', transition: 'all 0.2s', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Total Income</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#03DAC6', marginTop: '4px' }}>
                        +${kpis.income.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div 
                    className={`kpi-card ${filters.type === 'Expense' ? 'active' : ''}`} 
                    onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'Expense' ? '' : 'Expense', category: '' }))}
                    style={{
                        padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #333', cursor: 'pointer',
                        borderColor: filters.type === 'Expense' ? '#bb86fc' : '#333', transition: 'all 0.2s', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Total Expenses</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#bb86fc', marginTop: '4px' }}>
                        -${kpis.expense.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div 
                    className={`kpi-card ${filters.type === 'Investment' ? 'active' : ''}`} 
                    onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'Investment' ? '' : 'Investment', category: '' }))}
                    style={{
                        padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #333', cursor: 'pointer',
                        borderColor: filters.type === 'Investment' ? '#36A2EB' : '#333', transition: 'all 0.2s', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Investments</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#36A2EB', marginTop: '4px' }}>
                        -${kpis.investment.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div 
                    className={`kpi-card ${filters.type === 'Reimbursable' ? 'active' : ''}`} 
                    onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'Reimbursable' ? '' : 'Reimbursable', category: '' }))}
                    style={{
                        padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #333', cursor: 'pointer',
                        borderColor: filters.type === 'Reimbursable' ? '#FF9F40' : '#333', transition: 'all 0.2s', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Reimbursable</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#FF9F40', marginTop: '4px' }}>
                        ${kpis.reimbursable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div 
                    className={`kpi-card ${filters.type === 'Transfer' ? 'active' : ''}`} 
                    onClick={() => setFilters(prev => ({ ...prev, type: prev.type === 'Transfer' ? '' : 'Transfer', category: '' }))}
                    style={{
                        padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #333', cursor: 'pointer',
                        borderColor: filters.type === 'Transfer' ? '#888888' : '#333', transition: 'all 0.2s', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Transfers</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#888888', marginTop: '4px' }}>
                        ${kpis.transfer.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>

                <div 
                    className="kpi-card" 
                    style={{
                        padding: '12px', borderRadius: '8px', backgroundColor: '#1e1e1e', border: '1px solid #333',
                        borderColor: kpis.net >= 0 ? '#03DAC6' : '#CF6679', textAlign: 'center'
                    }}
                >
                    <div style={{ fontSize: '0.8rem', color: '#888' }}>Net Cash Flow</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: kpis.net >= 0 ? '#03DAC6' : '#CF6679', marginTop: '4px' }}>
                        {kpis.net >= 0 ? '+' : ''}${kpis.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                </div>
            </div>

            {/* Upper Section */}
            <section className="charts-section">
                <div className="card chart-container-left">
                    <BarChartComponent
                        data={sortedData}
                        dateRange={{
                            start: filters.startDate || defaultDateRange.start,
                            end: filters.endDate || defaultDateRange.end
                        }}
                        type={filters.type}
                        onMonthClick={handleMonthClick}
                        hasDateFilter={!!(filters.startDate || filters.endDate || filters.preset)}
                        onResetDateRange={() => setFilters(prev => ({ ...prev, startDate: '', endDate: '', preset: '' }))}
                    />
                </div>
                <div className="right-panel">
                    <div className="card">
                        <PieChartComponent
                            data={sortedData}
                            onCategoryClick={handleCategoryChange}
                            type={filters.type}
                            selectedCategory={filters.category}
                            onResetCategory={() => handleCategoryChange('')}
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
                                    <span>${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                            <option key={acc.id} value={acc.id}>{acc.label || acc.name}</option>
                        ))}
                    </select>

                    <label>Type:</label>
                    <select
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value, category: '' }))}
                    >
                        <option value="">All Types</option>
                        <option value="Expense">Expense</option>
                        <option value="Income">Income</option>
                        <option value="Transfer">Transfer</option>
                        <option value="Reimbursable">Reimbursable</option>
                        <option value="Investment">Investment</option>
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
                        {filteredCategoriesForDropdown.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    <button className="btn-reset" onClick={handleReset}>Reset Filters</button>
                </div>

                <div className="total-stats">
                    Filtered Total: ${totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                rules={rules}
            />
        </div >
    );
};
