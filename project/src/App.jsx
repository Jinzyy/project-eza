import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import axios from 'axios';
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
import './App.css';

const theme = {
  token: {
    colorPrimary: '#1890ff',
    borderRadius: 8,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};

// AuthContext and Provider
const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(!!sessionStorage.getItem('token'));

  // Listen for token changes in sessionStorage (e.g., logout in another tab)
  useEffect(() => {
    const handleStorageChange = () => {
      setIsAuthenticated(!!sessionStorage.getItem('token'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Function to log out user
  const logout = () => {
    sessionStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  // Function to log in user (for completeness)
  const login = (token) => {
    sessionStorage.setItem('token', token);
    setIsAuthenticated(true);
  };

  const value = {
    isAuthenticated,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Axios interceptor component to handle 401 Unauthorized globally
function AxiosInterceptor() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      response => response,
      error => {
        if (error.response && error.response.status === 401) {
          // Token invalid or expired
          logout();
          navigate('/login', { replace: true });
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, [navigate, logout]);

  return null; // This component does not render anything
}

// ProtectedRoute component to guard private routes
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

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
        element={<ProtectedRoute><Landing /></ProtectedRoute>}
      />
      <Route
        path="/purchase"
        element={<ProtectedRoute><Purchase /></ProtectedRoute>}
      />
      <Route
        path="/purchase/unload-pallet"
        element={<ProtectedRoute><UnloadPallet /></ProtectedRoute>}
      />
      <Route
        path="/purchase/unload-blong"
        element={<ProtectedRoute><UnloadBlong /></ProtectedRoute>}
      />
      <Route
        path="/purchase/stock-record"
        element={<ProtectedRoute><StockRecord /></ProtectedRoute>}
      />
      <Route
        path="/purchase/goods-receipt"
        element={<ProtectedRoute><GoodsReceipt /></ProtectedRoute>}
      />
      <Route
        path="/purchase/purchase-note"
        element={<ProtectedRoute><PurchaseNote /></ProtectedRoute>}
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
          <AxiosInterceptor />
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ConfigProvider>
  );
}

export default App;
