import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Sales from './pages/Sales';
import Supplies from './pages/Supplies';
import SupplyCreate from './pages/SupplyCreate';
import SupplyReceive from './pages/SupplyReceive';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import { AuthProvider } from './contexts/AuthContext';

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <Toaster position="top-right" />
        <Layout />
      </div>
    </AuthProvider>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppContent />,
    children: [
      { path: '/', element: <Navigate to="/dashboard" /> },
      { path: '/dashboard', element: <Dashboard /> },
      { path: '/products', element: <Products /> },
      { path: '/sales', element: <Sales /> },
      { path: '/supplies', element: <Supplies /> },
      { path: '/supplies/new', element: <SupplyCreate /> },
      { path: '/supplies/:id/receive', element: <SupplyReceive /> },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
]);

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}

export default App;