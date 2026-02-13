import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Fingerprint, AlertCircle, ArrowLeft, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'sonner';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Access codes do not match');
      return;
    }

    if (!agreed) {
      setError('You must agree to the terms of service');
      return;
    }

    setLoading(true);

    try {
      await register(username, email, password);
      toast.success('Clearance granted. Welcome, Agent.');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
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
              <Fingerprint className="w-10 h-10 text-white" />
            </div>
            <h1 className="font-heading text-3xl text-white tracking-widest uppercase">
              Request Clearance
            </h1>
            <p className="text-zinc-500 text-sm mt-2 font-mono">
              // NEW AGENT REGISTRATION
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
              <Label htmlFor="username" className="text-zinc-400 uppercase tracking-widest text-xs">
                Agent Codename
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus:border-zinc-600 rounded-none h-12 text-white placeholder:text-zinc-600 font-mono"
                placeholder="SHADOW_WOLF"
                required
                data-testid="username-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 uppercase tracking-widest text-xs">
                Agent Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus:border-zinc-600 rounded-none h-12 text-white placeholder:text-zinc-600 font-mono"
                placeholder="agent@fbi.gov"
                required
                data-testid="email-input"
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
                className="bg-zinc-900 border-zinc-800 focus:border-zinc-600 rounded-none h-12 text-white placeholder:text-zinc-600 font-mono"
                placeholder="••••••••"
                required
                minLength={6}
                data-testid="password-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-400 uppercase tracking-widest text-xs">
                Confirm Access Code
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-zinc-900 border-zinc-800 focus:border-zinc-600 rounded-none h-12 text-white placeholder:text-zinc-600 font-mono"
                placeholder="••••••••"
                required
                data-testid="confirm-password-input"
              />
            </div>

            <div className="flex items-start gap-3">
              <Checkbox
                id="terms"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked)}
                className="mt-1 border-zinc-700 data-[state=checked]:bg-white data-[state=checked]:text-black"
                data-testid="terms-checkbox"
              />
              <Label htmlFor="terms" className="text-zinc-400 text-sm leading-relaxed cursor-pointer">
                I agree to the <Link to="/terms" className="text-white hover:underline">Terms of Service</Link> and{' '}
                <Link to="/privacy" className="text-white hover:underline">Privacy Policy</Link>. 
                I consent to the collection of gameplay data for analytics purposes.
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-sm h-12"
              data-testid="register-submit-btn"
            >
              {loading ? 'Processing...' : 'Request Clearance'}
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-zinc-500 text-sm">
              Already have clearance?{' '}
              <Link to="/login" className="text-white hover:underline" data-testid="login-link">
                Agent Login
              </Link>
            </p>
          </div>

          {/* Clearance levels */}
          <div className="mt-12 pt-8 border-t border-zinc-800">
            <div className="font-mono text-xs text-zinc-600 mb-4 text-center">
              CLEARANCE LEVELS
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              {['ANALYST', 'FIELD', 'SPECIAL', 'PROFILER', 'LEAD'].map((level, i) => (
                <div key={level} className="text-zinc-600 text-xs">
                  <div className={`w-2 h-2 mx-auto mb-1 ${i === 0 ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                  <span className="font-mono">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
