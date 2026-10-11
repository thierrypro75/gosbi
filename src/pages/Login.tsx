import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';
import { Package, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  const inputClass = `block w-full pl-10 pr-4 py-2.5 text-gray-900 border border-gray-300 rounded-lg
    bg-white transition-colors duration-200
    focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none
    placeholder:text-gray-400`;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2 bg-white">
      <Toaster position="top-right" />

      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden text-white">
        <img
          src="/images/login/hero.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-900/30 to-blue-900/20" />

        <div className="relative z-10 p-10 flex items-center gap-3">
          <div className="bg-white/90 p-2 rounded-xl">
            <Package className="h-6 w-6 text-blue-600" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Gosbi Management</span>
        </div>

        <img
          src="/images/login/gosbi-exclusive-dog.png"
          alt="Gosbi Exclusive"
          className="absolute bottom-0 right-8 z-10 h-[52%] max-h-[26rem] w-auto object-contain drop-shadow-2xl"
        />

        <div className="relative z-10 p-10 max-w-[60%]">
          <h2 className="text-4xl font-bold leading-tight">
            Une alimentation naturelle pour chaque chien.
          </h2>
          <p className="mt-3 text-white/80">
            Pilotez vos produits, stocks et commandes depuis un seul espace.
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col lg:min-h-0">
        <header className="relative h-52 shrink-0 overflow-hidden text-white lg:hidden">
          <img
            src="/images/login/hero.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[60%_40%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/80 to-blue-900/10" />
          <div className="relative z-10 flex h-full items-start gap-3 p-6">
            <div className="bg-white/90 p-2 rounded-xl">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <span className="mt-1.5 text-lg font-semibold tracking-tight">Gosbi Management</span>
          </div>
        </header>

        <main className="relative z-10 -mt-8 flex flex-1 items-center justify-center rounded-t-3xl bg-white p-6 sm:p-10 lg:mt-0 lg:rounded-none lg:bg-gradient-to-br lg:from-blue-50 lg:to-white">
          <img
            src="/images/login/gosbi-original-dog.png"
            alt=""
            className="pointer-events-none absolute bottom-full right-6 h-24 w-auto object-contain lg:hidden"
          />
          <img
            src="/images/login/gosbi-fresko-dog.png"
            alt=""
            className="pointer-events-none absolute bottom-0 right-8 hidden h-40 w-auto object-contain opacity-90 xl:block"
          />

          <div className="relative w-full max-w-md">
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-900">Bienvenue</h1>
              <p className="mt-1 text-gray-600">Connectez-vous à votre compte Gosbi</p>
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
                  className={inputClass}
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
                  tabIndex={-1}
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
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:text-blue-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
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
        </main>
      </div>
    </div>
  );
}
