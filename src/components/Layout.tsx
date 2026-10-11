import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Menu, Package } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('sidebar-collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => setCollapsed((value) => !value);

  useEffect(() => {
    try {
      localStorage.setItem('sidebar-collapsed', collapsed ? '1' : '0');
    } catch {
      /* stockage indisponible : le choix n'est simplement pas mémorisé */
    }
  }, [collapsed]);

  // Ctrl/Cmd + B : réduire ou développer le menu.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setCollapsed((value) => !value);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isSidebarOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isSidebarOpen]);

  if (!user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="flex h-screen h-dvh bg-canvas text-ink">
      {/* Sidebar desktop */}
      <aside className={`hidden shrink-0 md:block ${collapsed ? 'w-[4.5rem]' : 'w-64'}`}>
        <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
      </aside>

      {/* Sidebar mobile */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="relative h-full w-72 max-w-[85vw] shadow-pop">
            <Sidebar onClose={() => setIsSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barre mobile */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-4 md:hidden">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            className="-ml-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-white">
              <Package className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight">Gosbi</span>
          </span>
        </header>

        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
