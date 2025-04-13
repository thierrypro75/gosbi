import { Link, useLocation } from 'react-router-dom';
import { Package, LayoutDashboard, ShoppingCart, X, LogOut, PackagePlus, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

const navigation = [
  { name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Produits', href: '/products', icon: Package },
  { name: 'Ventes', href: '/sales', icon: ShoppingCart },
  { name: 'Approvisionnement', href: '/supplies', icon: PackagePlus },
  { name: 'CRM', href: '/crm/clients', icon: Users },
];

interface SidebarProps {
  onClose?: () => void;
}

export default function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { signOut } = useAuth();

  const isPathActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center">
          <Package className="h-8 w-8 text-blue-600" />
          <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Gosbi</span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
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
                isPathActive(item.href)
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800',
                'group flex items-center px-2 py-2 text-sm font-medium rounded-md'
              )}
            >
              <Icon
                className={cn(
                  isPathActive(item.href)
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400',
                  'mr-3 h-5 w-5'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-4 space-y-1">
        <ThemeToggle />
        <button
          onClick={() => signOut()}
          className="w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/50"
        >
          <LogOut className="mr-3 h-5 w-5 text-red-400 dark:text-red-500 group-hover:text-red-500 dark:group-hover:text-red-400" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}