import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Package, LayoutDashboard, ShoppingCart, X, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';

const navigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard },
  { name: 'Produits', href: '/products', icon: Package },
  { name: 'Ventes', href: '/sales', icon: ShoppingCart },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Package className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900">Gosbi</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        )}
      </div>

      <nav className="flex-1 px-2 pb-4 space-y-1 mt-5">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={cn(
                item.href === location.pathname
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
              )}
            >
              <Icon
                className={cn(
                  item.href === location.pathname
                    ? 'text-blue-600'
                    : 'text-gray-400 group-hover:text-gray-500',
                  'mr-3 h-5 w-5'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-4">
        <button
          onClick={() => signOut()}
          className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50"
        >
          <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-500" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}