import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, Sparkles, Save } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface MagicToolModalProps {
  tool: { title: string; desc: string; icon: any; color: string };
  onClose: () => void;
}

export default function MagicToolModal({ tool, onClose }: MagicToolModalProps) {
  const { user } = useAuth();
  const { activeProject } = useProjects();
  const [apiKeys] = useLocalStorage('trimatrix_api_keys', []);
  const geminiKey = apiKeys.find((k: any) => k.id === 'gemini')?.value || import.meta.env.VITE_GEMINI_API_KEY || '';

  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const runTool = async () => {
    if (!input.trim()) return;
    setLoading(true);
    try {
      if (!geminiKey) {
        throw new Error("Gemini API key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      
      const prompt = `You are an expert marketing assistant. Perform the following task: "${tool.title}". Task description: ${tool.desc}. Input: "${input}". Provide a high-quality, actionable, and professional response.`;
      const aiResult = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      setResult(aiResult.text || 'No result generated.');
    } catch (error: any) {
      console.error('Magic Tool Error:', error);
      setResult(error.message || 'Error generating content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async () => {
    if (!user || !result || !activeProject) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'projects', activeProject.id, 'magicResults'), {
        uid: user.uid,
        tool: tool.title,
        input,
        result,
        createdAt: serverTimestamp()
      });
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${activeProject.id}/magicResults`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
          <h2 className="text-xl font-bold text-theme-main flex items-center">
            <tool.icon className={`w-6 h-6 mr-3 ${tool.color}`} />
            {tool.title}
          </h2>
          <button onClick={onClose} className="text-theme-muted hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto">
          <p className="text-theme-muted text-sm">{tool.desc}</p>
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={4}
            placeholder="Enter your input here..."
            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all resize-none"
          />
          <button 
            onClick={runTool}
            disabled={loading || !input.trim()}
            className="w-full bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center transition-all"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Sparkles className="w-5 h-5 mr-2" /> Run Engine</>}
          </button>

          {result && (
            <div className="bg-black/20 p-4 rounded-xl border border-white/5">
              <h4 className="text-theme-main font-semibold mb-2">Engine Output:</h4>
              <p className="text-theme-muted text-sm whitespace-pre-wrap">{result}</p>
            </div>
          )}
        </div>
        
        {result && (
          <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end">
            <button 
              onClick={saveResult}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold flex items-center transition-all"
            >
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save to Database</>}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
