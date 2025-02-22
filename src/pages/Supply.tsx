import { useState } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { productService } from '../lib/services/productService';
import { stockMovementService } from '../lib/services/stockMovementService';
import { Product, Presentation } from '../lib/schemas/product';
import { StockMovementCreate } from '../lib/schemas/stockMovement';
import { toast } from 'react-hot-toast';
import ProductForm from '../components/products/ProductForm';
import { Search, Plus } from 'lucide-react';
import Offcanvas from '../components/ui/Offcanvas';
import Modal from '../components/ui/Modal';

interface SupplyMutationVariables {
  productId: string;
  presentationId: string;
  quantity: number;
}

export default function Supply() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPresentation, setSelectedPresentation] = useState<Presentation | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [supplyQuantity, setSupplyQuantity] = useState<number>(0);
  const queryClient = useQueryClient();

  // Fetch all products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productService.getAll()
  });

  // Filter products based on search term
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Mutation for adding supply
  const supplyMutation = useMutation<void, Error, SupplyMutationVariables>({
    mutationFn: async ({ productId, presentationId, quantity }) => {
      const presentation = selectedProduct?.presentations.find(p => p.id === presentationId);
      if (!presentation) throw new Error('Présentation non trouvée');
      if (!selectedProduct) throw new Error('Produit non trouvé');

      const stockMovement: StockMovementCreate = {
        productId,
        presentationId,
        quantityIn: quantity,
        quantityOut: null,
        stockBefore: presentation.stock,
        stockAfter: presentation.stock + quantity,
        reason: 'SUPPLY',
        status: 'ACTIVE'
      };

      await stockMovementService.create(stockMovement);

      // Update presentation stock
      await productService.update(productId, {
        ...selectedProduct,
        presentations: selectedProduct.presentations.map(p =>
          p.id === presentationId
            ? { ...p, stock: p.stock + quantity }
            : p
        )
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Stock approvisionné avec succès');
      setSelectedProduct(null);
      setSelectedPresentation(null);
      setSupplyQuantity(0);
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de l\'approvisionnement: ' + error.message);
    }
  });

  const handleSupply = async () => {
    if (!selectedProduct || !selectedPresentation || supplyQuantity <= 0) {
      toast.error('Veuillez remplir tous les champs correctement');
      return;
    }

    await supplyMutation.mutateAsync({
      productId: selectedProduct.id!,
      presentationId: selectedPresentation.id!,
      quantity: supplyQuantity
    });
  };

  const handleNewProduct = async (productData: Partial<Product>) => {
    try {
      // Ensure all required fields are present
      if (!productData.name || !productData.description || !productData.category || !productData.presentations) {
        toast.error('Veuillez remplir tous les champs obligatoires');
        return;
      }

      await productService.create({
        name: productData.name,
        description: productData.description,
        category: productData.category,
        presentations: productData.presentations
      });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsNewProductModalOpen(false);
      toast.success('Produit créé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la création du produit');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Approvisionnement</h1>
        <button
          onClick={() => setIsNewProductModalOpen(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nouveau Produit
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher un produit..."
          className="w-full pl-10 pr-4 py-2 border rounded-md"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Products List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.map((product: Product) => (
          <div
            key={product.id}
            className="border rounded-lg p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="text-lg font-semibold">{product.name}</h3>
            <p className="text-sm text-gray-600 mb-2">{product.category}</p>
            <div className="space-y-2">
              {product.presentations.map((presentation) => (
                <div
                  key={presentation.id}
                  className="flex justify-between items-center p-2 bg-gray-50 rounded"
                >
                  <div>
                    <span className="font-medium">{presentation.unit}</span>
                    <span className="text-sm text-gray-600 ml-2">
                      Stock: {presentation.stock}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedProduct(product);
                      setSelectedPresentation(presentation);
                    }}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Approvisionner
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Supply Modal */}
      <Modal
        isOpen={!!selectedProduct && !!selectedPresentation}
        onClose={() => {
          setSelectedProduct(null);
          setSelectedPresentation(null);
          setSupplyQuantity(0);
        }}
        title="Approvisionnement"
      >
        <div className="space-y-4">
          <div>
            <p className="font-medium">{selectedProduct?.name}</p>
            <p className="text-sm text-gray-600">
              Présentation: {selectedPresentation?.unit}
            </p>
            <p className="text-sm text-gray-600">
              Stock actuel: {selectedPresentation?.stock}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantité à ajouter
            </label>
            <input
              type="number"
              min="1"
              value={supplyQuantity}
              onChange={(e) => setSupplyQuantity(parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => {
                setSelectedProduct(null);
                setSelectedPresentation(null);
                setSupplyQuantity(0);
              }}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSupply}
              disabled={supplyQuantity <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>

      {/* New Product Modal */}
      <Offcanvas
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        title="Nouveau produit"
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setIsNewProductModalOpen(false)}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              form="product-form"
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Créer
            </button>
          </div>
        }
      >
        <ProductForm
          id="product-form"
          onSubmit={handleNewProduct}
        />
      </Offcanvas>
    </div>
  );
} 