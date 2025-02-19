import { useState } from 'react';
import { Package, Plus, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../lib/services/productService';
import { Product, Presentation } from '../lib/schemas/product';
import Offcanvas from '../components/common/Offcanvas';
import ProductForm from '../components/products/ProductForm';

export default function Products() {
  const [isOffcanvasOpen, setIsOffcanvasOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();

  // Récupération des produits
  const { data: products, isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll,
  });

  // Mutation pour créer/modifier un produit
  const { mutate: saveProduct } = useMutation({
    mutationFn: (data: Partial<Product>) => {
      if (selectedProduct?.id) {
        return productService.update(selectedProduct.id, data);
      }
      return productService.create(data as Omit<Product, 'id'>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsOffcanvasOpen(false);
      setSelectedProduct(null);
    },
  });

  // Mutation pour supprimer un produit
  const { mutate: deleteProduct } = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  // Mutation pour mettre à jour le stock
  const { mutate: updateStock } = useMutation({
    mutationFn: ({ presentationId, quantity }: { presentationId: string; quantity: number }) =>
      productService.updateStock(presentationId, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setIsOffcanvasOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      deleteProduct(id);
    }
  };

  const handleStockAdjustment = (presentationId: string, adjustment: number) => {
    updateStock({ presentationId, quantity: adjustment });
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <button
          onClick={() => {
            setSelectedProduct(null);
            setIsOffcanvasOpen(true);
          }}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nouveau Produit
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {/* Desktop view */}
          <table className="hidden md:table min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Présentation
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix de vente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products?.map((product) => (
                product.presentations.map((presentation: Presentation, index: number) => (
                  <tr key={`${product.id}-${presentation.id}`} className={index > 0 ? 'bg-gray-50' : ''}>
                    {index === 0 && (
                      <td className="px-6 py-4 whitespace-nowrap" rowSpan={product.presentations.length}>
                        <div className="flex items-center">
                          <Package className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {product.description}
                            </div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>
                        <span className="font-medium">{presentation.size} {presentation.unit}</span>
                        <br />
                        <span className="text-xs">SKU: {presentation.sku}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      €{presentation.sellingPrice.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            presentation.stock <= presentation.lowStockThreshold
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {presentation.stock} en stock
                        </span>
                        {presentation.stock <= presentation.lowStockThreshold && (
                          <AlertTriangle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleStockAdjustment(presentation.id, 1)}
                          className="text-green-600 hover:text-green-900"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleStockAdjustment(presentation.id, -1)}
                          className="text-red-600 hover:text-red-900"
                        >
                          -1
                        </button>
                        {index === 0 && (
                          <>
                            <button
                              onClick={() => handleEdit(product)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Supprimer
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-200">
            {products?.map((product) => (
              <div key={product.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Package className="h-10 w-10 text-gray-400" />
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {product.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {product.presentations.map((presentation: Presentation) => (
                    <div key={presentation.id} className="border rounded-lg p-3 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">
                          {presentation.size} {presentation.unit}
                        </span>
                        <span className="text-sm text-gray-500">
                          SKU: {presentation.sku}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">Prix de vente</p>
                          <p className="text-sm font-medium text-gray-900">
                            €{presentation.sellingPrice.toFixed(2)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Stock</p>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                                presentation.stock <= presentation.lowStockThreshold
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-green-100 text-green-800'
                              }`}
                            >
                              {presentation.stock} en stock
                            </span>
                            {presentation.stock <= presentation.lowStockThreshold && (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleStockAdjustment(presentation.id, 1)}
                          className="text-green-600 hover:text-green-900"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleStockAdjustment(presentation.id, -1)}
                          className="text-red-600 hover:text-red-900"
                        >
                          -1
                        </button>
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
      >
        <ProductForm
          initialData={selectedProduct || undefined}
          onSubmit={saveProduct}
          onCancel={() => {
            setIsOffcanvasOpen(false);
            setSelectedProduct(null);
          }}
        />
      </Offcanvas>
    </div>
  );
}