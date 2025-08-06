import { supabase } from '../supabaseClient';
import { Product, ProductUpdate, Presentation, SellingPrice } from '../schemas/product';
import { stockMovementService } from './stockMovementService';
import { sellingPriceService } from './sellingPriceService';
import toast from 'react-hot-toast';

const PRODUCTS_TABLE = 'products';
const PRESENTATIONS_TABLE = 'presentations';

function generateSKU(productName: string, unit: string, index: number): string {
  // Prend les 3 premières lettres du nom du produit en majuscules
  const prefix = productName.slice(0, 3).toUpperCase();
  // Prend la première lettre de l'unité en majuscules
  const unitPrefix = unit.slice(0, 1).toUpperCase();
  // Ajoute un timestamp pour garantir l'unicité
  const timestamp = Date.now().toString().slice(-6);
  // Ajoute un numéro séquentiel sur 3 chiffres
  const sequence = String(index + 1).padStart(3, '0');
  
  return `${prefix}-${unitPrefix}${sequence}-${timestamp}`;
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

        // Récupérer les prix de vente pour chaque présentation
        const presentationsWithPrices = await Promise.all(
          (presentations || []).map(async (p) => {
            try {
              const sellingPrices = await sellingPriceService.getByPresentation(p.id);
              return {
                id: p.id,
                unit: p.unit,
                purchasePrice: p.purchase_price,
                sellingPrice: p.selling_price, // Keep for backward compatibility
                sellingPrices: sellingPrices,
                stock: p.stock,
                lowStockThreshold: p.low_stock_threshold,
                sku: p.sku
              };
            } catch (error) {
              // Si pas de prix de vente multiples, utiliser le prix de vente standard
              return {
                id: p.id,
                unit: p.unit,
                purchasePrice: p.purchase_price,
                sellingPrice: p.selling_price,
                sellingPrices: [],
                stock: p.stock,
                lowStockThreshold: p.low_stock_threshold,
                sku: p.sku
              };
            }
          })
        );

        return {
          ...product,
          presentations: presentationsWithPrices
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

    // Récupérer les prix de vente pour chaque présentation
    const presentationsWithPrices = await Promise.all(
      (presentations || []).map(async (p) => {
        try {
          const sellingPrices = await sellingPriceService.getByPresentation(p.id);
          return {
            id: p.id,
            unit: p.unit,
            purchasePrice: p.purchase_price,
            sellingPrice: p.selling_price, // Keep for backward compatibility
            sellingPrices: sellingPrices,
            stock: p.stock,
            lowStockThreshold: p.low_stock_threshold,
            sku: p.sku
          };
        } catch (error) {
          // Si pas de prix de vente multiples, utiliser le prix de vente standard
          return {
            id: p.id,
            unit: p.unit,
            purchasePrice: p.purchase_price,
            sellingPrice: p.selling_price,
            sellingPrices: [],
            stock: p.stock,
            lowStockThreshold: p.low_stock_threshold,
            sku: p.sku
          };
        }
      })
    );

    return {
      ...product,
      presentations: presentationsWithPrices
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

    // 3. Créer les mouvements de stock initiaux
    try {
      await Promise.all(presentations.map(async (presentation) => {
        if (presentation.stock > 0) {
          await stockMovementService.create({
            productId: newProduct.id,
            presentationId: presentation.id,
            quantityIn: presentation.stock,
            quantityOut: null,
            stockBefore: 0,
            stockAfter: presentation.stock,
            reason: 'INITIAL',
            status: 'ACTIVE'
          });
        }
      }));
    } catch (error) {
      console.error('Error creating stock movements:', error);
      // On continue malgré l'erreur car le produit et les présentations sont déjà créés
      toast.error('Erreur lors de la création des mouvements de stock');
    }

    // Créer les prix de vente multiples pour chaque présentation
    const presentationsWithPrices = await Promise.all(
      presentations.map(async (p, index) => {
        const presentation = product.presentations[index];
        const sellingPrices = presentation.sellingPrices || [];

        // Créer les prix de vente multiples (séquentiellement pour éviter les conflits)
        const createdSellingPrices = [];

        // Séparer les prix par défaut et non-par défaut
        const nonDefaultPrices = sellingPrices.filter(sp => !sp.isDefault);
        const defaultPrices = sellingPrices.filter(sp => sp.isDefault);

        // Créer d'abord les prix non-par défaut
        for (const sp of nonDefaultPrices) {
          const createdPrice = await sellingPriceService.create(p.id, {
            label: sp.label,
            price: sp.price,
            isDefault: sp.isDefault
          });
          createdSellingPrices.push(createdPrice);
        }

        // Ensuite créer les prix par défaut (un seul à la fois)
        for (const sp of defaultPrices) {
          const createdPrice = await sellingPriceService.create(p.id, {
            label: sp.label,
            price: sp.price,
            isDefault: sp.isDefault
          });
          createdSellingPrices.push(createdPrice);
        }

        return {
          id: p.id,
          unit: p.unit,
          purchasePrice: p.purchase_price,
          sellingPrice: p.selling_price, // Keep for backward compatibility
          sellingPrices: createdSellingPrices,
          stock: p.stock,
          lowStockThreshold: p.low_stock_threshold,
          sku: p.sku
        };
      })
    );

    console.log('Presentations created with prices:', presentationsWithPrices);
    toast.success('Produit créé avec succès');
    return {
      ...newProduct,
      presentations: presentationsWithPrices
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

    // 2. Mettre à jour les présentations
    if (product.presentations) {
      // Récupérer les présentations actuelles
      const { data: currentPresentations } = await supabase
        .from(PRESENTATIONS_TABLE)
        .select('*')
        .eq('product_id', id);

      const currentPresentationsMap = new Map(
        currentPresentations?.map(p => [p.id, p]) || []
      );

      // Identifier les présentations à créer, mettre à jour ou supprimer
      const presentationsToUpdate = [];
      const presentationsToCreate = [];
      const presentationIdsToKeep = new Set();

      for (const [index, presentation] of product.presentations.entries()) {
        if (presentation.id && currentPresentationsMap.has(presentation.id)) {
          // Mise à jour d'une présentation existante
          presentationsToUpdate.push({
            id: presentation.id,
            unit: presentation.unit,
            purchase_price: presentation.purchasePrice,
            selling_price: presentation.sellingPrice,
            low_stock_threshold: presentation.lowStockThreshold,
            updated_at: new Date().toISOString()
          });
          presentationIdsToKeep.add(presentation.id);
        } else {
          // Nouvelle présentation
          presentationsToCreate.push({
            product_id: id,
            unit: presentation.unit,
            purchase_price: presentation.purchasePrice,
            selling_price: presentation.sellingPrice,
            stock: presentation.stock || 0,
            low_stock_threshold: presentation.lowStockThreshold,
            sku: generateSKU(product.name!, presentation.unit, index),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      }

      // Vérifier les présentations à supprimer
      const presentationsToDelete = currentPresentations
        ?.filter(p => !presentationIdsToKeep.has(p.id))
        .map(p => p.id) || [];

      // Vérifier s'il y a des mouvements de stock pour les présentations à supprimer
      if (presentationsToDelete.length > 0) {
        const { data: movements } = await supabase
          .from('stock_movements')
          .select('presentation_id')
          .in('presentation_id', presentationsToDelete)
          .neq('reason', 'INITIAL');

        if (movements && movements.length > 0) {
          toast.error('Une présentation ne peut pas être supprimée car elle a des mouvements de stock');
          throw new Error('Une présentation ne peut pas être supprimée car elle a des mouvements de stock');
        }

        // Supprimer les présentations qui n'ont pas de mouvements
        const { error: deleteError } = await supabase
          .from(PRESENTATIONS_TABLE)
          .delete()
          .in('id', presentationsToDelete);

        if (deleteError) {
          toast.error('Erreur lors de la suppression des présentations');
          throw deleteError;
        }
      }

      // Mettre à jour les présentations existantes
      if (presentationsToUpdate.length > 0) {
        for (const presentation of presentationsToUpdate) {
          const { error: updateError } = await supabase
            .from(PRESENTATIONS_TABLE)
            .update(presentation)
            .eq('id', presentation.id);

          if (updateError) {
            toast.error('Erreur lors de la mise à jour des présentations');
            throw updateError;
          }
        }
      }

      // Créer les nouvelles présentations
      if (presentationsToCreate.length > 0) {
        const { data: createdPresentations, error: createError } = await supabase
          .from(PRESENTATIONS_TABLE)
          .insert(presentationsToCreate)
          .select();

        if (createError) {
          toast.error('Erreur lors de la création des présentations');
          throw createError;
        }

        // Créer les prix de vente multiples pour les nouvelles présentations
        for (let i = 0; i < createdPresentations.length; i++) {
          const createdPresentation = createdPresentations[i];
          const presentationData = product.presentations.find(p =>
            p.unit === createdPresentation.unit &&
            p.purchasePrice === createdPresentation.purchase_price
          );

          if (presentationData?.sellingPrices) {
            // Séparer les prix par défaut et non-par défaut
            const nonDefaultPrices = presentationData.sellingPrices.filter(sp => !sp.isDefault);
            const defaultPrices = presentationData.sellingPrices.filter(sp => sp.isDefault);

            // Créer d'abord les prix non-par défaut
            for (const sellingPrice of nonDefaultPrices) {
              await sellingPriceService.create(createdPresentation.id, {
                label: sellingPrice.label,
                price: sellingPrice.price,
                isDefault: sellingPrice.isDefault
              });
            }

            // Ensuite créer les prix par défaut (un seul à la fois)
            for (const sellingPrice of defaultPrices) {
              await sellingPriceService.create(createdPresentation.id, {
                label: sellingPrice.label,
                price: sellingPrice.price,
                isDefault: sellingPrice.isDefault
              });
            }
          }
        }
      }

      // Mettre à jour les prix de vente multiples pour chaque présentation
      for (const [index, presentation] of product.presentations.entries()) {
        if (presentation.id && currentPresentationsMap.has(presentation.id)) {
          // Mise à jour des prix de vente pour une présentation existante
          const sellingPrices = presentation.sellingPrices || [];

          // Récupérer les prix existants
          const existingPrices = await sellingPriceService.getByPresentation(presentation.id);
          const existingPricesMap = new Map(existingPrices.map(p => [p.id, p]));

          // Identifier les prix à créer, mettre à jour ou supprimer
          const pricesToCreate = [];
          const pricesToUpdate = [];
          const priceIdsToKeep = new Set();

          // Vérifier s'il y a plusieurs prix par défaut dans les données du formulaire
          const defaultPricesInForm = sellingPrices.filter(sp => sp.isDefault);
          if (defaultPricesInForm.length > 1) {
            console.warn('Multiple default prices detected in form data, keeping only the first one');
            // Garder seulement le premier prix par défaut
            for (let i = 0; i < sellingPrices.length; i++) {
              if (sellingPrices[i].isDefault) {
                // Trouver le premier prix par défaut
                if (i === sellingPrices.findIndex(sp => sp.isDefault)) {
                  // C'est le premier, le garder comme par défaut
                  continue;
                } else {
                  // Ce n'est pas le premier, le marquer comme non-par défaut
                  sellingPrices[i].isDefault = false;
                }
              }
            }
          } else if (defaultPricesInForm.length === 0) {
            // S'il n'y a aucun prix par défaut, marquer le premier comme par défaut
            console.warn('No default price detected in form data, setting first price as default');
            if (sellingPrices.length > 0) {
              sellingPrices[0].isDefault = true;
            }
          }

          for (const sellingPrice of sellingPrices) {
            if (sellingPrice.id && existingPricesMap.has(sellingPrice.id)) {
              // Mise à jour d'un prix existant
              pricesToUpdate.push({
                id: sellingPrice.id,
                label: sellingPrice.label,
                price: sellingPrice.price,
                isDefault: sellingPrice.isDefault
              });
              priceIdsToKeep.add(sellingPrice.id);
            } else {
              // Nouveau prix
              pricesToCreate.push({
                presentationId: presentation.id,
                label: sellingPrice.label,
                price: sellingPrice.price,
                isDefault: sellingPrice.isDefault
              });
            }
          }

          // Supprimer les prix qui ne sont plus présents
          const pricesToDelete = existingPrices
            .filter(p => !priceIdsToKeep.has(p.id))
            .map(p => p.id);

          for (const priceId of pricesToDelete) {
            await sellingPriceService.delete(priceId);
          }

          // S'assurer qu'il n'y a qu'un seul prix par défaut
          const defaultPricesToCreate = pricesToCreate.filter(p => p.isDefault);
          const nonDefaultPricesToCreate = pricesToCreate.filter(p => !p.isDefault);

          // Si plusieurs prix sont marqués comme par défaut, ne garder que le premier
          if (defaultPricesToCreate.length > 1) {
            console.warn('Multiple default prices detected, keeping only the first one');
            const firstDefault = defaultPricesToCreate[0];
            const othersAsNonDefault = defaultPricesToCreate.slice(1).map(p => ({ ...p, isDefault: false }));

            // Ajouter les autres comme non-par défaut
            nonDefaultPricesToCreate.push(...othersAsNonDefault);

            // Ne garder que le premier comme par défaut
            defaultPricesToCreate.splice(1);
          }

          // Créer d'abord les prix non-par défaut
          console.log('🔄 Creating non-default prices:', nonDefaultPricesToCreate);
          for (const priceData of nonDefaultPricesToCreate) {
            console.log('📤 Creating non-default price:', priceData);
            await sellingPriceService.create(priceData.presentationId, {
              label: priceData.label,
              price: priceData.price,
              isDefault: priceData.isDefault
            });
          }

          // Ensuite créer les prix par défaut (un seul à la fois)
          console.log('🔄 Creating default prices:', defaultPricesToCreate);
          for (const priceData of defaultPricesToCreate) {
            console.log('📤 Creating default price:', priceData);
            await sellingPriceService.create(priceData.presentationId, {
              label: priceData.label,
              price: priceData.price,
              isDefault: priceData.isDefault
            });
          }

          // S'assurer qu'il n'y a qu'un seul prix par défaut parmi les prix existants
          const defaultPrices = pricesToUpdate.filter(p => p.isDefault);
          const nonDefaultPrices = pricesToUpdate.filter(p => !p.isDefault);

          // Si plusieurs prix existants sont marqués comme par défaut, ne garder que le premier
          if (defaultPrices.length > 1) {
            console.warn('Multiple default prices detected in existing prices, keeping only the first one');
            const firstDefault = defaultPrices[0];
            const othersAsNonDefault = defaultPrices.slice(1).map(p => ({ ...p, isDefault: false }));

            // Ajouter les autres comme non-par défaut
            nonDefaultPrices.push(...othersAsNonDefault);

            // Ne garder que le premier comme par défaut
            defaultPrices.splice(1);
          }

          // Mettre à jour d'abord les prix non-par défaut
          for (const priceData of nonDefaultPrices) {
            await sellingPriceService.update(priceData.id, {
              label: priceData.label,
              price: priceData.price,
              isDefault: priceData.isDefault
            });
          }

          // Ensuite mettre à jour les prix par défaut (un seul à la fois)
          for (const priceData of defaultPrices) {
            await sellingPriceService.update(priceData.id, {
              label: priceData.label,
              price: priceData.price,
              isDefault: priceData.isDefault
            });
          }
        }
      }
    }

    toast.success('Produit mis à jour avec succès');
    return this.getById(id);
  },

  async delete(id: string) {
    // Vérifier si le produit a des mouvements de stock non-initiaux
    const { data: movements, error: movementsError } = await supabase
      .from('stock_movements')
      .select('reason')
      .eq('product_id', id)
      .neq('reason', 'INITIAL');

    if (movementsError) {
      toast.error('Erreur lors de la vérification des mouvements de stock');
      throw movementsError;
    }

    if (movements && movements.length > 0) {
      toast.error('Ce produit ne peut pas être supprimé car il a des mouvements de stock');
      throw new Error('Ce produit ne peut pas être supprimé car il a des mouvements de stock');
    }

    // Si pas de mouvements non-initiaux, supprimer le produit
    const { error: deleteError } = await supabase
      .from(PRODUCTS_TABLE)
      .delete()
      .eq('id', id);

    if (deleteError) {
      toast.error('Erreur lors de la suppression du produit');
      throw deleteError;
    }

    toast.success('Produit supprimé avec succès');
  },

  async updateStock(presentationId: string, quantity: number) {
    // 1. Récupérer la présentation actuelle
    const { data: presentation, error: getError } = await supabase
      .from(PRESENTATIONS_TABLE)
      .select('*, products!inner(*)')
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

  async processSale(presentationId: string, quantity: number) {
    // 1. Récupérer la présentation actuelle
    const { data: presentation, error: getError } = await supabase
      .from(PRESENTATIONS_TABLE)
      .select('*, products!inner(*)')
      .eq('id', presentationId)
      .single();

    if (getError) {
      toast.error('Erreur lors de la récupération de la présentation');
      throw getError;
    }

    const newStock = presentation.stock - quantity;
    if (newStock < 0) {
      toast.error('Stock insuffisant');
      throw new Error('Stock insuffisant');
    }

    // 2. Créer le mouvement de stock pour la vente
    await stockMovementService.create({
      productId: presentation.product_id,
      presentationId: presentationId,
      quantityIn: null,
      quantityOut: quantity,
      stockBefore: presentation.stock,
      stockAfter: newStock,
      reason: 'SALE',
      status: 'ACTIVE'
    });

    // 3. Mettre à jour le stock
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

    // 4. Vérifier le seuil de stock bas
    if (newStock <= presentation.low_stock_threshold) {
      toast.error(`Stock bas pour la présentation (${newStock} unités restantes)`);
    }

    return this.getById(presentation.product_id);
  },

  async processReturn(presentationId: string, quantity: number) {
    // 1. Récupérer la présentation actuelle
    const { data: presentation, error: getError } = await supabase
      .from(PRESENTATIONS_TABLE)
      .select('*, products!inner(*)')
      .eq('id', presentationId)
      .single();

    if (getError) {
      toast.error('Erreur lors de la récupération de la présentation');
      throw getError;
    }

    const newStock = presentation.stock + quantity;

    // 2. Créer le mouvement de stock pour le retour
    await stockMovementService.create({
      productId: presentation.product_id,
      presentationId: presentationId,
      quantityIn: quantity,
      quantityOut: null,
      stockBefore: presentation.stock,
      stockAfter: newStock,
      reason: 'RETURN',
      status: 'ACTIVE'
    });

    // 3. Mettre à jour le stock
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