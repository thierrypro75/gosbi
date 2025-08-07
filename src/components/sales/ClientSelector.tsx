import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, User } from 'lucide-react';
import { clientService, Client } from '../../lib/services/clientService';
import { toast } from 'react-hot-toast';

interface ClientSelectorProps {
  selectedClient: Client | null;
  onClientSelect: (client: Client | null) => void;
  placeholder?: string;
  className?: string;
}

export default function ClientSelector({ 
  selectedClient, 
  onClientSelect, 
  placeholder = "Rechercher un client...",
  className = ""
}: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadClients();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadClients = async () => {
    setLoading(true);
    try {
      const { data, error } = await clientService.getActiveClients();
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  const searchClients = async (query: string) => {
    if (query.length < 2) {
      await loadClients();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await clientService.searchClients(query);
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error searching clients:', error);
      toast.error('Erreur lors de la recherche');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    searchClients(query);
  };

  const handleClientSelect = (client: Client) => {
    onClientSelect(client);
    setIsOpen(false);
    setSearchQuery('');
  };

  const clearSelection = () => {
    onClientSelect(null);
    setSearchQuery('');
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={selectedClient ? selectedClient.name : searchQuery}
          onChange={handleSearchChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {selectedClient ? (
            <button
              onClick={clearSelection}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          ) : (
            <Search className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          <div className="p-2">
            <button
              onClick={() => {
                const newClient: Client = {
                  id: 'new',
                  name: searchQuery,
                  status: 'ACTIVE',
                  created_by: '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                };
                onClientSelect(newClient);
                setIsOpen(false);
              }}
              className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center space-x-2 rounded"
            >
              <Plus className="h-4 w-4" />
              <span>Créer "{searchQuery}"</span>
            </button>
          </div>

          <div className="border-t border-gray-200"></div>

          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Chargement...</div>
          ) : clients.length === 0 ? (
            <div className="px-4 py-2 text-sm text-gray-500">
              {searchQuery ? 'Aucun client trouvé' : 'Aucun client disponible'}
            </div>
          ) : (
            <div>
              {clients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => handleClientSelect(client)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center space-x-2"
                >
                  <User className="h-4 w-4 text-gray-400" />
                  <span>{client.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
