import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Purchase from './pages/Purchase';
import UnloadPallet from './pages/purchase/UnloadPallet';
import UnloadBlong from './pages/purchase/UnloadBlong';
import StockRecord from './pages/purchase/StockRecord';
import GoodsReceipt from './pages/purchase/GoodsReceipt';
import PurchaseNote from './pages/purchase/PurchaseNote';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const theme = {
  token: {
    colorPrimary: '#1890ff',
    colorSuccess: '#52c41a',
    colorWarning: '#faad14',
    colorError: '#f5222d',
    colorInfo: '#1890ff',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<ProtectedRoute><Landing /></ProtectedRoute>} />
            <Route path="/purchase" element={<ProtectedRoute><Purchase /></ProtectedRoute>} />
            <Route path="/purchase/unload-pallet" element={<ProtectedRoute><UnloadPallet /></ProtectedRoute>} />
            <Route path="/purchase/unload-blong" element={<ProtectedRoute><UnloadBlong /></ProtectedRoute>} />
            <Route path="/purchase/stock-record" element={<ProtectedRoute><StockRecord /></ProtectedRoute>} />
            <Route path="/purchase/goods-receipt" element={<ProtectedRoute><GoodsReceipt /></ProtectedRoute>} />
            <Route path="/purchase/purchase-note" element={<ProtectedRoute><PurchaseNote /></ProtectedRoute>} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;