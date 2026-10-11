import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ChevronsUpDown, Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

export interface DataColumn<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Largeur en px. Obligatoire pour une colonne figée (sticky). */
  width?: number;
  /** Colonne figée à gauche ou à droite (à partir de l'écran `lg`). */
  sticky?: 'left' | 'right';
  align?: 'left' | 'right' | 'center';
  /** Texte indexé par la recherche. Sans valeur, la colonne n'est pas filtrable. */
  search?: (row: T) => string | number | null | undefined;
  /** Contenu de la ligne de total (calculé sur les lignes filtrées). */
  footer?: (rows: T[]) => ReactNode;
  /** Valeur de tri. Sa présence rend l'en-tête cliquable. */
  sort?: (row: T) => string | number | null | undefined;
  cellClassName?: string;
  /** Autorise le retour à la ligne (par défaut: une seule ligne). */
  wrap?: boolean;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Nom des lignes au pluriel, ex. « ventes ». */
  label: string;
  caption: string;
  searchPlaceholder?: string;
  pageSize?: number;
  footerLabel?: string;
  emptyMessage?: string;
  /** Rendu des cartes sous `md`. Sans cela, le tableau défile horizontalement. */
  mobile?: { render: (row: T) => ReactNode; footer?: (rows: T[]) => ReactNode };
  /** Classe de hauteur du conteneur défilant. */
  scrollClassName?: string;
  toolbarExtra?: ReactNode;
  /** Recherche pilotée par la page (ex. placée dans l'en-tête). */
  query?: string;
  onQueryChange?: (query: string) => void;
  /** Masque le champ de recherche de la barre d'outils du tableau. */
  hideSearch?: boolean;
  /** Occupe toute la hauteur du parent (qui doit être un conteneur flex en colonne de hauteur définie). */
  fill?: boolean;
  defaultSort?: { id: string; dir: 'asc' | 'desc' };
  /** Rend les lignes cliquables. Les boutons internes doivent appeler `stopPropagation`. */
  onRowClick?: (row: T) => void;
}

/** Champ de recherche réutilisable, au même rendu que celui du tableau. */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Rechercher…',
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
        aria-hidden="true"
      />
      <input
        type="text"
        inputMode="search"
        enterKeyHint="search"
        autoComplete="off"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block h-9 w-full rounded-lg border border-line bg-surface pl-9 pr-9 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Effacer la recherche"
          className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-subtle hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const DEFAULT_WIDTH = 160;
