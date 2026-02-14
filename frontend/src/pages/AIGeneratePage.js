import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Fingerprint, LayoutDashboard, FileText, Users, BarChart3, 
  LogOut, ArrowLeft, Wand2, Loader2
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CASE_TYPES = [
  { value: 'HOM', label: 'Homicide' },
  { value: 'FRAUD', label: 'Fraud' },
  { value: 'KID', label: 'Kidnapping' },
  { value: 'TERROR', label: 'Terrorism' },
  { value: 'CYBER', label: 'Cybercrime' },
  { value: 'DRUG', label: 'Drug Trafficking' }
];

const US_STATES = [
  { value: 'Illinois', counties: ['Cook', 'DuPage', 'Lake', 'Will'] },
  { value: 'California', counties: ['Los Angeles', 'San Diego', 'Orange', 'San Francisco'] },
  { value: 'New York', counties: ['New York', 'Kings', 'Queens', 'Bronx'] },
  { value: 'Texas', counties: ['Harris', 'Dallas', 'Travis', 'Bexar'] },
  { value: 'Florida', counties: ['Miami-Dade', 'Broward', 'Palm Beach', 'Orange'] }
];

export default function AIGeneratePage() {
  const { token, logout, isOwner } = useAuth();
  const navigate = useNavigate();
  
  const [generating, setGenerating] = useState(false);
  const [generatedCase, setGeneratedCase] = useState(null);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    case_type: 'HOM',
    location_state: 'Illinois',
    location_county: 'Cook',
    suspects_count: 4,
    scenes_count: 12,
    tone: 'realistic',
    difficulty: 2
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedCase(null);
    
    try {
      const response = await axios.post(`${API_URL}/owner/cases/generate`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setGeneratedCase(response.data);
      toast.success('Case generated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate case');
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveCase = async () => {
    if (!generatedCase) return;
    
    setSaving(true);
    try {
      await axios.post(`${API_URL}/owner/cases`, {
        ...generatedCase,
        published: false,
        patch_notes: [],
        bonus_files: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Case saved successfully!');
      navigate('/owner/cases');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save case');
    } finally {
      setSaving(false);
    }
  };

  const getCounties = () => {
    const state = US_STATES.find(s => s.value === formData.location_state);
    return state?.counties || [];
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
              className="flex items-center gap-3 px-4 py-3 text-white bg-zinc-800 font-mono text-sm uppercase tracking-widest"
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
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              onClick={() => navigate('/owner/cases')}
              className="text-zinc-400 hover:text-white p-2"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="font-heading text-3xl text-white uppercase tracking-wide">
                AI Case Generator
              </h1>
              <p className="text-zinc-500 font-mono text-sm mt-1">
                Generate complete FBI cases using AI
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Generator Form */}
            <div className="p-6 border border-zinc-800 bg-zinc-900/30 space-y-6">
              <div className="flex items-center gap-3 mb-4">
                <Wand2 className="w-5 h-5 text-purple-500" />
                <span className="font-mono text-xs text-zinc-500 tracking-widest uppercase">
                  Generation Parameters
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase tracking-widest text-xs">Case Type</Label>
                <Select 
                  value={formData.case_type} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, case_type: v }))}
                >
                  <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800">
                    {CASE_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">State</Label>
                  <Select 
                    value={formData.location_state} 
                    onValueChange={(v) => setFormData(prev => ({ 
                      ...prev, 
                      location_state: v,
                      location_county: US_STATES.find(s => s.value === v)?.counties[0] || ''
                    }))}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {US_STATES.map(state => (
                        <SelectItem key={state.value} value={state.value}>{state.value}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">County</Label>
                  <Select 
                    value={formData.location_county} 
                    onValueChange={(v) => setFormData(prev => ({ ...prev, location_county: v }))}
                  >
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 rounded-none text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {getCounties().map(county => (
                        <SelectItem key={county} value={county}>{county}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">Suspects</Label>
                  <Input
                    type="number"
                    min={2}
                    max={6}
                    value={formData.suspects_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, suspects_count: parseInt(e.target.value) }))}
                    className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">Scenes</Label>
                  <Input
                    type="number"
                    min={10}
                    max={16}
                    value={formData.scenes_count}
                    onChange={(e) => setFormData(prev => ({ ...prev, scenes_count: parseInt(e.target.value) }))}
                    className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase tracking-widest text-xs">Difficulty (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={formData.difficulty}
                  onChange={(e) => setFormData(prev => ({ ...prev, difficulty: parseInt(e.target.value) }))}
                  className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                />
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full bg-purple-600 text-white hover:bg-purple-500 rounded-none uppercase tracking-widest font-bold text-sm h-12"
                data-testid="generate-btn"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    Generate Case
                  </>
                )}
              </Button>
            </div>

            {/* Preview */}
            <div className="p-6 border border-zinc-800 bg-zinc-900/30">
              <div className="font-mono text-xs text-zinc-500 tracking-widest uppercase mb-4">
                Generated Preview
              </div>

              {generating && (
                <div className="text-center py-16">
                  <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
                  <p className="text-zinc-400 font-mono text-sm">AI is crafting your case...</p>
                  <p className="text-zinc-600 text-xs mt-2">This may take 30-60 seconds</p>
                </div>
              )}

              {!generating && !generatedCase && (
                <div className="text-center py-16 text-zinc-600">
                  <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Configure parameters and click generate</p>
                </div>
              )}

              {generatedCase && (
                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-emerald-500 text-sm">{generatedCase.case_id}</span>
                    <h3 className="font-heading text-xl text-white uppercase mt-1">
                      {generatedCase.title}
                    </h3>
                  </div>

                  <div className="text-sm text-zinc-400">
                    <strong className="text-zinc-300">Location:</strong> {generatedCase.location_county}, {generatedCase.location_state}
                  </div>

                  <div className="text-sm text-zinc-400">
                    <strong className="text-zinc-300">Victim:</strong> {generatedCase.victim_overview}
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center py-4 border-y border-zinc-800">
                    <div>
                      <div className="font-heading text-xl text-white">{generatedCase.suspects?.length || 0}</div>
                      <div className="text-zinc-500 text-xs font-mono">SUSPECTS</div>
                    </div>
                    <div>
                      <div className="font-heading text-xl text-white">{generatedCase.scenes?.length || 0}</div>
                      <div className="text-zinc-500 text-xs font-mono">SCENES</div>
                    </div>
                    <div>
                      <div className="font-heading text-xl text-white">{generatedCase.clues?.length || 0}</div>
                      <div className="text-zinc-500 text-xs font-mono">CLUES</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="font-mono text-xs text-zinc-500">SUSPECTS:</div>
                    {generatedCase.suspects?.map((s, i) => (
                      <div key={i} className="text-sm text-zinc-400">
                        • {s.name} ({s.age}) - {s.role}
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={handleSaveCase}
                    disabled={saving}
                    className="w-full bg-emerald-600 text-white hover:bg-emerald-500 rounded-none uppercase tracking-widest font-bold text-sm h-12 mt-4"
                    data-testid="save-generated-btn"
                  >
                    {saving ? 'Saving...' : 'Save Case'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
