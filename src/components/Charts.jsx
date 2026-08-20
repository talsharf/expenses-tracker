import React, { useMemo } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const BarChartComponent = ({ data, dateRange, type, onMonthClick, hasDateFilter, onResetDateRange }) => {
    const chartData = useMemo(() => {
        // 1. Generate all months in range logic
        // We need to determine the span of months involved.
        // Parse range
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);

        // Generate array of YYYY-MM keys
        const months = [];
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        const endTime = end.getTime();

        while (current.getTime() <= endTime) {
            const y = current.getFullYear();
            const m = current.getMonth();
            months.push({
                key: `${y}-${String(m + 1).padStart(2, '0')}`,
                label: `${MONTHS[m]}${start.getFullYear() !== end.getFullYear() ? ` '${String(y).slice(2)}` : ''}`,
                year: y,
                monthIndex: m
            });
            current.setMonth(current.getMonth() + 1);
        }

        // If range is invalid or empty, handle gracefully
        if (months.length === 0) return { labels: [], datasets: [], months: [] };

        // Aggregate data
        const totals = {};
        months.forEach(m => totals[m.key] = 0);

        data.forEach(item => {
            const key = item.date.substring(0, 7); // YYYY-MM
            if (totals[key] !== undefined) {
                totals[key] += item.amount;
            }
        });

        const typeColors = {
            'Income': '#03DAC6',
            'Expense': '#bb86fc',
            'Transfer': '#888888',
            'Reimbursable': '#FF9F40',
            'Investment': '#36A2EB'
        };
        const activeColor = typeColors[type] || '#bb86fc';
        const activeLabel = type ? `Total ${type}` : 'Total Expenses';

        return {
            labels: months.map(m => m.label),
            months,
            datasets: [
                {
                    label: activeLabel,
                    data: months.map(m => totals[m.key]),
                    backgroundColor: activeColor,
                    borderRadius: 4,
                },
            ],
        };
    }, [data, dateRange, type]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        onHover: (event, chartElement) => {
            if (event?.native?.target) {
                event.native.target.style.cursor = chartElement && chartElement.length > 0 ? 'pointer' : 'default';
            }
        },
        onClick: (event, elements) => {
            if (elements.length > 0 && onMonthClick && chartData.months) {
                const index = elements[0].index;
                const selectedMonth = chartData.months[index];
                if (selectedMonth) {
                    onMonthClick(selectedMonth.year, selectedMonth.monthIndex, selectedMonth.key);
                }
            }
        },
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: type ? `Monthly ${type}` : 'Monthly Expenses',
                color: '#b0b0b0',
                font: { size: 14 }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: '#333' },
                ticks: { color: '#b0b0b0' }
            },
            x: {
                grid: { display: false },
                ticks: { color: '#b0b0b0' }
            }
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {hasDateFilter && onResetDateRange && (
                <button
                    onClick={onResetDateRange}
                    title="Reset Date Range"
                    aria-label="Reset Date Range"
                    style={{
                        position: 'absolute',
                        top: '0px',
                        left: '0px',
                        zIndex: 10,
                        backgroundColor: 'rgba(30, 30, 30, 0.85)',
                        border: '1px solid #555',
                        borderRadius: '6px',
                        color: '#e0e0e0',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#383838';
                        e.currentTarget.style.borderColor = '#03DAC6';
                        e.currentTarget.style.color = '#03DAC6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(30, 30, 30, 0.85)';
                        e.currentTarget.style.borderColor = '#555';
                        e.currentTarget.style.color = '#e0e0e0';
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
            )}
            <Bar data={chartData} options={options} />
        </div>
    );
};

export const PieChartComponent = ({ data, onCategoryClick, type, selectedCategory, onResetCategory }) => {
    const chartData = useMemo(() => {
        const totals = {};
        data.forEach(item => {
            totals[item.category] = (totals[item.category] || 0) + item.amount;
        });

        const labels = Object.keys(totals);
        const values = Object.values(totals);

        // Generate colors (using a palette)
        const colors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
            '#FF9F40', '#E7E9ED', '#76D7C4', '#F7DC6F', '#C39BD3'
        ];

        return {
            labels: labels,
            datasets: [
                {
                    data: values,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 1,
                    borderColor: '#1e1e1e'
                },
            ],
        };
    }, [data]);

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: true,
                text: type ? `${type} by Category` : 'Expenses by Category',
                color: '#b0b0b0',
            }
        },
        onClick: (event, elements) => {
            if (elements.length > 0) {
                const index = elements[0].index;
                const category = chartData.labels[index];
                onCategoryClick(category);
            }
        }
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            {selectedCategory && (
                <button
                    onClick={onResetCategory}
                    title="Back to all categories"
                    aria-label="Back to all categories"
                    style={{
                        position: 'absolute',
                        top: '0px',
                        left: '0px',
                        zIndex: 10,
                        backgroundColor: 'rgba(30, 30, 30, 0.85)',
                        border: '1px solid #555',
                        borderRadius: '6px',
                        color: '#e0e0e0',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                        backdropFilter: 'blur(4px)',
                        transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#383838';
                        e.currentTarget.style.borderColor = '#03DAC6';
                        e.currentTarget.style.color = '#03DAC6';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(30, 30, 30, 0.85)';
                        e.currentTarget.style.borderColor = '#555';
                        e.currentTarget.style.color = '#e0e0e0';
                    }}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
            )}
            <Pie data={chartData} options={options} />
        </div>
    );
};
