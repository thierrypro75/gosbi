import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { supplyService } from '../lib/services/supplyService';
import { productService } from '../lib/services/productService';
import { Product, Presentation } from '../lib/schemas/product';
import type { SupplyCreate } from '../lib/schemas/supply';
import { SupplyStatus } from '../lib/schemas/supply';
import { toast } from 'react-hot-toast';
import { ChevronLeft, Plus, Trash2 } from 'lucide-react';
import CreatableSelect from 'react-select/creatable';
import QuickProductForm, { QuickProductFormRef } from '../components/products/QuickProductForm';
import Modal from '../components/ui/Modal';
import LoadingSpinner from '../components/common/LoadingSpinner';

interface ProductOption {
  value: string;
  label: string;
  isNew?: boolean;
  product?: Product | null;
}

interface PresentationOption {
  value: string;
  label: string;
  isNew?: boolean;
  presentation?: Presentation;
}

interface SupplyLineForm {
  productId: string;
  presentationId: string;
  orderedQuantity: number;
  purchasePrice: number | null;
  sellingPrice: number | null;
  product?: Product | null;
  presentation?: Presentation | null;
}

interface ProductFormData {
  name: string;
  description: string;
  category: string;
  presentations: Presentation[];
}

export default function SupplyCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState<SupplyLineForm[]>([]);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [newProductData, setNewProductData] = useState<ProductFormData | null>(null);
  const [newProductLineIndex, setNewProductLineIndex] = useState<number | null>(null);
  const formRef = useRef<QuickProductFormRef>(null);

  // Charger tous les produits
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => productService.getAll()
  });

  // Mutation pour créer un approvisionnement
  const createSupplyMutation = useMutation({
    mutationFn: (data: SupplyCreate) => supplyService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplies'] });
      toast.success('Approvisionnement créé avec succès');
      navigate('/supplies');
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la création: ' + error.message);
    }
  });

  // Mutation pour créer un nouveau produit
  const createProductMutation = useMutation({
    mutationFn: (data: Omit<Product, 'id'>) => productService.create(data),
    onSuccess: (newProduct) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      // Si nous avons un index de ligne en attente, mettre à jour la ligne avec le nouveau produit
      if (newProductLineIndex !== null) {
        const firstPresentation = newProduct.presentations[0]; // Récupérer la première présentation
        const newLines = [...lines];
        
        // Mettre à jour la ligne avec le nouveau produit et sa première présentation
        newLines[newProductLineIndex] = {
          ...newLines[newProductLineIndex],
          productId: newProduct.id!,
          product: newProduct,
          presentationId: firstPresentation.id!,
          presentation: firstPresentation,
          purchasePrice: firstPresentation.purchasePrice || 0,
          sellingPrice: firstPresentation.sellingPrice || 0,
          orderedQuantity: 1 // Ajouter une quantité par défaut
        };
        setLines(newLines);

        // Mettre à jour la liste des produits dans le cache
        const updatedProducts = [...(products || []), newProduct];
        queryClient.setQueryData(['products'], updatedProducts);
      }
      
      setIsNewProductModalOpen(false);
      setNewProductLineIndex(null);
      toast.success('Produit créé avec succès');
    },
    onError: (error: Error) => {
      toast.error('Erreur lors de la création du produit: ' + error.message);
    }
  });

  const handleAddLine = () => {
    setLines([...lines, {
      productId: '',
      presentationId: '',
      orderedQuantity: 1,
      purchasePrice: null,
      sellingPrice: null
    }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const handleLineChange = (index: number, field: keyof SupplyLineForm, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0) {
      toast.error('Ajoutez au moins une ligne à la commande');
      return;
    }

    // Validation détaillée des lignes
    for (const [index, line] of lines.entries()) {
      if (!line.productId) {
        toast.error(`Ligne ${index + 1} : Sélectionnez un produit`);
        return;
      }
      if (!line.presentationId) {
        toast.error(`Ligne ${index + 1} : Sélectionnez une présentation`);
        return;
      }
      if (!line.orderedQuantity || line.orderedQuantity <= 0) {
        toast.error(`Ligne ${index + 1} : La quantité doit être supérieure à 0`);
        return;
      }
      if (line.purchasePrice === null || line.purchasePrice < 0) {
        toast.error(`Ligne ${index + 1} : Le prix d'achat doit être défini et positif`);
        return;
      }
    }

    await createSupplyMutation.mutateAsync({
      description,
      status: SupplyStatus.COMMANDE_INITIEE,
      lines: lines.map(line => ({
        productId: line.productId,
        presentationId: line.presentationId,
        orderedQuantity: line.orderedQuantity,
        purchasePrice: line.purchasePrice || 0,
        sellingPrice: line.sellingPrice || 0,
        receivedQuantity: 0
      }))
    });
  };

  const handleProductSelect = (index: number, option: ProductOption | null) => {
    if (option?.isNew) {
      // Initialiser les données du nouveau produit
      setNewProductData({ 
        name: option.label,
        description: '',
        category: '',
        presentations: [{
          unit: '',  // On laisse vide pour que l'utilisateur puisse le remplir
          purchasePrice: 0,
          sellingPrice: 0,
          stock: 0,
          lowStockThreshold: 0
        }]
      });
      setNewProductLineIndex(index);
      setIsNewProductModalOpen(true);
    } else if (option) {
      const selectedProduct = products.find(p => p.id === option.value);
      const newLines = [...lines];
      newLines[index] = {
        ...newLines[index],
        productId: option.value,
        product: selectedProduct || null,
        presentationId: '',
        presentation: null,
        purchasePrice: null,
        sellingPrice: null
      };
      setLines(newLines);
    } else {
      const newLines = [...lines];
      newLines[index] = {
        ...newLines[index],
        productId: '',
        product: null,
        presentationId: '',
        presentation: null,
        purchasePrice: null,
        sellingPrice: null
      };
      setLines(newLines);
    }
  };

  const handleCreateProduct = async (productData: Omit<Product, 'id'>) => {
    try {
      console.log('Initial productData:', JSON.stringify(productData, null, 2));
      // Ajouter un SKU unique à chaque présentation
      const presentationsWithSku = productData.presentations.map(presentation => {
        // Ne pas générer de SKU ici car il sera généré par le service
        return {
          ...presentation,
          // Supprimer le sku si présent
          sku: undefined
        };
      });

      console.log('Presentations without SKUs:', presentationsWithSku);

      await createProductMutation.mutateAsync({
        ...productData,
        description: productData.description || '',
        presentations: presentationsWithSku
      });
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };

  const handlePresentationCreate = async (index: number, unit: string) => {
    const line = lines[index];
    if (!line.product) return;

    try {
      // Créer une nouvelle présentation sans SKU
      const newPresentation = {
        unit,
        purchasePrice: 0,
        sellingPrice: 0,
        stock: 0,
        lowStockThreshold: 0
      };

      const updatedProduct = await productService.update(line.product.id!, {
        ...line.product,
        presentations: [
          ...line.product.presentations,
          newPresentation
        ]
      });

      // Récupérer la présentation nouvellement créée depuis le produit mis à jour
      const createdPresentation = updatedProduct.presentations[updatedProduct.presentations.length - 1];

      // Mettre à jour la liste des produits
      const newProducts = products.map(p => 
        p.id === updatedProduct.id ? updatedProduct : p
      );
      queryClient.setQueryData(['products'], newProducts);

      // Mettre à jour la ligne avec la nouvelle présentation
      const updatedLine = {
        ...line,
        product: updatedProduct,
        presentationId: createdPresentation.id!, // Utiliser l'ID de la présentation créée
        presentation: createdPresentation,
        purchasePrice: createdPresentation.purchasePrice,
        sellingPrice: createdPresentation.sellingPrice
      };

      const newLines = [...lines];
      newLines[index] = updatedLine;
      setLines(newLines);

      toast.success('Présentation créée avec succès');
    } catch (error) {
      console.error('Error creating presentation:', error);
      toast.error('Erreur lors de la création de la présentation');
    }
  };

  const handlePresentationSelect = (index: number, option: PresentationOption | null) => {
    if (option?.isNew) {
      handlePresentationCreate(index, option.label);
    } else {
      const selectedPresentation = option?.presentation;
      const newLines = [...lines];
      newLines[index] = {
        ...newLines[index],
        presentationId: option?.value || '',
        presentation: selectedPresentation || null,
        purchasePrice: selectedPresentation?.purchasePrice || null,
        sellingPrice: selectedPresentation?.sellingPrice || null
      };
      setLines(newLines);
    }
  };

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="mb-6">
        <button
          onClick={() => navigate('/supplies')}
          className="flex items-center text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Retour aux approvisionnements
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Nouvelle commande</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optionnelle)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              rows={3}
              placeholder="Description de la commande..."
            />
          </div>

          {/* Lignes de commande */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">Produits commandés</h2>
              <button
                type="button"
                onClick={handleAddLine}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter un produit
              </button>
            </div>

            <div className="space-y-4">
              {lines.map((line, index) => (
                <div key={index} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    {/* Produit */}
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Produit
                      </label>
                      <CreatableSelect<ProductOption>
                        isClearable
                        placeholder="Sélectionner ou créer..."
                        options={products.map(product => ({
                          value: product.id!,
                          label: `${product.name} (${product.category})`,
                          product
                        }))}
                        value={line.productId ? {
                          value: line.productId,
                          label: `${line.product?.name} (${line.product?.category})`,
                          product: line.product
                        } : null}
                        onChange={(option) => handleProductSelect(index, option)}
                        onCreateOption={(inputValue) => {
                          handleProductSelect(index, { value: '', label: inputValue, isNew: true });
                        }}
                        formatCreateLabel={(inputValue: string) => `Créer "${inputValue}"`}
                      />
                    </div>

                    {/* Présentation */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Présentation
                      </label>
                      <CreatableSelect<PresentationOption>
                        isClearable
                        isDisabled={!line.productId}
                        placeholder={line.productId ? "Sélectionner ou créer..." : "Sélectionnez d'abord un produit"}
                        options={line.product?.presentations?.map(presentation => ({
                          value: presentation.id!,
                          label: presentation.unit,
                          presentation: presentation
                        })) || []}
                        value={line.presentationId && line.presentation ? {
                          value: line.presentationId,
                          label: line.presentation.unit,
                          presentation: line.presentation
                        } : null}
                        onChange={(option) => handlePresentationSelect(index, option)}
                        formatCreateLabel={(inputValue: string) => `Créer "${inputValue}"`}
                      />
                    </div>

                    {/* Quantité */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantité
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={line.orderedQuantity}
                        onChange={(e) => handleLineChange(index, 'orderedQuantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>

                    {/* Prix d'achat */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prix d'achat
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={line.purchasePrice || ''}
                        onChange={(e) => handleLineChange(index, 'purchasePrice', parseFloat(e.target.value) || null)}
                        className="w-full px-3 py-2 border rounded-md"
                      />
                    </div>
                  </div>

                  {/* Bouton supprimer */}
                  <button
                    type="button"
                    onClick={() => handleRemoveLine(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {lines.length === 0 && (
                <div className="text-center py-12 text-gray-500 border rounded-lg">
                  Aucun produit dans la commande
                </div>
              )}
            </div>
          </div>

          {/* Boutons d'action */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={() => navigate('/supplies')}
              className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              disabled={lines.length === 0}
            >
              Créer la commande
            </button>
          </div>
        </form>
      </div>

      {/* Modal pour créer un nouveau produit */}
      <Modal
        isOpen={isNewProductModalOpen}
        onClose={() => {
          setIsNewProductModalOpen(false);
          setNewProductData(null);
          setNewProductLineIndex(null);
        }}
        title="Nouveau produit"
      >
        {newProductData && (
          <>
            <QuickProductForm
              ref={formRef}
              id="product-form"
              initialData={newProductData}
              onSubmit={(data) => {
                if (data.name && data.category && data.presentations.length > 0) {
                  handleCreateProduct({
                    name: data.name,
                    description: data.description || '',
                    category: data.category,
                    presentations: data.presentations
                  });
                }
              }}
            />
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setIsNewProductModalOpen(false);
                  setNewProductData(null);
                  setNewProductLineIndex(null);
                }}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  console.log('Create product button clicked');
                  if (formRef.current) {
                    console.log('Form ref exists, calling submitForm');
                    formRef.current.submitForm();
                  } else {
                    console.log('Form ref is null');
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Créer le produit
              </button>
            </div>
          </>
        )}
      </Modal>
      
      {/* Loading Spinner */}
      <LoadingSpinner 
        isVisible={createSupplyMutation.isPending || createProductMutation.isPending} 
        message={createSupplyMutation.isPending ? "Création de la commande en cours..." : "Création du produit en cours..."}
      />
    </div>
  );
} 