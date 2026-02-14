import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Fingerprint, LayoutDashboard, FileText, Users, BarChart3, 
  Settings, LogOut, Plus, TrendingUp, Trophy, Clock, CheckCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OwnerDashboardPage() {
  const { token, logout, isOwner, user } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      const [analyticsRes, casesRes] = await Promise.all([
        axios.get(`${API_URL}/owner/analytics/overview`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/owner/cases`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      setAnalytics(analyticsRes.data);
      setCases(casesRes.data);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const stats = analytics ? [
    { label: 'Total Players', value: analytics.total_players, icon: Users, color: 'text-blue-500' },
    { label: 'Active Today', value: analytics.active_today, icon: TrendingUp, color: 'text-emerald-500' },
    { label: 'Total Sessions', value: analytics.total_sessions, icon: Clock, color: 'text-purple-500' },
    { label: 'Completion Rate', value: `${analytics.completion_rate}%`, icon: CheckCircle, color: 'text-amber-500' }
  ] : [];

  return (
    <div className="min-h-screen bg-zinc-950 flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/30 flex flex-col">
        <div className="p-6 border-b border-zinc-800">
          <Link to="/" className="flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-white" />
            <span className="font-heading text-lg tracking-widest text-white">CASE FILES</span>
          </Link>
          <div className="mt-2 font-mono text-xs text-red-500">OWNER PORTAL</div>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            <Link
              to="/owner/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-white bg-zinc-800 font-mono text-sm uppercase tracking-widest"
              data-testid="nav-dashboard"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              to="/owner/cases"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
              data-testid="nav-cases"
            >
              <FileText className="w-4 h-4" />
              Cases
            </Link>
            <Link
              to="/owner/analytics"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
              data-testid="nav-analytics"
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </Link>
            <Link
              to="/owner/users"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
              data-testid="nav-users"
            >
              <Users className="w-4 h-4" />
              Players
            </Link>
          </div>
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-zinc-400 hover:text-white hover:bg-zinc-800/50"
            data-testid="owner-logout-btn"
          >
            <LogOut className="w-4 h-4 mr-3" />
            <span className="font-mono text-xs uppercase tracking-widest">Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-heading text-3xl text-white uppercase tracking-wide">
                Dashboard
              </h1>
              <p className="text-zinc-500 font-mono text-sm mt-1">
                Welcome back, {user?.username}
              </p>
            </div>
            <Button
              onClick={() => navigate('/owner/cases/new')}
              className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-xs h-10 px-6"
              data-testid="create-case-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Case
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              <div className="font-mono text-sm">Loading analytics...</div>
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => (
                  <div 
                    key={stat.label}
                    className="p-6 border border-zinc-800 bg-zinc-900/30"
                    data-testid={`stat-${stat.label.toLowerCase().replace(' ', '-')}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="font-heading text-3xl text-white">{stat.value}</div>
                    <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-1">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Cases */}
                <div className="border border-zinc-800 bg-zinc-900/30">
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                      Recent Cases
                    </span>
                    <Link 
                      to="/owner/cases" 
                      className="text-zinc-400 hover:text-white text-xs font-mono"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="divide-y divide-zinc-800">
                    {cases.slice(0, 5).map((caseItem) => (
                      <Link
                        key={caseItem.id}
                        to={`/owner/cases/${caseItem.id}`}
                        className="block p-4 hover:bg-zinc-900/50 transition-colors"
                        data-testid={`recent-case-${caseItem.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-white font-heading uppercase">
                              {caseItem.title}
                            </div>
                            <div className="text-zinc-500 font-mono text-xs mt-1">
                              {caseItem.case_id}
                            </div>
                          </div>
                          <div className={`px-2 py-1 text-xs font-mono ${
                            caseItem.published 
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-500'
                          }`}>
                            {caseItem.published ? 'PUBLISHED' : 'DRAFT'}
                          </div>
                        </div>
                      </Link>
                    ))}
                    {cases.length === 0 && (
                      <div className="p-8 text-center text-zinc-500">
                        <FileText className="w-8 h-8 mx-auto mb-3 text-zinc-700" />
                        <p>No cases created yet</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Ending Distribution */}
                <div className="border border-zinc-800 bg-zinc-900/30">
                  <div className="p-4 border-b border-zinc-800">
                    <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                      Ending Distribution
                    </span>
                  </div>
                  <div className="p-6">
                    {analytics && (
                      <div className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-emerald-500 font-mono text-sm">CLOSED (GOOD)</span>
                            <span className="text-white font-heading">
                              {analytics.ending_distribution.closed}
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-800">
                            <div 
                              className="h-full bg-emerald-500"
                              style={{
                                width: `${(analytics.ending_distribution.closed / 
                                  (analytics.ending_distribution.closed + analytics.ending_distribution.compromised || 1)) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-red-500 font-mono text-sm">COMPROMISED (BAD)</span>
                            <span className="text-white font-heading">
                              {analytics.ending_distribution.compromised}
                            </span>
                          </div>
                          <div className="h-2 bg-zinc-800">
                            <div 
                              className="h-full bg-red-500"
                              style={{
                                width: `${(analytics.ending_distribution.compromised / 
                                  (analytics.ending_distribution.closed + analytics.ending_distribution.compromised || 1)) * 100}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Players */}
                <div className="border border-zinc-800 bg-zinc-900/30">
                  <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                      Top Players
                    </span>
                    <Trophy className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="p-4">
                    <Link
                      to="/owner/analytics"
                      className="block text-center py-4 border border-zinc-800 hover:border-zinc-700 transition-colors"
                    >
                      <span className="text-zinc-400 font-mono text-sm">View Leaderboard</span>
                    </Link>
                  </div>
                </div>

                {/* Subscriptions */}
                <div className="border border-zinc-800 bg-zinc-900/30">
                  <div className="p-4 border-b border-zinc-800">
                    <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                      Subscriptions
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="text-center">
                      <div className="font-heading text-4xl text-white">
                        {analytics?.active_subscriptions || 0}
                      </div>
                      <div className="text-zinc-500 font-mono text-xs uppercase tracking-widest mt-2">
                        Active Subscribers
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
