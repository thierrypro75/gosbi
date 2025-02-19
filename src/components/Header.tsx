import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut } from 'lucide-react';

export default function Header() {
  const { signOut, user } = useAuth();

  return (
    <header className="bg-white shadow">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <span className="text-sm text-gray-500">
              Bienvenue, {user?.email}
            </span>
          </div>
          <button
            onClick={() => signOut()}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </button>
        </div>
      </div>
    </header>
  );
}