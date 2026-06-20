import React from 'react';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <div className="app">
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: '#ffffff', fontSize: '2.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
          Expense<span style={{ color: '#bb86fc' }}>Tracker</span>
        </h1>
        <p style={{ color: '#a0a0a0', fontSize: '1.05rem', margin: 0, fontWeight: 400 }}>
          A simple app to track and analyze your expenses, income, and transactions
        </p>
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
