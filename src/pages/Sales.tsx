import React, { useState, useEffect } from 'react';
import { ShoppingCart, Download, Plus, Trash2 } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { saleService, Sale } from '../lib/services/saleService';
import { productService } from '../lib/services/productService';
import { toast } from 'react-hot-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [selectedPresentation, setSelectedPresentation] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [clientName, setClientName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productService.getAll
  });

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    const { data } = await saleService.getSales();
    if (data) setSales(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
        presentation.sellingPrice,
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
      await loadSales();
      // Invalider le cache des produits pour forcer un rechargement
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // Réinitialiser le formulaire
      setSelectedProduct('');
      setSelectedPresentation('');
      setQuantity(1);
      setClientName('');
      setDescription('');
      setSaleDate(new Date().toISOString().split('T')[0]);
      
      toast.success('Vente enregistrée avec succès');
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Erreur lors de l\'enregistrement de la vente');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (saleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette vente ? Cette action est irréversible.')) {
      return;
    }

    try {
      const { error } = await saleService.deleteSale(saleId);
      if (error) throw error;
      
      // Recharger les ventes et les produits
      await loadSales();
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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Download className="h-5 w-5 mr-2" />
          Exporter
        </button>
      </div>

      {/* Formulaire de vente */}
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">Nouvelle vente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                onChange={(e) => setSelectedPresentation(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                required
                disabled={!selectedProduct}
              >
                <option value="">Sélectionner une présentation</option>
                {selectedProductData?.presentations.map((presentation) => (
                  <option key={presentation.id} value={presentation.id}>
                    {presentation.unit} - Stock: {presentation.stock}
                  </option>
                ))}
              </select>
            </div>

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

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <div className="flex items-center justify-center">
                  <Plus className="h-5 w-5 mr-2" />
                  {loading ? 'Enregistrement...' : 'Enregistrer la vente'}
                </div>
              </button>
            </div>
          </div>

          <div className="mt-4">
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
      </div>

      {/* Tableau des ventes */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
              {sales.map((sale) => (
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
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-200">
            {sales.map((sale) => (
              <div key={sale.id} className="p-4 space-y-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}