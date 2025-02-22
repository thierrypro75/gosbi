import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Package, TrendingUp, AlertTriangle, DollarSign, ShoppingBag, TrendingDown } from 'lucide-react';
import { saleService } from '../lib/services/saleService';
import { formatPrice } from '../lib/utils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

interface TopProduct {
  name: string;
  amount: number;
}

interface DashboardMetrics {
  totalRevenue: number;
  averageOrderValue: number;
  totalSales: number;
  topProducts: TopProduct[];
  revenueGrowth: number;
  lowStockCount: number;
}

interface TimelineData {
  date: string;
  amount: number;
}

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [salesData, setSalesData] = useState<TimelineData[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    averageOrderValue: 0,
    totalSales: 0,
    topProducts: [],
    revenueGrowth: 0,
    lowStockCount: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, [timeframe]);

  const loadDashboardData = async () => {
    try {
      const { data: sales } = await saleService.getSales();
      if (!sales) return;

      // Calculate metrics
      const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0);
      const totalSales = sales.length;
      const averageOrderValue = totalRevenue / totalSales;

      // Group sales by product for top products chart
      const productSales = sales.reduce<Record<string, number>>((acc, sale) => {
        const productName = sale.product?.name || 'Unknown';
        acc[productName] = (acc[productName] || 0) + sale.total_amount;
        return acc;
      }, {});

      const topProducts = Object.entries(productSales)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Calculate revenue growth (mock data for now)
      const revenueGrowth = 15.7;

      // Group sales by date for timeline chart
      const timelineData = sales.reduce<Record<string, number>>((acc, sale) => {
        const date = new Date(sale.sale_date).toLocaleDateString();
        acc[date] = (acc[date] || 0) + sale.total_amount;
        return acc;
      }, {});

      const chartData = Object.entries(timelineData).map(([date, amount]) => ({
        date,
        amount
      }));

      setMetrics({
        totalRevenue,
        averageOrderValue,
        totalSales,
        topProducts,
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
                +{metrics.revenueGrowth}% par rapport au mois dernier
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Évolution du chiffre d'affaires */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Évolution du chiffre d'affaires</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#3B82F6" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top produits */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top produits</h2>
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
                  label
                >
                  {metrics.topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4">
            <ul className="space-y-2">
              {metrics.topProducts.map((product, index) => (
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
      </div>
    </div>
  );
}