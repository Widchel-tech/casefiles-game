import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Star, Shield, Zap, Clock, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SubscriptionPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(null);
  const [checkingPayment, setCheckingPayment] = useState(false);

  // Check for payment success
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      pollPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const pollPaymentStatus = async (sessionId, attempts = 0) => {
    const maxAttempts = 5;
    setCheckingPayment(true);

    if (attempts >= maxAttempts) {
      setCheckingPayment(false);
      toast.info('Payment status pending. Please check back shortly.');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/payments/status/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.payment_status === 'paid') {
        setCheckingPayment(false);
        toast.success('Subscription activated! Welcome to the Bureau.');
        navigate('/subscription', { replace: true });
        window.location.reload();
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(sessionId, attempts + 1), 2000);
    } catch (error) {
      console.error('Payment status check failed:', error);
      setCheckingPayment(false);
    }
  };

  const handleSubscribe = async (packageType) => {
    setLoading(packageType);
    try {
      const originUrl = window.location.origin;
      const response = await axios.post(`${API_URL}/payments/checkout`, 
        { package_type: packageType, origin_url: originUrl },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      // Redirect to Stripe checkout
      window.location.href = response.data.url;
    } catch (error) {
      toast.error('Failed to create checkout session');
      setLoading(null);
    }
  };

  const plans = [
    {
      id: 'monthly',
      name: 'Monthly',
      price: 10.99,
      period: '/month',
      billing: 'Billed monthly, cancel anytime',
      features: [
        'Access to all cases',
        'AI Interrogation system',
        'Career progression tracking',
        'Leaderboard access',
        'New cases monthly',
        'Auto-renews monthly'
      ]
    },
    {
      id: 'yearly',
      name: 'Yearly',
      price: 100,
      period: '/year',
      badge: 'SAVE $32',
      billing: 'Billed annually, cancel anytime',
      features: [
        'Everything in Monthly',
        'Over 2 months FREE',
        'Priority access to new cases',
        'Exclusive Task Force cases',
        'Advanced analytics',
        'Auto-renews yearly'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 noise-overlay">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" />
            <span className="font-mono text-xs tracking-widest uppercase">Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Payment Processing Overlay */}
      {checkingPayment && (
        <div className="fixed inset-0 bg-zinc-950/90 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
            <div className="text-white font-heading text-xl uppercase">Processing Payment</div>
            <div className="text-zinc-500 font-mono text-sm mt-2">Please wait...</div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Star className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="font-heading text-4xl text-white tracking-widest uppercase">
            Bureau Clearance
          </h1>
          <p className="text-zinc-500 font-mono text-sm mt-2">
            // UPGRADE YOUR ACCESS LEVEL
          </p>
        </div>

        {/* Current Status */}
        {user?.subscription_status === 'active' && (
          <div className="mb-8 p-6 border border-emerald-800 bg-emerald-950/20">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-emerald-500" />
              <div>
                <div className="text-emerald-500 font-heading uppercase">Active Subscription</div>
                <div className="text-zinc-400 text-sm font-mono">
                  Your clearance is active. Thank you for your service.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {plans.map((plan) => (
            <div 
              key={plan.id}
              className={`p-8 border bg-zinc-900/30 relative ${
                plan.badge ? 'border-emerald-700' : 'border-zinc-800'
              }`}
              data-testid={`plan-${plan.id}`}
            >
              {plan.badge && (
                <div className="absolute -top-3 right-6 bg-emerald-600 text-black text-xs font-bold px-3 py-1 tracking-widest">
                  {plan.badge}
                </div>
              )}

              <div className="mb-6">
                <h3 className="font-heading text-2xl text-white uppercase tracking-wide">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-4xl font-heading text-white">${plan.price}</span>
                  <span className="text-zinc-500 font-mono text-sm">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-3 text-zinc-300">
                    <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Billing Info */}
              <div className="text-center mb-6 py-2 border-t border-zinc-800">
                <span className="text-zinc-500 text-xs font-mono">{plan.billing}</span>
              </div>

              <Button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id || user?.subscription_status === 'active'}
                className={`w-full rounded-none uppercase tracking-widest font-bold text-sm h-12 ${
                  plan.badge 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
                data-testid={`subscribe-${plan.id}-btn`}
              >
                {loading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : user?.subscription_status === 'active' ? (
                  'Already Subscribed'
                ) : (
                  `Get ${plan.name}`
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <div className="font-mono text-xs text-zinc-500 tracking-widest mb-2">
              // WHAT YOU GET
            </div>
            <h2 className="font-heading text-2xl text-white uppercase tracking-wide">
              Full Bureau Access
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 border border-zinc-800 bg-zinc-900/30">
              <Shield className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="font-heading text-lg text-white uppercase mb-2">All Cases</h3>
              <p className="text-zinc-500 text-sm">
                Access every case in the system, from basic investigations to complex task force operations.
              </p>
            </div>
            <div className="p-6 border border-zinc-800 bg-zinc-900/30">
              <Zap className="w-8 h-8 text-amber-500 mb-4" />
              <h3 className="font-heading text-lg text-white uppercase mb-2">AI Interrogation</h3>
              <p className="text-zinc-500 text-sm">
                Question suspects with our advanced AI system. They respond realistically to your approach.
              </p>
            </div>
            <div className="p-6 border border-zinc-800 bg-zinc-900/30">
              <Clock className="w-8 h-8 text-purple-500 mb-4" />
              <h3 className="font-heading text-lg text-white uppercase mb-2">Career Progress</h3>
              <p className="text-zinc-500 text-sm">
                Track your career points, climb the ranks, and compete on the global leaderboard.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 p-6 border border-zinc-800 bg-zinc-900/20">
          <div className="font-mono text-xs text-zinc-500 mb-4">FAQ</div>
          <div className="space-y-4">
            <div>
              <div className="text-white font-heading uppercase text-sm mb-1">Can I cancel anytime?</div>
              <div className="text-zinc-500 text-sm">Yes. Cancel anytime from your profile. Access continues until the end of your billing period.</div>
            </div>
            <div>
              <div className="text-white font-heading uppercase text-sm mb-1">What payment methods are accepted?</div>
              <div className="text-zinc-500 text-sm">We accept all major credit cards through our secure payment processor.</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
