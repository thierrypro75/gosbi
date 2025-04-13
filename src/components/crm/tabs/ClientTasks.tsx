import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
}

interface ClientTasksProps {
  clientId: string;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onDeleteTask: (id: string) => void;
  onToggleTask: (id: string) => void;
}

export default function ClientTasks({
  clientId,
  tasks,
  onAddTask,
  onDeleteTask,
  onToggleTask,
}: ClientTasksProps) {
  const [newTask, setNewTask] = React.useState({
    title: '',
    description: '',
    dueDate: new Date().toISOString().split('T')[0],
    completed: false,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddTask(newTask);
    setNewTask({
      title: '',
      description: '',
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nouvelle tâche</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Titre de la tâche"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Description de la tâche"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Date d'échéance</Label>
              <Input
                id="dueDate"
                type="date"
                value={newTask.dueDate}
                onChange={(e) =>
                  setNewTask({ ...newTask, dueDate: e.target.value })
                }
                required
              />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter la tâche
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tâches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-start justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onToggleTask(task.id)}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <CheckCircle2
                        className={`w-5 h-5 ${
                          task.completed
                            ? 'text-green-500 dark:text-green-400'
                            : ''
                        }`}
                      />
                    </button>
                    <span
                      className={`font-medium ${
                        task.completed
                          ? 'line-through text-gray-500 dark:text-gray-400'
                          : ''
                      }`}
                    >
                      {task.title}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>
                  <p
                    className={`text-sm text-gray-600 dark:text-gray-300 ${
                      task.completed ? 'line-through' : ''
                    }`}
                  >
                    {task.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDeleteTask(task.id)}
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