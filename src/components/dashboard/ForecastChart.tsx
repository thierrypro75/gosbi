import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { addMonths, format, startOfMonth, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { saleService } from '../../lib/services/saleService';
import { supplyService } from '../../lib/services/supplyService';
import { productService } from '../../lib/services/productService';
import { cn, formatPrice } from '../../lib/utils';
import { forecastSeries } from '../../lib/forecast';

type Metric = 'quantity' | 'amount';

interface ChartColors {
  accent: string;
  supply: string;
  stock: string;
  grid: string;
  axis: string;
  surface: string;
  ink: string;
  line: string;
}

interface Row {
  key: string;
  label: string;
  sold?: number;
  soldPartial?: number;
  soldF?: number;
  appro?: number;
  stock?: number;
  stockPartial?: number;
  stockF?: number;
  lo?: number;
  span?: number;
  forecast?: boolean;
  current?: boolean;
}

interface Reorder {
  name: string;
  stock: number;
  demand: number;
  coverage: number | null;
  toOrder: number;
  cost: number;
  /** Libellé du mois où le stock s'épuise sans réapprovisionnement, sinon null. */
  runout: string | null;
}

const HISTORY_MONTHS = 24; // historique chargé pour apprendre (la saisonnalité exige 24 mois)
const DISPLAY_MONTHS = 12; // mois réels affichés sur la courbe
const HORIZON = 3;
const MIN_MONTHS = 4;
const ALL = '__all__';

export default function ForecastChart({ colors }: { colors: ChartColors }) {
  const [metric, setMetric] = useState<Metric>('quantity');
  const [product, setProduct] = useState(ALL);

  const now = useMemo(() => new Date(), []);
  const firstMonth = useMemo(() => startOfMonth(subMonths(now, HISTORY_MONTHS)), [now]);

  const { data: salesResult, isLoading } = useQuery({
    queryKey: ['sales-history', format(firstMonth, 'yyyy-MM')],
    queryFn: () => saleService.getSales(format(firstMonth, 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')),
  });
  const { data: supplies = [] } = useQuery({
    queryKey: ['supplies'],
    queryFn: () => supplyService.getAll(),
  });
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  const sales = salesResult?.data ?? [];

  // Les 10 produits les plus vendus sur l'historique.
  const topProducts = useMemo(() => {
    const totals = new Map<string, number>();
    sales.forEach((s) => {
      const name = s.product?.name || 'Produit inconnu';
      totals.set(name, (totals.get(name) ?? 0) + s.quantity);
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name]) => name);
  }, [sales]);

  const model = useMemo(() => {
    const names = product === ALL ? topProducts : [product];
    const selected = new Set(names);
    const keyOf = (d: Date) => format(d, 'yyyy-MM');
    const soldBy = new Map<string, number>();
    const approBy = new Map<string, number>();
    const qtyByProduct = new Map<string, Map<string, number>>();
    const receivedByProduct = new Map<string, Map<string, number>>();

    sales.forEach((s) => {
      const name = s.product?.name || 'Produit inconnu';
      if (!selected.has(name)) return;
      const k = keyOf(new Date(s.sale_date));
      soldBy.set(k, (soldBy.get(k) ?? 0) + (metric === 'quantity' ? s.quantity : s.total_amount));
      const per = qtyByProduct.get(name) ?? new Map<string, number>();
      per.set(k, (per.get(k) ?? 0) + s.quantity);
      qtyByProduct.set(name, per);
    });
    (supplies as any[]).forEach((supply) => {
      (supply.lines ?? []).forEach((line: any) => {
        const name = line.product?.name || 'Produit inconnu';
        if (!selected.has(name)) return;
        const received = Number(line.received_quantity ?? 0);
        if (!received) return;
        // Date de réception : dernière mise à jour de la ligne, à défaut la création de la commande.
        const when = line.updated_at ?? supply.created_at;
        if (!when) return;
        const k = keyOf(new Date(when));
        const perRecv = receivedByProduct.get(name) ?? new Map<string, number>();
        perRecv.set(k, (perRecv.get(k) ?? 0) + received);
        receivedByProduct.set(name, perRecv);
        const price = Number(line.purchase_price ?? line.presentation?.purchase_price ?? 0);
        approBy.set(k, (approBy.get(k) ?? 0) + (metric === 'quantity' ? received : received * price));
      });
    });

    // Mois entiers (sans le mois en cours), à partir de la première vente.
    const currentMonth = startOfMonth(now);
    const months: Date[] = [];
    for (let d = firstMonth; d < currentMonth; d = addMonths(d, 1)) months.push(d);
    const firstActive = months.findIndex((d) => (soldBy.get(keyOf(d)) ?? 0) > 0);
    const complete = firstActive === -1 ? [] : months.slice(firstActive);

    if (complete.length < MIN_MONTHS) {
      return { rows: [] as Row[], enough: false, summary: null, reorder: [] as Reorder[], safetyAgg: 0 };
    }

    const soldSeries = complete.map((d) => soldBy.get(keyOf(d)) ?? 0);
    const n = complete.length;
    const ctx = { firstMonth: complete[0].getMonth() };
    const label = (d: Date) => format(d, 'MMM yy', { locale: fr });

    // Index 0 = mois en cours, 1..HORIZON = mois à venir.
    const fc = forecastSeries(soldSeries, HORIZON + 1, ctx);
    const partialSold = soldBy.get(keyOf(currentMonth)) ?? 0;

    // Par produit : prévision de ventes (unités), stock actuel, stock projeté sans réapprovisionnement.
    const perProduct = names.map((name) => {
      const per = qtyByProduct.get(name) ?? new Map<string, number>();
      const series = complete.map((d) => per.get(keyOf(d)) ?? 0);
      const f = forecastSeries(series, HORIZON + 1, ctx).forecast;
      const monthSoFar = per.get(keyOf(currentMonth)) ?? 0;
      const remainingNow = Math.max(0, f[0] - monthSoFar);
      const next3 = f.slice(1).reduce((acc, v) => acc + v, 0);

      const catalog = (products as any[]).find((p) => p.name === name);
      const presentations: any[] = catalog?.presentations ?? [];
      const stockNow = presentations.reduce((acc, p) => acc + Number(p.stock ?? 0), 0);
      const safety = presentations.reduce((acc, p) => acc + Number(p.lowStockThreshold ?? 0), 0);
      const prices = presentations.map((p) => Number(p.purchasePrice ?? 0)).filter(Boolean);
      const unitCost = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;

      // Stock de fin de mois reconstitué en remontant depuis le stock actuel :
      // le stock du mois précédent = stock du mois - réceptions du mois + ventes du mois.
      const recv = receivedByProduct.get(name) ?? new Map<string, number>();
      const stockHist: number[] = new Array(complete.length).fill(0);
      let running = stockNow - (recv.get(keyOf(currentMonth)) ?? 0) + monthSoFar; // fin du dernier mois entier
      for (let i = complete.length - 1; i >= 0; i--) {
        stockHist[i] = Math.max(0, running);
        const k = keyOf(complete[i]);
        running = running - (recv.get(k) ?? 0) + (per.get(k) ?? 0);
      }
      // Stock à la fin du mois en cours, puis des 3 mois suivants, si rien n'est commandé.
      const proj: number[] = [Math.max(0, stockNow - remainingNow)];
      for (let i = 1; i <= HORIZON; i++) proj.push(Math.max(0, proj[i - 1] - f[i]));

      return { name, f, remainingNow, next3, stockNow, safety, unitCost, stockHist, proj };
    });

    // En montants, le stock est valorisé au prix d'achat moyen du produit.
    const factor = (p: { unitCost: number }) => (metric === 'amount' ? p.unitCost : 1);
    const stockAgg = complete.map((_, i) => perProduct.reduce((acc, p) => acc + p.stockHist[i] * factor(p), 0));
    const stockNowAgg = perProduct.reduce((acc, p) => acc + p.stockNow * factor(p), 0);
    const projAgg = Array.from({ length: HORIZON + 1 }, (_, k) =>
      perProduct.reduce((acc, p) => acc + p.proj[k] * factor(p), 0)
    );
    const safetyAgg = perProduct.reduce((acc, p) => acc + p.safety * factor(p), 0);

    // Seuls les derniers mois sont dessinés ; tout l'historique sert à l'apprentissage.
    const shown = complete.slice(-DISPLAY_MONTHS);
    const rows: Row[] = shown.map((d) => {
      const i = complete.indexOf(d);
      return {
        key: keyOf(d),
        label: label(d),
        sold: soldSeries[i],
        appro: approBy.get(keyOf(d)) ?? 0,
        stock: stockAgg[i],
        // Le dernier mois réel sert de point de départ aux courbes de prévision.
        ...(i === n - 1 ? { soldF: soldSeries[i], stockF: stockAgg[i] } : {}),
      };
    });

    // Mois en cours (partiel) : estimation du mois complet (jamais sous le réel à date).
    [currentMonth, ...Array.from({ length: HORIZON }, (_, i) => addMonths(currentMonth, i + 1))].forEach((d, i) => {
      const hat = i === 0 ? Math.max(fc.forecast[0], partialSold) : fc.forecast[i];
      const lo = i === 0 ? Math.max(fc.lo[0], partialSold) : fc.lo[i];
      const hi = Math.max(fc.hi[i], hat);
      rows.push({
        key: keyOf(d),
        label: label(d),
        forecast: i > 0,
        current: i === 0,
        soldF: hat,
        stockF: projAgg[i],
        lo,
        span: Math.max(0, hi - lo),
        ...(i === 0
          ? { soldPartial: partialSold, appro: approBy.get(keyOf(d)) ?? 0, stockPartial: stockNowAgg }
          : {}),
      });
    });

    const nextRows = rows.filter((r) => r.forecast);
    const lastThree = soldSeries.slice(-HORIZON).reduce((a, b) => a + b, 0);
    const predicted = nextRows.reduce((acc, r) => acc + (r.soldF ?? 0), 0);

    // Approvisionnement conseillé : besoin (reste du mois + 3 mois) + seuil de sécurité - stock actuel.
    const reorder: Reorder[] = perProduct.map((p) => {
      const demand = p.remainingNow + p.next3;
      const toOrder = Math.max(0, Math.ceil(demand + p.safety - p.stockNow));
      const monthly = p.next3 / HORIZON;
      const out = p.proj.findIndex((v) => v <= 0);
      return {
        name: p.name,
        stock: p.stockNow,
        demand,
        coverage: monthly > 0 ? p.stockNow / monthly : null,
        toOrder,
        cost: toOrder * p.unitCost,
        runout: out === -1 ? null : label(addMonths(currentMonth, out)),
      };
    });
    reorder.sort((a, b) => b.toOrder - a.toOrder);

    return {
      rows,
      enough: true,
      reorder,
      safetyAgg,
      summary: {
        predicted,
        lastThree,
        delta: lastThree ? ((predicted - lastThree) / lastThree) * 100 : null,
        months: n,
        modelLabel: fc.model,
        wape: fc.wape,
        toOrderQty: reorder.reduce((acc, r) => acc + r.toOrder, 0),
        toOrderCost: reorder.reduce((acc, r) => acc + r.cost, 0),
        toOrderCount: reorder.filter((r) => r.toOrder > 0).length,
      },
    };
  }, [sales, supplies, products, metric, product, topProducts, firstMonth, now]);

  const fmt = (v: number) =>
    metric === 'amount' ? formatPrice(Math.round(v)) : `${Math.round(v).toLocaleString('fr-FR')} unités`;
  const axisFmt = (v: number) =>
    metric === 'amount' ? (v >= 1000 ? `${(v / 1000).toFixed(v >= 1e6 ? 0 : 1)}K` : String(v)) : String(v);

  const firstForecast = model.rows.find((r) => r.forecast)?.label;
  const lastForecast = model.rows[model.rows.length - 1]?.label;

  return (
    <section className="rounded-xl border border-line bg-surface p-5 shadow-panel sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-semibold text-ink">Prévision des ventes à 3 mois</h2>
          <p className="mt-0.5 text-sm text-muted">
            Ventes et stock sur 12 mois, prolongés sur les {HORIZON} mois à venir. Le stock prévu suppose qu'aucune commande n'est passée : c'est lui qui déclenche l'approvisionnement conseillé.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="forecast-product" className="sr-only">Produit</label>
          <select
            id="forecast-product"
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            className="w-full sm:w-64"
          >
            <option value={ALL}>Top 10 produits (cumul)</option>
            {topProducts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Unité" className="inline-flex self-start rounded-lg border border-line bg-rail p-0.5">
            {([
              { id: 'quantity', label: 'Quantités' },
              { id: 'amount', label: 'Montants' },
            ] as { id: Metric; label: string }[]).map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={metric === m.id}
                onClick={() => setMetric(m.id)}
                className={cn(
                  'min-h-8 rounded-md px-3 text-sm font-medium transition-colors duration-150',
                  metric === m.id ? 'bg-surface text-ink shadow-panel' : 'text-muted hover:text-ink'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!model.enough ? (
        <div className="mt-4 flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-line px-4 text-center">
          <p className="text-sm font-medium text-ink">
            {isLoading ? 'Chargement…' : 'Historique insuffisant pour une prévision'}
          </p>
          {!isLoading && (
            <p className="mt-1 text-sm text-muted">Il faut au moins {MIN_MONTHS} mois complets de ventes.</p>
          )}
        </div>
      ) : (
        <>
          {model.summary && (
            <dl className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-line px-4 py-3">
                <dt className="text-xs text-muted">Ventes prévues (3 mois)</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-ink">{fmt(model.summary.predicted)}</dd>
              </div>
              <div className="rounded-lg border border-line px-4 py-3">
                <dt className="text-xs text-muted">Par rapport aux 3 derniers mois</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-ink">
                  {model.summary.delta === null
                    ? '–'
                    : `${model.summary.delta > 0 ? '+' : ''}${model.summary.delta.toFixed(1)} %`}
                </dd>
                <dd className="text-xs text-muted">Réel : {fmt(model.summary.lastThree)}</dd>
              </div>
              <div className="rounded-lg border border-line px-4 py-3">
                <dt className="text-xs text-muted">Approvisionnement conseillé</dt>
                <dd className="mt-1 text-lg font-semibold tabular-nums text-ink">
                  {model.summary.toOrderQty > 0
                    ? metric === 'amount'
                      ? formatPrice(Math.round(model.summary.toOrderCost))
                      : `${model.summary.toOrderQty.toLocaleString('fr-FR')} unités`
                    : 'Aucun'}
                </dd>
                <dd className="text-xs text-muted">
                  {model.summary.toOrderCount > 0
                    ? `${model.summary.toOrderCount} produit${model.summary.toOrderCount > 1 ? 's' : ''} à commander`
                    : 'Le stock couvre les ventes prévues'}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted">
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-5" style={{ backgroundColor: colors.accent }} aria-hidden="true" />
              Ventes
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2.5 w-3 rounded-sm" style={{ backgroundColor: colors.supply, opacity: 0.55 }} aria-hidden="true" />
              Réceptions du mois (axe de droite)
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-0.5 w-5 border-t-2 border-dashed"
                style={{ borderColor: colors.accent }}
                aria-hidden="true"
              />
              Prévision des ventes
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-0.5 w-5" style={{ backgroundColor: colors.stock }} aria-hidden="true" />
              Stock fin de mois
            </span>
            <span className="inline-flex items-center gap-2">
              <span
                className="h-0.5 w-5 border-t-2 border-dashed"
                style={{ borderColor: colors.stock }}
                aria-hidden="true"
              />
              Stock prévu (sans commande)
            </span>
          </div>

          <div className="mt-2 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={model.rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={colors.grid} />
                {firstForecast && lastForecast && (
                  <ReferenceArea yAxisId="flow" x1={firstForecast} x2={lastForecast} fill={colors.grid} fillOpacity={0.35} />
                )}
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={{ fontSize: 12, fill: colors.axis }}
                  tickLine={false}
                  axisLine={{ stroke: colors.grid }}
                />
                <YAxis
                  yAxisId="flow"
                  tickFormatter={axisFmt}
                  width={64}
                  tick={{ fontSize: 12, fill: colors.axis }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                />
                <YAxis
                  yAxisId="stock"
                  orientation="right"
                  tickFormatter={axisFmt}
                  width={64}
                  tick={{ fontSize: 12, fill: colors.stock }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 'auto']}
                />
                <Tooltip
                  cursor={{ stroke: colors.grid }}
                  content={({ active, payload }) => {
                    const row = payload?.[0]?.payload as Row | undefined;
                    if (!active || !row) return null;
                    const sold = row.sold ?? row.soldF;
                    return (
                      <div
                        className="rounded-lg border px-3 py-2 text-[13px]"
                        style={{ background: colors.surface, borderColor: colors.line, color: colors.ink }}
                      >
                        <p className="font-semibold capitalize">
                          {row.label}
                          {row.forecast ? ' · prévision' : row.current ? ' · en cours' : ''}
                        </p>
                        {sold !== undefined && (
                          <p>
                            Ventes{row.forecast || row.current ? ' prévues' : ''} : {fmt(sold)}
                          </p>
                        )}
                        {row.current && row.soldPartial !== undefined && (
                          <p style={{ color: colors.axis }}>À date : {fmt(row.soldPartial)}</p>
                        )}
                        {row.forecast && row.lo !== undefined && row.span !== undefined && (
                          <p style={{ color: colors.axis }}>
                            Fourchette : {fmt(row.lo)} à {fmt(row.lo + row.span)}
                          </p>
                        )}
                        {(row.stock !== undefined || row.stockPartial !== undefined) && (
                          <p style={{ color: colors.stock }}>
                            Stock {row.current ? 'actuel' : 'fin de mois'} : {fmt(row.stock ?? row.stockPartial ?? 0)}
                          </p>
                        )}
                        {(row.forecast || row.current) && row.stockF !== undefined && (
                          <p style={{ color: colors.stock }}>Stock prévu fin de mois : {fmt(row.stockF)}</p>
                        )}
                        {!row.forecast && row.appro !== undefined && (
                          <p>
                            Reçu{row.current ? ' à date' : ' dans le mois'} : {fmt(row.appro)}
                          </p>
                        )}
                      </div>
                    );
                  }}
                />
                {/* Fourchette de prévision : base transparente + bande empilée */}
                <Area yAxisId="flow" dataKey="lo" stackId="band" stroke="none" fill="transparent" isAnimationActive={false} />
                <Area
                  yAxisId="flow"
                  dataKey="span"
                  stackId="band"
                  stroke="none"
                  fill={colors.accent}
                  fillOpacity={0.14}
                  isAnimationActive={false}
                />
                <Bar yAxisId="stock" dataKey="appro" fill={colors.supply} fillOpacity={0.55} radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false} />
                <Line yAxisId="flow" type="monotone" dataKey="sold" stroke={colors.accent} strokeWidth={2} dot={{ r: 3, fill: colors.accent, strokeWidth: 0 }} isAnimationActive={false} />
                <Line yAxisId="flow" type="monotone" dataKey="soldF" stroke={colors.accent} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                <Line
                  yAxisId="flow"
                  dataKey="soldPartial"
                  stroke="none"
                  dot={{ r: 4, fill: colors.surface, stroke: colors.accent, strokeWidth: 2 }}
                  activeDot={false}
                  isAnimationActive={false}
                />
                {model.safetyAgg > 0 && (
                  <ReferenceLine
                    yAxisId="stock"
                    y={model.safetyAgg}
                    stroke={colors.stock}
                    strokeOpacity={0.5}
                    strokeDasharray="2 4"
                    label={{ value: 'Seuil minimum', position: 'insideTopLeft', fontSize: 11, fill: colors.stock }}
                  />
                )}
                <Line yAxisId="stock" type="linear" dataKey="stock" stroke={colors.stock} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line yAxisId="stock" type="linear" dataKey="stockF" stroke={colors.stock} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                <Line
                  yAxisId="stock"
                  dataKey="stockPartial"
                  stroke="none"
                  dot={{ r: 4, fill: colors.surface, stroke: colors.stock, strokeWidth: 2 }}
                  activeDot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-ink">Approvisionnement conseillé</h3>
            <p className="mt-0.5 text-xs text-muted">
              Besoin = ventes prévues jusqu'à fin {format(addMonths(now, HORIZON), 'MMMM', { locale: fr })} + seuil de
              sécurité du produit − stock actuel. Un produit bien approvisionné n'est pas à commander.
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <caption className="sr-only">Approvisionnement conseillé par produit</caption>
                <thead>
                  <tr className="bg-rail text-xs uppercase tracking-wider text-muted">
                    <th scope="col" className="px-4 py-2.5 text-left font-medium">Produit</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Stock</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Besoin prévu</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Couverture</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Rupture estimée</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">À commander</th>
                    <th scope="col" className="px-4 py-2.5 text-right font-medium">Coût estimé</th>
                  </tr>
                </thead>
                <tbody>
                  {model.reorder.map((r) => (
                    <tr key={r.name} className="border-t border-line">
                      <td className="px-4 py-2.5 font-medium text-ink">{r.name}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{r.stock.toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{Math.round(r.demand).toLocaleString('fr-FR')}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {r.coverage === null ? '–' : `${r.coverage.toFixed(1)} mois`}
                      </td>
                      <td className="px-4 py-2.5 text-right capitalize text-muted">{r.runout ?? '–'}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r.toOrder > 0 ? (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-amber-800">
                            {r.toOrder.toLocaleString('fr-FR')}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            Stock suffisant
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted">
                        {r.toOrder > 0 ? formatPrice(Math.round(r.cost)) : '–'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted">
            Modèle retenu : {model.summary?.modelLabel}, choisi par rétro-test sur {model.summary?.months} mois
            d'historique (pics exceptionnels écrêtés).
            {model.summary?.wape != null &&
              ` Sur les derniers mois, l'erreur moyenne de ce modèle était d'environ ${Math.round(model.summary.wape * 100)} %.`}
            {' '}La zone grisée est la fourchette probable à 80 %, déduite des erreurs observées. Les points creux sont le
            mois en cours, à date. Le stock passé est reconstitué à rebours depuis le stock actuel (réceptions − ventes) ; en montants, il est valorisé au prix d'achat moyen. Indicatif : promotions, ruptures de stock et délais de livraison ne sont pas pris en
            compte. Le coût utilise le prix d'achat moyen des présentations du produit.
          </p>
        </>
      )}
    </section>
  );
}
