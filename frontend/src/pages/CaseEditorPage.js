import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { 
  Fingerprint, LayoutDashboard, FileText, Users, BarChart3, 
  LogOut, Save, ArrowLeft, Plus, Trash2, GripVertical, Check, DollarSign, Image, X
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Switch } from '../components/ui/switch';
import { useAuth } from '../contexts/AuthContext';
import ImageUpload from '../components/ImageUpload';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CASE_TYPES = ['HOM', 'FRAUD', 'KID', 'TERROR', 'CYBER', 'DRUG', 'OTHER'];
const US_STATES = ['Illinois', 'California', 'New York', 'Texas', 'Florida', 'Ohio', 'Michigan', 'Pennsylvania'];

export default function CaseEditorPage() {
  const { caseId } = useParams();
  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const isNew = caseId === 'new' || !caseId;
  
  const [saving, setSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(!isNew);
  const [caseData, setCaseData] = useState({
    case_id: '',
    case_type: 'HOM',
    title: '',
    location_county: '',
    location_state: 'Illinois',
    victim_overview: '',
    victim_photo_url: null,
    summary: '',
    difficulty: 2,
    time_limit_minutes: 15,
    tags: [],
    suspects: [],
    scenes: [],
    clues: [],
    endings: [
      { id: crypto.randomUUID(), type: 'CLOSED_GOOD', title: 'Case Closed', narration: '', cp_base: 30, cp_modifiers: {}, mugshot_url: null },
      { id: crypto.randomUUID(), type: 'COMPROMISED_BAD', title: 'Case Compromised', narration: '', cp_base: 5, cp_modifiers: {}, mugshot_url: null }
    ],
    published: false,
    patch_notes: [],
    bonus_files: []
  });

  useEffect(() => {
    if (!token) return;
    
    if (!isNew && caseId) {
      fetchCase();
    } else {
      setPageLoading(false);
    }
  }, [token, isNew, caseId]);

  const fetchCase = async () => {
    setPageLoading(true);
    try {
      const response = await axios.get(`${API_URL}/owner/cases/${caseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCaseData(response.data);
    } catch (error) {
      toast.error('Failed to load case');
      navigate('/owner/cases');
    } finally {
      setPageLoading(false);
    }
  };

  const saveCase = async () => {
    setSaving(true);
    try {
      if (isNew) {
        await axios.post(`${API_URL}/owner/cases`, caseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Case created');
      } else {
        await axios.put(`${API_URL}/owner/cases/${caseId}`, caseData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Case saved');
      }
      navigate('/owner/cases');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save case');
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field, value) => {
    setCaseData(prev => ({ ...prev, [field]: value }));
  };

  // Suspect management
  const addSuspect = () => {
    const newSuspect = {
      id: crypto.randomUUID(),
      name: '',
      age: 30,
      role: '',
      motive_angle: '',
      alibi_summary: '',
      risk_notes: '',
      is_guilty: false,
      portrait_url: null
    };
    setCaseData(prev => ({ ...prev, suspects: [...prev.suspects, newSuspect] }));
  };

  const updateSuspect = (index, field, value) => {
    const newSuspects = [...caseData.suspects];
    newSuspects[index] = { ...newSuspects[index], [field]: value };
    setCaseData(prev => ({ ...prev, suspects: newSuspects }));
  };

  const removeSuspect = (index) => {
    setCaseData(prev => ({ ...prev, suspects: prev.suspects.filter((_, i) => i !== index) }));
  };

  // Scene management
  const addScene = () => {
    const newScene = {
      id: `S${caseData.scenes.length}`,
      order: caseData.scenes.length,
      title: '',
      narration: '',
      is_interview_scene: false,
      is_accusation_scene: false,
      choices: [],
      media_urls: []
    };
    setCaseData(prev => ({ ...prev, scenes: [...prev.scenes, newScene] }));
  };

  const updateScene = (index, field, value) => {
    const newScenes = [...caseData.scenes];
    newScenes[index] = { ...newScenes[index], [field]: value };
    setCaseData(prev => ({ ...prev, scenes: newScenes }));
  };

  const removeScene = (index) => {
    setCaseData(prev => ({ ...prev, scenes: prev.scenes.filter((_, i) => i !== index) }));
  };

  const addChoice = (sceneIndex) => {
    const newChoice = {
      id: crypto.randomUUID(),
      text: '',
      score_delta: 0,
      add_clues: [],
      require_clues: [],
      next_scene_id: '',
      risk_flag: 'none'
    };
    const newScenes = [...caseData.scenes];
    newScenes[sceneIndex].choices = [...newScenes[sceneIndex].choices, newChoice];
    setCaseData(prev => ({ ...prev, scenes: newScenes }));
  };

  const updateChoice = (sceneIndex, choiceIndex, field, value) => {
    const newScenes = [...caseData.scenes];
    newScenes[sceneIndex].choices[choiceIndex] = {
      ...newScenes[sceneIndex].choices[choiceIndex],
      [field]: value
    };
    setCaseData(prev => ({ ...prev, scenes: newScenes }));
  };

  const removeChoice = (sceneIndex, choiceIndex) => {
    const newScenes = [...caseData.scenes];
    newScenes[sceneIndex].choices = newScenes[sceneIndex].choices.filter((_, i) => i !== choiceIndex);
    setCaseData(prev => ({ ...prev, scenes: newScenes }));
  };

  // Clue management
  const addClue = () => {
    const newClue = {
      id: crypto.randomUUID(),
      label: '',
      description: '',
      load_bearing: false,
      misdirection: false
    };
    setCaseData(prev => ({ ...prev, clues: [...prev.clues, newClue] }));
  };

  const updateClue = (index, field, value) => {
    const newClues = [...caseData.clues];
    newClues[index] = { ...newClues[index], [field]: value };
    setCaseData(prev => ({ ...prev, clues: newClues }));
  };

  const removeClue = (index) => {
    setCaseData(prev => ({ ...prev, clues: prev.clues.filter((_, i) => i !== index) }));
  };

  // Ending management
  const updateEnding = (index, field, value) => {
    const newEndings = [...caseData.endings];
    newEndings[index] = { ...newEndings[index], [field]: value };
    setCaseData(prev => ({ ...prev, endings: newEndings }));
  };

  const handleLogout = () => {
    logout();
    navigate('/owner/login');
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Fingerprint className="w-12 h-12 text-zinc-600 mx-auto animate-pulse" />
          <p className="text-zinc-500 mt-4 font-mono text-sm">LOADING CASE...</p>
        </div>
      </div>
    );
  }

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
            <Link
              to="/owner/revenue"
              className="flex items-center gap-3 px-4 py-3 text-zinc-400 hover:text-white hover:bg-zinc-800/50 font-mono text-sm uppercase tracking-widest transition-colors"
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
      <main className="flex-1 p-8 overflow-auto">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => navigate('/owner/cases')}
                className="text-zinc-400 hover:text-white p-2"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="font-heading text-3xl text-white uppercase tracking-wide">
                  {isNew ? 'Create Case' : 'Edit Case'}
                </h1>
                <p className="text-zinc-500 font-mono text-sm mt-1">
                  {caseData.case_id || 'New case'}
                </p>
              </div>
            </div>
            <Button
              onClick={saveCase}
              disabled={saving}
              className="bg-emerald-600 text-white hover:bg-emerald-500 rounded-none uppercase tracking-widest font-bold text-xs h-10 px-6"
              data-testid="save-case-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Case'}
            </Button>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="header" className="w-full">
            <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-1 mb-6 flex-wrap">
              <TabsTrigger value="header" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs">
                Header
              </TabsTrigger>
              <TabsTrigger value="suspects" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs">
                Suspects ({caseData.suspects.length})
              </TabsTrigger>
              <TabsTrigger value="scenes" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs">
                Scenes ({caseData.scenes.length})
              </TabsTrigger>
              <TabsTrigger value="clues" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs">
                Clues ({caseData.clues.length})
              </TabsTrigger>
              <TabsTrigger value="endings" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs">
                Endings
              </TabsTrigger>
            </TabsList>

            {/* Header Tab */}
            <TabsContent value="header" className="mt-0 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">Case ID</Label>
                  <Input
                    value={caseData.case_id}
                    onChange={(e) => updateField('case_id', e.target.value)}
                    placeholder="FBI-HOM-24-001"
                    className="bg-zinc-900 border-zinc-800 rounded-none text-white"
                    data-testid="case-id-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">Case Type</Label>
                  <Select value={caseData.case_type} onValueChange={(v) => updateField('case_type', v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-none text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {CASE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase tracking-widest text-xs">Title</Label>
                <Input
                  value={caseData.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="The Riverside Conspiracy"
                  className="bg-zinc-900 border-zinc-800 rounded-none text-white"
                  data-testid="case-title-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">County</Label>
                  <Input
                    value={caseData.location_county}
                    onChange={(e) => updateField('location_county', e.target.value)}
                    placeholder="Cook"
                    className="bg-zinc-900 border-zinc-800 rounded-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">State</Label>
                  <Select value={caseData.location_state} onValueChange={(v) => updateField('location_state', v)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-none text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {US_STATES.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-zinc-400 uppercase tracking-widest text-xs">Victim Overview</Label>
                <div className="flex gap-6">
                  {/* Victim Photo Upload */}
                  <ImageUpload
                    value={caseData.victim_photo_url}
                    onChange={(url) => updateField('victim_photo_url', url)}
                    token={token}
                    label="Victim Photo"
                    previewSize="medium"
                  />
                  <Textarea
                    value={caseData.victim_overview}
                    onChange={(e) => updateField('victim_overview', e.target.value)}
                    placeholder="Brief description of the victim (name, age, occupation, circumstances of death)..."
                    className="bg-zinc-900 border-zinc-800 rounded-none text-white h-32 flex-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">Difficulty (1-5)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={caseData.difficulty}
                    onChange={(e) => updateField('difficulty', parseInt(e.target.value))}
                    className="bg-zinc-900 border-zinc-800 rounded-none text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-zinc-400 uppercase tracking-widest text-xs">Time Limit (minutes)</Label>
                  <Input
                    type="number"
                    min={5}
                    max={60}
                    value={caseData.time_limit_minutes}
                    onChange={(e) => updateField('time_limit_minutes', parseInt(e.target.value))}
                    className="bg-zinc-900 border-zinc-800 rounded-none text-white"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Suspects Tab */}
            <TabsContent value="suspects" className="mt-0 space-y-4">
              <Button
                onClick={addSuspect}
                className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-none uppercase tracking-widest text-xs"
                data-testid="add-suspect-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Suspect
              </Button>

              {caseData.suspects.map((suspect, index) => (
                <div key={suspect.id} className="p-6 border border-zinc-800 bg-zinc-900/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-500">SUSPECT #{index + 1}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={suspect.is_guilty}
                          onCheckedChange={(v) => updateSuspect(index, 'is_guilty', v)}
                        />
                        <Label className="text-xs text-zinc-400">GUILTY</Label>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => removeSuspect(index)}
                        className="text-zinc-400 hover:text-red-500 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-6">
                    {/* Portrait Upload */}
                    <ImageUpload
                      value={suspect.portrait_url}
                      onChange={(url) => updateSuspect(index, 'portrait_url', url)}
                      token={token}
                      label="Portrait"
                      previewSize="medium"
                    />
                    
                    {/* Suspect Details */}
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Input
                          value={suspect.name}
                          onChange={(e) => updateSuspect(index, 'name', e.target.value)}
                          placeholder="Full Name"
                          className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                        />
                        <Input
                          type="number"
                          value={suspect.age}
                          onChange={(e) => updateSuspect(index, 'age', parseInt(e.target.value))}
                          placeholder="Age"
                          className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                        />
                        <Input
                          value={suspect.role}
                          onChange={(e) => updateSuspect(index, 'role', e.target.value)}
                          placeholder="Role/Relationship"
                          className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                        />
                      </div>
                      
                      <Textarea
                        value={suspect.motive_angle}
                        onChange={(e) => updateSuspect(index, 'motive_angle', e.target.value)}
                        placeholder="Potential motive..."
                        className="bg-zinc-950 border-zinc-800 rounded-none text-white h-16"
                      />
                      
                      <Textarea
                        value={suspect.alibi_summary}
                        onChange={(e) => updateSuspect(index, 'alibi_summary', e.target.value)}
                        placeholder="Alibi details..."
                        className="bg-zinc-950 border-zinc-800 rounded-none text-white h-16"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Scenes Tab */}
            <TabsContent value="scenes" className="mt-0 space-y-4">
              <Button
                onClick={addScene}
                className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-none uppercase tracking-widest text-xs"
                data-testid="add-scene-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Scene
              </Button>

              {caseData.scenes.map((scene, sceneIndex) => (
                <div key={scene.id} className="p-6 border border-zinc-800 bg-zinc-900/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <GripVertical className="w-4 h-4 text-zinc-600" />
                      <span className="font-mono text-emerald-500">SCENE {scene.id}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={scene.is_interview_scene}
                          onCheckedChange={(v) => updateScene(sceneIndex, 'is_interview_scene', v)}
                        />
                        <Label className="text-xs text-zinc-400">Interview</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={scene.is_accusation_scene}
                          onCheckedChange={(v) => updateScene(sceneIndex, 'is_accusation_scene', v)}
                        />
                        <Label className="text-xs text-zinc-400">Accusation</Label>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => removeScene(sceneIndex)}
                        className="text-zinc-400 hover:text-red-500 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <Input
                    value={scene.title}
                    onChange={(e) => updateScene(sceneIndex, 'title', e.target.value)}
                    placeholder="Scene Title"
                    className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                  />

                  <div className="space-y-1">
                    <Textarea
                      value={scene.narration}
                      onChange={(e) => updateScene(sceneIndex, 'narration', e.target.value)}
                      placeholder="Scene narration (90-160 words)..."
                      className="bg-zinc-950 border-zinc-800 rounded-none text-white h-32 font-typewriter"
                    />
                    <div className="text-xs text-zinc-500 text-right">
                      {scene.narration.split(/\s+/).filter(w => w).length} words
                    </div>
                  </div>

                  {/* Scene Media Upload */}
                  <div className="space-y-2 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-500">SCENE MEDIA (Crime Scene Photos)</span>
                      <Button
                        type="button"
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = 'image/*';
                          input.onchange = async (e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('Image must be less than 5MB');
                              return;
                            }
                            try {
                              const formData = new FormData();
                              formData.append('file', file);
                              const response = await axios.post(`${API_URL}/owner/upload`, formData, {
                                headers: {
                                  Authorization: `Bearer ${token}`,
                                  'Content-Type': 'multipart/form-data'
                                }
                              });
                              const imageUrl = `${process.env.REACT_APP_BACKEND_URL}${response.data.url}`;
                              const newMediaUrls = [...(scene.media_urls || []), imageUrl];
                              updateScene(sceneIndex, 'media_urls', newMediaUrls);
                              toast.success('Image uploaded');
                            } catch (error) {
                              toast.error('Failed to upload image');
                            }
                          };
                          input.click();
                        }}
                        variant="ghost"
                        className="text-zinc-400 hover:text-white text-xs h-6"
                        data-testid={`add-scene-media-${sceneIndex}`}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Photo
                      </Button>
                    </div>
                    
                    {scene.media_urls && scene.media_urls.length > 0 && (
                      <div className="flex flex-wrap gap-3">
                        {scene.media_urls.map((url, mediaIndex) => (
                          <div key={mediaIndex} className="relative w-24 h-24 group">
                            <img 
                              src={url} 
                              alt={`Scene media ${mediaIndex + 1}`}
                              className="w-full h-full object-cover border border-zinc-700"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newMediaUrls = scene.media_urls.filter((_, i) => i !== mediaIndex);
                                updateScene(sceneIndex, 'media_urls', newMediaUrls);
                              }}
                              className="absolute top-1 right-1 bg-red-900/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                              data-testid={`remove-scene-media-${sceneIndex}-${mediaIndex}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Choices */}
                  <div className="space-y-3 pt-4 border-t border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-zinc-500">CHOICES</span>
                      <Button
                        onClick={() => addChoice(sceneIndex)}
                        variant="ghost"
                        className="text-zinc-400 hover:text-white text-xs h-6"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>

                    {scene.choices.map((choice, choiceIndex) => (
                      <div key={choice.id} className="p-3 bg-zinc-950 border border-zinc-800 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={choice.text}
                            onChange={(e) => updateChoice(sceneIndex, choiceIndex, 'text', e.target.value)}
                            placeholder="Choice text..."
                            className="bg-zinc-900 border-zinc-800 rounded-none text-white flex-1 h-8 text-sm"
                          />
                          <Button
                            variant="ghost"
                            onClick={() => removeChoice(sceneIndex, choiceIndex)}
                            className="text-zinc-400 hover:text-red-500 h-8 w-8 p-0"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <Input
                            type="number"
                            value={choice.score_delta}
                            onChange={(e) => updateChoice(sceneIndex, choiceIndex, 'score_delta', parseInt(e.target.value))}
                            placeholder="Score"
                            className="bg-zinc-900 border-zinc-800 rounded-none text-white h-8 text-xs"
                          />
                          <Input
                            value={choice.next_scene_id}
                            onChange={(e) => updateChoice(sceneIndex, choiceIndex, 'next_scene_id', e.target.value)}
                            placeholder="Next Scene"
                            className="bg-zinc-900 border-zinc-800 rounded-none text-white h-8 text-xs"
                          />
                          <Select 
                            value={choice.risk_flag} 
                            onValueChange={(v) => updateChoice(sceneIndex, choiceIndex, 'risk_flag', v)}
                          >
                            <SelectTrigger className="bg-zinc-900 border-zinc-800 rounded-none text-white h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              <SelectItem value="none">No Risk</SelectItem>
                              <SelectItem value="low">Low Risk</SelectItem>
                              <SelectItem value="medium">Medium Risk</SelectItem>
                              <SelectItem value="high">High Risk</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Clues Tab */}
            <TabsContent value="clues" className="mt-0 space-y-4">
              <Button
                onClick={addClue}
                className="bg-zinc-800 text-white hover:bg-zinc-700 rounded-none uppercase tracking-widest text-xs"
                data-testid="add-clue-btn"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Clue
              </Button>

              {caseData.clues.map((clue, index) => (
                <div key={clue.id} className="p-4 border border-zinc-800 bg-zinc-900/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-zinc-500">ID: {clue.id.slice(0, 8)}</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={clue.load_bearing}
                          onCheckedChange={(v) => updateClue(index, 'load_bearing', v)}
                        />
                        <Label className="text-xs text-amber-500">Load Bearing</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={clue.misdirection}
                          onCheckedChange={(v) => updateClue(index, 'misdirection', v)}
                        />
                        <Label className="text-xs text-zinc-400">Misdirection</Label>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => removeClue(index)}
                        className="text-zinc-400 hover:text-red-500 h-8 w-8 p-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex gap-4">
                    {/* Clue Image Upload */}
                    <ImageUpload
                      value={clue.image_url}
                      onChange={(url) => updateClue(index, 'image_url', url)}
                      token={token}
                      label="Evidence Photo"
                      previewSize="small"
                    />
                    
                    {/* Clue Details */}
                    <div className="flex-1 space-y-3">
                      <Input
                        value={clue.label}
                        onChange={(e) => updateClue(index, 'label', e.target.value)}
                        placeholder="Clue Label"
                        className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                      />
                      <Textarea
                        value={clue.description}
                        onChange={(e) => updateClue(index, 'description', e.target.value)}
                        placeholder="What the clue reveals..."
                        className="bg-zinc-950 border-zinc-800 rounded-none text-white h-16"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>

            {/* Endings Tab */}
            <TabsContent value="endings" className="mt-0 space-y-4">
              {caseData.endings.map((ending, index) => (
                <div 
                  key={ending.id} 
                  className={`p-6 border bg-zinc-900/30 space-y-4 ${
                    ending.type === 'CLOSED_GOOD' ? 'border-emerald-800' : 'border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-mono text-sm ${
                      ending.type === 'CLOSED_GOOD' ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {ending.type.replace('_', ' ')}
                    </span>
                    <div className="flex items-center gap-4">
                      <Label className="text-xs text-zinc-400">Base CP:</Label>
                      <Input
                        type="number"
                        value={ending.cp_base}
                        onChange={(e) => updateEnding(index, 'cp_base', parseInt(e.target.value))}
                        className="bg-zinc-950 border-zinc-800 rounded-none text-white w-24 h-8"
                        placeholder="Base CP"
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-6">
                    {/* Mugshot Upload */}
                    <ImageUpload
                      value={ending.mugshot_url}
                      onChange={(url) => updateEnding(index, 'mugshot_url', url)}
                      token={token}
                      label={ending.type === 'CLOSED_GOOD' ? "Perp Mugshot" : "Case File Photo"}
                      previewSize="medium"
                    />
                    
                    <div className="flex-1 space-y-4">
                      <Input
                        value={ending.title}
                        onChange={(e) => updateEnding(index, 'title', e.target.value)}
                        placeholder="Ending Title"
                        className="bg-zinc-950 border-zinc-800 rounded-none text-white"
                      />
                      <Textarea
                        value={ending.narration}
                        onChange={(e) => updateEnding(index, 'narration', e.target.value)}
                        placeholder="Ending narration (what happens when the case concludes)..."
                        className="bg-zinc-950 border-zinc-800 rounded-none text-white h-28 font-typewriter"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
