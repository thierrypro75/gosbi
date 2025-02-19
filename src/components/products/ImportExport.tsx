import { useState } from 'react';
import { Download, Upload, FileDown } from 'lucide-react';
import { importExportService } from '../../lib/services/importExportService';
import { toast } from 'react-hot-toast';

export default function ImportExport() {
  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const result = await importExportService.importProductsFromCSV(file);
      toast.success(`${result.success} produits importés avec succès`);
      if (result.errors.length > 0) {
        toast.error(`${result.errors.length} erreurs lors de l'import`);
        console.error('Import errors:', result.errors);
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
      event.target.value = '';
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await importExportService.exportProductsToCSV();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `produits_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('Export réussi');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
      console.error('Export error:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadTemplate = () => {
    importExportService.downloadTemplate();
  };

  return (
    <div className="flex space-x-4">
      <label className="relative">
        <input
          type="file"
          accept=".csv"
          onChange={handleImport}
          className="sr-only"
          disabled={isImporting}
        />
        <span className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer disabled:opacity-50">
          <Upload className="h-5 w-5 mr-2" />
          {isImporting ? 'Importation...' : 'Importer'}
        </span>
      </label>

      <button
        onClick={handleExport}
        disabled={isExporting}
        className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
      >
        <Download className="h-5 w-5 mr-2" />
        {isExporting ? 'Exportation...' : 'Exporter'}
      </button>

      <button
        onClick={handleDownloadTemplate}
        className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
      >
        <FileDown className="h-5 w-5 mr-2" />
        Modèle CSV
      </button>
    </div>
  );
} 