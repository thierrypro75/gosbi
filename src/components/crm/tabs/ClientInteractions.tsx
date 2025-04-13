import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

interface Interaction {
  id: string;
  type: string;
  date: string;
  notes: string;
}

interface ClientInteractionsProps {
  clientId: string;
  interactions: Interaction[];
  onAddInteraction: (interaction: Omit<Interaction, 'id'>) => void;
  onDeleteInteraction: (id: string) => void;
}

export default function ClientInteractions({
  clientId,
  interactions,
  onAddInteraction,
  onDeleteInteraction,
}: ClientInteractionsProps) {
  const [newInteraction, setNewInteraction] = React.useState({
    type: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddInteraction(newInteraction);
    setNewInteraction({
      type: '',
      date: new Date().toISOString().split('T')[0],
      notes: '',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle interaction</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input
                  id="type"
                  value={newInteraction.type}
                  onChange={(e) =>
                    setNewInteraction({ ...newInteraction, type: e.target.value })
                  }
                  placeholder="Appel, Email, Réunion..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newInteraction.date}
                  onChange={(e) =>
                    setNewInteraction({ ...newInteraction, date: e.target.value })
                  }
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newInteraction.notes}
                onChange={(e) =>
                  setNewInteraction({ ...newInteraction, notes: e.target.value })
                }
                placeholder="Détails de l'interaction..."
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter l'interaction
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historique des interactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {interactions.map((interaction) => (
              <div
                key={interaction.id}
                className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{interaction.type}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(interaction.date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {interaction.notes}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteInteraction(interaction.id)}
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 