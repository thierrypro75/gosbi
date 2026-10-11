import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Moon, Sun } from 'lucide-react';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  className?: string;
  /** Mode réduit : icône seule, libellé réservé aux lecteurs d'écran. */
  collapsed?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, collapsed = false }) => {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === 'light' ? Moon : Sun;
  const label = theme === 'light' ? 'Mode sombre' : 'Mode clair';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={collapsed ? label : undefined}
      className={cn('text-muted hover:bg-line/60 hover:text-ink', className)}
    >
      <Icon className="h-[18px] w-[18px] shrink-0 text-subtle group-hover:text-ink" strokeWidth={1.75} aria-hidden="true" />
      <span className={cn(collapsed && 'sr-only')}>{label}</span>
    </button>
  );
};
