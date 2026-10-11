import { useState } from 'react';
import { Package, Plus, Pencil, Trash2, History } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../lib/services/productService';
import { Product, Presentation } from '../lib/schemas/product';
import Offcanvas from '../components/common/Offcanvas';
import Modal from '../components/common/Modal';
import ProductForm from '../components/products/ProductForm';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { toast } from 'react-hot-toast';
import StockAlerts from '../components/stock/StockAlerts';
import ImportExport from '../components/products/ImportExport';
import StockMovementHistory from '../components/stock/StockMovementHistory';
import DataTable, { SearchInput, type DataColumn } from '../components/ui/DataTable';

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
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: productService.getAll
  });

  // Mutation pour créer/modifier un produit
  const { mutate: saveProduct, isPending: isSaving } = useMutation({
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
  const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
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

  if (isProductsLoading) {
    return <div>Chargement...</div>;
  }

  const openHistory = (product: Product, presentation: Presentation) => {
    setSelectedProduct(product);
    setSelectedPresentation(presentation);
    setIsHistoryModalOpen(true);
  };

  // Une sous-ligne par présentation : hauteur fixe pour que les colonnes restent alignées.
  const sub = 'flex h-11 flex-col justify-center';
  const subs = (product: Product, render: (p: Presentation) => React.ReactNode) => (
    <div className="space-y-2">
      {product.presentations.map((p: Presentation) => (
        <div key={p.id} className={sub}>
          {render(p)}
        </div>
      ))}
    </div>
  );

  const columns: DataColumn<Product>[] = [
    {
      id: 'product',
      header: 'Produit',
      width: 300,
      sticky: 'left',
      wrap: true,
      sort: (p) => p.name,
      search: (p) => `${p.name} ${p.description ?? ''}`,
      cell: (p) => (
        <div className="flex items-start gap-3">
          <Package className="mt-0.5 h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
          <div className="min-w-0">
            <div className="font-medium text-ink">{p.name}</div>
            {p.description && <div className="break-words text-sm text-muted">{truncateDescription(p.description)}</div>}
          </div>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Catégorie',
      width: 140,
      sort: (p) => p.category,
      search: (p) => p.category,
      cell: (p) => (
        <span className="inline-flex items-center rounded-full bg-line/70 px-2.5 py-0.5 text-xs font-medium text-ink">
          {p.category}
        </span>
      ),
    },
    {
      id: 'presentation',
      header: 'Présentation',
      width: 190,
      search: (p) => p.presentations.map((x: Presentation) => `${x.unit} ${x.sku ?? ''}`).join(' '),
      cell: (p) =>
        subs(p, (x) => (
          <>
            <div className="truncate font-medium text-ink">{x.unit}</div>
            <div className="truncate text-sm text-muted">{x.sku}</div>
          </>
        )),
    },
    {
      id: 'price',
      header: 'Prix',
      width: 170,
      align: 'right',
      cell: (p) =>
        subs(p, (x) => (
          <>
            <div className="font-medium tabular-nums text-ink">{formatPrice(x.purchasePrice)}</div>
            <div className="text-sm tabular-nums text-muted">{formatPrice(x.sellingPrice)}</div>
          </>
        )),
    },
    {
      id: 'stock',
      header: 'Stock',
      width: 100,
      align: 'right',
      cell: (p) =>
        subs(p, (x) => (
          <div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums leading-4 ${
                x.stock <= x.lowStockThreshold ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}
            >
              {x.stock}
            </span>
          </div>
        )),
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 144,
      sticky: 'right',
      cell: (p) => (
        <div className="space-y-2">
          {p.presentations.map((x: Presentation, index: number) => (
            <div key={x.id} className="flex h-11 items-center gap-1">
              <button
                type="button"
                onClick={() => openHistory(p, x)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-line/60 hover:text-ink"
                title={`Historique des mouvements (${x.unit})`}
                aria-label={`Historique des mouvements de ${p.name} (${x.unit})`}
              >
                <History className="h-[18px] w-[18px]" aria-hidden="true" />
              </button>
              {index === 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => handleEdit(p)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-accent-ink transition-colors hover:bg-accent-soft"
                    title="Modifier"
                    aria-label={`Modifier ${p.name}`}
                  >
                    <Pencil className="h-[18px] w-[18px]" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id, p.name)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                    title="Supprimer"
                    aria-label={`Supprimer ${p.name}`}
                  >
                    <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Produits</h1>
        <div className="flex items-center gap-2">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Produit, catégorie, référence…"
            label="Rechercher parmi les produits"
            className="flex-1 sm:w-72 sm:flex-none"
          />
          <ImportExport buttonClassName="w-9 h-9 inline-flex items-center justify-center" />
          <button
            onClick={() => {
              setSelectedProduct(null);
              setIsOffcanvasOpen(true);
            }}
            className="w-9 h-9 inline-flex shrink-0 items-center justify-center bg-blue-600 text-white rounded hover:bg-blue-700"
            title="Nouveau Produit"
            aria-label="Nouveau produit"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      <DataTable<Product>
        rows={products ?? []}
        rowKey={(p) => String(p.id)}
        label="produits"
        caption="Liste des produits et de leurs présentations"
        query={searchQuery}
        onQueryChange={setSearchQuery}
        hideSearch
        fill
        defaultSort={{ id: 'product', dir: 'asc' }}
        emptyMessage="Aucun produit enregistré."
        columns={columns}
        mobile={{
          render: (product) => (
            <div className="p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Package className="h-4 w-4 shrink-0 text-subtle" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium text-ink">{product.name}</h3>
                    <p className="truncate text-xs text-muted">{truncateDescription(product.description)}</p>
                  </div>
                </div>
                <div className="flex shrink-0">
                  <button
                    type="button"
                    onClick={() => handleEdit(product)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-accent-ink hover:bg-accent-soft"
                    title="Modifier"
                    aria-label={`Modifier ${product.name}`}
                  >
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(product.id, product.name)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-red-600 hover:bg-red-50"
                    title="Supprimer"
                    aria-label={`Supprimer ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="mt-2 space-y-1.5">
                {product.presentations.map((presentation: Presentation) => (
                  <div key={presentation.id} className="flex items-center justify-between gap-2 rounded-lg border border-line px-2.5 py-2">
                    <div className="min-w-0 text-xs">
                      <span className="font-medium text-ink">{presentation.unit}</span>
                      <span className="ml-1 truncate text-muted">({presentation.sku})</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-xs tabular-nums text-ink">{formatPrice(presentation.purchasePrice)}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-xs font-medium leading-none tabular-nums ${
                          presentation.stock <= presentation.lowStockThreshold
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {presentation.stock}
                      </span>
                      <button
                        type="button"
                        onClick={() => openHistory(product, presentation)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-line/60 hover:text-ink"
                        title="Historique des mouvements"
                        aria-label="Historique des mouvements"
                      >
                        <History className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ),
        }}
      />

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
      
      {/* Loading Spinner */}
      <LoadingSpinner 
        isVisible={isSaving || isDeleting} 
        message={isSaving ? "Enregistrement en cours..." : "Suppression en cours..."}
      />
    </div>
  );
}