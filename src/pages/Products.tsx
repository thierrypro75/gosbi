import { useState } from 'react';
import { Package, Plus, Pencil, Trash2, Search, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../lib/services/productService';
import { Product, Presentation } from '../lib/schemas/product';
import Offcanvas from '../components/common/Offcanvas';
import Modal from '../components/common/Modal';
import ProductForm from '../components/products/ProductForm';
import { toast } from 'react-hot-toast';
import StockAlerts from '../components/stock/StockAlerts';
import ImportExport from '../components/products/ImportExport';
import StockMovementHistory from '../components/stock/StockMovementHistory';

const truncateDescription = (description: string = '') => {
  const words = description.split(' ');
  if (words.length > 30) {
    return words.slice(0, 30).join(' ') + '...';
  }
  return description;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'MGA',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

export default function Products() {
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll
  });

  const filteredProducts = products?.filter((product: Product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.description?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.presentations.some((p: Presentation) => 
      p.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  // Mutation pour créer/modifier un produit
  const { mutate: saveProduct } = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      console.log('Mutation started with data:', data);
      try {
        if (selectedProduct?.id) {
          console.log('Updating product:', selectedProduct.id);
          return await productService.update(selectedProduct.id, data);
        }
        // Pour la création, on s'assure que toutes les propriétés requises sont présentes
        const newProduct = {
          name: data.name!,
          description: data.description!,
          category: data.category!,
          presentations: data.presentations!.map(p => ({
            unit: p.unit,
            purchasePrice: Number(p.purchasePrice),
            sellingPrice: Number(p.sellingPrice),
            stock: Number(p.stock),
            lowStockThreshold: Number(p.lowStockThreshold)
          }))
        };
        console.log('Creating new product:', newProduct);
        return await productService.create(newProduct);
      } catch (error) {
        console.error('Error in mutation:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('Mutation successful:', data);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsOffcanvasOpen(false);
      setSelectedProduct(null);
      toast.success('Produit enregistré avec succès');
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      toast.error('Erreur lors de l\'enregistrement du produit');
    }
  });

  // Mutation pour supprimer un produit
  const { mutate: deleteProduct } = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsOffcanvasOpen(true);
  };

  const handleDelete = async (id?: string, name?: string) => {
    if (!id || !name) return;
    const confirmed = window.confirm(`Êtes-vous sûr de vouloir supprimer le produit "${name}" ?`);
    if (confirmed) {
      deleteProduct(id);
    }
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Produits</h1>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-48 h-8 sm:h-9 pl-8 pr-3 text-xs sm:text-sm border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400" />
          </div>
          <div className="flex items-center space-x-1">
            <ImportExport buttonClassName="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center" />
            <button
              onClick={() => {
                setSelectedProduct(null);
                setIsOffcanvasOpen(true);
              }}
              className="w-8 h-8 sm:w-9 sm:h-9 inline-flex items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700"
              title="Nouveau Produit"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="hidden md:table min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Catégorie
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions produit
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Présentation
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Historique
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts?.map((product: Product) => (
                product.presentations.map((presentation: Presentation, presentationIndex: number) => (
                  <tr key={`${product.id}-${presentation.id}`} className="hover:bg-gray-50">
                    {presentationIndex === 0 && (
                      <>
                        <td className="px-4 py-2" rowSpan={product.presentations.length}>
                          <div className="flex items-center">
                            <Package className="h-5 w-5 text-gray-400 mr-2" />
                            <div>
                              <div className="font-medium text-gray-900">{product.name}</div>
                              <div className="text-gray-500 text-sm break-words max-w-xs">{truncateDescription(product.description)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap" rowSpan={product.presentations.length}>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {product.category}
                          </span>
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap" rowSpan={product.presentations.length}>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Modifier"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id, product.name)}
                              className="text-red-600 hover:text-red-900"
                              title="Supprimer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">{presentation.unit}</div>
                        <div className="text-gray-500">{presentation.sku}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      <div className="text-sm text-right">
                        <div className="font-medium text-gray-900">{formatPrice(presentation.purchasePrice)}</div>
                        <div className="text-gray-500">{formatPrice(presentation.sellingPrice)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-right">
                      <span
                        className={`px-2 py-0.5 text-xs leading-4 font-medium rounded-full ${
                          presentation.stock <= presentation.lowStockThreshold
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {presentation.stock}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedProduct(product);
                            setSelectedPresentation(presentation);
                            setIsHistoryModalOpen(true);
                          }}
                          className="text-gray-600 hover:text-gray-900"
                          title="Historique des mouvements"
                        >
                          <History className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-200">
            {filteredProducts?.map((product: Product) => (
              <div key={product.id} className="p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 min-w-0">
                    <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {product.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {truncateDescription(product.description)}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-900 p-1"
                      title="Modifier"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="text-red-600 hover:text-red-900 p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-1 space-y-1">
                  {product.presentations.map((presentation: Presentation) => (
                    <div key={presentation.id} className="border rounded px-2 py-1.5 hover:bg-gray-50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center min-w-0">
                          <span className="text-xs font-medium">
                            {presentation.unit}
                          </span>
                          <span className="text-xs text-gray-400 ml-1 truncate">
                            ({presentation.sku})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          <span className="text-xs">
                            {formatPrice(presentation.purchasePrice)}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 text-xs leading-none font-medium rounded-full ${
                              presentation.stock <= presentation.lowStockThreshold
                                ? 'bg-red-100 text-red-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {presentation.stock}
                          </span>
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setSelectedProduct(product);
                                setSelectedPresentation(presentation);
                                setIsHistoryModalOpen(true);
                              }}
                              className="text-gray-600 hover:text-gray-900"
                              title="Historique des mouvements"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => {
          setIsOffcanvasOpen(false);
          setSelectedProduct(null);
        }}
        title={selectedProduct ? 'Modifier le produit' : 'Nouveau produit'}
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsOffcanvasOpen(false);
                setSelectedProduct(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="product-form"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {selectedProduct ? 'Modifier' : 'Créer'}
            </button>
          </div>
        }
      >
        <ProductForm
          id="product-form"
          initialData={selectedProduct || undefined}
          onSubmit={saveProduct}
        />
      </Offcanvas>

      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Historique des mouvements - ${selectedProduct?.name} (${selectedPresentation?.unit})`}
        className="sm:max-w-4xl"
      >
        <StockMovementHistory
          presentationId={selectedPresentation?.id || ''}
        />
      </Modal>

      <StockAlerts />
    </div>
  );
}