import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Mail, Lock, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const [isResetMode, setIsResetMode] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we're in reset mode (user clicked the email link)
    const type = searchParams.get('type');
    setIsResetMode(type === 'recovery');
  }, [searchParams]);

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setIsEmailSent(false);
    setError(null);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password?type=recovery`,
      });
      
      if (error) {
        // Supabase renvoie "Invalid login credentials" quand l'email n'existe pas
        if (error.message.includes('Invalid login credentials')) {
          setError('Aucun compte n\'existe avec cette adresse email');
        } else if (error.message.includes('over_email_send_rate_limit')) {
          setError('Veuillez patienter quelques secondes avant de réessayer');
        } else {
          setError(error.message || 'Erreur lors de l\'envoi des instructions');
        }
        return;
      }
      
      setIsEmailSent(true);
      toast.success('Un email de réinitialisation a été envoyé à ' + email + '. Veuillez vérifier votre boîte de réception et vos spams.');
    } catch (error: any) {
      setError('Une erreur inattendue est survenue');
      console.error('Reset password error:', error);
    } finally {
      setTimeout(() => setLoading(false), 2000);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      if (error) {
        setError(error.message || 'Erreur lors de la mise à jour du mot de passe');
        return;
      }
      
      toast.success('Mot de passe mis à jour avec succès');
      navigate('/login');
    } catch (error: any) {
      setError('Une erreur inattendue est survenue');
      console.error('Password update error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <button
              onClick={() => navigate('/login')}
              className="self-start flex items-center text-gray-600 hover:text-gray-900 mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour à la connexion
            </button>
            <div className="bg-blue-50 p-3 rounded-xl">
              <Lock className="h-10 w-10 text-blue-600" />
            </div>
            <h1 className="mt-4 text-2xl font-bold text-gray-900">
              {isResetMode ? 'Nouveau mot de passe' : 'Réinitialiser le mot de passe'}
            </h1>
            <p className="mt-1 text-gray-600">
              {isResetMode 
                ? 'Entrez votre nouveau mot de passe'
                : 'Entrez votre email pour recevoir les instructions'
              }
            </p>
          </div>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg">
              <p className="text-sm text-red-600">
                {error}
              </p>
            </div>
          )}
          
          {!isResetMode && isEmailSent ? (
            <div className="text-center p-6 bg-green-50 rounded-lg">
              <div className="text-green-600 mb-2">
                ✓ Instructions envoyées !
              </div>
              <p className="text-sm text-green-700">
                Un email de réinitialisation a été envoyé.<br/>
                Il devrait être reçu si <strong>{email}</strong> fait parti de notre base de données.<br/>
                Veuillez vérifier votre boîte de réception et vos spams.
              </p>
              <button
                onClick={() => {
                  setIsEmailSent(false);
                  setEmail('');
                }}
                className="mt-4 text-sm text-green-700 hover:text-green-800 underline"
              >
                Envoyer à une autre adresse
              </button>
            </div>
          ) : (
            <form onSubmit={isResetMode ? handlePasswordReset : handleResetRequest} className="space-y-6">
              {!isResetMode ? (
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
              ) : (
                <div className="space-y-2">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Nouveau mot de passe
                  </label>
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
                      minLength={6}
                    />
                  </div>
                </div>
              )}

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
                ) : (
                  isResetMode ? 'Mettre à jour le mot de passe' : 'Envoyer les instructions'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 