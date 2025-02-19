import { Product } from '../schemas/product';
import { productService } from './productService';
import Papa from 'papaparse';
import { toast } from 'react-hot-toast';

interface ImportResult {
  success: number;
  errors: Array<{ row: number; error: string }>;
}

export const importExportService = {
  async importProductsFromCSV(file: File): Promise<ImportResult> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const errors: Array<{ row: number; error: string }> = [];
          const products: Array<Omit<Product, 'id'>> = [];
          
          results.data.forEach((row: any, index: number) => {
            try {
              const product = {
                name: row.name,
                description: row.description,
                category: row.category,
                presentations: [{
                  unit: row.unit,
                  purchasePrice: parseFloat(row.purchase_price),
                  sellingPrice: parseFloat(row.selling_price),
                  stock: parseInt(row.stock, 10),
                  lowStockThreshold: parseInt(row.low_stock_threshold, 10)
                }]
              };
              products.push(product);
            } catch (error) {
              errors.push({ row: index + 2, error: 'Format invalide' });
            }
          });

          if (products.length > 0) {
            try {
              await productService.importProducts(products);
              resolve({
                success: products.length,
                errors
              });
            } catch (error) {
              reject(error);
            }
          } else {
            resolve({
              success: 0,
              errors
            });
          }
        },
        error: (error) => {
          reject(error);
        }
      });
    });
  },

  async exportProductsToCSV(): Promise<Blob> {
    const products = await productService.getAll();
    
    const rows = products.flatMap(product => 
      product.presentations.map(presentation => ({
        name: product.name,
        description: product.description,
        category: product.category,
        unit: presentation.unit,
        purchase_price: presentation.purchasePrice,
        selling_price: presentation.sellingPrice,
        stock: presentation.stock,
        low_stock_threshold: presentation.lowStockThreshold,
        sku: presentation.sku
      }))
    );

    const csv = Papa.unparse(rows);
    return new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  },

  downloadTemplate() {
    const headers = [
      'name',
      'description',
      'category',
      'unit',
      'purchase_price',
      'selling_price',
      'stock',
      'low_stock_threshold'
    ];
    
    const csv = Papa.unparse([headers]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'template_import_produits.csv';
    link.click();
    URL.revokeObjectURL(link.href);
  }
}; 