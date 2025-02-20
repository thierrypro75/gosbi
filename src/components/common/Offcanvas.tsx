import { X } from 'lucide-react';

interface OffcanvasProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export default function Offcanvas({ isOpen, onClose, title, children, footer }: OffcanvasProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="fixed inset-y-0 right-0 flex max-w-full pl-10">
          <div className="w-screen max-w-md">
            <div className="flex h-full flex-col bg-white shadow-xl">
              {/* En-tête */}
              <div className="border-b border-gray-200">
                <div className="flex items-center justify-between px-4 py-6">
                  <h2 className="text-lg font-medium text-gray-900">{title}</h2>
                  <button
                    type="button"
                    className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <span className="sr-only">Fermer</span>
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              {/* Contenu */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-4 py-6">
                  {children}
                </div>
              </div>

              {/* Footer */}
              {footer && (
                <div className="border-t border-gray-200 bg-gray-50 px-4 py-6">
                  {footer}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 