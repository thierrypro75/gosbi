import { supabase } from '../supabaseClient';
import { Product, ProductUpdate, Presentation } from '../schemas/product';
import toast from 'react-hot-toast';

const PRODUCTS_TABLE = 'products';
const PRESENTATIONS_TABLE = 'presentations';

function generateSKU(productName: string, unit: string, index: number): string {
  // Prend les 3 premières lettres du nom du produit en majuscules
  const prefix = productName.slice(0, 3).toUpperCase();
  // Prend la première lettre de l'unité en majuscules
  const unitPrefix = unit.slice(0, 1).toUpperCase();
  // Ajoute un numéro séquentiel sur 3 chiffres
  const sequence = String(index + 1).padStart(3, '0');
  
  return `${prefix}-${unitPrefix}${sequence}`;
}

export const productService = {
  async getAll() {
    const { data: products, error: productsError } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .order('name');

    if (productsError) {
      toast.error('Erreur lors du chargement des produits');
      throw productsError;
    }

    // Récupérer les présentations pour chaque produit
    const productsWithPresentations = await Promise.all(
      products.map(async (product) => {
        const { data: presentations, error: presentationsError } = await supabase
          .from(PRESENTATIONS_TABLE)
          .select('*')
          .eq('product_id', product.id)
          .order('created_at');

        if (presentationsError) {
          toast.error('Erreur lors du chargement des présentations');
          throw presentationsError;
        }

        // Convertir les présentations en format camelCase
        const formattedPresentations = (presentations || []).map(p => ({
          id: p.id,
          unit: p.unit,
          purchasePrice: p.purchase_price,
          sellingPrice: p.selling_price,
          stock: p.stock,
          lowStockThreshold: p.low_stock_threshold,
          sku: p.sku
        }));

        return {
          ...product,
          presentations: formattedPresentations
        };
      })
    );

    return productsWithPresentations;
  },

  async getById(id: string) {
    const { data: product, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (productError) {
      toast.error('Erreur lors du chargement du produit');
      throw productError;
    }

    const { data: presentations, error: presentationsError } = await supabase
      .from(PRESENTATIONS_TABLE)
      .select('*')
      .eq('product_id', id)
      .order('created_at');

    if (presentationsError) {
      toast.error('Erreur lors du chargement des présentations');
      throw presentationsError;
    }

    // Convertir les présentations en format camelCase
    const formattedPresentations = (presentations || []).map(p => ({
      id: p.id,
      unit: p.unit,
      purchasePrice: p.purchase_price,
      sellingPrice: p.selling_price,
      stock: p.stock,
      lowStockThreshold: p.low_stock_threshold,
      sku: p.sku
    }));

    return {
      ...product,
      presentations: formattedPresentations
    };
  },

  async create(product: Omit<Product, 'id'>) {
    console.log('Creating product in service:', product);
    // 1. Créer d'abord le produit
    const { data: newProduct, error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .insert([{
        name: product.name,
        description: product.description,
        category: product.category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (productError) {
      console.error('Error creating product:', productError);
      toast.error('Erreur lors de la création du produit');
      throw productError;
    }

    console.log('Product created:', newProduct);

    // 2. Créer les présentations avec les SKUs générés
    const presentationsToCreate = product.presentations.map((presentation, index) => ({
      product_id: newProduct.id,
      unit: presentation.unit,
      purchase_price: presentation.purchasePrice,
      selling_price: presentation.sellingPrice,
      stock: presentation.stock,
      low_stock_threshold: presentation.lowStockThreshold,
      sku: generateSKU(product.name, presentation.unit, index),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    console.log('Creating presentations:', presentationsToCreate);

    const { data: presentations, error: presentationsError } = await supabase
      .from(PRESENTATIONS_TABLE)
      .insert(presentationsToCreate)
      .select();

    if (presentationsError) {
      console.error('Error creating presentations:', presentationsError);
      // Si erreur, supprimer le produit créé
      await supabase.from(PRODUCTS_TABLE).delete().eq('id', newProduct.id);
      toast.error('Erreur lors de la création des présentations');
      throw presentationsError;
    }

    // Convertir les présentations en format camelCase pour le frontend
    const formattedPresentations = presentations.map(p => ({
      id: p.id,
      unit: p.unit,
      purchasePrice: p.purchase_price,
      sellingPrice: p.selling_price,
      stock: p.stock,
      lowStockThreshold: p.low_stock_threshold,
      sku: p.sku
    }));

    console.log('Presentations created:', formattedPresentations);
    toast.success('Produit créé avec succès');
    return {
      ...newProduct,
      presentations: formattedPresentations
    };
  },

  async update(id: string, product: ProductUpdate) {
    // 1. Mettre à jour le produit
    const { error: productError } = await supabase
      .from(PRODUCTS_TABLE)
      .update({
        name: product.name,
        description: product.description,
        category: product.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (productError) {
      toast.error('Erreur lors de la mise à jour du produit');
      throw productError;
    }

    // 2. Mettre à jour ou créer les présentations
    if (product.presentations) {
      // Supprimer les anciennes présentations
      await supabase
        .from(PRESENTATIONS_TABLE)
        .delete()
        .eq('product_id', id);

      // Créer les nouvelles présentations
      const presentationsToCreate = product.presentations.map((presentation, index) => ({
        product_id: id,
        unit: presentation.unit,
        purchase_price: presentation.purchasePrice,
        selling_price: presentation.sellingPrice,
        stock: presentation.stock,
        low_stock_threshold: presentation.lowStockThreshold,
        sku: generateSKU(product.name!, presentation.unit, index),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error: presentationsError } = await supabase
        .from(PRESENTATIONS_TABLE)
        .insert(presentationsToCreate)
        .select();

      if (presentationsError) {
        toast.error('Erreur lors de la mise à jour des présentations');
        throw presentationsError;
      }
    }

    toast.success('Produit mis à jour avec succès');
    return this.getById(id);
  },

  async delete(id: string) {
    // Supprimer d'abord les présentations
    await supabase
      .from(PRESENTATIONS_TABLE)
      .delete()
      .eq('product_id', id);

    // Puis supprimer le produit
    const { error } = await supabase
      .from(PRODUCTS_TABLE)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la suppression du produit');
      throw error;
    }

    toast.success('Produit supprimé avec succès');
  },

  async updateStock(presentationId: string, quantity: number) {
    // 1. Récupérer la présentation actuelle
    const { data: presentation, error: getError } = await supabase
      .from(PRESENTATIONS_TABLE)
      .select('*')
      .eq('id', presentationId)
      .single();

    if (getError) {
      toast.error('Erreur lors de la récupération de la présentation');
      throw getError;
    }

    const newStock = presentation.stock + quantity;
    if (newStock < 0) {
      toast.error('Stock insuffisant');
      throw new Error('Stock insuffisant');
    }

    // 2. Mettre à jour le stock
    const { error: updateError } = await supabase
      .from(PRESENTATIONS_TABLE)
      .update({ 
        stock: newStock,
        updated_at: new Date()
      })
      .eq('id', presentationId);

    if (updateError) {
      toast.error('Erreur lors de la mise à jour du stock');
      throw updateError;
    }

    // 3. Vérifier le seuil de stock bas
    if (newStock <= presentation.low_stock_threshold) {
      toast.error(`Stock bas pour la présentation (${newStock} unités restantes)`);
    }

    return this.getById(presentation.product_id);
  },

  async importProducts(products: Omit<Product, 'id'>[]) {
    const { data, error } = await supabase
      .from(PRODUCTS_TABLE)
      .insert(products.map(product => ({
        ...product,
        createdAt: new Date(),
        updatedAt: new Date()
      })))
      .select();

    if (error) {
      toast.error('Erreur lors de l\'import des produits');
      throw error;
    }

    toast.success(`${products.length} produits importés avec succès`);
    return data;
  }
}; 