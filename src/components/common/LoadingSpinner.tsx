import React from 'react';

interface LoadingSpinnerProps {
  isVisible: boolean;
  message?: string;
}

export default function LoadingSpinner({ isVisible, message = "Chargement..." }: LoadingSpinnerProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black bg-opacity-50" />
      
      {/* Spinner Container */}
      <div className="relative bg-white rounded-lg p-6 shadow-xl">
        <div className="flex flex-col items-center space-y-4">
          {/* Spinner */}
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          
          {/* Message */}
          <p className="text-sm text-gray-600 font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
}
