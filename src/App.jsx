import React from 'react';
import { Dashboard } from './components/Dashboard';

function App() {
  return (
    <div className="app">
      <header style={{ textAlign: 'center', marginBottom: '1rem' }}>
        <h1 style={{ color: '#ffffff', fontSize: '2.5rem', fontWeight: 800 }}>
          Expense<span style={{ color: '#bb86fc' }}>Tracker</span>
        </h1>
      </header>
      <main>
        <Dashboard />
      </main>
    </div>
  );
}

export default App;
