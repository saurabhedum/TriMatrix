import { useState, useEffect } from 'react';
import { Search, RefreshCw, CheckCircle2, AlertCircle, Plus, Trash2, Save, Play, Target, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useNotifications } from '../context/NotificationContext';

const DEFAULT_DYNAMIC_VARIABLES = [
  { key: '{{primary_keyword}}', value: 'ai marketing automation' },
  { key: '{{current_year}}', value: '2026' },
  { key: '{{top_trend}}', value: 'predictive analytics' },
  { key: '{{industry}}', value: 'SaaS' },
  { key: '{{target_audience}}', value: 'CMOs' },
  { key: '{{location}}', value: 'Global' },
];

export default function SeoEngine() {
  const { user, isAuthReady } = useAuth();
  const { activeProject } = useProjects();
  const { sendNotification } = useNotifications();
  const [keywords, setKeywords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [competitorDomain, setCompetitorDomain] = useState('');
  const [gapKeywords, setGapKeywords] = useState<any[]>([]);
  const [strategies, setStrategies] = useState<any[]>([]);
  const [newStrategyName, setNewStrategyName] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<any>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [dynamicVariables, setDynamicVariables] = useState<any[]>([]);
  const [isManagingVariables, setIsManagingVariables] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [newStepContent, setNewStepContent] = useState('');
  const [addingStepTo, setAddingStepTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [businessProfile] = useLocalStorage('trimatrix_business_profile', {
    companyName: '',
    industry: '',
    targetAudience: '',
    mainGoals: '',
    brandVoice: ''
  });

  const getBusinessContext = () => {
    if (!businessProfile.companyName && !businessProfile.industry) return '';
    return `\n\nBusiness Context:\nCompany Name: ${businessProfile.companyName || 'Not specified'}\nIndustry: ${businessProfile.industry || 'Not specified'}\nTarget Audience: ${businessProfile.targetAudience || 'Not specified'}\nMain Goals: ${businessProfile.mainGoals || 'Not specified'}\nBrand Voice: ${businessProfile.brandVoice || 'Not specified'}\n\nPlease tailor your suggestions to align with this business profile.`;
  };

  const [apiKeys] = useLocalStorage('trimatrix_api_keys', []);
  const geminiKey = apiKeys.find((k: any) => k.id === 'gemini')?.value || import.meta.env.VITE_GEMINI_API_KEY || '';

  useEffect(() => {
    if (!isAuthReady || !user || !activeProject) {
      setDynamicVariables([]);
      setStrategies([]);
      return;
    }

    const qVars = query(collection(db, 'projects', activeProject.id, 'dynamicVariables'), where('uid', '==', user.uid));
    const unsubscribeVars = onSnapshot(qVars, (snapshot) => {
      const vars = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      if (vars.length > 0) {
        setDynamicVariables(vars);
      } else {
        setDynamicVariables([]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/dynamicVariables`);
    });

    const qStrategies = query(collection(db, 'projects', activeProject.id, 'seoStrategies'), where('uid', '==', user.uid));
    const unsubscribeStrategies = onSnapshot(qStrategies, (snapshot) => {
      const strats = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          steps: data.steps ? JSON.parse(data.steps) : []
        };
      });
      if (strats.length > 0) {
        setStrategies(strats);
      } else {
        setStrategies([]);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/seoStrategies`);
    });

    return () => {
      unsubscribeVars();
      unsubscribeStrategies();
    };
  }, [user, isAuthReady, activeProject]);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const runGapAnalysis = () => {
    if (!competitorDomain) return;
    setLoading(true);
    setTimeout(() => {
      // Logic for Gap Analysis should be implemented here
      setGapKeywords([]);
      setLoading(false);
    }, 1500);
  };

  const addStrategy = async () => {
    if (!newStrategyName.trim() || !user || !activeProject) return;
    try {
      await addDoc(collection(db, 'projects', activeProject.id, 'seoStrategies'), {
        uid: user.uid,
        name: newStrategyName,
        steps: JSON.stringify([]),
        createdAt: serverTimestamp()
      });
      setNewStrategyName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${activeProject.id}/seoStrategies`);
    }
  };

  const deleteStrategy = async (id: string) => {
    if (!user || !activeProject) return;
    try {
      await deleteDoc(doc(db, 'projects', activeProject.id, 'seoStrategies', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `projects/${activeProject.id}/seoStrategies/${id}`);
    }
  };

  const addStep = async (strategyId: string, content: string = newStepContent) => {
    if (!content.trim() || !user || !activeProject) return;

    try {
      const strategy = strategies.find(s => s.id === strategyId);
      if (!strategy) return;
      
      const updatedSteps = [...strategy.steps, content];
      await updateDoc(doc(db, 'projects', activeProject.id, 'seoStrategies', strategyId), {
        steps: JSON.stringify(updatedSteps)
      });
      
      setNewStepContent('');
      setAddingStepTo(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `projects/${activeProject.id}/seoStrategies/${strategyId}`);
    }
  };

  const addSuggestionToStrategy = (suggestion: string) => {
    if (strategies.length === 0) {
      sendNotification("Action Required", "Please create a strategy first.", "warning", "seo");
      return;
    }
    // Add to the first strategy for simplicity, or could prompt user
    addStep(strategies[0].id, suggestion);
  };

  const generateAISuggestions = async () => {
    setLoadingSuggestions(true);
    setError(null);
    
    try {
      const keywordList = keywords.map(k => `${k.keyword} (Vol: ${k.volume}, Diff: ${k.difficulty})`).join(', ');
      
      const aiClient = new GoogleGenAI({ apiKey: geminiKey });
      const response = await aiClient.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Based on the following tracked keywords, suggest related long-tail keywords, content cluster ideas, and optimization strategies.\n\nKeywords:\n${keywordList}${getBusinessContext()}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              longTail: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of 3-5 specific long-tail keyword suggestions"
              },
              clusters: { 
                type: Type.ARRAY, 
                items: { 
                  type: Type.OBJECT,
                  properties: {
                    topic: { type: Type.STRING, description: "Main cluster topic" },
                    subtopics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of 2-4 subtopics" }
                  },
                  required: ["topic", "subtopics"]
                },
                description: "List of 2-3 content cluster ideas"
              },
              strategies: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "List of 2-3 actionable SEO optimization strategies"
              }
            },
            required: ["longTail", "clusters", "strategies"]
          }
        }
      });
      
      if (response.text) {
        setAiSuggestions(JSON.parse(response.text));
      }
    } catch (err: any) {
      console.error("Error generating SEO suggestions:", err);
      setError(err.message || "Failed to generate suggestions. Please try again.");
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addVariable = async () => {
    if (!newVarKey.trim() || !newVarValue.trim() || !activeProject) return;
    setError(null);
    
    if (!user) {
      setError("Please log in to save dynamic variables.");
      return;
    }

    const formattedKey = newVarKey.startsWith('{{') && newVarKey.endsWith('}}') ? newVarKey : `{{${newVarKey.replace(/[{}]/g, '')}}}`;
    
    // Check if it already exists in local state to prevent duplicates
    if (dynamicVariables.find((v: any) => v.key === formattedKey)) {
      sendNotification("Duplicate detected", "Variable key already exists.", "warning", "seo");
      return;
    }

    try {
      await addDoc(collection(db, 'projects', activeProject.id, 'dynamicVariables'), {
        uid: user.uid,
        key: formattedKey,
        value: newVarValue,
        createdAt: serverTimestamp()
      });
      
      setNewVarKey('');
      setNewVarValue('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${activeProject.id}/dynamicVariables`);
    }
  };

  const deleteVariable = async (id: string, key: string) => {
    if (!user || !activeProject) return;
    
    // Don't allow deleting default variables if they aren't in Firestore yet
    if (!id) {
      sendNotification("Action Denied", "Cannot delete default variables until you save custom ones.", "warning", "seo");
      return;
    }

    try {
      await deleteDoc(doc(db, 'projects', activeProject.id, 'dynamicVariables', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `projects/${activeProject.id}/dynamicVariables/${id}`);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">Search Optimizer</h1>
          <p className="text-theme-muted mt-1">Find what people search for and build your ranking plan.</p>
        </div>
        <button 
          onClick={handleRefresh}
          className="bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-lg shadow-theme-primary/20"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Update Trends
        </button>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Live Keyword Trends */}
        <div className="lg:col-span-2 glassy-neumorphic rounded-2xl overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-theme-main flex items-center">
              <Search className="w-5 h-5 mr-2 text-theme-primary" />
              Popular Searches
            </h3>
            <span className="text-xs bg-white/10 text-theme-muted px-2 py-1 rounded-md">Updated 5m ago</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-theme-muted">
              <thead className="bg-black/20 text-xs uppercase text-theme-main">
                <tr>
                  <th className="px-6 py-4">Keyword</th>
                  <th className="px-6 py-4">Volume</th>
                  <th className="px-6 py-4">Difficulty</th>
                  <th className="px-6 py-4">Trend</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-theme-muted">Refreshing data...</td></tr>
                ) : keywords.map((kw) => (
                  <tr key={kw.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 font-medium text-theme-main whitespace-nowrap">{kw.keyword}</td>
                    <td className="px-6 py-4">{kw.volume.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-full bg-black/20 rounded-full h-2 mr-2 max-w-[60px]">
                          <div className={`h-2 rounded-full ${kw.difficulty > 70 ? 'bg-rose-500' : kw.difficulty > 40 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${kw.difficulty}%` }}></div>
                        </div>
                        {kw.difficulty}
                      </div>
                    </td>
                    <td className={`px-6 py-4 ${kw.trend.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {kw.trend}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${kw.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                        {kw.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Keyword Strategy & Suggestions */}
          <div className="p-6 border-t border-white/10 bg-slate-900/50">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-theme-main flex items-center">
                <Target className="w-5 h-5 mr-2 text-indigo-400" />
                AI Search Ideas
              </h3>
              <button 
                onClick={generateAISuggestions}
                disabled={loadingSuggestions}
                className="bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center disabled:opacity-50"
              >
                {loadingSuggestions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {loadingSuggestions ? 'Thinking...' : 'Get AI Ideas'}
              </button>
            </div>
            
            {aiSuggestions ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4"
              >
                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3">More Specific Searches</h4>
                  <ul className="space-y-2">
                    {aiSuggestions.longTail.map((kw: string, i: number) => (
                      <li key={i} className="text-xs text-theme-muted flex items-start justify-between group">
                        <span className="flex items-start">
                          <span className="text-emerald-500 mr-2">•</span>
                          {kw}
                        </span>
                        <button 
                          onClick={() => addSuggestionToStrategy(`Target long-tail keyword: ${kw}`)}
                          className="opacity-0 group-hover:opacity-100 text-theme-primary hover:text-theme-primary-hover transition-opacity p-1"
                          title="Add to Strategy"
                        >
                          <Plus size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-amber-400 mb-3">Topic Categories</h4>
                  <ul className="space-y-3">
                    {aiSuggestions.clusters.map((cluster: any, i: number) => (
                      <li key={i} className="text-xs text-theme-muted group relative pr-6">
                        <span className="font-medium text-theme-main block mb-1">{cluster.topic}</span>
                        <span className="text-slate-500">{cluster.subtopics.join(', ')}</span>
                        <button 
                          onClick={() => addSuggestionToStrategy(`Create content cluster around: ${cluster.topic}`)}
                          className="absolute right-0 top-0 opacity-0 group-hover:opacity-100 text-theme-primary hover:text-theme-primary-hover transition-opacity p-1"
                          title="Add to Strategy"
                        >
                          <Plus size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-black/30 border border-white/5 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-indigo-400 mb-3">How to Improve</h4>
                  <ul className="space-y-2">
                    {aiSuggestions.strategies.map((strategy: string, i: number) => (
                      <li key={i} className="text-xs text-theme-muted flex items-start justify-between group">
                        <span className="flex items-start">
                          <span className="text-indigo-500 mr-2">→</span>
                          {strategy}
                        </span>
                        <button 
                          onClick={() => addSuggestionToStrategy(strategy)}
                          className="opacity-0 group-hover:opacity-100 text-theme-primary hover:text-theme-primary-hover transition-opacity p-1"
                          title="Add to Strategy"
                        >
                          <Plus size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ) : (
              <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-black/10">
                <p className="text-sm text-theme-muted">Click "Get AI Ideas" to analyze your tracked keywords and discover new opportunities.</p>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Variables & Recommendations */}
        <div className="space-y-8">
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-4">Custom Text Pieces</h3>
            <div className="space-y-3 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {dynamicVariables.map((v: any, i: number) => (
                <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-3 bg-black/20 rounded-lg border border-white/5 gap-2">
                  <span className="text-xs font-mono text-theme-primary truncate" title={v.key}>{v.key}</span>
                  <span className="text-sm text-theme-main truncate max-w-[150px]" title={v.value}>{v.value}</span>
                </div>
              ))}
            </div>
            <button 
              onClick={() => setIsManagingVariables(true)}
              className="w-full mt-4 text-sm text-theme-primary hover:underline py-2 transition-all"
            >
              Manage Variables
            </button>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-4">Page Fixes</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-theme-muted">Meta tags optimized for top 10 pages</span>
              </li>
              <li className="flex items-start">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-theme-muted">Schema markup generated and injected</span>
              </li>
              <li className="flex items-start">
                <AlertCircle className="w-5 h-5 text-amber-400 mr-3 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-theme-muted">Internal linking opportunity detected on /blog/ai-tools</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Keyword Gap Analysis */}
      <div className="glassy-neumorphic rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-theme-main mb-6 flex items-center">
          <Target className="w-5 h-5 mr-2 text-theme-primary" />
          Compare with Competitors
        </h3>
        <div className="flex gap-4 mb-6">
          <input 
            type="text" 
            placeholder="Enter competitor domain (e.g., competitor.com)..." 
            value={competitorDomain}
            onChange={(e) => setCompetitorDomain(e.target.value)}
            className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none"
          />
          <button onClick={runGapAnalysis} className="bg-theme-primary text-white px-6 py-3 rounded-xl font-medium hover:bg-theme-primary-hover transition-colors">
            Analyze
          </button>
        </div>
        {gapKeywords.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {gapKeywords.map((kw, i) => (
              <div key={i} className="bg-black/30 border border-white/10 rounded-xl p-4">
                <h4 className="text-theme-main font-medium mb-2">{kw.keyword}</h4>
                <div className="flex justify-between text-sm text-theme-muted">
                  <span>Vol: {kw.volume.toLocaleString()}</span>
                  <span>Diff: {kw.difficulty}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Strategy Builder */}
      <div className="glassy-neumorphic rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <h3 className="text-xl font-semibold text-theme-main">Plan Maker</h3>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="New Strategy Name..." 
              value={newStrategyName}
              onChange={(e) => setNewStrategyName(e.target.value)}
              className="bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-theme-main focus:outline-none focus:border-theme-primary"
            />
            <button onClick={addStrategy} className="bg-theme-primary hover:bg-theme-primary-hover text-white p-2 rounded-lg transition-colors">
              <Plus size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map(strategy => (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              key={strategy.id} 
              className="bg-black/20 border border-white/10 rounded-xl p-5 relative group"
            >
              <button 
                onClick={() => deleteStrategy(strategy.id)}
                className="absolute top-4 right-4 text-theme-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 size={16} />
              </button>
              <h4 className="font-medium text-theme-main mb-4 pr-6">{strategy.name}</h4>
              
              <div className="space-y-2 mb-6">
                {strategy.steps.length === 0 ? (
                  <p className="text-xs text-theme-muted italic">No steps added yet.</p>
                ) : (
                  strategy.steps.map((step, i) => (
                    <div key={i} className="flex items-center text-sm text-theme-muted bg-white/5 px-3 py-2 rounded-md">
                      <span className="w-5 h-5 rounded-full bg-theme-primary/20 text-theme-primary flex items-center justify-center text-xs mr-3 flex-shrink-0">{i + 1}</span>
                      {step}
                    </div>
                  ))
                )}
              </div>
              
              <div className="flex gap-2">
                {addingStepTo === strategy.id ? (
                  <div className="flex-1 flex gap-2">
                    <input
                      type="text"
                      placeholder="Step description..."
                      value={newStepContent}
                      onChange={(e) => setNewStepContent(e.target.value)}
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-2 py-1 text-sm text-theme-main focus:outline-none focus:border-theme-primary"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') addStep(strategy.id);
                        if (e.key === 'Escape') setAddingStepTo(null);
                      }}
                    />
                    <button onClick={() => addStep(strategy.id)} className="bg-theme-primary hover:bg-theme-primary-hover text-white px-3 py-1 rounded-lg text-sm transition-colors">
                      Add
                    </button>
                    <button onClick={() => setAddingStepTo(null)} className="bg-white/5 hover:bg-white/10 text-theme-muted px-3 py-1 rounded-lg text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setAddingStepTo(strategy.id)} className="flex-1 bg-white/5 hover:bg-white/10 text-theme-main text-sm py-2 rounded-lg flex items-center justify-center transition-colors">
                      <Plus size={14} className="mr-1" /> Add Step
                    </button>
                    <button className="flex-1 bg-theme-primary/20 hover:bg-theme-primary/30 text-theme-primary text-sm py-2 rounded-lg flex items-center justify-center transition-colors">
                      <Play size={14} className="mr-1" /> Execute
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Manage Variables Modal */}
      <AnimatePresence>
        {isManagingVariables && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h2 className="text-xl font-bold text-white">Manage Dynamic Variables</h2>
                <button onClick={() => setIsManagingVariables(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Add New Variable */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Key (e.g., primary_keyword)"
                    value={newVarKey}
                    onChange={(e) => setNewVarKey(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-theme-primary"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={newVarValue}
                    onChange={(e) => setNewVarValue(e.target.value)}
                    className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-theme-primary"
                  />
                  <button 
                    onClick={addVariable}
                    className="bg-theme-primary hover:bg-theme-primary-hover text-white p-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>

                {/* List of Variables */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {dynamicVariables.map((v: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-black/20 rounded-lg border border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-mono text-theme-primary">{v.key}</span>
                        <span className="text-sm text-slate-300">{v.value}</span>
                      </div>
                      <button 
                        onClick={() => deleteVariable(v.id, v.key)}
                        className="text-slate-500 hover:text-rose-400 transition-colors p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {dynamicVariables.length === 0 && (
                    <p className="text-center text-sm text-slate-500 py-4">No variables defined.</p>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
