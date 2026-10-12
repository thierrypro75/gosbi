import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import { saleService, type Sale } from '../lib/services/saleService';
import { supplyService } from '../lib/services/supplyService';
import ForecastChart from '../components/dashboard/ForecastChart';
import { stockAlertService } from '../lib/services/stockAlertService';
import { useTheme } from '../contexts/ThemeContext';
import { cn, formatPrice, formatPriceCompact } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Recharts writes SVG attributes, which can't read the OKLCH CSS tokens reliably
// in every browser, so the chart uses sRGB values matching the tokens.
const CHART_COLORS = {
  light: { stock: '#0f766e', supply: '#9aa5ba', accent: '#2f6bd8', grid: '#e3e7ef', axis: '#5b6579', surface: '#fcfcfd', ink: '#1b2233', line: '#e3e7ef' },
  dark: { stock: '#5eead4', supply: '#64708a', accent: '#7aa2f7', grid: '#2f3647', axis: '#9aa5ba', surface: '#1c2130', ink: '#eef0f5', line: '#2f3647' },
};

const formatAmountInK = (value: number) => {
  const abs = Math.abs(value);
  const fmt = (n: number) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(n);
  if (abs >= 1_000_000_000) return `${fmt(value / 1_000_000_000)} Md`;
  if (abs >= 1_000_000) return `${fmt(value / 1_000_000)} M`;
  if (abs >= 1000) return `${fmt(value / 1000)} K`;
  return formatPrice(value);
};

interface TopProduct {
  name: string;
  presentation: string;
  amount: number;
}

interface TopProductAggregated {
  name: string;
  amount: number;
}

interface DashboardMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  totalSales: number;
  topProducts: TopProduct[];
  topProductsAggregated: TopProductAggregated[];
  revenueGrowth: number | null;
}

interface TimelineData {
  date: string;
  amount: number;
}

type FlowMetric = 'quantity' | 'amount';

interface ProductFlow {
  name: string;
  soldQty: number;
  soldAmount: number;
  suppliedQty: number;
  suppliedAmount: number;
}

