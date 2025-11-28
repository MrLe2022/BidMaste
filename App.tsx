import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import EquipmentPage from './pages/EquipmentPage';
import QuotationsPage from './pages/QuotationsPage';
import AnalysisPage from './pages/AnalysisPage';
import SupplyRequestPage from './pages/SupplyRequestPage';
import LoginPage from './pages/LoginPage';
import UserManagementPage from './pages/UserManagementPage';
import HelpPage from './pages/HelpPage';
import { getCurrentUser, logout } from './services/storage';
import { User } from './types';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'equipment' | 'quotes' | 'analysis' | 'supply-request' | 'users' | 'help'>('equipment');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    logout();
    setCurrentUser(null);
    setActiveTab('equipment');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'equipment':
        return <EquipmentPage />;
      case 'quotes':
        return <QuotationsPage />;
      case 'analysis':
        return <AnalysisPage />;
      case 'supply-request':
        return <SupplyRequestPage />;
      case 'users':
        return currentUser?.role === 'admin' ? <UserManagementPage /> : <div className="text-center text-red-500 mt-10">Bạn không có quyền truy cập trang này.</div>;
      case 'help':
        return <HelpPage />;
      default:
        return <EquipmentPage />;
    }
  };

  if (isLoading) return null;

  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        currentUser={currentUser}
        onLogout={handleLogout}
    >
      {renderContent()}
    </Layout>
  );
}

export default App;