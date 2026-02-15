import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Fingerprint, Clock, Shield, FileText, Users, Search, 
  MessageSquare, Calendar, AlertTriangle, ChevronRight, 
  Check, X, Target, Notebook, Send, ArrowLeft, User
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { ScrollArea } from '../components/ui/scroll-area';
import { useAuth } from '../contexts/AuthContext';
import { getRiskColor, getImageUrl } from '../lib/utils';
import axios from 'axios';
import { toast } from 'sonner';

const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function GameplayPage() {
  const { caseId } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [session, setSession] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [currentScene, setCurrentScene] = useState(null);
  const [score, setScore] = useState(0);
  const [cluesCollected, setCluesCollected] = useState([]);
  const [proceduralRisk, setProceduralRisk] = useState('LOW');
  const [loading, setLoading] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [notes, setNotes] = useState('');
  const [showNotebook, setShowNotebook] = useState(false);
  
  // Interrogation state
  const [showInterrogation, setShowInterrogation] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [interrogationQuestion, setInterrogationQuestion] = useState('');
  const [interrogationHistory, setInterrogationHistory] = useState([]);
  const [interrogating, setInterrogating] = useState(false);
  
  // Accusation state
  const [showAccusation, setShowAccusation] = useState(false);
  const [selectedAccuseSuspect, setSelectedAccuseSuspect] = useState(null);
  const [selectedClues, setSelectedClues] = useState([]);
  
  // Ending state
  const [gameEnded, setGameEnded] = useState(false);
  const [endingResult, setEndingResult] = useState(null);

  const startGame = useCallback(async () => {
    try {
      const response = await axios.post(`${API_URL}/play/start`, 
        { case_id: caseId },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setSession(response.data);
      setCaseData(response.data.case);
      setCurrentScene(response.data.current_scene);
      setScore(response.data.score);
      setCluesCollected(response.data.clues_collected);
      setProceduralRisk(response.data.procedural_risk);
      setTimeRemaining(response.data.case.time_limit_minutes * 60);
    } catch (error) {
      console.error('Failed to start game:', error);
      toast.error('Failed to start case');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [caseId, token, navigate]);

  useEffect(() => {
    startGame();
  }, [startGame]);

  // Timer
  useEffect(() => {
    if (!timeRemaining || gameEnded) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining, gameEnded]);

  const handleTimeUp = () => {
    setGameEnded(true);
    setEndingResult({
      success: false,
      correct_accusation: false,
      ending_type: 'COMPROMISED_BAD',
      ending_title: 'Time Expired',
      ending_narration: 'The investigation window has closed. Without a conclusive resolution, the case remains open, the suspect at large. The Bureau marks this as an operational failure.',
      career_points_earned: 0,
      procedural_risk: proceduralRisk
    });
    toast.error('Time expired! Case compromised.');
  };

  const makeChoice = async (choiceId) => {
    try {
      const response = await axios.post(`${API_URL}/play/choice`,
        { 
          session_id: session.session_id,
          scene_id: currentScene.id,
          choice_id: choiceId
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setScore(response.data.score);
      setCluesCollected(response.data.clues_collected);
      setProceduralRisk(response.data.procedural_risk);
      setCurrentScene(response.data.next_scene);
      
      if (response.data.next_scene?.is_accusation_scene) {
        setShowAccusation(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Action failed');
    }
  };

  const interrogateSuspect = async () => {
    if (!interrogationQuestion.trim()) return;
    
    setInterrogating(true);
    try {
      const response = await axios.post(`${API_URL}/play/interrogate`,
        {
          session_id: session.session_id,
          suspect_id: selectedSuspect.id,
          question: interrogationQuestion
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      setInterrogationHistory(prev => [...prev, {
        question: interrogationQuestion,
        response: response.data.response,
        suspect: response.data.suspect_name
      }]);
      setInterrogationQuestion('');
    } catch (error) {
      toast.error('Interrogation failed');
    } finally {
      setInterrogating(false);
    }
  };

  const makeAccusation = async () => {
    if (!selectedAccuseSuspect || selectedClues.length < 3) {
      toast.error('Select a suspect and at least 3 clues');
      return;
    }
    
    try {
      const response = await axios.post(`${API_URL}/play/accuse`,
        {
          session_id: session.session_id,
          suspect_id: selectedAccuseSuspect.id,
          clue_ids: selectedClues
        },
        { headers: { Authorization: `Bearer ${token}` }}
      );
      
      if (response.data.continue_investigation) {
        toast.warning(response.data.message);
        return;
      }
      
      setGameEnded(true);
      setEndingResult(response.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Accusation failed');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getClueById = (clueId) => {
    return caseData?.clues?.find(c => c.id === clueId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Fingerprint className="w-12 h-12 text-zinc-600 mx-auto animate-pulse" />
          <p className="text-zinc-500 mt-4 font-mono text-sm">LOADING CASE FILE...</p>
        </div>
      </div>
    );
  }

  if (gameEnded && endingResult) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className={`p-8 border ${endingResult.ending_type === 'CLOSED_GOOD' ? 'border-emerald-800 bg-emerald-950/20' : 'border-red-800 bg-red-950/20'}`}>
            <div className="text-center mb-8">
              <div className={`font-mono text-xs tracking-widest mb-4 ${endingResult.ending_type === 'CLOSED_GOOD' ? 'text-emerald-500' : 'text-red-500'}`}>
                CASE STATUS
              </div>
              <h1 className="font-heading text-4xl text-white uppercase tracking-wide">
                {endingResult.ending_title}
              </h1>
            </div>
            
            <p className="text-zinc-300 leading-relaxed mb-8 font-typewriter">
              {endingResult.ending_narration}
            </p>
            
            <div className="grid grid-cols-3 gap-4 mb-8 text-center">
              <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                <div className="font-mono text-xs text-zinc-500 mb-1">VERDICT</div>
                <div className={`font-heading text-lg ${endingResult.correct_accusation ? 'text-emerald-500' : 'text-red-500'}`}>
                  {endingResult.correct_accusation ? 'CORRECT' : 'INCORRECT'}
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                <div className="font-mono text-xs text-zinc-500 mb-1">CP EARNED</div>
                <div className="font-heading text-lg text-white">
                  {endingResult.career_points_earned > 0 ? '+' : ''}{endingResult.career_points_earned}
                </div>
              </div>
              <div className="p-4 bg-zinc-900/50 border border-zinc-800">
                <div className="font-mono text-xs text-zinc-500 mb-1">PROCEDURE</div>
                <div className={`font-heading text-lg ${getRiskColor(endingResult.procedural_risk)}`}>
                  {endingResult.procedural_risk}
                </div>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-zinc-800 text-white hover:bg-zinc-700 rounded-none uppercase tracking-widest text-sm h-12"
                data-testid="return-dashboard-btn"
              >
                Return to Dashboard
              </Button>
              <Button
                onClick={() => window.location.reload()}
                variant="outline"
                className="flex-1 border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-none uppercase tracking-widest text-sm h-12"
                data-testid="replay-btn"
              >
                Replay Case
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top Bar */}
      <header className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="text-zinc-400 hover:text-white p-2"
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <span className="font-mono text-xs text-emerald-500">{caseData?.case_id}</span>
              <h1 className="font-heading text-lg text-white uppercase tracking-wide">
                {caseData?.title}
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Timer */}
            <div className={`flex items-center gap-2 font-mono ${timeRemaining < 60 ? 'text-red-500 animate-pulse' : 'text-zinc-300'}`}>
              <Clock className="w-4 h-4" />
              <span data-testid="timer">{formatTime(timeRemaining)}</span>
            </div>
            
            {/* Score */}
            <div className="flex items-center gap-2 text-zinc-300 font-mono">
              <Target className="w-4 h-4" />
              <span data-testid="score">SCORE: {score}</span>
            </div>
            
            {/* Risk */}
            <div className={`flex items-center gap-2 font-mono border px-3 py-1 ${getRiskColor(proceduralRisk)}`}>
              <Shield className="w-4 h-4" />
              <span data-testid="risk">RISK: {proceduralRisk}</span>
            </div>
            
            {/* Notebook */}
            <Button
              variant="ghost"
              onClick={() => setShowNotebook(!showNotebook)}
              className="text-zinc-400 hover:text-white"
              data-testid="notebook-btn"
            >
              <Notebook className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Main Content */}
        <main className="flex-1 p-6">
          <Tabs defaultValue="scene" className="w-full">
            <TabsList className="bg-zinc-900 border border-zinc-800 rounded-none p-1 mb-6">
              <TabsTrigger value="scene" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs tracking-widest">
                <FileText className="w-4 h-4 mr-2" />
                Scene
              </TabsTrigger>
              <TabsTrigger value="suspects" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs tracking-widest">
                <Users className="w-4 h-4 mr-2" />
                Suspects
              </TabsTrigger>
              <TabsTrigger value="clues" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs tracking-widest">
                <Search className="w-4 h-4 mr-2" />
                Clues ({cluesCollected.length})
              </TabsTrigger>
              <TabsTrigger value="timeline" className="rounded-none data-[state=active]:bg-zinc-800 uppercase font-mono text-xs tracking-widest">
                <Calendar className="w-4 h-4 mr-2" />
                Timeline
              </TabsTrigger>
            </TabsList>

            {/* Scene Tab */}
            <TabsContent value="scene" className="mt-0">
              {currentScene && (
                <div className="max-w-4xl">
                  <div className="mb-6">
                    <span className="font-mono text-xs text-zinc-500">
                      SCENE {currentScene.order + 1}
                    </span>
                    <h2 className="font-heading text-2xl text-white uppercase tracking-wide mt-1">
                      {currentScene.title}
                    </h2>
                  </div>
                  
                  <div className="p-6 border border-zinc-800 bg-zinc-900/30 mb-6">
                    {/* Scene Media/Images */}
                    {currentScene.media_urls && currentScene.media_urls.length > 0 && (
                      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentScene.media_urls.map((url, idx) => (
                          <div key={idx} className="border border-zinc-700 overflow-hidden">
                            <img 
                              src={getImageUrl(url)} 
                              alt={`Scene evidence ${idx + 1}`}
                              className="w-full h-48 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-zinc-300 leading-relaxed font-typewriter whitespace-pre-wrap">
                      {currentScene.narration}
                    </p>
                  </div>
                  
                  {/* Choices */}
                  <div className="space-y-3">
                    <div className="font-mono text-xs text-zinc-500 mb-3">
                      AVAILABLE ACTIONS
                    </div>
                    {currentScene.choices.map((choice, index) => {
                      const hasRequiredClues = choice.require_clues.every(
                        clueId => cluesCollected.includes(clueId)
                      );
                      
                      return (
                        <button
                          key={choice.id}
                          onClick={() => hasRequiredClues && makeChoice(choice.id)}
                          disabled={!hasRequiredClues}
                          className={`w-full p-4 text-left border transition-all ${
                            hasRequiredClues 
                              ? 'border-zinc-700 hover:border-zinc-500 bg-zinc-900/50 hover:bg-zinc-900' 
                              : 'border-zinc-800 bg-zinc-900/20 opacity-50 cursor-not-allowed'
                          }`}
                          data-testid={`choice-${index}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <span className="text-zinc-300">{choice.text}</span>
                              {!hasRequiredClues && (
                                <div className="flex items-center gap-2 mt-2 text-amber-500 text-xs font-mono">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>Requires additional evidence</span>
                                </div>
                              )}
                            </div>
                            {choice.risk_flag !== 'none' && (
                              <span className={`font-mono text-xs ${getRiskColor(choice.risk_flag.toUpperCase())}`}>
                                {choice.risk_flag.toUpperCase()} RISK
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Suspects Tab */}
            <TabsContent value="suspects" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {caseData?.suspects.map((suspect) => (
                  <div 
                    key={suspect.id}
                    className="p-6 border border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 transition-colors"
                    data-testid={`suspect-${suspect.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                        {suspect.portrait_url ? (
                          <img 
                            src={getImageUrl(suspect.portrait_url)} 
                            alt={suspect.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-8 h-8 text-zinc-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading text-lg text-white uppercase">{suspect.name}</h3>
                        <p className="text-zinc-500 text-sm">{suspect.age} years old • {suspect.role}</p>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-2 text-sm">
                      <div>
                        <span className="text-zinc-500 font-mono text-xs">MOTIVE:</span>
                        <p className="text-zinc-400">{suspect.motive_angle}</p>
                      </div>
                      <div>
                        <span className="text-zinc-500 font-mono text-xs">ALIBI:</span>
                        <p className="text-zinc-400">{suspect.alibi_summary}</p>
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => {
                        setSelectedSuspect(suspect);
                        setShowInterrogation(true);
                        setInterrogationHistory([]);
                      }}
                      className="mt-4 w-full bg-zinc-800 text-white hover:bg-zinc-700 rounded-none uppercase tracking-widest text-xs"
                      data-testid={`interrogate-${suspect.id}`}
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Interrogate
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Clues Tab */}
            <TabsContent value="clues" className="mt-0">
              {cluesCollected.length === 0 ? (
                <div className="text-center py-12 border border-zinc-800 bg-zinc-900/30">
                  <Search className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-500">No evidence collected yet</p>
                  <p className="text-zinc-600 text-sm mt-1">Investigate scenes to gather clues</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {cluesCollected.map((clueId) => {
                    const clue = getClueById(clueId);
                    if (!clue) return null;
                    
                    return (
                      <div 
                        key={clueId}
                        className="p-4 border border-zinc-800 bg-zinc-900/30"
                        data-testid={`clue-${clueId}`}
                      >
                        <div className="flex items-start gap-3">
                          {clue.image_url ? (
                            <div className="w-16 h-16 flex-shrink-0 border border-zinc-700 overflow-hidden">
                              <img 
                                src={getImageUrl(clue.image_url)} 
                                alt={clue.label}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className={`w-8 h-8 flex items-center justify-center border ${
                              clue.load_bearing ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-700 bg-zinc-800'
                            }`}>
                              <FileText className={`w-4 h-4 ${clue.load_bearing ? 'text-amber-500' : 'text-zinc-500'}`} />
                            </div>
                          )}
                          <div>
                            <h4 className="text-white font-mono text-sm">{clue.label}</h4>
                            <p className="text-zinc-400 text-sm mt-1">{clue.description}</p>
                            {clue.load_bearing && (
                              <span className="inline-block mt-2 px-2 py-0.5 bg-amber-500/20 border border-amber-500/50 text-amber-500 text-xs font-mono">
                                KEY EVIDENCE
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0">
              <div className="max-w-2xl">
                <div className="font-mono text-xs text-zinc-500 mb-4">CASE TIMELINE</div>
                <div className="border-l border-zinc-800 pl-6 space-y-6">
                  {caseData?.scenes.slice(0, (currentScene?.order || 0) + 1).map((scene, index) => (
                    <div key={scene.id} className="relative">
                      <div className="absolute -left-[25px] w-2 h-2 bg-emerald-500 border-2 border-zinc-950" />
                      <div className="font-mono text-xs text-zinc-500">SCENE {index + 1}</div>
                      <div className="text-white font-heading uppercase">{scene.title}</div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </main>

        {/* Notebook Panel */}
        {showNotebook && (
          <aside className="w-80 border-l border-zinc-800 p-4 bg-zinc-900/30">
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-xs text-zinc-500 tracking-widest">FIELD NOTEBOOK</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotebook(false)}
                className="text-zinc-500 hover:text-white h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Take notes on your investigation..."
              className="bg-zinc-950 border-zinc-800 rounded-none h-[calc(100vh-200px)] text-zinc-300 placeholder:text-zinc-600 font-typewriter text-sm resize-none"
              data-testid="notes-textarea"
            />
          </aside>
        )}
      </div>

      {/* Interrogation Modal */}
      <Dialog open={showInterrogation} onOpenChange={setShowInterrogation}>
        <DialogContent className="bg-zinc-950 border-zinc-800 rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white uppercase tracking-wide">
              Interrogation: {selectedSuspect?.name}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="h-[300px] border border-zinc-800 bg-zinc-900/30 p-4 mb-4">
            {interrogationHistory.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">Begin your interrogation</p>
            ) : (
              <div className="space-y-4">
                {interrogationHistory.map((entry, index) => (
                  <div key={index}>
                    <div className="text-emerald-500 font-mono text-sm mb-1">
                      AGENT: {entry.question}
                    </div>
                    <div className="text-zinc-300 font-typewriter border-l-2 border-zinc-700 pl-3">
                      {entry.response}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          <div className="flex gap-2">
            <Textarea
              value={interrogationQuestion}
              onChange={(e) => setInterrogationQuestion(e.target.value)}
              placeholder="Ask your question..."
              className="bg-zinc-900 border-zinc-800 rounded-none text-white placeholder:text-zinc-600 resize-none h-20"
              data-testid="interrogation-input"
            />
            <Button
              onClick={interrogateSuspect}
              disabled={interrogating || !interrogationQuestion.trim()}
              className="bg-white text-black hover:bg-zinc-200 rounded-none px-6"
              data-testid="send-question-btn"
            >
              {interrogating ? '...' : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Accusation Modal */}
      <Dialog open={showAccusation} onOpenChange={setShowAccusation}>
        <DialogContent className="bg-zinc-950 border-zinc-800 rounded-none max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-heading text-xl text-white uppercase tracking-wide">
              Make Accusation
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div>
              <div className="font-mono text-xs text-zinc-500 mb-3">SELECT SUSPECT</div>
              <div className="grid grid-cols-2 gap-2">
                {caseData?.suspects.map((suspect) => (
                  <button
                    key={suspect.id}
                    onClick={() => setSelectedAccuseSuspect(suspect)}
                    className={`p-3 border text-left transition-colors ${
                      selectedAccuseSuspect?.id === suspect.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-zinc-800 hover:border-zinc-700'
                    }`}
                    data-testid={`accuse-suspect-${suspect.id}`}
                  >
                    <div className="text-white text-sm">{suspect.name}</div>
                    <div className="text-zinc-500 text-xs">{suspect.role}</div>
                  </button>
                ))}
              </div>
            </div>
            
            <div>
              <div className="font-mono text-xs text-zinc-500 mb-3">
                SELECT EVIDENCE (MIN. 3) - {selectedClues.length} SELECTED
              </div>
              <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                {cluesCollected.map((clueId) => {
                  const clue = getClueById(clueId);
                  if (!clue) return null;
                  
                  const isSelected = selectedClues.includes(clueId);
                  
                  return (
                    <button
                      key={clueId}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedClues(prev => prev.filter(id => id !== clueId));
                        } else {
                          setSelectedClues(prev => [...prev, clueId]);
                        }
                      }}
                      className={`p-3 border text-left flex items-center gap-3 transition-colors ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : 'border-zinc-800 hover:border-zinc-700'
                      }`}
                      data-testid={`select-clue-${clueId}`}
                    >
                      <div className={`w-5 h-5 border flex items-center justify-center ${
                        isSelected ? 'border-emerald-500 bg-emerald-500' : 'border-zinc-700'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-black" />}
                      </div>
                      <div>
                        <div className="text-white text-sm">{clue.label}</div>
                        <div className="text-zinc-500 text-xs line-clamp-1">{clue.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            
            <Button
              onClick={makeAccusation}
              disabled={!selectedAccuseSuspect || selectedClues.length < 3}
              className="w-full bg-red-900 text-white hover:bg-red-800 rounded-none uppercase tracking-widest"
              data-testid="confirm-accusation-btn"
            >
              <Target className="w-4 h-4 mr-2" />
              Confirm Accusation
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
