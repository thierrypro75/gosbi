/**
 * Prévision de séries mensuelles courtes (quelques mois à quelques années).
 *
 * Principe :
 *  1. les pics isolés (achat exceptionnel) sont écrêtés avant l'apprentissage ;
 *  2. plusieurs modèles sont mis en concurrence : moyenne pondérée, lissage
 *     exponentiel simple, lissage de Holt à tendance amortie, et lissage corrigé
 *     de la saisonnalité (si au moins 24 mois d'historique) ;
 *  3. chaque modèle est évalué par rétro-test (on « rejoue » les derniers mois sans
 *     les connaître) et les deux meilleurs sont combinés, pondérés par leur précision ;
 *  4. la fourchette provient des erreurs réellement observées lors du rétro-test.
 */

export interface ForecastResult {
  /** Prévisions pour les `horizon` mois qui suivent la série. */
  forecast: number[];
  lo: number[];
  hi: number[];
  /** Libellé du ou des modèles retenus. */
  model: string;
  /** Erreur moyenne en % observée au rétro-test (null si historique trop court). */
  wape: number | null;
}

interface Ctx {
  /** Mois calendaire (0-11) du premier point de la série. */
  firstMonth: number;
}

type Runner = (y: number[], h: number, ctx: Ctx) => number[];

interface Candidate {
  id: string;
  label: string;
  run: Runner;
}

const Z80 = 1.2816; // intervalle à 80 %
const MIN_TRAIN = 4;
const BACKTEST_MONTHS = 6;
const BACKTEST_HORIZON = 3;

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Écrête les valeurs exceptionnelles (Q3 + 1,5 × écart interquartile). */
export function winsorize(y: number[]): number[] {
  if (y.length < 6) return y.slice();
  const s = [...y].sort((a, b) => a - b);
  const q1 = quantile(s, 0.25);
  const q3 = quantile(s, 0.75);
  const cap = q3 + 1.5 * (q3 - q1);
  return cap > 0 ? y.map((v) => Math.min(v, cap)) : y.slice();
}

// ---------- modèles ----------

const weightedAverage: Runner = (y, h) => {
  const last = y.slice(-3).reverse(); // du plus récent au plus ancien
  const w = [0.5, 0.3, 0.2].slice(0, last.length);
  const total = w.reduce((a, b) => a + b, 0);
  const level = last.reduce((acc, v, i) => acc + v * w[i], 0) / total;
  return Array(h).fill(Math.max(0, level));
};

function sesLevel(y: number[]) {
  let best = { level: y[y.length - 1], sse: Infinity };
  for (let a = 0.1; a <= 0.91; a += 0.1) {
    let l = y[0];
    let sse = 0;
    for (let i = 1; i < y.length; i++) {
      sse += (y[i] - l) ** 2;
      l = a * y[i] + (1 - a) * l;
    }
    if (sse < best.sse) best = { level: l, sse };
  }
  return best.level;
}

const ses: Runner = (y, h) => Array(h).fill(Math.max(0, sesLevel(y)));

const holtDamped: Runner = (y, h) => {
  const n = y.length;
  const k = Math.min(3, n - 1);
  const trend0 = k > 0 ? (y[k] - y[0]) / k : 0;
  let best = { l: y[n - 1], t: 0, phi: 0.9, sse: Infinity };

  for (const a of [0.2, 0.4, 0.6, 0.8]) {
    for (const b of [0.1, 0.2, 0.3]) {
      for (const phi of [0.8, 0.9, 0.95]) {
        let l = y[0];
        let t = trend0;
        let sse = 0;
        for (let i = 1; i < n; i++) {
          const f = l + phi * t;
          sse += (y[i] - f) ** 2;
          const next = a * y[i] + (1 - a) * (l + phi * t);
          t = b * (next - l) + (1 - b) * phi * t;
          l = next;
        }
        if (sse < best.sse) best = { l, t, phi, sse };
      }
    }
  }

  const out: number[] = [];
  let damp = 0;
  for (let i = 1; i <= h; i++) {
    damp += best.phi ** i;
    out.push(Math.max(0, best.l + best.t * damp));
  }
  return out;
};

const seasonalSes: Runner = (y, h, ctx) => {
  const n = y.length;
  const overall = mean(y) || 1;
  const idx = Array.from({ length: 12 }, (_, m) => {
    const vals = y.filter((_, i) => (ctx.firstMonth + i) % 12 === m);
    const raw = vals.length ? mean(vals) / overall : 1;
    return Math.max(0.4, 1 + 0.7 * (raw - 1)); // atténué : seulement deux cycles observés
  });
  const adjusted = y.map((v, i) => v / idx[(ctx.firstMonth + i) % 12]);
  const base = holtDamped(adjusted, h, ctx);
  return base.map((v, k) => Math.max(0, v * idx[(ctx.firstMonth + n + k) % 12]));
};

