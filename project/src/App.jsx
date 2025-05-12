import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Landing from './pages/Landing';
import Purchase from './pages/Purchase';
import UnloadPallet from './pages/purchase/UnloadPallet';
import UnloadBlong from './pages/purchase/UnloadBlong';
import StockRecord from './pages/purchase/StockRecord';
import GoodsReceipt from './pages/purchase/GoodsReceipt';
import PurchaseNote from './pages/purchase/PurchaseNote';
import Sales from './pages/Sales';
import SalesOrder from './pages/sales/SalesOrder';
import DeliveryOrder from './pages/sales/DeliveryOrder';
import Invoice from './pages/sales/Invoice';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
      />

      <Route
        path="/dashboard"
        element={<ProtectedRoute><Landing/></ProtectedRoute>}
      />
      <Route
        path="/purchase"
        element={<ProtectedRoute><Purchase/></ProtectedRoute>}
      />
      <Route
        path="/purchase/unload-pallet"
        element={<ProtectedRoute><UnloadPallet/></ProtectedRoute>}
      />
      <Route
        path="/purchase/unload-blong"
        element={<ProtectedRoute><UnloadBlong/></ProtectedRoute>}
      />
      <Route
        path="/purchase/stock-record"
        element={<ProtectedRoute><StockRecord/></ProtectedRoute>}
      />
      <Route
        path="/purchase/goods-receipt"
        element={<ProtectedRoute><GoodsReceipt/></ProtectedRoute>}
      />
      <Route
        path="/purchase/purchase-note"
        element={<ProtectedRoute><PurchaseNote/></ProtectedRoute>}
      />

      <Route 
        path="/sales" 
        element={<ProtectedRoute><Sales /></ProtectedRoute>} 
      />
      <Route 
        path="/sales/sales-order" 
        element={<ProtectedRoute><SalesOrder /></ProtectedRoute>} 
      />
      <Route 
        path="/sales/delivery-order" 
        element={<ProtectedRoute><DeliveryOrder /></ProtectedRoute>} 
      />
      <Route 
        path="/sales/invoice" 
        element={<ProtectedRoute><Invoice /></ProtectedRoute>} 
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
