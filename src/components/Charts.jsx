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

export const BarChartComponent = ({ data, dateRange, type }) => {
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
                label: MONTHS[m],
                year: y
            });
            current.setMonth(current.getMonth() + 1);
        }

        // If range is invalid or empty, handle gracefully
        if (months.length === 0) return { labels: [], datasets: [] };

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

    return <Bar data={chartData} options={options} />;
};

export const PieChartComponent = ({ data, onCategoryClick, type }) => {
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

    return <Pie data={chartData} options={options} />;
};