function candidates(n: number): Candidate[] {
  const list: Candidate[] = [
    { id: 'wma', label: 'moyenne pondérée', run: weightedAverage },
    { id: 'ses', label: 'lissage exponentiel', run: ses },
    { id: 'holt', label: 'tendance amortie', run: holtDamped },
  ];
  if (n >= 24) list.push({ id: 'seasonal', label: 'saisonnalité', run: seasonalSes });
  return list;
}

// ---------- évaluation ----------

interface BacktestPoint {
  h: number;
  actual: number;
  preds: Record<string, number>;
}

function backtest(raw: number[], clean: number[], ctx: Ctx, models: Candidate[]): BacktestPoint[] {
  const n = raw.length;
  const points: BacktestPoint[] = [];
  for (let t = Math.max(MIN_TRAIN, n - BACKTEST_MONTHS); t < n; t++) {
    const h = Math.min(BACKTEST_HORIZON, n - t);
    const train = clean.slice(0, t);
    const byModel = models.map((m) => ({ id: m.id, f: m.run(train, h, ctx) }));
    for (let k = 0; k < h; k++) {
      const preds: Record<string, number> = {};
      byModel.forEach((m) => (preds[m.id] = m.f[k]));
      points.push({ h: k + 1, actual: raw[t + k], preds });
    }
  }
  return points;
}

const wapeOf = (points: BacktestPoint[], pick: (p: BacktestPoint) => number) => {
  const actual = points.reduce((acc, p) => acc + p.actual, 0);
  if (actual <= 0) return Infinity;
  return points.reduce((acc, p) => acc + Math.abs(p.actual - pick(p)), 0) / actual;
};

// ---------- API ----------

export function forecastSeries(raw: number[], horizon: number, ctx: Ctx): ForecastResult {
  const n = raw.length;
  const clean = winsorize(raw);
  const models = candidates(n);

  if (n < MIN_TRAIN) {
    const f = weightedAverage(clean, horizon, ctx);
    return { forecast: f, lo: f.map(() => 0), hi: f.map((v) => v * 2), model: 'moyenne', wape: null };
  }

  const points = backtest(raw, clean, ctx, models);

  // Classement par précision au rétro-test.
  const ranked = models
    .map((m) => ({ m, wape: points.length ? wapeOf(points, (p) => p.preds[m.id]) : Infinity }))
    .sort((a, b) => a.wape - b.wape);

  let chosen = ranked.filter((r) => Number.isFinite(r.wape)).slice(0, 2);
  if (!chosen.length) chosen = [{ m: models.find((m) => m.id === 'ses')!, wape: Infinity }];

  const weights = chosen.map((c) => (Number.isFinite(c.wape) ? 1 / Math.max(c.wape, 0.05) : 1));
  const wSum = weights.reduce((a, b) => a + b, 0);
  const wNorm = weights.map((w) => w / wSum);

  const combined = (preds: Record<string, number>) =>
    chosen.reduce((acc, c, i) => acc + preds[c.m.id] * wNorm[i], 0);

  const finals = chosen.map((c) => c.m.run(clean, horizon, ctx));
  const forecast = Array.from({ length: horizon }, (_, k) =>
    Math.max(0, finals.reduce((acc, f, i) => acc + f[k] * wNorm[i], 0))
  );

  // Fourchette : erreurs réelles du modèle combiné, par horizon.
  const errors = points.map((p) => ({ h: p.h, e: p.actual - combined(p.preds) }));
  const rmse = (list: number[]) => Math.sqrt(mean(list.map((e) => e * e)));
  const pooled = errors.length >= 2 ? rmse(errors.map((x) => x.e)) : null;
  const fallback = Math.sqrt(mean(clean.map((v) => (v - mean(clean)) ** 2))) * 0.8;

  const sigma = (h: number) => {
    const same = errors.filter((x) => x.h === h).map((x) => x.e);
    if (same.length >= 3) return rmse(same);
    const base = pooled ?? fallback;
    return base * Math.sqrt(h / 2);
  };

  const lo = forecast.map((f, k) => Math.max(0, f - Z80 * sigma(k + 1)));
  const hi = forecast.map((f, k) => f + Z80 * sigma(k + 1));

  const ensembleWape = points.length ? wapeOf(points, (p) => combined(p.preds)) : Infinity;

  return {
    forecast,
    lo,
    hi,
    model: chosen.map((c) => c.m.label).join(' + '),
    wape: Number.isFinite(ensembleWape) ? ensembleWape : null,
  };
}
