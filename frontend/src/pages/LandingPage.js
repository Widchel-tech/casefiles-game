import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FileText, Shield, Users, Target, ChevronRight, Lock, Fingerprint } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useAuth } from '../contexts/AuthContext';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hoveredFeature, setHoveredFeature] = useState(null);

  const features = [
    {
      icon: FileText,
      title: 'AUTHENTIC CASE FILES',
      description: 'Investigate realistic FBI cases with proper chain-of-custody, warrants, and legal procedure.'
    },
    {
      icon: Shield,
      title: 'PROCEDURAL CONSEQUENCES',
      description: 'Every action matters. Reckless investigation leads to compromised evidence and failed prosecutions.'
    },
    {
      icon: Users,
      title: 'AI INTERROGATIONS',
      description: 'Question suspects using advanced AI. They lie, deflect, and may even request their lawyer.'
    },
    {
      icon: Target,
      title: 'CAREER PROGRESSION',
      description: 'Rise through the ranks from Analyst to Task Force Lead. Unlock harder cases and special tools.'
    }
  ];

  return (
    <div className="min-h-screen bg-zinc-950 noise-overlay">
      {/* Hero Section */}
      <div 
        className="relative min-h-screen flex flex-col"
        style={{
          backgroundImage: `linear-gradient(to bottom, rgba(9,9,11,0.7), rgba(9,9,11,0.95)), url('https://images.unsplash.com/photo-1768066429203-19c3f10b8c6d?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzh8MHwxfHNlYXJjaHwyfHx1cmJhbiUyMG5pZ2h0JTIwY2l0eSUyMHJhaW4lMjBub2lyfGVufDB8fHx8MTc3MDk3MTAwOXww&ixlib=rb-4.1.0&q=85')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Navigation */}
        <nav className="relative z-20 flex items-center justify-between p-6 md:p-8">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-8 h-8 text-white" />
            <span className="font-heading text-xl tracking-widest text-white">CASE FILES</span>
          </div>
          <div className="flex items-center gap-4">
            {user ? (
              <Button
                onClick={() => navigate('/dashboard')}
                className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-xs h-9 px-6"
                data-testid="dashboard-btn"
              >
                Dashboard
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/login')}
                  className="text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none uppercase tracking-widest text-xs"
                  data-testid="login-btn"
                >
                  Agent Login
                </Button>
                <Button
                  onClick={() => navigate('/register')}
                  className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-xs h-9 px-6"
                  data-testid="register-btn"
                >
                  Enlist
                </Button>
              </>
            )}
          </div>
        </nav>

        {/* Hero Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-8 text-center relative z-10">
          <div className="mb-4 flex items-center gap-2 text-zinc-500 font-mono text-xs tracking-widest">
            <Lock className="w-3 h-3" />
            <span>CLASSIFIED // FOR AUTHORIZED PERSONNEL ONLY</span>
          </div>
          
          <h1 className="font-heading text-5xl md:text-7xl lg:text-8xl text-white tracking-tighter uppercase mb-6">
            CASE FILES
          </h1>
          
          <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mb-8 leading-relaxed">
            Step into the shoes of an FBI investigator. Solve hyper-realistic cases where 
            every decision shapes the outcome. One wrong move and the case is compromised.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => navigate(user ? '/dashboard' : '/register')}
              className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-sm h-12 px-10"
              data-testid="start-investigation-btn"
            >
              Start Investigation
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/owner/login')}
              className="border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-900 hover:border-zinc-600 rounded-none uppercase tracking-widest text-sm h-12 px-10"
              data-testid="owner-portal-btn"
            >
              Owner Portal
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16">
            <div className="text-center">
              <div className="font-heading text-3xl md:text-4xl text-white">12+</div>
              <div className="text-zinc-500 text-xs tracking-widest uppercase mt-1">Cases</div>
            </div>
            <div className="text-center">
              <div className="font-heading text-3xl md:text-4xl text-white">5</div>
              <div className="text-zinc-500 text-xs tracking-widest uppercase mt-1">Ranks</div>
            </div>
            <div className="text-center">
              <div className="font-heading text-3xl md:text-4xl text-emerald-500">∞</div>
              <div className="text-zinc-500 text-xs tracking-widest uppercase mt-1">Outcomes</div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-zinc-600 animate-bounce">
          <ChevronRight className="w-6 h-6 rotate-90" />
        </div>
      </div>

      {/* Features Section */}
      <section className="relative py-24 md:py-32 px-6 md:px-8 bg-zinc-950">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="font-mono text-xs text-zinc-500 tracking-widest mb-4">
              // SYSTEM CAPABILITIES
            </div>
            <h2 className="font-heading text-3xl md:text-5xl text-white tracking-tight uppercase">
              Your Investigation Toolkit
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className={`p-8 border border-zinc-800 bg-zinc-900/30 transition-all duration-300 ${
                  hoveredFeature === index ? 'border-zinc-600 bg-zinc-900/50' : ''
                }`}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
              >
                <feature.icon className={`w-8 h-8 mb-4 transition-colors ${
                  hoveredFeature === index ? 'text-white' : 'text-zinc-500'
                }`} />
                <h3 className="font-heading text-xl text-white tracking-wide uppercase mb-3">
                  {feature.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 md:px-8 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto text-center">
          <div className="font-mono text-emerald-500 text-xs tracking-widest mb-4">
            &gt; CLEARANCE GRANTED
          </div>
          <h2 className="font-heading text-3xl md:text-4xl text-white tracking-tight uppercase mb-6">
            Ready to Join the Bureau?
          </h2>
          <p className="text-zinc-400 mb-8 max-w-2xl mx-auto">
            Subscribe for full access to all cases, AI interrogations, and career progression. 
            Start at $5/month.
          </p>
          <Button
            onClick={() => navigate(user ? '/subscription' : '/register')}
            className="bg-white text-black hover:bg-zinc-200 rounded-none uppercase tracking-widest font-bold text-sm h-12 px-10"
            data-testid="subscribe-btn"
          >
            Get Started
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Fingerprint className="w-5 h-5 text-zinc-600" />
            <span className="font-heading text-sm tracking-widest text-zinc-600">CASE FILES</span>
          </div>
          <div className="text-zinc-600 text-xs">
            © 2024 Case Files. All rights reserved.
          </div>
          <div className="flex gap-6">
            <Link to="/privacy" className="text-zinc-600 hover:text-zinc-400 text-xs uppercase tracking-widest">
              Privacy
            </Link>
            <Link to="/terms" className="text-zinc-600 hover:text-zinc-400 text-xs uppercase tracking-widest">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
