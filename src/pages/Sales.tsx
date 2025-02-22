import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Trash2, ChevronLeft, ChevronRight, X, Save, SaveAll } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { saleService, Sale } from '../lib/services/saleService';
import { productService } from '../lib/services/productService';
import { toast } from 'react-hot-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import Offcanvas from '../components/common/Offcanvas';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';

interface Product {
  id: string;
  name: string;
  presentations: {
    id: string;
    unit: string;
    sellingPrice: number;
    stock: number;
  }[];
}

interface Presentation {
  id: string;
  unit: string;
  sellingPrice: number;
  stock: number;
}

export default function Sales() {
  // Get current month's start and end dates
  const getCurrentMonthDates = (): [Date, Date] => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    firstDay.setHours(0, 0, 0, 0);
    
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    lastDay.setHours(23, 59, 59, 999);

    return [firstDay, lastDay];
  };

  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedPresentation, setSelectedPresentation] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Date, Date]>(getCurrentMonthDates());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productService.getAll
  });

  const { data: salesData } = useQuery({
    queryKey: ['sales', dateRange, currentPage],
    queryFn: async () => {
      const startDate = dateRange[0].toISOString().split('T')[0];
      const endDate = new Date(dateRange[1].getTime() + 24 * 60 * 60 * 1000 - 1).toISOString().split('T')[0];
      return await saleService.getSales(startDate, endDate);
    }
  });

  const sales = salesData?.data || [];
  const totalSales = sales.length;
  const totalPages = Math.ceil(totalSales / itemsPerPage);
  const currentSales = sales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDateRangeChange = (dates: [Date, Date] | null) => {
    if (dates) {
      setDateRange(dates);
      setCurrentPage(1);
    }
  };

  const createSale = async () => {
    if (!selectedProduct || !selectedPresentation || quantity <= 0 || !clientName || !saleDate) return;

    setLoading(true);
    try {
      const product = products.find((p: Product) => p.id === selectedProduct);
      const presentation = product?.presentations.find((p: Presentation) => p.id === selectedPresentation);
      
      if (!product || !presentation) return;

      const result = await saleService.createSale(
        selectedProduct,
        selectedPresentation,
        quantity,
        sellingPrice,
        saleDate,
        clientName,
        description
      );

      if (result.error) {
        console.error('Error creating sale:', result.error);
        toast.error('Erreur lors de l\'enregistrement de la vente');
        return;
      }

      // Recharger les ventes et les produits
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // Réinitialiser le formulaire
      setSelectedProduct('');
      setSelectedPresentation('');
      setQuantity(1);
      setClientName('');
      setDescription('');
      setSellingPrice(0);
      setIsOffcanvasOpen(false);
      
      toast.success('Vente enregistrée avec succès');
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Erreur lors de l\'enregistrement de la vente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSale();
  };

  const handleDelete = async (saleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await saleService.deleteSale(saleId);
      if (error) throw error;
      
      // Recharger les ventes et les produits
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      toast.success('Vente supprimée avec succès');
    } catch (error) {
      console.error('Error deleting sale:', error);
      toast.error('Erreur lors de la suppression de la vente');
    }
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-4 sm:flex-grow sm:ml-8">
          <div className="relative flex-grow" style={{ zIndex: 20 }}>
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              appearance="default"
              placeholder="Sélectionner les dates"
              format="dd-MM-yyyy"
              defaultValue={getCurrentMonthDates()}
              placement="auto"
              menuStyle={{ width: 'auto' }}
              block
              style={{ zIndex: 20 }}
              ranges={[
                {
                  label: 'Aujourd\'hui',
                  value: [new Date(), new Date()]
                },
                {
                  label: 'Cette semaine',
                  value: [
                    new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)),
                    new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 7))
                  ]
                },
                {
                  label: 'Ce mois',
                  value: getCurrentMonthDates()
                }
              ]}
              locale={{
                sunday: 'Dim',
                monday: 'Lun',
                tuesday: 'Mar',
                wednesday: 'Mer',
                thursday: 'Jeu',
                friday: 'Ven',
                saturday: 'Sam',
                ok: 'OK',
                today: 'Aujourd\'hui',
                yesterday: 'Hier',
                last7Days: '7 derniers jours'
              }}
            />
          </div>
          <button
            onClick={() => setIsOffcanvasOpen(true)}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 whitespace-nowrap"
          >
            <Plus className="h-5 w-5 mr-2" />
            Nouvelle vente
          </button>
        </div>
      </div>

      {/* Tableau des ventes */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 text-sm text-gray-500">
            <div>
              Total : <span className="font-medium text-gray-900">{totalSales}</span> ventes
            </div>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span>Page {currentPage} sur {totalPages}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md p-1 text-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-md p-1 text-gray-400 hover:bg-gray-50 disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          {/* Desktop view */}
          <table className="hidden md:table min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix unitaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentSales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sale.sale_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.client_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <ShoppingCart className="h-5 w-5 text-gray-400 mr-3" />
                      <div className="text-sm">
                        <div className="text-gray-900">{sale.product?.name}</div>
                        <div className="text-gray-500">{sale.presentation?.unit}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPrice(sale.unit_price)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                    {formatPrice(sale.total_amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">
                    {sale.description || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleDelete(sale.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-50">
                <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">
                  Total général
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                  {formatPrice(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-200">
            {currentSales.map((sale) => (
              <div key={sale.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <ShoppingCart className="h-10 w-10 text-gray-400" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {sale.product?.name}
                        <span className="text-gray-500 ml-2">({sale.presentation?.unit})</span>
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-700">
                        Client: {sale.client_name}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs text-gray-500">Quantité</p>
                    <p className="text-sm font-medium text-gray-900">{sale.quantity}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Prix unitaire</p>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPrice(sale.unit_price)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-sm font-medium text-blue-600">
                      {formatPrice(sale.total_amount)}
                    </p>
                  </div>
                  {sale.description && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500">Description</p>
                      <p className="text-sm text-gray-700">{sale.description}</p>
                    </div>
                  )}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => handleDelete(sale.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-4 bg-gray-50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-900">Total général</span>
                <span className="text-sm font-bold text-blue-600">
                  {formatPrice(sales.reduce((sum, sale) => sum + sale.total_amount, 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => {
          setIsOffcanvasOpen(false);
          setSelectedProduct('');
          setSelectedPresentation('');
          setQuantity(1);
          setClientName('');
          setDescription('');
          setSellingPrice(0);
          setSaleDate(new Date().toISOString().split('T')[0]);
        }}
        title="Nouvelle vente"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsOffcanvasOpen(false);
                setSelectedProduct('');
                setSelectedPresentation('');
                setQuantity(1);
                setClientName('');
                setDescription('');
                setSellingPrice(0);
                setSaleDate(new Date().toISOString().split('T')[0]);
              }}
              className="flex items-center justify-center w-10 h-10 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              title="Annuler"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="submit"
              form="sale-form"
              disabled={loading}
              className="flex items-center justify-center w-10 h-10 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              title="Enregistrer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.preventDefault();
                if (!selectedProduct || !selectedPresentation || quantity <= 0 || !clientName || !saleDate) return;

                setLoading(true);
                try {
                  const product = products.find((p: Product) => p.id === selectedProduct);
                  const presentation = product?.presentations.find((p: Presentation) => p.id === selectedPresentation);
                  
                  if (!product || !presentation) return;

                  const result = await saleService.createSale(
                    selectedProduct,
                    selectedPresentation,
                    quantity,
                    sellingPrice,
                    saleDate,
                    clientName,
                    description
                  );

                  if (result.error) {
                    console.error('Error creating sale:', result.error);
                    toast.error('Erreur lors de l\'enregistrement de la vente');
                    return;
                  }

                  // Recharger les ventes et les produits
                  queryClient.invalidateQueries({ queryKey: ['sales'] });
                  queryClient.invalidateQueries({ queryKey: ['products'] });

                  // Réinitialiser le formulaire sauf la date
                  setSelectedProduct('');
                  setSelectedPresentation('');
                  setQuantity(1);
                  setClientName('');
                  setDescription('');
                  setSellingPrice(0);
                  
                  toast.success('Vente enregistrée avec succès');
                } catch (error) {
                  console.error('Error creating sale:', error);
                  toast.error('Erreur lors de l\'enregistrement de la vente');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="flex items-center justify-center w-10 h-10 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              title="Enregistrer et nouveau"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <SaveAll className="h-5 w-5" />
              )}
            </button>
          </div>
        }
      >
        <form id="sale-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Date de l'opération</label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Nom du client</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                placeholder="Nom du client"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Produit</label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setSelectedPresentation('');
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Sélectionner un produit</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Présentation</label>
            <select
              value={selectedPresentation}
              onChange={(e) => {
                setSelectedPresentation(e.target.value);
                const presentation = selectedProductData?.presentations.find(p => p.id === e.target.value);
                if (presentation) {
                  setSellingPrice(presentation.sellingPrice);
                }
              }}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
              disabled={!selectedProduct}
            >
              <option value="">Sélectionner une présentation</option>
              {selectedProductData?.presentations.map((presentation) => (
                <option key={presentation.id} value={presentation.id}>
                  {presentation.unit} - {formatPrice(presentation.sellingPrice)} 
                  {presentation.stock <= 0 ? ' (Rupture de stock)' : ` (${presentation.stock} en stock)`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantité</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Prix de vente</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(parseFloat(e.target.value))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm text-gray-500">
                  MGA
                </span>
              </div>
            </div>
          </div>

          {sellingPrice > 0 && quantity > 0 && (
            <div className="rounded-md bg-gray-50 p-4">
              <div className="text-sm text-gray-700">
                <p>Prix unitaire : {formatPrice(sellingPrice)}</p>
                <p className="font-medium mt-2">
                  Total : {formatPrice(sellingPrice * quantity)}
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Description de la vente (optionnel)"
            />
          </div>
        </form>
      </Offcanvas>
    </div>
  );
}