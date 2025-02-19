import React from 'react';
import { Package, Plus } from 'lucide-react';

export default function Products() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Produits</h1>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
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
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix
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
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Package className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        Gosbi Exclusive Grain Free Adult Mini
                      </div>
                      <div className="text-sm text-gray-500">
                        Croquettes pour chien
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  GOS-EXC-GF-AM-7
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €45,99
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    En stock (124)
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button className="text-blue-600 hover:text-blue-900">Modifier</button>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-200">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Package className="h-10 w-10 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Gosbi Exclusive Grain Free Adult Mini
                    </h3>
                    <p className="text-sm text-gray-500">Croquettes pour chien</p>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-900">
                  Modifier
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500">SKU</p>
                  <p className="text-sm font-medium text-gray-900">GOS-EXC-GF-AM-7</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prix</p>
                  <p className="text-sm font-medium text-gray-900">€45,99</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Stock</p>
                  <span className="mt-1 inline-flex px-2 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                    En stock (124)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}