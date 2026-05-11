import React, { useState } from 'react';
import { Sparkles, Wand2, Zap, Target, TrendingUp, Layers, FileText, Search, Mail, Calendar, Mic, Video, Tag, BarChart3, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MagicToolModal from '../components/MagicToolModal';

export default function Magic() {
  const [selectedTool, setSelectedTool] = useState<any>(null);

  const tools = [
    { title: "Auto-Viral Predictor", desc: "Analyzes trends and predicts virality score.", icon: TrendingUp, color: "text-rose-400", bg: "bg-rose-400/10" },
    { title: "Competitor X-Ray", desc: "Deep-scans competitor domains for insights.", icon: Target, color: "text-blue-400", bg: "bg-blue-400/10" },
    { title: "Instant Landing Page", desc: "Generates landing page code from prompt.", icon: Layers, color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { title: "Sentiment Alchemist", desc: "Drafts empathetic responses to feedback.", icon: Wand2, color: "text-purple-400", bg: "bg-purple-400/10" },
    { title: "Ad Copy Generator", desc: "Creates high-converting ad copy.", icon: MessageSquare, color: "text-amber-400", bg: "bg-amber-400/10" },
    { title: "SEO Keyword Research", desc: "Finds high-volume, low-difficulty keywords.", icon: Search, color: "text-sky-400", bg: "bg-sky-400/10" },
    { title: "Email Subject Optimizer", desc: "Boosts open rates with catchy subjects.", icon: Mail, color: "text-rose-500", bg: "bg-rose-500/10" },
    { title: "Social Media Calendar", desc: "Generates a 30-day content calendar.", icon: Calendar, color: "text-indigo-400", bg: "bg-indigo-400/10" },
    { title: "Brand Voice Analyzer", desc: "Ensures consistency across all content.", icon: Sparkles, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Customer Persona Builder", desc: "Creates detailed customer personas.", icon: User, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Blog Outline Generator", desc: "Structures comprehensive blog posts.", icon: FileText, color: "text-slate-400", bg: "bg-slate-400/10" },
    { title: "Video Script Generator", desc: "Writes engaging video scripts.", icon: Video, color: "text-rose-600", bg: "bg-rose-600/10" },
    { title: "Meta Tag Generator", desc: "Optimizes meta tags for SEO.", icon: Tag, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Content Gap Analyzer", desc: "Identifies missing content opportunities.", icon: BarChart3, color: "text-sky-500", bg: "bg-sky-500/10" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-theme-main flex items-center">
            <Sparkles className="w-8 h-8 mr-3 text-theme-primary" />
            Magic Tools
          </h1>
          <p className="text-theme-muted mt-2">State-of-the-art experimental features to dazzle your workflow.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glassy-neumorphic rounded-2xl p-6 hover:scale-[1.02] transition-transform cursor-pointer relative overflow-hidden group"
            onClick={() => setSelectedTool(tool)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10">
              <div className={`w-12 h-12 rounded-xl ${tool.bg} flex items-center justify-center mb-4`}>
                <tool.icon className={`w-6 h-6 ${tool.color}`} />
              </div>
              <h3 className="text-xl font-bold text-theme-main mb-2">{tool.title}</h3>
              <p className="text-theme-muted text-sm leading-relaxed mb-6">{tool.desc}</p>
              <button className="flex items-center text-sm font-medium text-theme-primary hover:text-theme-primary-hover transition-colors">
                <Zap className="w-4 h-4 mr-2" />
                Initialize Tool
              </button>
            </div>
          </motion.div>
        ))}
      </div>
      
      <AnimatePresence>
        {selectedTool && (
          <MagicToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
