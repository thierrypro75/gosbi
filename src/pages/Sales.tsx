import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Plus, Trash2, X, Save, SaveAll } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { saleService, Sale } from '../lib/services/saleService';
import { productService } from '../lib/services/productService';
import { clientService, Client } from '../lib/services/clientService';
import { toast } from 'react-hot-toast';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import Offcanvas from '../components/common/Offcanvas';
import SaleForm from '../components/sales/SaleForm';
import ClientSelector from '../components/sales/ClientSelector';
import LoadingSpinner from '../components/common/LoadingSpinner';
import DataTable, { SearchInput, type DataColumn } from '../components/ui/DataTable';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import { Product } from '../lib/schemas/product';

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
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [description, setDescription] = useState<string>('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState<[Date, Date]>(getCurrentMonthDates());
  const [itemsPerPage] = useState(25);
  const [saleTotal, setSaleTotal] = useState(0);
  const queryClient = useQueryClient();
  // Une seule bascule automatique vers la dernière période avec des ventes, sauf si l'utilisateur choisit lui-même.
  const periodSettled = useRef(false);

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productService.getAll
  });

  const { data: salesData } = useQuery({
    queryKey: ['sales', dateRange],
    queryFn: async () => {
      const startDate = dateRange[0].toISOString().split('T')[0];
      const endDate = new Date(dateRange[1].getTime() + 24 * 60 * 60 * 1000 - 1).toISOString().split('T')[0];
      return await saleService.getSales(startDate, endDate);
    }
  });

  const sales = salesData?.data || [];

  useEffect(() => {
    if (periodSettled.current || !salesData) return;
    periodSettled.current = true;
    if (sales.length > 0) return;

    saleService.getLatestSaleDate().then((latest) => {
      if (!latest) return;
      const d = new Date(latest);
      const first = new Date(d.getFullYear(), d.getMonth(), 1);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      last.setHours(23, 59, 59, 999);
      setDateRange([first, last]);
    });
  }, [salesData]);

  const handleDateRangeChange = (dates: [Date, Date] | null) => {
    periodSettled.current = true;
    if (dates) {
      setDateRange(dates);
    }
  };

  const createSale = async (formData: { presentationId: string; sellingPriceId: string; quantity: number }, keepClient: boolean = false) => {
    if (!formData.presentationId || !formData.sellingPriceId || formData.quantity <= 0 || !selectedClient || !saleDate) return;

    setLoading(true);
    try {
      const presentation = products
        .flatMap(p => p.presentations)
        .find(p => p.id === formData.presentationId);
      
      const sellingPrice = presentation?.sellingPrices?.find(sp => sp.id === formData.sellingPriceId);

      if (!presentation || !sellingPrice) {
        toast.error('Présentation ou prix de vente non trouvé');
        return;
      }

      // Trouver le produit parent de la présentation
      const parentProduct = products.find(p =>
        p.presentations.some(pres => pres.id === formData.presentationId)
      );

      if (!parentProduct) {
        toast.error('Produit parent non trouvé');
        return;
      }

      if (!parentProduct.id) {
        toast.error('ID du produit parent non trouvé');
        return;
      }

      // Si le client a l'ID "new", créer d'abord le client
      let clientId = selectedClient?.id;
      let clientName = selectedClient?.name || '';

      if (selectedClient?.id === 'new') {
        const clientResult = await clientService.createClient({
          name: selectedClient.name,
          email: '',
          phone: '',
          company: '',
          status: 'ACTIVE'
        });

        if (clientResult.error) {
          console.error('Error creating client:', clientResult.error);
          toast.error('Erreur lors de la création du client');
          return;
        }

        clientId = clientResult.data?.id || null;
        clientName = clientResult.data?.name || selectedClient.name;

        // Recharger la liste des clients
        queryClient.invalidateQueries({ queryKey: ['clients'] });
      }

      const result = await saleService.createSale(
        parentProduct.id,
        formData.presentationId,
        formData.sellingPriceId,
        formData.quantity,
        sellingPrice.price,
        saleDate,
        clientId,
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

      // Réinitialiser le formulaire selon le mode
      if (keepClient) {
        // Mode "Enregistrer et nouveau" : garder le client, réinitialiser le reste
        setDescription('');
        setSaleDate(new Date().toISOString().split('T')[0]);
        setSaleTotal(0);
        toast.success('Vente enregistrée. Prêt pour une nouvelle vente.');
      } else {
        // Mode normal : tout réinitialiser
        setSelectedClient(null);
        setDescription('');
        setIsOffcanvasOpen(false);
        toast.success('Vente enregistrée avec succès');
      }
    } catch (error) {
      console.error('Error creating sale:', error);
      toast.error('Erreur lors de l\'enregistrement de la vente');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: { presentationId: string; sellingPriceId: string; quantity: number }, keepClient: boolean = false) => {
    await createSale(formData, keepClient);
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

  const salesColumns: DataColumn<Sale>[] = [
    {
      id: 'date',
      header: 'Date',
      width: 104,
      sticky: 'left',
      cell: (sale) => <span className="text-muted">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</span>,
      search: (sale) => new Date(sale.sale_date).toLocaleDateString('fr-FR'),
    },
    {
      id: 'client',
      header: 'Client',
      width: 144,
      sticky: 'left',
      cell: (sale) => sale.client_name,
      search: (sale) => sale.client_name,
    },
    {
      id: 'product',
      header: 'Produit',
      width: 240,
      sticky: 'left',
      cell: (sale) => (
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-5 w-5 shrink-0 text-subtle" aria-hidden="true" />
          <div className="min-w-0">
            <div className="truncate text-ink">{sale.product?.name}</div>
            <div className="truncate text-muted">{sale.presentation?.unit}</div>
          </div>
        </div>
      ),
      search: (sale) => `${sale.product?.name ?? ''} ${sale.presentation?.unit ?? ''}`,
    },
    {
      id: 'quantity',
      header: 'Quantité',
      width: 104,
      align: 'right',
      cell: (sale) => <span className="tabular-nums">{sale.quantity}</span>,
    },
    {
      id: 'unit_price',
      header: 'Prix unitaire',
      width: 152,
      align: 'right',
      cell: (sale) => <span className="tabular-nums">{formatPrice(sale.unit_price)}</span>,
    },
    {
      id: 'total',
      header: 'Total',
      width: 152,
      align: 'right',
      cell: (sale) => <span className="font-medium tabular-nums">{formatPrice(sale.total_amount)}</span>,
      footer: (rows) => (
        <span className="tabular-nums text-accent-ink">
          {formatPrice(rows.reduce((sum, sale) => sum + sale.total_amount, 0))}
        </span>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      cell: (sale) => <span className="text-muted">{sale.description || '–'}</span>,
      search: (sale) => sale.description,
      wrap: true,
      cellClassName: 'min-w-[12rem]',
    },
    {
      id: 'actions',
      header: <span className="sr-only">Actions</span>,
      width: 72,
      sticky: 'right',
      align: 'center',
      cell: (sale) => (
        <button
          type="button"
          onClick={() => handleDelete(sale.id)}
          aria-label={`Supprimer la vente de ${sale.client_name}`}
          title="Supprimer"
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 md:h-[calc(100dvh-3rem)]">
      <div className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Ventes</h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:justify-end">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Client, produit, description…"
            label="Rechercher parmi les ventes"
            className="sm:w-60"
          />
          <div className="relative w-full sm:w-64" style={{ zIndex: 20 }}>
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
      <DataTable<Sale>
        rows={sales}
        rowKey={(sale) => sale.id}
        label="ventes"
        caption="Liste des ventes"
        query={search}
        onQueryChange={setSearch}
        hideSearch
        pageSize={itemsPerPage}
        fill
        footerLabel="Total général"
        emptyMessage="Aucune vente sur cette période."
        columns={salesColumns}
        mobile={{
          render: (sale) => (
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ShoppingCart className="h-8 w-8 shrink-0 text-subtle" aria-hidden="true" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-ink">
                      {sale.product?.name}
                      <span className="ml-2 text-muted">({sale.presentation?.unit})</span>
                    </h3>
                    <p className="text-sm text-muted">{new Date(sale.sale_date).toLocaleDateString('fr-FR')}</p>
                    <p className="text-sm text-ink">Client : {sale.client_name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(sale.id)}
                  aria-label="Supprimer la vente"
                  className="-mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted">Quantité</dt>
                  <dd className="font-medium tabular-nums text-ink">{sale.quantity}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted">Prix unitaire</dt>
                  <dd className="font-medium tabular-nums text-ink">{formatPrice(sale.unit_price)}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-muted">Total</dt>
                  <dd className="font-semibold tabular-nums text-accent-ink">{formatPrice(sale.total_amount)}</dd>
                </div>
                {sale.description && (
                  <div className="col-span-2">
                    <dt className="text-xs text-muted">Description</dt>
                    <dd className="text-ink">{sale.description}</dd>
                  </div>
                )}
              </dl>
            </div>
          ),
          footer: (rows) => (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-ink">Total général</span>
              <span className="text-sm font-semibold tabular-nums text-accent-ink">
                {formatPrice(rows.reduce((sum, sale) => sum + sale.total_amount, 0))}
              </span>
            </div>
          ),
        }}
      />

      <Offcanvas
        isOpen={isOffcanvasOpen}
        onClose={() => {
          setIsOffcanvasOpen(false);
          setSelectedClient(null);
          setDescription('');
          setSaleDate(new Date().toISOString().split('T')[0]);
        }}
        title={
          <div className="flex items-center space-x-3">
            <span>Vente du</span>
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="text-lg font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
              required
            />
          </div>
        }
        footer={
          <div className="flex items-center justify-between">
            <div className="text-lg font-bold text-gray-900">
              Total : {saleTotal.toLocaleString('fr-FR')} MGA
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsOffcanvasOpen(false);
                  setSelectedClient(null);
                  setDescription('');
                  setSaleDate(new Date().toISOString().split('T')[0]);
                  setSaleTotal(0);
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
                  // Soumettre le formulaire avec le mode "Enregistrer et nouveau"
                  const form = document.getElementById('sale-form') as HTMLFormElement;
                  if (form) {
                    const formData = new FormData(form);
                    const data = {
                      presentationId: formData.get('presentationId') as string,
                      sellingPriceId: formData.get('sellingPriceId') as string,
                      quantity: parseInt(formData.get('quantity') as string) || 1
                    };

                    if (data.presentationId && data.sellingPriceId && data.quantity > 0) {
                      await handleSubmit(data, true); // Mode "Enregistrer et nouveau"
                    }
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
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Client</label>
            <ClientSelector
              selectedClient={selectedClient}
              onClientSelect={setSelectedClient}
              placeholder="Rechercher ou créer un client..."
              className="mt-1"
            />
          </div>

          <SaleForm
            id="sale-form"
            products={products}
            onSubmit={handleSubmit}
            onTotalChange={setSaleTotal}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-gray-900"
              placeholder="Description de la vente (optionnel)"
            />
          </div>
        </div>
      </Offcanvas>
      
      {/* Loading Spinner */}
      <LoadingSpinner 
        isVisible={loading} 
        message="Enregistrement de la vente en cours..."
      />
    </div>
  );
}