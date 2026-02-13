import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Fingerprint, FileText, Trophy, Target, Clock, 
  ChevronRight, LogOut, Star, Shield, User
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { useAuth } from '../contexts/AuthContext';
import { getLevelColor, formatDate } from '../lib/utils';
import axios from 'axios';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCases();
  }, []);

  const fetchCases = async () => {
    try {
      const response = await axios.get(`${API_URL}/cases`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCases(response.data);
    } catch (error) {
      console.error('Failed to fetch cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelProgress = () => {
    const thresholds = [0, 50, 120, 220, 350, 500];
    const cp = user?.career_points || 0;
    const level = user?.level || 1;
    const current = thresholds[level - 1];
    const next = thresholds[level] || thresholds[thresholds.length - 1];
    return ((cp - current) / (next - current)) * 100;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 noise-overlay">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <Fingerprint className="w-6 h-6 text-white" />
            <span className="font-heading text-lg tracking-widest text-white">CASE FILES</span>
          </Link>
          
          <div className="flex items-center gap-6">
            <Link 
              to="/leaderboard" 
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
              data-testid="leaderboard-link"
            >
              <Trophy className="w-4 h-4" />
              <span className="hidden md:inline font-mono text-xs tracking-widest uppercase">Leaderboard</span>
            </Link>
            <Link 
              to="/subscription" 
              className="text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
              data-testid="subscription-link"
            >
              <Star className="w-4 h-4" />
              <span className="hidden md:inline font-mono text-xs tracking-widest uppercase">Subscribe</span>
            </Link>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none"
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Agent Profile Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2 p-8 border border-zinc-800 bg-zinc-900/30">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="font-mono text-xs text-zinc-500 tracking-widest mb-2">
                  AGENT DOSSIER
                </div>
                <h1 className="font-heading text-3xl text-white tracking-wide uppercase">
                  {user.username}
                </h1>
              </div>
              <div className={`level-badge ${getLevelColor(user.level)}`}>
                LEVEL {user.level}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div>
                <div className="font-mono text-xs text-zinc-500 mb-1">RANK</div>
                <div className="text-white font-heading text-lg uppercase">{user.level_title}</div>
              </div>
              <div>
                <div className="font-mono text-xs text-zinc-500 mb-1">CAREER POINTS</div>
                <div className="text-white font-heading text-lg">{user.career_points} CP</div>
              </div>
              <div>
                <div className="font-mono text-xs text-zinc-500 mb-1">CLEARANCE</div>
                <div className={`font-heading text-lg uppercase ${getLevelColor(user.level)}`}>
                  {user.subscription_status === 'active' ? 'ACTIVE' : 'STANDARD'}
                </div>
              </div>
              <div>
                <div className="font-mono text-xs text-zinc-500 mb-1">SINCE</div>
                <div className="text-white font-mono text-sm">{formatDate(user.created_at)}</div>
              </div>
            </div>

            {/* Level Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-zinc-500">LEVEL PROGRESS</span>
                <span className="font-mono text-xs text-zinc-400">
                  {user.career_points} / {[50, 120, 220, 350, 500][user.level - 1] || 500} CP
                </span>
              </div>
              <Progress 
                value={getLevelProgress()} 
                className="h-2 bg-zinc-800 rounded-none"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="p-8 border border-zinc-800 bg-zinc-900/30">
            <div className="font-mono text-xs text-zinc-500 tracking-widest mb-6">
              QUICK ACCESS
            </div>
            <div className="space-y-4">
              <Link 
                to="/leaderboard"
                className="flex items-center justify-between p-4 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                data-testid="quick-leaderboard"
              >
                <div className="flex items-center gap-3">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  <span className="text-zinc-300 font-mono text-sm">Leaderboard</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </Link>
              <Link 
                to="/subscription"
                className="flex items-center justify-between p-4 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                data-testid="quick-subscription"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-5 h-5 text-emerald-500" />
                  <span className="text-zinc-300 font-mono text-sm">Upgrade</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </Link>
              <Link 
                to="/profile"
                className="flex items-center justify-between p-4 border border-zinc-800 hover:border-zinc-700 transition-colors group"
                data-testid="quick-profile"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-500" />
                  <span className="text-zinc-300 font-mono text-sm">Profile</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </Link>
            </div>
          </div>
        </div>

        {/* Available Cases */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="font-mono text-xs text-zinc-500 tracking-widest mb-2">
                // ACTIVE CASE FILES
              </div>
              <h2 className="font-heading text-2xl text-white tracking-wide uppercase">
                Available Cases
              </h2>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              <div className="font-mono text-sm">Loading case files...</div>
            </div>
          ) : cases.length === 0 ? (
            <div className="text-center py-12 border border-zinc-800 bg-zinc-900/30">
              <FileText className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
              <div className="text-zinc-400 mb-2">No cases available</div>
              <div className="text-zinc-600 text-sm">Check back soon for new investigations</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cases.map((caseItem) => (
                <div
                  key={caseItem.id}
                  className="border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 transition-all group"
                  data-testid={`case-card-${caseItem.id}`}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <span className="font-mono text-xs text-emerald-500">
                        {caseItem.case_id}
                      </span>
                      <span className="font-mono text-xs text-zinc-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {caseItem.time_limit_minutes}m
                      </span>
                    </div>
                    
                    <h3 className="font-heading text-xl text-white uppercase tracking-wide mb-2">
                      {caseItem.title}
                    </h3>
                    
                    <p className="text-zinc-500 text-sm mb-4 line-clamp-2">
                      {caseItem.victim_overview}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-zinc-600 text-xs font-mono">
                        {caseItem.location_county}, {caseItem.location_state}
                      </span>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <div 
                            key={i}
                            className={`w-2 h-2 ${i < caseItem.difficulty ? 'bg-amber-500' : 'bg-zinc-800'}`}
                          />
                        ))}
                      </div>
                    </div>

                    <Button
                      onClick={() => navigate(`/play/${caseItem.id}`)}
                      className="w-full bg-zinc-800 text-white hover:bg-zinc-700 rounded-none uppercase tracking-widest font-bold text-xs h-10 group-hover:bg-white group-hover:text-black transition-colors"
                      data-testid={`play-case-${caseItem.id}`}
                    >
                      Open Case File
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
