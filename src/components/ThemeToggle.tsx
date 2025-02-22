import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'w-full group flex items-center px-2 py-2 text-sm font-medium rounded-md',
        'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
      )}
    >
      {theme === 'light' ? (
        <Moon className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
      ) : (
        <Sun className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
      )}
      {theme === 'light' ? 'Mode sombre' : 'Mode clair'}
    </button>
  );
}; 