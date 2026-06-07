import React, { useState, useEffect, useRef } from 'react';
import { BrainCircuit, Sparkles, MessageSquare, Zap, Cpu, Users, User, FileText, BarChart3, Activity, Heart, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { collection, addDoc, onSnapshot, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';

export default function AI() {
  const [apiKeys] = useLocalStorage('trimatrix_api_keys', []);
  const geminiKey = apiKeys.find((k: any) => k.id === 'gemini')?.value || import.meta.env.VITE_GEMINI_API_KEY || '';
  const ai = new GoogleGenAI({ apiKey: geminiKey || '' });

  const [persona, setPersona] = useState<any>(null);
  const [targetAudience, setTargetAudience] = useState('');
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  
  const [contentInput, setContentInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);

  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useLocalStorage<{role: 'user' | 'assistant', text: string}[]>('trimatrix_ai_chat_history', [{ role: 'assistant', text: "Hello! I'm your TriMatrix AI Assistant. I can help you analyze campaigns, generate content ideas, or optimize your SEO strategy. What would you like to do today?" }]);
  const [isChatting, setIsChatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { activeProject } = useProjects();

  useEffect(() => {
    if (!user || !activeProject) return;

    const q = query(collection(db, 'projects', activeProject.id, 'aiChatMessages'), where('uid', '==', user.uid), orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ role: doc.data().role, text: doc.data().text }));
      if (messages.length > 0) {
        setChatHistory(messages);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/aiChatMessages`);
    });

    return () => unsubscribe();
  }, [user, activeProject]);

  const [businessProfile] = useLocalStorage('trimatrix_business_profile', {
    companyName: '',
    industry: '',
    targetAudience: '',
    mainGoals: '',
    brandVoice: ''
  });

  const getBusinessContext = () => {
    if (!businessProfile.companyName && !businessProfile.industry) return '';
    return `\n\nBusiness Context:\nCompany Name: ${businessProfile.companyName || 'Not specified'}\nIndustry: ${businessProfile.industry || 'Not specified'}\nTarget Audience: ${businessProfile.targetAudience || 'Not specified'}\nMain Goals: ${businessProfile.mainGoals || 'Not specified'}\nBrand Voice: ${businessProfile.brandVoice || 'Not specified'}\n\nPlease tailor your response to align with this business profile.`;
  };

  const handleChat = async () => {
    if (!chatInput.trim() || isChatting || !user || !activeProject) return;
    const userMsg = chatInput;
    setChatInput('');
    setIsChatting(true);
    setError(null);

    try {
      // Save user message to Firestore
      await addDoc(collection(db, 'projects', activeProject.id, 'aiChatMessages'), {
        uid: user.uid,
        role: 'user',
        text: userMsg,
        createdAt: serverTimestamp()
      });

      if (!geminiKey) {
        throw new Error("Gemini API key is not configured. Please add it in Settings.");
      }

      const response = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `User asks: ${userMsg}. Respond as TriMatrix marketing assistant.${getBusinessContext()}` }] }]
      });
      const responseText = response.text || response.choices?.[0]?.message?.content || '';

      // Save assistant response to Firestore
      await addDoc(collection(db, 'projects', activeProject.id, 'aiChatMessages'), {
        uid: user.uid,
        role: 'assistant',
        text: responseText || 'Sorry, I could not process that.',
        createdAt: serverTimestamp()
      });
    } catch (err: any) {
      console.error("Chat error:", err);
      let errorMessage = "I'm sorry, I encountered an issue while processing your request. Please try again in a moment.";
      if (err.message && err.message.toLowerCase().includes("api key") || err.status === 401 || err.status === 403) {
        errorMessage = "Invalid API Key. Please update your AI API key in Settings.";
      } else if (err.message && err.message.toLowerCase().includes("quota") || err.status === 429) {
        errorMessage = "Rate limit or quota exceeded. Please try again later.";
      } else if (err.message && (err.message.toLowerCase().includes("network") || err.message.toLowerCase().includes("fetch"))) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = `API Error: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsChatting(false);
    }
  };

  const generatePersona = async () => {
    if (!targetAudience.trim()) return;
    setIsGeneratingPersona(true);
    setError(null);
    
    try {
      if (!geminiKey) {
        throw new Error("Gemini API key is not configured.");
      }
      const prompt = `Generate a detailed customer persona for the target audience: "${targetAudience}".${getBusinessContext()}
Output the response in JSON format. The JSON should contain exactly these keys:
{
  "name": "A catchy name for the persona",
  "demographics": "Age, occupation, location, income, etc.",
  "psychographics": "Values, beliefs, interests, lifestyle",
  "behavioral": "Buying habits, brand interactions, tech usage"
}`;

      const response = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const content = response.text || '';
      
      if (content) {
        // Simple cleanup if AI wraps in markdown blocks
        const jsonStr = content.replace(/```json|```/g, '').trim();
        setPersona(JSON.parse(jsonStr));
      }
    } catch (err: any) {
      console.error("Error generating persona:", err);
      let errorMessage = "Failed to generate persona. Please try again.";
      if (err.message && err.message.toLowerCase().includes("api key") || err.status === 401 || err.status === 403) {
        errorMessage = "Invalid API Key. Please update your AI API key in Settings.";
      } else if (err.message && err.message.toLowerCase().includes("quota") || err.status === 429) {
        errorMessage = "Rate limit or quota exceeded. Please try again later.";
      } else if (err.message && (err.message.toLowerCase().includes("network") || err.message.toLowerCase().includes("fetch"))) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = `API Error: ${err.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsGeneratingPersona(false);
    }
  };

  const analyzeContent = async () => {
    if (!contentInput.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    
    const prompt = `Analyze the following marketing content for SEO, readability, sentiment, and engagement potential. Provide specific suggestions for improvement. Return ONLY a valid JSON object matching this schema:
{
  "seoScore": number (0-100),
  "readability": string (e.g., "Grade 8 (Conversational)"),
  "sentiment": string (e.g., "Positive & Encouraging"),
  "engagementPotential": string (e.g., "High (8.5/10)"),
  "suggestions": string[] (3-5 actionable suggestions)
}

${getBusinessContext()}

Content:
${contentInput}`;

    try {
      if (!geminiKey) {
        throw new Error("Gemini API key is not configured.");
      }
      const response = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const text = response.text || '';
      if (text) {
        const jsonStr = text.replace(/```json|```/g, '').trim();
        setAnalysisResult(JSON.parse(jsonStr));
      }
    } catch (openaiError: any) {
      console.error("API failed:", openaiError);
      let errorMessage = "An error occurred while analyzing content.";
      if (openaiError.message && openaiError.message.toLowerCase().includes("api key") || openaiError.status === 401 || openaiError.status === 403) {
        errorMessage = "Invalid API Key. Please update your AI API key in Settings.";
      } else if (openaiError.message && openaiError.message.toLowerCase().includes("quota") || openaiError.status === 429) {
        errorMessage = "Rate limit or quota exceeded. Please try again later.";
      } else if (openaiError.message && (openaiError.message.toLowerCase().includes("network") || openaiError.message.toLowerCase().includes("fetch"))) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (openaiError.message) {
        errorMessage = `API Error: ${openaiError.message}`;
      }
      setError(errorMessage);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-main flex items-center">
            <BrainCircuit className="w-8 h-8 mr-3 text-theme-primary" />
            AI Helper
          </h1>
          <p className="text-theme-muted mt-2">Your smart assistant for marketing.</p>
        </div>
      </div>

      {error && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glassy-neumorphic rounded-2xl p-6 h-[500px] flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-theme-secondary/20' : 'bg-theme-primary/20'}`}>
                    {msg.role === 'user' ? <User className="w-5 h-5 text-theme-secondary" /> : <BrainCircuit className="w-5 h-5 text-theme-primary" />}
                  </div>
                  <div className={`bg-black/20 rounded-2xl p-4 border border-white/5 text-sm text-theme-main ${msg.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isChatting && (
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-5 h-5 text-theme-primary animate-spin" />
                  </div>
                </div>
              )}
            </div>
            <div className="relative">
              <input 
                type="text" 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                placeholder="Ask me anything about your marketing..." 
                className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
              />
              <button 
                onClick={handleChat}
                disabled={isChatting}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors disabled:opacity-50"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Persona Generator Section */}
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-4 flex items-center">
              <Users className="w-5 h-5 mr-2 text-theme-primary" />
              Customer Profile Maker
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input 
                type="text" 
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="Who is your customer? (e.g., Doctors)" 
                className="bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main" 
              />
              <button 
                onClick={generatePersona} 
                disabled={isGeneratingPersona || !targetAudience.trim()}
                className="bg-theme-primary text-white rounded-xl p-3 font-medium hover:bg-theme-primary-hover disabled:opacity-50 flex items-center justify-center"
              >
                {isGeneratingPersona ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                Generate Profile
              </button>
            </div>
            {persona && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black/30 border border-white/10 rounded-xl p-4 space-y-2 mt-4">
                <h4 className="text-theme-main font-bold flex items-center"><User className="w-4 h-4 mr-2"/>{persona.name}</h4>
                <p className="text-theme-muted text-sm"><strong>Age/Location:</strong> {persona.demographics}</p>
                <p className="text-theme-muted text-sm"><strong>Interests:</strong> {persona.psychographics}</p>
                <p className="text-theme-muted text-sm"><strong>Habits:</strong> {persona.behavioral}</p>
              </motion.div>
            )}
          </div>

          {/* Content Analysis Section */}
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-indigo-400" />
              Check Content
            </h3>
            <p className="text-sm text-theme-muted mb-4">Paste text to see how to improve it.</p>
            
            <div className="space-y-4">
              <textarea 
                value={contentInput}
                onChange={(e) => setContentInput(e.target.value)}
                placeholder="Paste your content or URL here..." 
                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-theme-main focus:ring-2 focus:ring-indigo-500 outline-none h-32 resize-none"
              />
              <button 
                onClick={analyzeContent} 
                disabled={isAnalyzing || !contentInput.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl p-3 font-medium transition-colors flex items-center justify-center"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Check It
                  </>
                )}
              </button>
            </div>

            {analysisResult && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }} 
                className="mt-6 space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-2">
                      <span className="text-xl font-bold text-emerald-400">{analysisResult.seoScore}</span>
                    </div>
                    <span className="text-xs text-theme-muted font-medium uppercase tracking-wider">Search Score</span>
                  </div>
                  <div className="bg-black/30 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center">
                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center mb-2">
                      <Activity className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="text-sm font-semibold text-theme-main mb-1">{analysisResult.engagementPotential}</span>
                    <span className="text-xs text-theme-muted font-medium uppercase tracking-wider">Engagement</span>
                  </div>
                </div>
                
                <div className="bg-black/30 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-sm text-theme-muted flex items-center"><FileText className="w-4 h-4 mr-2 text-slate-400"/> Easy to Read</span>
                    <span className="text-sm font-medium text-theme-main">{analysisResult.readability}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-white/5 pb-2">
                    <span className="text-sm text-theme-muted flex items-center"><Heart className="w-4 h-4 mr-2 text-rose-400"/> Feedback Tone</span>
                    <span className="text-sm font-medium text-theme-main">{analysisResult.sentiment}</span>
                  </div>
                  <div className="pt-2">
                    <span className="text-sm font-medium text-theme-main mb-2 block">How to Improve:</span>
                    <ul className="space-y-2">
                      {analysisResult.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-theme-muted flex items-start">
                          <span className="text-indigo-400 mr-2">→</span>
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-theme-primary" />
              Try These
            </h3>
            <div className="space-y-3">
              {[
                "Analyze my latest email campaign",
                "Generate 5 viral tweet ideas",
                "Suggest SEO keywords for 'SaaS'",
                "Audit my landing page conversion"
              ].map((prompt, i) => (
                <button key={i} className="w-full text-left p-3 rounded-xl bg-black/20 border border-white/5 hover:bg-white/5 hover:border-theme-primary/50 transition-all text-sm text-theme-muted hover:text-theme-main">
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-4 flex items-center">
              <Cpu className="w-5 h-5 mr-2 text-theme-primary" />
              System Status
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-theme-muted">Model</span>
                <span className="text-sm font-medium text-theme-primary">TriMatrix-v4</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-theme-muted">Context Window</span>
                <span className="text-sm font-medium text-theme-main">128k tokens</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-theme-muted">Latency</span>
                <span className="text-sm font-medium text-emerald-400">24ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
