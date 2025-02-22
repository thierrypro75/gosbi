import { Navigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Menu, Package } from 'lucide-react';
import { useState } from 'react';

export default function Layout() {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-800">
      {/* Sidebar pour desktop */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Sidebar mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Overlay sombre */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-75"
            onClick={() => setIsSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white dark:bg-gray-900">
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header mobile avec bouton menu */}
        <div className="md:hidden bg-white dark:bg-gray-900">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center">
              <button
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-300"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="flex items-center ml-3">
                <Package className="h-6 w-6 text-blue-600" />
                <span className="ml-2 text-lg font-bold text-gray-900 dark:text-white">Gosbi</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-4">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}