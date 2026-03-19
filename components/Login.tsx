import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../utils/supabase';

interface LoginProps {
  onClose?: () => void;
}

const Login: React.FC<LoginProps> = ({ onClose }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  // Check for success from Stripe checkout
  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setError(null);
      // Show success message
      alert('Payment successful! Please log in with your email to continue setup.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const timeoutFuse = new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error("Database connection timed out. Please try again.")), 8000)
      );

      const authOperation = isSignUp
        ? signUp(email, password)
        : signIn(email, password);

      const { error, data } = await Promise.race([authOperation, timeoutFuse]);

      if (error) {
        setError(error.message);
      } else {
        if (onClose) {
          onClose();
        } else {
          window.location.href = '/dashboard';
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <img 
            src="/images/Logo_MyParallel.png" 
            alt="MyParallel" 
            className="mx-auto mb-4"
            style={{ height: '80px' }}
          />
          <h1 className="text-3xl font-bold text-slate-900 mb-2">MyParallel</h1>
          <p className="text-slate-600">Your Wellness Support Companion</p>
        </div>

        {/* Toggle */}
        <div className="flex gap-2 mb-6 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setIsSignUp(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              !isSignUp
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              isSignUp
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-base"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed text-base"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {isSignUp && (
          <p className="mt-4 text-sm text-slate-600 text-center">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;

