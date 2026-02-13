import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Fingerprint, AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function OwnerLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { ownerLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await ownerLogin(email, password);
      toast.success('Owner access granted');
      navigate('/owner/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Owner authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col noise-overlay">
      {/* Header */}
      <nav className="p-6 md:p-8">
        <Link to="/" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-4 h-4" />
          <span className="font-mono text-xs tracking-widest uppercase">Back to HQ</span>
        </Link>
      </nav>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="p-3 border border-red-800 bg-red-950/30">
                <Lock className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <h1 className="font-heading text-3xl text-white tracking-widest uppercase">
              Owner Portal
            </h1>
            <p className="text-red-500 text-sm mt-2 font-mono">
              // RESTRICTED ACCESS - OWNER ONLY
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-900/50 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 uppercase tracking-widest text-xs">
                Owner Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus:border-red-800 rounded-none h-12 text-white placeholder:text-zinc-600 font-mono"
                placeholder="admin@casefiles.fbi"
                required
                data-testid="owner-email-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 uppercase tracking-widest text-xs">
                Access Code
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus:border-red-800 rounded-none h-12 text-white placeholder:text-zinc-600 font-mono"
                placeholder="••••••••"
                required
                data-testid="owner-password-input"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-red-900 text-white hover:bg-red-800 rounded-none uppercase tracking-widest font-bold text-sm h-12"
              data-testid="owner-login-btn"
            >
              {loading ? 'Authenticating...' : 'Access Owner Portal'}
            </Button>
          </form>

          {/* Info */}
          <div className="mt-12 pt-8 border-t border-zinc-800">
            <div className="font-mono text-xs text-zinc-600 text-center">
              <p>Default credentials:</p>
              <p className="text-zinc-500 mt-1">admin@casefiles.fbi / admin123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