const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export default function DataTable<T>({
  columns,
  rows,
  rowKey,
  label,
  caption,
  searchPlaceholder = 'Rechercher…',
  pageSize,
  footerLabel,
  emptyMessage = 'Aucune donnée à afficher.',
  mobile,
  scrollClassName = 'max-h-[calc(100dvh-17rem)] min-h-[14rem]',
  toolbarExtra,
  query: controlledQuery,
  onQueryChange,
  hideSearch,
  fill,
  defaultSort,
  onRowClick,
}: DataTableProps<T>) {
  const { theme } = useTheme();
  const [innerQuery, setInnerQuery] = useState('');
  const query = controlledQuery ?? innerQuery;
  const setQuery = onQueryChange ?? setInnerQuery;
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(defaultSort);

  const filtered = useMemo(() => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return rows;
    const searchable = columns.filter((c) => c.search);
    return rows.filter((row) => {
      const haystack = normalize(searchable.map((c) => c.search!(row) ?? '').join(' '));
      return terms.every((t) => haystack.includes(t));
    });
  }, [rows, columns, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const sorted = useMemo(() => {
    const column = sort && columns.find((c) => c.id === sort.id);
    if (!sort || !column?.sort) return filtered;
    const get = column.sort;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = get(a) ?? '';
      const bv = get(b) ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
      return String(av).localeCompare(String(bv), 'fr', { numeric: true, sensitivity: 'base' }) * factor;
    });
  }, [filtered, columns, sort]);

  const toggleSort = (id: string) =>
    setSort((prev) => (prev?.id === id ? { id, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { id, dir: 'asc' }));

  const totalPages = pageSize ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const currentPage = Math.min(page, totalPages);
  const visible = pageSize ? sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize) : sorted;

  // Décalages des colonnes figées.
  const offsets = useMemo(() => {
    const map: Record<string, number> = {};
    let left = 0;
    columns.forEach((c) => {
      if (c.sticky === 'left') {
        map[c.id] = left;
        left += c.width ?? DEFAULT_WIDTH;
      }
    });
    let right = 0;
    [...columns].reverse().forEach((c) => {
      if (c.sticky === 'right') {
        map[c.id] = right;
        right += c.width ?? DEFAULT_WIDTH;
      }
    });
    return map;
  }, [columns]);

  const lastLeft = [...columns].reverse().find((c) => c.sticky === 'left')?.id;
  const firstRight = columns.find((c) => c.sticky === 'right')?.id;
  const hasFooter = columns.some((c) => c.footer);
  // Le libellé du total se place juste avant la première colonne qui a un total.
  const footerLabelIndex = Math.max(0, columns.findIndex((c) => c.footer) - 1);
  const minWidth = columns.reduce((sum, c) => sum + (c.width ?? DEFAULT_WIDTH), 0);

  // Empilement et fond posés en ligne: une colonne figée doit toujours recouvrir
  // les colonnes qui défilent dessous, quelles que soient les classes fusionnées.
  const cellStyle = (c: DataColumn<T>, zIndex?: number, background?: string): CSSProperties => ({
    ...(c.sticky === 'left' ? ({ '--sl': `${offsets[c.id]}px` } as CSSProperties) : {}),
    ...(c.sticky === 'right' ? ({ '--sr': `${offsets[c.id]}px` } as CSSProperties) : {}),
    ...(zIndex !== undefined ? { zIndex } : {}),
    ...(background ? { backgroundColor: background } : {}),
  });

  // Valeurs sRGB fixes (équivalentes aux jetons surface/rail) : un fond figé ne doit jamais
  // dépendre d'une variable CSS ou d'un format de couleur que le navigateur ignorerait.
  const SURFACE = theme === 'dark' ? '#1b202c' : '#fdfdfe';
  const RAIL = theme === 'dark' ? '#171b26' : '#f1f3f7';

  const stickyClass = (c: DataColumn<T>, z: string) =>
    c.sticky === 'left'
      ? cn('lg:sticky lg:[left:var(--sl)]', z, c.id === lastLeft && 'lg:border-r lg:border-r-line')
      : c.sticky === 'right'
        ? cn('lg:sticky lg:[right:var(--sr)]', z, c.id === firstRight && 'lg:border-l lg:border-l-line')
        : '';

  const table = (
    <div className={cn('overflow-auto overscroll-contain', fill ? 'min-h-[14rem] flex-1' : scrollClassName)}>
      <table className="w-full table-fixed border-separate border-spacing-0 text-sm" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          {columns.map((c) => (
            <col key={c.id} style={c.width ? { width: c.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.id}
                scope="col"
                aria-sort={
                  sort?.id === c.id && c.sort ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined
                }
                style={cellStyle(c, c.sticky ? 6 : 5, RAIL)}
                className={cn(
                  'sticky top-0 whitespace-nowrap border-b border-line px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted',
                  alignClass[c.align ?? 'left'],
                  c.sticky && stickyClass(c, '')
                )}
              >
                {c.sort ? (
                  <button
                    type="button"
                    onClick={() => toggleSort(c.id)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded uppercase tracking-wider transition-colors hover:text-ink',
                      c.align === 'right' && 'flex-row-reverse',
                      sort?.id === c.id && 'text-ink'
                    )}
                  >
                    {c.header}
                    {sort?.id === c.id ? (
                      sort.dir === 'asc' ? (
                        <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )
                    ) : (
                      <ChevronsUpDown className="h-3.5 w-3.5 text-subtle" aria-hidden="true" />
                    )}
                  </button>
                ) : (
                  c.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visible.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={{ backgroundColor: SURFACE }}
              className={cn(onRowClick && 'cursor-pointer')}
            >
              {columns.map((c) => (
                <td
                  key={c.id}
                  style={cellStyle(c, c.sticky ? 3 : undefined, c.sticky ? SURFACE : undefined)}
                  className={cn(
                    'border-b border-line px-4 py-3 align-middle text-ink',
                    alignClass[c.align ?? 'left'],
                    !c.wrap && 'overflow-hidden text-ellipsis whitespace-nowrap',
                    c.sticky && stickyClass(c, ''),
                    c.cellClassName
                  )}
                >
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasFooter && visible.length > 0 && (
          <tfoot>
            <tr>
              {columns.map((c, i) => (
                <td
                  key={c.id}
                  style={cellStyle(c, c.sticky ? 5 : 4, RAIL)}
                  className={cn(
                    'sticky bottom-0 whitespace-nowrap border-t border-line px-4 py-3 align-middle font-medium text-ink',
                    alignClass[c.align ?? 'left'],
                    c.sticky && stickyClass(c, '')
                  )}
                >
                  {c.footer ? c.footer(filtered) : i === footerLabelIndex ? footerLabel : null}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );

  const empty = (
    <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
      {query ? (
        <>
          <p className="text-sm font-medium text-ink">Aucun résultat pour « {query} »</p>
          <button
            type="button"
            onClick={() => setQuery('')}
            className="mt-2 rounded text-sm font-medium text-accent-ink hover:underline"
          >
            Effacer la recherche
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">{emptyMessage}</p>
      )}
    </div>
  );

  return (
    <div className={cn('overflow-hidden rounded-xl border border-line bg-surface shadow-panel', fill && 'flex min-h-0 flex-1 flex-col')}>
      <div className="flex shrink-0 flex-col gap-3 border-b border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          {!hideSearch && (
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={searchPlaceholder}
              label={`Rechercher parmi les ${label}`}
              className="sm:w-72"
            />
          )}
          <p className="text-sm text-muted" aria-live="polite">
            <span className="font-medium tabular-nums text-ink">{filtered.length}</span>
            {query && <span className="tabular-nums"> sur {rows.length}</span>} {label}
          </p>
          {toolbarExtra}
        </div>

        {pageSize && totalPages > 1 && (
          <div className="flex items-center gap-2 text-sm text-muted">
            <span className="tabular-nums">
              Page {currentPage} sur {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(currentPage - 1, 1))}
                disabled={currentPage === 1}
                aria-label="Page précédente"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPage(Math.min(currentPage + 1, totalPages))}
                disabled={currentPage === totalPages}
                aria-label="Page suivante"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        empty
      ) : mobile ? (
        <>
          <div className={cn('hidden md:block', fill && 'md:flex md:min-h-0 md:flex-1 md:flex-col')}>{table}</div>
          <div className="divide-y divide-line md:hidden">
            {visible.map((row) => (
              <div key={rowKey(row)}>{mobile.render(row)}</div>
            ))}
            {mobile.footer && <div className="bg-rail px-4 py-3">{mobile.footer(filtered)}</div>}
          </div>
        </>
      ) : (
        table
      )}
    </div>
  );
}