type TimeframeType = 'day' | 'week' | 'month' | 'year' | 'last3months' | 'last6months' | 'lastyear' | 'last2years';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<TimeframeType>('month');
  const [salesData, setSalesData] = useState<TimelineData[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    averageOrderValue: 0,
    totalSales: 0,
    topProducts: [],
    topProductsAggregated: [],
    revenueGrowth: null
  });
  const [loading, setLoading] = useState(true);
  const [periodSales, setPeriodSales] = useState<Sale[]>([]);
  const [period, setPeriod] = useState<{ start: Date; end: Date } | null>(null);
  const [flowMetric, setFlowMetric] = useState<FlowMetric>('quantity');
  const { theme } = useTheme();
  const colors = CHART_COLORS[theme];

  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => supplyService.getAll(),
  });

  const { data: unreadAlerts, isError: alertsError } = useQuery({
    queryKey: ['stockAlerts'],
    queryFn: stockAlertService.getUnread,
  });

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Calculer les dates de début et fin en fonction du timeframe
      const now = new Date();
      let startDate = new Date();
      let endDate = new Date();

      switch (timeframe) {
        case 'day':
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - now.getDay()));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last3months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last6months':
          startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'lastyear':
          startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'last2years':
          startDate = new Date(now.getFullYear() - 2, now.getMonth(), 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), 11, 31);
          endDate.setHours(23, 59, 59, 999);
          break;
      }

      const { data: sales } = await saleService.getSales(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      if (!sales) {
        setLoading(false);
        return;
      }

      setPeriodSales(sales);
      setPeriod({ start: startDate, end: endDate });

      // Calculate metrics
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalSales = sales.length;
      const averageOrderValue = totalSales ? totalRevenue / totalSales : 0;

      // Group sales by product and presentation for top products chart
      const productSalesDetailed = sales.reduce<Record<string, number>>((acc, sale) => {
        const productName = sale.product?.name || 'Unknown';
        const presentation = sale.presentation?.unit || 'Unknown';
        const key = `${productName} - ${presentation}`;
        acc[key] = (acc[key] || 0) + sale.total_amount;
        return acc;
      }, {});

      // Group sales by product only
      const productSalesAggregated = sales.reduce<Record<string, number>>((acc, sale) => {
        const productName = sale.product?.name || 'Unknown';
        acc[productName] = (acc[productName] || 0) + sale.total_amount;
        return acc;
      }, {});

      const topProducts = Object.entries(productSalesDetailed)
        .map(([key, amount]) => {
          const [name, presentation] = key.split(' - ');
          return { name, presentation, amount };
        })
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      const topProductsAggregated = Object.entries(productSalesAggregated)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Calculate revenue growth by comparing with previous period
      let previousStartDate = new Date(startDate);
      let previousEndDate = new Date(endDate);
      const periodDiff = endDate.getTime() - startDate.getTime();
      
      previousStartDate = new Date(startDate.getTime() - periodDiff);
      previousEndDate = new Date(endDate.getTime() - periodDiff);

      const { data: previousSales } = await saleService.getSales(
        previousStartDate.toISOString().split('T')[0],
        previousEndDate.toISOString().split('T')[0]
      );

      const previousRevenue = previousSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;
      const revenueGrowth = previousRevenue ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : null;

      // Group sales by date for timeline chart
      const timelineData = sales.reduce<Record<string, number>>((acc, sale) => {
        const date = format(new Date(sale.sale_date), timeframe === 'last2years' || timeframe === 'lastyear' ? 'MM/yyyy' : 'dd/MM/yyyy', { locale: fr });
        acc[date] = (acc[date] || 0) + sale.total_amount;
        return acc;
      }, {});

      // Convertir en tableau et trier par date
      const chartData = Object.entries(timelineData)
        .map(([date, amount]) => ({
          date,
          amount,
          // Créer une date pour le tri
          sortDate: new Date(date.split('/').reverse().join('-'))
        }))
        .sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime())
        .map(({ date, amount }) => ({ date, amount }));

      setMetrics({
        totalRevenue,
        averageOrderValue,
        totalSales,
        topProducts,
        topProductsAggregated,
        revenueGrowth
      });

      setSalesData(chartData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboardData();
  }, [timeframe]);

  const getTimeframeLabel = () => {
    switch (timeframe) {
      case 'day': return 'à hier';
      case 'week': return 'à la semaine dernière';
      case 'month': return 'au mois dernier';
      case 'last3months': return 'aux 3 mois précédents';
      case 'last6months': return 'aux 6 mois précédents';
      case 'lastyear': return "à l'année précédente";
      case 'last2years': return 'aux 2 années précédentes';
      default: return "à l'année dernière";
    }
  };

  // Ventes et approvisionnements reçus, regroupés par produit, sur la période choisie.
  const productFlow = useMemo<ProductFlow[]>(() => {
    const map = new Map<string, ProductFlow>();
    const entry = (name: string) => {
      let e = map.get(name);
      if (!e) {
        e = { name, soldQty: 0, soldAmount: 0, suppliedQty: 0, suppliedAmount: 0 };
        map.set(name, e);
      }
      return e;
    };

    periodSales.forEach((sale) => {
      const e = entry(sale.product?.name || 'Produit inconnu');
      e.soldQty += sale.quantity;
      e.soldAmount += sale.total_amount;
    });

    if (period) {
      (supplies as any[]).forEach((supply) => {
        const date = supply.created_at ? new Date(supply.created_at) : null;
        if (!date || date < period.start || date > period.end) return;
        (supply.lines ?? []).forEach((line: any) => {
          const received = Number(line.received_quantity ?? 0);
          if (!received) return;
          const price = Number(line.purchase_price ?? line.presentation?.purchase_price ?? 0);
          const e = entry(line.product?.name || 'Produit inconnu');
          e.suppliedQty += received;
          e.suppliedAmount += received * price;
        });
      });
    }
    return [...map.values()];
  }, [periodSales, supplies, period]);

  const topFlow = useMemo(() => {
    const quantity = flowMetric === 'quantity';
    return [...productFlow]
      .sort((a, b) => (quantity ? b.soldQty - a.soldQty : b.soldAmount - a.soldAmount))
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        ventes: quantity ? p.soldQty : p.soldAmount,
        appro: quantity ? p.suppliedQty : p.suppliedAmount,
      }));
  }, [productFlow, flowMetric]);

  const formatFlow = (value: number) =>
    flowMetric === 'amount' ? formatPrice(value) : `${value.toLocaleString('fr-FR')} unités`;

  const alertCount = unreadAlerts?.length;
  const growth = metrics.revenueGrowth;
  const GrowthIcon = growth !== null && growth < 0 ? TrendingDown : TrendingUp;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted">Vue d'ensemble de l'activité commerciale.</p>
        </div>
        <div>
          <label htmlFor="timeframe" className="sr-only">Période</label>
          <select
            id="timeframe"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as TimeframeType)}
            className="w-full sm:w-52"
          >
            <option value="day">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="last3months">3 derniers mois</option>
            <option value="last6months">6 derniers mois</option>
            <option value="lastyear">12 derniers mois</option>
            <option value="last2years">2 dernières années</option>
            <option value="year">Cette année</option>
          </select>
        </div>
      </div>

      <section
        aria-label="Indicateurs clés"
        className="grid grid-cols-1 divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface shadow-panel md:grid-cols-3 md:divide-x md:divide-y-0"
      >
        <div className="p-5 sm:p-6">
          <p className="text-sm font-medium text-muted">Chiffre d'affaires</p>
          <p
            title={formatPrice(metrics.totalRevenue)}
            className={cn('mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink', loading && 'opacity-40')}
          >
            {formatPriceCompact(metrics.totalRevenue)}
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
            {growth === null ? (
              <>Pas de comparaison disponible</>
            ) : (
              <>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums',
                    growth < 0 ? 'bg-danger-soft text-danger' : 'bg-positive-soft text-positive'
                  )}
                >
                  <GrowthIcon className="h-3.5 w-3.5" aria-hidden="true" />
                  {growth > 0 ? '+' : ''}
                  {growth.toFixed(1)} %
                </span>
                <span>par rapport {getTimeframeLabel()}</span>
              </>
            )}
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-sm font-medium text-muted">Ventes</p>
          <p className={cn('mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink', loading && 'opacity-40')}>
            {metrics.totalSales}
          </p>
          <p className="mt-2 text-sm text-muted">
            Panier moyen <span className="font-medium tabular-nums text-ink">{formatPriceCompact(metrics.averageOrderValue)}</span>
          </p>
        </div>

        <div className="p-5 sm:p-6">
          <p className="text-sm font-medium text-muted">Alertes de stock</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-ink">
            {alertsError || alertCount === undefined ? '–' : alertCount}
          </p>
          <p className="mt-2 text-sm">
            <Link
              to="/products"
              className="inline-flex items-center gap-1 rounded font-medium text-accent-ink hover:underline"
            >
              {alertCount ? 'Voir les produits concernés' : 'Consulter les produits'}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-6">
        <h2 className="text-base font-semibold text-ink">Évolution du chiffre d'affaires</h2>
        <div className="mt-4 h-72 sm:h-80">
          {salesData.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-line px-4 text-center">
              <p className="text-sm font-medium text-ink">{loading ? 'Chargement…' : 'Aucune vente sur cette période'}</p>
              {!loading && (
                <p className="mt-1 text-sm text-muted">Choisissez une autre période ou enregistrez une vente.</p>
              )}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={colors.grid} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: string) => (d.length > 7 ? d.slice(0, 5) : d)}
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tick={{ fontSize: 12, fill: colors.axis }}
                  tickLine={false}
                  axisLine={{ stroke: colors.grid }}
                />
                <YAxis
                  tickFormatter={formatAmountInK}
                  width={64}
                  tick={{ fontSize: 12, fill: colors.axis }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'dataMax']}
                />
                <Tooltip
                  formatter={(value: number) => [formatPrice(value), "Chiffre d'affaires"]}
                  cursor={{ stroke: colors.grid }}
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 8,
                    color: colors.ink,
                    fontSize: 13,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                  }}
                  labelStyle={{ color: colors.axis }}
                  itemStyle={{ color: colors.ink }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke={colors.accent}
                  strokeWidth={2}
                  dot={salesData.length < 32 ? { r: 3, fill: colors.accent, strokeWidth: 0 } : false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Ventes et approvisionnements</h2>
            <p className="mt-0.5 text-sm text-muted">
              Les 10 produits les plus vendus sur la période, comparés aux quantités reçues en stock.
            </p>
          </div>
          <div role="group" aria-label="Unité" className="inline-flex self-start rounded-lg border border-line bg-rail p-0.5">
            {([
              { id: 'quantity', label: 'Quantités' },
              { id: 'amount', label: 'Montants' },
            ] as { id: FlowMetric; label: string }[]).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={flowMetric === m.id}
                onClick={() => setFlowMetric(m.id)}
                className={cn(
                  'min-h-8 rounded-md px-3 text-sm font-medium transition-colors duration-150',
                  flowMetric === m.id ? 'bg-surface text-ink shadow-panel' : 'text-muted hover:text-ink'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors.accent }} aria-hidden="true" />
            Ventes
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: colors.supply }} aria-hidden="true" />
            Approvisionnements reçus
          </span>
        </div>

        {topFlow.length === 0 ? (
          <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-line px-4 text-center">
            <p className="text-sm font-medium text-ink">{loading ? 'Chargement…' : 'Aucune vente sur cette période'}</p>
          </div>
        ) : (
          <div className="mt-2" style={{ height: topFlow.length * 52 + 40 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topFlow}
                layout="vertical"
                margin={{ top: 8, right: 24, left: 0, bottom: 0 }}
                barGap={3}
                barCategoryGap="22%"
              >
                <CartesianGrid horizontal={false} stroke={colors.grid} />
                <XAxis
                  type="number"
                  tickFormatter={(v: number) => (flowMetric === 'amount' ? formatAmountInK(v) : String(v))}
                  tick={{ fontSize: 12, fill: colors.axis }}
                  tickLine={false}
                  axisLine={{ stroke: colors.grid }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tick={{ fontSize: 12, fill: colors.axis }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(n: string) => (n.length > 26 ? `${n.slice(0, 25)}…` : n)}
                />
                <Tooltip
                  cursor={{ fill: colors.grid, fillOpacity: 0.4 }}
                  formatter={(value: number, name: string) => [
                    formatFlow(value),
                    name === 'ventes' ? 'Ventes' : 'Approvisionnements reçus',
                  ]}
                  contentStyle={{
                    background: colors.surface,
                    border: `1px solid ${colors.line}`,
                    borderRadius: 8,
                    color: colors.ink,
                    fontSize: 13,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.14)',
                  }}
                  labelStyle={{ color: colors.ink, fontWeight: 600 }}
                  itemStyle={{ color: colors.ink }}
                />
                <Bar dataKey="ventes" fill={colors.accent} radius={[0, 4, 4, 0]} barSize={14} />
                <Bar dataKey="appro" fill={colors.supply} radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <ForecastChart colors={colors} />

      <TopProducts
        loading={loading}
        total={metrics.totalRevenue}
        colors={colors}
        byProduct={metrics.topProductsAggregated.map((p) => ({ key: p.name, label: p.name, amount: p.amount }))}
        byPresentation={metrics.topProducts.map((p) => ({
          key: `${p.name}-${p.presentation}`,
          label: p.name,
          hint: p.presentation,
          amount: p.amount,
        }))}
      />
    </div>
  );
}

interface RankedItem {
  key: string;
  label: string;
  hint?: string;
  amount: number;
}

type TopView = 'product' | 'presentation';

const TOP_VIEWS: { id: TopView; label: string }[] = [
  { id: 'product', label: 'Par produit' },
  { id: 'presentation', label: 'Par présentation' },
];

function TopProducts({
  byProduct,
  byPresentation,
  total,
  loading,
  colors,
}: {
  byProduct: RankedItem[];
  byPresentation: RankedItem[];
  total: number;
  loading: boolean;
  colors: (typeof CHART_COLORS)['light'];
}) {
  const [view, setView] = useState<TopView>('product');
  const items = view === 'product' ? byProduct : byPresentation;
  const max = Math.max(...items.map((i) => i.amount), 0);

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Top produits</h2>
          <p className="mt-0.5 text-sm text-muted">Classés par chiffre d'affaires sur la période.</p>
        </div>
        <div role="group" aria-label="Regroupement" className="inline-flex self-start rounded-lg border border-line bg-rail p-0.5">
          {TOP_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              className={cn(
                'min-h-8 rounded-md px-3 text-sm font-medium transition-colors duration-150',
                view === v.id ? 'bg-surface text-ink shadow-panel' : 'text-muted hover:text-ink'
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="mt-6 text-sm text-muted">{loading ? 'Chargement…' : 'Aucune vente sur cette période.'}</p>
      ) : (
        <ol className="mt-5 space-y-5">
          {items.map((item, index) => (
            <li
              key={item.key}
              className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2"
            >
              <span className="pt-0.5 text-sm tabular-nums text-subtle">{index + 1}</span>
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-ink">{item.label}</p>
                {item.hint && <p className="mt-0.5 text-xs text-muted">{item.hint}</p>}
              </div>
              <div className="text-right">
                <p className="whitespace-nowrap text-sm font-medium tabular-nums text-ink" title={formatPrice(item.amount)}>{formatPriceCompact(item.amount)}</p>
                <p className="mt-0.5 text-xs tabular-nums text-muted">
                  {total ? `${Math.round((item.amount / total) * 100)} % du CA` : '–'}
                </p>
              </div>
              <div
                className="col-span-2 col-start-2 h-1.5 overflow-hidden rounded-full"
                style={{ backgroundColor: colors.grid }}
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: colors.accent,
                    width: `${max ? Math.max((item.amount / max) * 100, 2) : 0}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
