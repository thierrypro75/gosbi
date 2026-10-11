import { Link, useLocation } from 'react-router-dom';
import {
  Package,
  LayoutDashboard,
  ShoppingCart,
  X,
  LogOut,
  PackagePlus,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navigation: NavGroup[] = [
  {
    label: 'Pilotage',
    items: [{ name: 'Tableau de bord', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'Commerce',
    items: [
      { name: 'Ventes', href: '/sales', icon: ShoppingCart },
      { name: 'Clients', href: '/clients', icon: Users },
    ],
  },
  {
    label: 'Stock',
    items: [
      { name: 'Produits', href: '/products', icon: Package },
      { name: 'Approvisionnement', href: '/supplies', icon: PackagePlus },
    ],
  },
];

interface SidebarProps {
  /** Fermeture du tiroir mobile. */
  onClose?: () => void;
  /** Mode réduit (icônes seules), desktop uniquement. */
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const itemBase =
  'group flex w-full items-center rounded-lg text-sm font-medium min-h-10 transition-colors duration-150 text-left';

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();

  const isPathActive = (path: string) => location.pathname.startsWith(path);
  const email = user?.email ?? '';
  const initial = email.charAt(0).toUpperCase() || 'G';
  const itemLayout = collapsed ? 'justify-center px-0' : 'gap-3 px-3';

  return (
    <div className="flex h-full w-full flex-col border-r border-line bg-rail">
      <div
        className={cn(
          'flex h-16 shrink-0 items-center',
          collapsed ? 'flex-col justify-center gap-1' : 'justify-between px-5'
        )}
      >
        <Link
          to="/dashboard"
          onClick={onClose}
          title="Gosbi"
          className="flex items-center gap-2.5 rounded-lg"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Package className="h-[18px] w-[18px]" strokeWidth={2} aria-hidden="true" />
          </span>
          <span className={cn('text-base font-semibold tracking-tight text-ink', collapsed && 'sr-only')}>
            Gosbi
          </span>
        </Link>

        {onToggleCollapse && !collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Réduire le menu"
            title="Réduire le menu (Ctrl+B)"
            className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-subtle transition-colors hover:bg-line/60 hover:text-ink"
          >
            <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden="true" />
          </button>
        )}

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le menu"
            className="-mr-2 flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink md:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <nav
        aria-label="Navigation principale"
        className={cn('flex-1 overflow-y-auto pb-4 pt-2', collapsed ? 'px-3' : 'px-3')}
      >
        {navigation.map((group, groupIndex) => (
          <div key={group.label} className="mb-5 last:mb-0">
            {collapsed ? (
              groupIndex > 0 && <div className="mx-3 mb-3 border-t border-line" aria-hidden="true" />
            ) : (
              <p className="px-3 pb-1.5 text-xs font-medium uppercase tracking-wider text-subtle">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map(({ name, href, icon: Icon }) => {
                const active = isPathActive(href);
                return (
                  <li key={href}>
                    <Link
                      to={href}
                      onClick={onClose}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? name : undefined}
                      title={collapsed ? name : undefined}
                      className={cn(
                        itemBase,
                        itemLayout,
                        active
                          ? 'bg-accent-soft text-accent-ink'
                          : 'text-muted hover:bg-line/60 hover:text-ink'
                      )}
                    >
                      <Icon
                        className={cn(
                          'h-[18px] w-[18px] shrink-0',
                          active ? 'text-accent-ink' : 'text-subtle group-hover:text-ink'
                        )}
                        strokeWidth={1.75}
                        aria-hidden="true"
                      />
                      <span className={cn(collapsed && 'sr-only')}>{name}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 space-y-0.5 border-t border-line p-3">
        {onToggleCollapse && collapsed && (
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="Développer le menu"
            title="Développer le menu (Ctrl+B)"
            className={cn(itemBase, itemLayout, 'text-muted hover:bg-line/60 hover:text-ink')}
          >
            <PanelLeftOpen className="h-[18px] w-[18px] shrink-0 text-subtle group-hover:text-ink" strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}

        <ThemeToggle className={cn(itemBase, itemLayout)} collapsed={collapsed} />

        {collapsed ? (
          <>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Déconnexion"
              title="Déconnexion"
              className={cn(itemBase, itemLayout, 'text-muted hover:bg-red-50 hover:text-red-600')}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
            </button>
            <div className="flex justify-center pt-2" title={email}>
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink"
              >
                {initial}
              </span>
            </div>
          </>
        ) : (
          <div className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-surface px-3 py-2">
            <span
              aria-hidden="true"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent-ink"
            >
              {initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink" title={email}>
                {email.split('@')[0] || 'Utilisateur'}
              </p>
              <p className="truncate text-xs text-muted" title={email}>
                {email}
              </p>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              aria-label="Déconnexion"
              title="Déconnexion"
              className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
