import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import DNSLookup from './pages/DNSLookup';
import DNSExplorer from './pages/DNSExplorer';
import ResolverLab from './pages/ResolverLab';
import TroubleshootingCenter from './pages/TroubleshootingCenter';
import HistoryLearning from './pages/HistoryLearning';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="lookup" element={<DNSLookup />} />
        <Route path="explorer" element={<DNSExplorer />} />
        <Route path="resolver-lab" element={<ResolverLab />} />
        <Route path="troubleshooting" element={<TroubleshootingCenter />} />
        <Route path="history-reports" element={<HistoryLearning />} />
        <Route path="learning-center" element={<HistoryLearning />} />
        <Route path="history-learning" element={<HistoryLearning />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
