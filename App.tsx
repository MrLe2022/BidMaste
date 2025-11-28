import React, { useState } from 'react';
import Layout from './components/Layout';
import EquipmentPage from './pages/EquipmentPage';
import QuotationsPage from './pages/QuotationsPage';
import AnalysisPage from './pages/AnalysisPage';
import SupplyRequestPage from './pages/SupplyRequestPage';

function App() {
  const [activeTab, setActiveTab] = useState<'equipment' | 'quotes' | 'analysis' | 'supply-request'>('equipment');

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
      default:
        return <EquipmentPage />;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}

export default App;