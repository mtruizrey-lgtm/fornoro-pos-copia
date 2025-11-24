

import React, { useState } from 'react';
import { AppProvider, useApp } from './store/AppContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { PosMain } from './components/POS/PosMain';
import { Dashboard } from './components/Admin/Dashboard';
import { Inventory } from './components/Admin/Inventory';
import { Customers } from './components/Admin/Customers';
import { Reservations } from './components/Reservations';
import { Settings } from './components/Admin/Settings';
import { Purchases } from './components/Admin/Purchases';
import { Expenses } from './components/Admin/Expenses';
import { Reports } from './components/Admin/Reports';
import { Register } from './components/Cashier/Register';

const AppContent: React.FC = () => {
  const { currentUser } = useApp();
  const [currentView, setCurrentView] = useState('pos');

  if (!currentUser) {
    return <Login />;
  }

  const renderView = () => {
    switch(currentView) {
      case 'pos': return <PosMain />;
      case 'register': return <Register />;
      case 'dashboard': return <Dashboard />;
      case 'reports': return <Reports />;
      case 'inventory': return <Inventory />;
      case 'purchases': return <Purchases />;
      case 'expenses': return <Expenses />;
      case 'customers': return <Customers />;
      case 'reservations': return <Reservations />;
      case 'settings': return <Settings />;
      default: return <div className="p-10 text-center text-slate-500">Módulo en construcción</div>;
    }
  };

  return (
    <Layout currentView={currentView} onChangeView={setCurrentView}>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;