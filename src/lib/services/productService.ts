import { supabase } from '../supabaseClient';
import { Product, ProductUpdate } from '../schemas/product';
import toast from 'react-hot-toast';

const TABLE_NAME = 'products';

export const productService = {
  async getAll() {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('name');

    if (error) {
      toast.error('Erreur lors du chargement des produits');
      throw error;
    }

    return data;
  },

  async getById(id: string) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Erreur lors du chargement du produit');
      throw error;
    }

    return data;
  },

  async create(product: Omit<Product, 'id'>) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert([{ ...product, createdAt: new Date(), updatedAt: new Date() }])
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la création du produit');
      throw error;
    }

    toast.success('Produit créé avec succès');
    return data;
  },

  async update(id: string, product: ProductUpdate) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ ...product, updatedAt: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la mise à jour du produit');
      throw error;
    }

    toast.success('Produit mis à jour avec succès');
    return data;
  },

  async delete(id: string) {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Erreur lors de la suppression du produit');
      throw error;
    }

    toast.success('Produit supprimé avec succès');
  },

  async updateStock(id: string, quantity: number) {
    const { data: product } = await this.getById(id);
    const newStock = product.stock + quantity;

    if (newStock < 0) {
      toast.error('Stock insuffisant');
      throw new Error('Stock insuffisant');
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ 
        stock: newStock,
        updatedAt: new Date()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      toast.error('Erreur lors de la mise à jour du stock');
      throw error;
    }

    // Vérifier le seuil de stock bas
    if (newStock <= product.lowStockThreshold) {
      toast.error(`Stock bas pour ${product.name} (${newStock} unités restantes)`);
      // Ici, on pourrait ajouter une notification dans une table dédiée
    }

    return data;
  },

  async importProducts(products: Omit<Product, 'id'>[]) {
    const { data, error } = await supabase
      .from(TABLE_NAME)
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