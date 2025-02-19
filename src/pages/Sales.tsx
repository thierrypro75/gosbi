import React from 'react';
import { ShoppingCart, Download } from 'lucide-react';
import { formatPrice } from '../lib/utils';

export default function Sales() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Ventes</h1>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          <Download className="h-5 w-5 mr-2" />
          Exporter
        </button>
      </div>

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          {/* Desktop view */}
          <table className="hidden md:table min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Produit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Prix unitaire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  15 février 2025
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <ShoppingCart className="h-5 w-5 text-gray-400 mr-3" />
                    <div className="text-sm text-gray-900">
                      Gosbi Exclusive Grain Free Adult Mini
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  5
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  €45,99
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  €229,95
                </td>
              </tr>
            </tbody>
          </table>

          {/* Mobile view */}
          <div className="md:hidden divide-y divide-gray-200">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <ShoppingCart className="h-10 w-10 text-gray-400" />
                  <div>
                    <h3 className="text-sm font-medium text-gray-900">
                      Gosbi Exclusive Grain Free Adult Mini
                    </h3>
                    <p className="text-sm text-gray-500">15 février 2025</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <p className="text-xs text-gray-500">Quantité</p>
                  <p className="text-sm font-medium text-gray-900">5</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Prix unitaire</p>
                  <p className="text-sm font-medium text-gray-900">€45,99</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-sm font-medium text-blue-600">€229,95</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}