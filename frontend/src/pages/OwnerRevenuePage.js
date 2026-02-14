import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Fingerprint, LayoutDashboard, FileText, Users, BarChart3, 
  LogOut, DollarSign, CreditCard, ArrowUpRight, AlertCircle,
  Banknote, TrendingUp, Calendar
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OwnerRevenuePage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectingStripe, setConnectingStripe] = useState(false);

  useEffect(() => {
    if (token) {
      fetchRevenue();
    }
  }, [token]);

  const fetchRevenue = async () => {
    try {
      const response = await axios.get(`${API_URL}/owner/revenue`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRevenue(response.data);
    } catch (error) {
      console.error('Failed to fetch revenue:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectStripeAccount = async () => {
    setConnectingStripe(true);
    try {
      const response = await axios.post(`${API_URL}/owner/stripe/connect`, 
        { return_url: window.location.href },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error('Failed to connect Stripe account');
    } finally {
      setConnectingStripe(false);
    }
  };

  const openStripeDashboard = async () => {
    try {
      const response = await axios.get(`${API_URL}/owner/stripe/dashboard`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (error) {
      toast.error('Failed to open Stripe dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/owner/login');
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <Link to="/owner/dashboard" className="flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-white" />
            <span className="font-heading text-lg tracking-widest text-white">CASE FILES</span>
          </Link>
          <div className="mt-2 font-mono text-xs text-red-500">OWNER PORTAL</div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <Link
              to="/owner/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/owner/cases"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <FileText className="w-4 h-4" />
              Cases
            </Link>
            <Link
              to="/owner/analytics"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Link>
            <Link
              to="/owner/users"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
            >
              <Users className="w-4 h-4" />
              Players
            </Link>
            <Link
              to="/owner/revenue"
              className="flex items-center gap-3 px-4 py-3 text-white bg-zinc-800 font-mono text-sm uppercase tracking-widest"
            >
              <DollarSign className="w-4 h-4" />
              Revenue
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/50"
          >
            <LogOut className="w-4 h-4 mr-3" />
            <span className="font-mono text-xs uppercase tracking-widest">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl text-white uppercase tracking-wide">
                Revenue & Payouts
              </h1>
              <p className="text-zinc-500 font-mono text-sm mt-1">
                Manage your earnings and bank payouts
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              <div className="font-mono text-sm">Loading revenue data...</div>
            </div>
          ) : (
            <>
              {/* Stripe Connection Status */}
              {!revenue?.stripe_connected ? (
                <div className="mb-8 p-6 border border-amber-800 bg-amber-950/20">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                    <div className="flex-1">
                      <h3 className="text-amber-500 font-heading uppercase text-lg mb-2">
                        Connect Your Bank Account
                      </h3>
                      <p className="text-zinc-400 mb-4">
                        To receive payouts directly to your bank account, you need to connect your Stripe account. 
                        This is a one-time setup that allows automatic transfers of your subscription revenue.
                      </p>
                      <Button
                        onClick={connectStripeAccount}
                        disabled={connectingStripe}
                        className="bg-amber-600 text-white hover:bg-amber-500 rounded-none uppercase tracking-widest font-bold text-xs"
                        data-testid="connect-stripe-btn"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        {connectingStripe ? 'Connecting...' : 'Connect Stripe Account'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-8 p-4 border border-emerald-800 bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-emerald-500 font-mono text-sm">STRIPE CONNECTED</span>
                  </div>
                  <Button
                    onClick={openStripeDashboard}
                    variant="outline"
                    className="border-emerald-700 text-emerald-500 hover:bg-emerald-950 rounded-none text-xs"
                    data-testid="stripe-dashboard-btn"
                  >
                    Open Stripe Dashboard
                    <ArrowUpRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {/* Revenue Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="p-6 border border-zinc-800 bg-zinc-900/30">
                  <Banknote className="w-5 h-5 text-emerald-500 mb-4" />
                  <div className="font-heading text-3xl text-white">
                    ${(revenue?.total_revenue || 0).toFixed(2)}
                  </div>
                  <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">
                    Total Revenue
                  </div>
                </div>
                <div className="p-6 border border-zinc-800 bg-zinc-900/30">
                  <TrendingUp className="w-5 h-5 text-blue-500 mb-4" />
                  <div className="font-heading text-3xl text-white">
                    ${(revenue?.this_month || 0).toFixed(2)}
                  </div>
                  <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">
                    This Month
                  </div>
                </div>
                <div className="p-6 border border-zinc-800 bg-zinc-900/30">
                  <Calendar className="w-5 h-5 text-purple-500 mb-4" />
                  <div className="font-heading text-3xl text-white">
                    ${(revenue?.pending_payout || 0).toFixed(2)}
                  </div>
                  <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">
                    Pending Payout
                  </div>
                </div>
              </div>

              {/* Recent Transactions */}
              <div className="border border-zinc-800 bg-zinc-900/30">
                <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                  <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                    Recent Transactions
                  </span>
                </div>
                
                {revenue?.transactions?.length > 0 ? (
                  <div className="divide-y divide-zinc-800">
                    {revenue.transactions.map((tx, index) => (
                      <div key={index} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="text-white font-mono text-sm">
                            {tx.package_type === 'yearly' ? 'Yearly' : 'Monthly'} Subscription
                          </div>
                          <div className="text-zinc-500 text-xs mt-1">
                            {new Date(tx.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-500 font-heading text-lg">
                            +${tx.amount.toFixed(2)}
                          </div>
                          <div className={`text-xs font-mono ${
                            tx.payment_status === 'completed' ? 'text-emerald-500' : 'text-amber-500'
                          }`}>
                            {tx.payment_status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-zinc-500">
                    <DollarSign className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                    <p>No transactions yet</p>
                    <p className="text-zinc-600 text-sm mt-1">
                      Revenue will appear here when players subscribe
                    </p>
                  </div>
                )}
              </div>

              {/* Payout Info */}
              <div className="mt-8 p-6 border border-zinc-800 bg-zinc-900/20">
                <div className="font-mono text-xs text-zinc-500 mb-4">HOW PAYOUTS WORK</div>
                <div className="space-y-3 text-zinc-400 text-sm">
                  <p>
                    • Subscription payments are processed through Stripe
                  </p>
                  <p>
                    • Funds are automatically transferred to your connected bank account
                  </p>
                  <p>
                    • Standard payout schedule: 2-7 business days after payment
                  </p>
                  <p>
                    • Stripe fees: 2.9% + $0.30 per transaction
                  </p>
                  <p>
                    • You can view detailed reports in your Stripe Dashboard
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
