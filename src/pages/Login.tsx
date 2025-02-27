import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { Package, Mail, Lock } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Identifiants invalides. Vérifiez votre email et mot de passe.');
        } else if (error.message.includes('Email not confirmed')) {
          toast.error('Veuillez confirmer votre email avant de vous connecter. Vérifiez votre boîte de réception.');
        } else if (error.message.includes('Invalid email')) {
          toast.error('Format d\'email invalide. Veuillez vérifier votre saisie.');
        } else if (error.message.includes('rate limit')) {
          toast.error('Trop de tentatives. Veuillez réessayer dans quelques minutes.');
        } else if (error.status === 404 || error.message.includes('404')) {
          toast.error('Le service d\'authentification est inaccessible. Veuillez réessayer plus tard.');
        } else if (error.status === 400 || error.message.includes('400')) {
          toast.error('Requête invalide. Veuillez vérifier vos informations.');
        } else {
          toast.error('Une erreur est survenue lors de la connexion. Veuillez réessayer.');
        }
        return;
      }
      
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Une erreur inattendue est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-blue-50 p-3 rounded-xl">
              <Package className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">Gosbi Management</h1>
            <p className="mt-1 text-gray-600">Connectez-vous à votre compte</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg 
                    bg-white/50 backdrop-blur-sm transition-colors duration-200
                    focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none
                    placeholder:text-gray-400"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Mot de passe
                </label>
                <Link
                  to="/reset-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg 
                    bg-white/50 backdrop-blur-sm transition-colors duration-200
                    focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none
                    placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent 
                rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors duration-200"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}