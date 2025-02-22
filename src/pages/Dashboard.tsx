import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, AlertTriangle, DollarSign, ShoppingBag, TrendingDown } from 'lucide-react';
import { saleService } from '../lib/services/saleService';
import { formatPrice } from '../lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const wrapLabel = (text: string, maxWidth: number = 20) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  words.forEach(word => {
    if (currentLine.length + word.length > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  });
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.join('\n');
};

const formatAmountInK = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
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
  revenueGrowth: number;
  lowStockCount: number;
}

interface TimelineData {
  date: string;
  amount: number;
}

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year' | 'last3months' | 'last6months' | 'lastyear' | 'last2years'>('month');
  const [salesData, setSalesData] = useState<TimelineData[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    averageOrderValue: 0,
    totalSales: 0,
    topProducts: [],
    topProductsAggregated: [],
    revenueGrowth: 0,
    lowStockCount: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  const loadDashboardData = async () => {
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
      if (!sales) return;

      // Calculate metrics
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalSales = sales.length;
      const averageOrderValue = totalRevenue / totalSales;

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
      const revenueGrowth = previousRevenue ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

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
        revenueGrowth,
        lowStockCount: 3 // Mock data for now
      });

      setSalesData(chartData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <div className="flex space-x-2">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as any)}
            className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Chiffre d'affaires total</p>
              <p className="text-2xl font-semibold text-gray-900">{formatPrice(metrics.totalRevenue)}</p>
              <p className="text-sm text-green-600">
                {metrics.revenueGrowth >= 0 ? '+' : ''}{metrics.revenueGrowth.toFixed(1)}% par rapport à {
                  timeframe === 'day' ? "hier" :
                  timeframe === 'week' ? "la semaine dernière" :
                  timeframe === 'month' ? "au mois dernier" :
                  timeframe === 'last3months' ? "aux 3 mois précédents" :
                  timeframe === 'last6months' ? "aux 6 mois précédents" :
                  timeframe === 'lastyear' ? "à l'année précédente" :
                  timeframe === 'last2years' ? "aux 2 années précédentes" :
                  "l'année dernière"
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <ShoppingBag className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Nombre de ventes</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.totalSales}</p>
              <p className="text-sm text-gray-600">
                Panier moyen: {formatPrice(metrics.averageOrderValue)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Alertes de stock</p>
              <p className="text-2xl font-semibold text-gray-900">{metrics.lowStockCount}</p>
              <p className="text-sm text-yellow-600">Produits en stock faible</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Évolution du chiffre d'affaires */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution du chiffre d'affaires</h2>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={salesData}
                margin={{
                  top: 20,
                  right: 40,
                  left: 80,
                  bottom: 80
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  angle={-90}
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{fontSize: 12}}
                />
                <YAxis 
                  tickFormatter={(value) => formatAmountInK(value)}
                  width={80}
                  tick={{fontSize: 12}}
                  tickCount={8}
                  domain={[0, 'dataMax + 1000']}
                />
                <Tooltip 
                  formatter={(value: number) => formatPrice(value)}
                  labelFormatter={(label) => `Date: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#3B82F6"
                  dot={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top produits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top produits</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.topProductsAggregated}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={{ stroke: '#555555', strokeWidth: 1, strokeDasharray: '2 2' }}
                    label={({ name, percent, x, y, cx }) => {
                      const percentage = `${(percent * 100).toFixed(0)}%`;
                      return (
                        <text x={x} y={y} fill="#666666" textAnchor={x > Number(cx) ? "start" : "end"} dominantBaseline="middle">
                          <tspan x={x} dy="-1.2em">{wrapLabel(name)}</tspan>
                          <tspan x={x} dy="1.2em">{percentage}</tspan>
                        </text>
                      );
                    }}
                  >
                    {metrics.topProductsAggregated.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatPrice(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4">
              <ul className="space-y-2">
                {metrics.topProductsAggregated.map((product, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {product.name}
                    </span>
                    <span className="font-medium">{formatPrice(product.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Top produits par présentation</h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.topProducts}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    labelLine={{ stroke: '#555555', strokeWidth: 1, strokeDasharray: '2 2' }}
                    label={({ name, presentation, percent, x, y, cx }) => {
                      const percentage = `${(percent * 100).toFixed(0)}%`;
                      return (
                        <text x={x} y={y} fill="#666666" textAnchor={x > Number(cx) ? "start" : "end"} dominantBaseline="middle">
                          <tspan x={x} dy="-2.2em">{wrapLabel(name)}</tspan>
                          <tspan x={x} dy="1.4em">{presentation}</tspan>
                          <tspan x={x} dy="1.4em">{percentage}</tspan>
                        </text>
                      );
                    }}
                  >
                    {metrics.topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => formatPrice(value)}
                    labelFormatter={(name) => {
                      const product = metrics.topProducts.find(p => p.name === name);
                      return `${wrapLabel(name)}\n${product?.presentation}`;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4">
              <ul className="space-y-2">
                {metrics.topProducts.map((product, index) => (
                  <li key={index} className="flex items-center justify-between">
                    <span className="flex items-center">
                      <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      {product.name} ({product.presentation})
                    </span>
                    <span className="font-medium">{formatPrice(product.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}