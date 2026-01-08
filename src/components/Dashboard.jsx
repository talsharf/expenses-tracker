import React, { useState, useEffect, useMemo } from 'react';
import { expenseData } from '../data/expenses';
import { BarChartComponent, PieChartComponent } from './Charts';
import { TransactionList } from './TransactionList';

export const Dashboard = () => {
    // Initial sort: Date Descending
    const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

    // Filters
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        category: '',
        preset: '' // '1m', '3m', '6m', '1y'
    });

    const [filteredData, setFilteredData] = useState(expenseData);

    // Initialize dates to cover range or default
    useEffect(() => {
        // Set default view to all time or specific range?
        // Plan says "default full view" on reset.
        // Let's set start/end from data bounds initially or empty to show all.
        // Actually, empty means all.
    }, []);

    // Filter Logic
    useEffect(() => {
        let data = [...expenseData];

        if (filters.startDate) {
            data = data.filter(item => item.date >= filters.startDate);
        }
        if (filters.endDate) {
            data = data.filter(item => item.date <= filters.endDate);
        }
        if (filters.category) {
            data = data.filter(item => item.type === filters.category);
        }

        setFilteredData(data);
    }, [filters]);

    // Sort Logic
    const sortedData = useMemo(() => {
        let data = [...filteredData];
        if (!sortConfig.key) return data; // No sort (default order from file? or just keep previous?)
        // Actually "Reset" means default sorting? Which is usually data order or Date Descending?
        // User said: "3rd click reset the sort".
        // Let's assume reset means 'date desc' as default or just index order.
        // Plan: "Logic: 1st click = Asc, 2nd click = Desc, 3rd click = Reset (Default sorting)"
        // Default: Date Descending.

        // If key is null/reset, we fallback to Date Desc?
        // Let's handle logic in handleSort to set key/direction.
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
            if (current.key === key) {
                if (current.direction === 'asc') return { key, direction: 'desc' };
                if (current.direction === 'desc') return { key: 'date', direction: 'desc' }; // Reset to default
            }
            return { key, direction: 'asc' };
        });
    };

    const handlePresetChange = (preset) => {
        const end = new Date();
        const start = new Date();
        const endStr = end.toISOString().split('T')[0];

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
                // Custom or reset
                return;
        }
        const startStr = start.toISOString().split('T')[0];

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
            preset: ''
        });
        setSortConfig({ key: 'date', direction: 'desc' });
    };

    // Stats
    const totalAmount = sortedData.reduce((sum, item) => sum + item.amount, 0);

    // Category Breakdown logic
    const categoryBreakdown = useMemo(() => {
        const totals = {};
        sortedData.forEach(item => {
            totals[item.type] = (totals[item.type] || 0) + item.amount;
        });
        return Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .map(([type, amount]) => ({ type, amount }));
    }, [sortedData]);


    // Unique Categories for dropdown
    const allCategories = [...new Set(expenseData.map(i => i.type))].sort();

    return (
        <div className="dashboard-container">
            {/* Middle Section (Filters) - Placed on top visually based on normal flow, but requested layout structure:
          Upper: Charts
          Middle: Filters
          Lower: List
          Wait, prompt said:
          Upper Section: Left Panel (Bar), Right Panel (Pie, List)
          Middle Section: Filter Row
          Lower Section: Transaction List
      */}

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
                        {categoryBreakdown.map(({ type, amount }) => (
                            <div
                                key={type}
                                className={`category-item ${filters.category === type ? 'active' : ''}`}
                                onClick={() => handleCategoryChange(type === filters.category ? '' : type)}
                            >
                                <span>{type}</span>
                                <span>${amount.toFixed(2)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Middle Section */}
            <section className="filters-section">
                <div className="filter-group">
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
            />
        </div>
    );
};
