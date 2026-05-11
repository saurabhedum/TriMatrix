import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Search, PenTool, Share2, BarChart3, Zap, Target, Users, Mail, Globe, TrendingUp, DollarSign, Network, X, Cpu, Database, Activity, ShieldCheck } from 'lucide-react';

const initialNodes = [
  // Core
  { id: 'core', type: 'input', data: { label: <div className="font-bold text-lg flex items-center justify-center"><Bot className="mr-2 text-theme-primary" /> TriMatrix Core</div> }, position: { x: 500, y: 50 }, className: 'bg-black/80 border-2 border-theme-primary text-white rounded-xl shadow-[0_0_30px_rgba(var(--primary-rgb),0.5)] p-4 w-64 text-center' },
  
  // Services
  { id: 'seo', data: { label: <div className="font-semibold flex items-center"><Search className="w-4 h-4 mr-2 text-emerald-400" /> SEO Engine</div> }, position: { x: 100, y: 200 }, className: 'bg-slate-900 border border-emerald-500/50 text-white rounded-lg p-3 w-48' },
  { id: 'content', data: { label: <div className="font-semibold flex items-center"><PenTool className="w-4 h-4 mr-2 text-purple-400" /> Content Gen</div> }, position: { x: 350, y: 200 }, className: 'bg-slate-900 border border-purple-500/50 text-white rounded-lg p-3 w-48' },
  { id: 'social', data: { label: <div className="font-semibold flex items-center"><Share2 className="w-4 h-4 mr-2 text-blue-400" /> Social Media</div> }, position: { x: 650, y: 200 }, className: 'bg-slate-900 border border-blue-500/50 text-white rounded-lg p-3 w-48' },
  { id: 'ads', data: { label: <div className="font-semibold flex items-center"><Target className="w-4 h-4 mr-2 text-rose-400" /> Paid Ads</div> }, position: { x: 900, y: 200 }, className: 'bg-slate-900 border border-rose-500/50 text-white rounded-lg p-3 w-48' },

  // Microservices - SEO
  { id: 'seo-1', data: { label: 'Keyword Research' }, position: { x: 0, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },
  { id: 'seo-2', data: { label: 'On-Page Opt.' }, position: { x: 150, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },
  
  // Nano - SEO
  { id: 'seo-1-1', data: { label: 'Search Volume' }, position: { x: -50, y: 450 }, className: 'bg-black/30 border border-white/5 text-gray-400 rounded p-1.5 w-32 text-xs' },
  { id: 'seo-1-2', data: { label: 'Keyword Difficulty' }, position: { x: 50, y: 450 }, className: 'bg-black/30 border border-white/5 text-gray-400 rounded p-1.5 w-32 text-xs' },
  
  // Microservices - Content
  { id: 'content-1', data: { label: 'Blog Articles' }, position: { x: 300, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },
  { id: 'content-2', data: { label: 'Email Copy' }, position: { x: 450, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },

  // Nano - Content
  { id: 'content-1-1', data: { label: 'SEO Outlines' }, position: { x: 250, y: 450 }, className: 'bg-black/30 border border-white/5 text-gray-400 rounded p-1.5 w-32 text-xs' },
  { id: 'content-1-2', data: { label: 'Auto-Publishing' }, position: { x: 350, y: 450 }, className: 'bg-black/30 border border-white/5 text-gray-400 rounded p-1.5 w-32 text-xs' },

  // Microservices - Social
  { id: 'social-1', data: { label: 'Platform Mgmt' }, position: { x: 600, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },
  { id: 'social-2', data: { label: 'Community' }, position: { x: 750, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },

  // Microservices - Ads
  { id: 'ads-1', data: { label: 'Campaign Creation' }, position: { x: 880, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },
  { id: 'ads-2', data: { label: 'Budget Optimization' }, position: { x: 1030, y: 350 }, className: 'bg-black/50 border border-white/10 text-gray-300 rounded p-2 w-40 text-sm' },
];

const initialEdges = [
  { id: 'e-core-seo', source: 'core', target: 'seo', animated: true, style: { stroke: '#10b981', strokeWidth: 2 } },
  { id: 'e-core-content', source: 'core', target: 'content', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
  { id: 'e-core-social', source: 'core', target: 'social', animated: true, style: { stroke: '#3b82f6', strokeWidth: 2 } },
  { id: 'e-core-ads', source: 'core', target: 'ads', animated: true, style: { stroke: '#fb7185', strokeWidth: 2 } },

  { id: 'e-seo-1', source: 'seo', target: 'seo-1', style: { stroke: '#ffffff40' } },
  { id: 'e-seo-2', source: 'seo', target: 'seo-2', style: { stroke: '#ffffff40' } },
  { id: 'e-seo-1-1', source: 'seo-1', target: 'seo-1-1', style: { stroke: '#ffffff20' } },
  { id: 'e-seo-1-2', source: 'seo-1', target: 'seo-1-2', style: { stroke: '#ffffff20' } },

  { id: 'e-content-1', source: 'content', target: 'content-1', style: { stroke: '#ffffff40' } },
  { id: 'e-content-2', source: 'content', target: 'content-2', style: { stroke: '#ffffff40' } },
  { id: 'e-content-1-1', source: 'content-1', target: 'content-1-1', style: { stroke: '#ffffff20' } },
  { id: 'e-content-1-2', source: 'content-1', target: 'content-1-2', style: { stroke: '#ffffff20' } },

  { id: 'e-social-1', source: 'social', target: 'social-1', style: { stroke: '#ffffff40' } },
  { id: 'e-social-2', source: 'social', target: 'social-2', style: { stroke: '#ffffff40' } },

  { id: 'e-ads-1', source: 'ads', target: 'ads-1', style: { stroke: '#ffffff40' } },
  { id: 'e-ads-2', source: 'ads', target: 'ads-2', style: { stroke: '#ffffff40' } },
];

function HeroMindMap() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full h-full absolute inset-0 z-0 opacity-40 mix-blend-screen pointer-events-none">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        colorMode="dark"
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        panOnScroll={false}
        preventScrolling={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="#ffffff20" />
      </ReactFlow>
    </div>
  );
}

export default function Hero() {
  const navigate = useNavigate();
  const [showArchitecture, setShowArchitecture] = useState(false);

  return (
    <div className="h-screen relative bg-theme-base overflow-hidden flex items-center justify-center">
      
      <ReactFlowProvider>
        <HeroMindMap />
      </ReactFlowProvider>

      <div className="relative z-20 text-center px-4 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h1 className="text-6xl md:text-8xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-theme-primary via-white to-theme-primary mb-6 tracking-tighter">
            TriMatrix
          </h1>
          <p className="text-xl md:text-3xl text-theme-muted font-light mb-8 leading-relaxed">
            The Ultimate Autonomous Digital Marketing Suite.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-12">
            <button 
              onClick={() => navigate('/onboarding')}
              className="px-8 py-4 bg-theme-primary text-white rounded-full font-bold text-lg hover:bg-theme-primary-hover transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)] hover:shadow-[0_0_30px_rgba(var(--primary-rgb),0.6)] hover:-translate-y-1"
            >
              Initialize System
            </button>
            <button 
              onClick={() => setShowArchitecture(true)}
              className="px-8 py-4 bg-white/5 border border-white/10 text-white rounded-full font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-sm"
            >
              View Architecture
            </button>
          </div>
        </motion.div>
      </div>

      {/* Gradient Overlays for depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-theme-base via-transparent to-theme-base z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-r from-theme-base via-transparent to-theme-base z-10 pointer-events-none" />

      {/* Architecture Modal */}
      <AnimatePresence>
        {showArchitecture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-2xl p-4 sm:p-6 lg:p-8"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
              className="relative w-full max-w-7xl h-[90vh] sm:h-[85vh] rounded-[2rem] border border-white/10 bg-[#050f1e]/80 shadow-[0_0_100px_rgba(0,212,255,0.1)] overflow-hidden flex flex-col backdrop-blur-3xl"
            >
              {/* Background Orbs & Effects */}
              <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-500/20 blur-[120px] pointer-events-none" />
              <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAyKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-50 pointer-events-none" />

              {/* Modal Header */}
              <div className="flex-none p-6 md:px-10 md:pt-10 border-b border-white/5 relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="flex flex-wrap items-center gap-4 text-[0.65rem] sm:text-xs font-mono tracking-widest text-cyan-400/80 uppercase mb-3">
                    <span className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"/> TM-ARCH-01</span>
                    <span className="hidden sm:inline text-white/20">|</span>
                    <span>Marketing Automation Engine</span>
                    <span className="hidden sm:inline text-white/20">|</span>
                    <span>System Transparency Active</span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
                    TriMatrix Architecture
                  </h2>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-slate-300">
                    <Database className="w-4 h-4 text-emerald-400" />
                    Live Data Flow
                  </div>
                  <button 
                    onClick={() => setShowArchitecture(false)} 
                    className="p-3 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-full transition-all group"
                  >
                    <X className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable content area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-10 relative z-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto h-full">
                  
                  {/* Left Column: Core Engine */}
                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex-1 rounded-3xl p-8 bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20 backdrop-blur-sm relative overflow-hidden flex flex-col justify-center min-h-[300px]"
                    >
                      <div className="absolute top-0 right-0 p-6 opacity-20">
                        <Cpu className="w-32 h-32 text-indigo-400" />
                      </div>
                      <div className="relative z-10">
                        <div className="inline-flex px-3 py-1 mb-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-wider uppercase">
                          Llama-3 LLM Core
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-4">Cognitive AI Engine</h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-8 max-w-md">
                          Powered by the ultra-fast Groq framework and customized via your exact business profile constraints. This centralized intelligence hub processes millions of parameters to dictate cross-channel strategy, write highly converting copy, and execute workflows without manual oversight.
                        </p>
                        
                        <div className="flex gap-4 border-t border-white/10 pt-6 mt-auto">
                          <div>
                            <div className="text-2xl font-bold text-white mb-1">&lt;1s</div>
                            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Inference latency</div>
                          </div>
                          <div className="w-px bg-white/10" />
                          <div>
                            <div className="text-2xl font-bold text-white mb-1">100%</div>
                            <div className="text-xs text-slate-400 font-mono uppercase tracking-wider">Automated Workflows</div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="rounded-3xl p-6 bg-[#091525]/80 border border-white/5 backdrop-blur-sm hover:border-cyan-500/30 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-cyan-500/10 rounded-2xl shrink-0">
                          <Network className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-white mb-2">Integrated Connectors</h4>
                          <p className="text-sm text-slate-400 leading-relaxed mb-4">
                            Seamless bi-directional syncing with Google Analytics, X (Twitter), LinkedIn, and Meta Ads to ground AI decisions in empirical conversion reality.
                          </p>
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-slate-300">OAuth 2.0</span>
                            <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-slate-300">Live Webhooks</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {/* Right Column: Execution Modules */}
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="rounded-3xl p-6 bg-[#091525]/80 border border-white/5 backdrop-blur-sm hover:border-emerald-500/30 transition-colors flex flex-col"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                              <Search className="w-5 h-5 text-emerald-400" />
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 px-2 py-1 rounded bg-emerald-500/10">Active Module</span>
                          </div>
                          <h4 className="text-white font-bold mb-2">SEO Dominance</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Continuous site crawls, semantic keyword mapping, and competitor gap analysis. Automatically restructures content to win featured snippets.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="rounded-3xl p-6 bg-[#091525]/80 border border-white/5 backdrop-blur-sm hover:border-purple-500/30 transition-colors flex flex-col"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-purple-500/10 rounded-xl">
                              <PenTool className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className="text-[10px] font-mono text-purple-400 px-2 py-1 rounded bg-purple-500/10">Active Module</span>
                          </div>
                          <h4 className="text-white font-bold mb-2">Content Orchestration</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Adaptive generation of long-form articles, ad copy variations, and multi-thread tweets, all explicitly tuned to your unique Brand Voice Profile.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="rounded-3xl p-6 bg-[#091525]/80 border border-white/5 backdrop-blur-sm hover:border-amber-500/30 transition-colors flex flex-col"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-amber-500/10 rounded-xl">
                              <TrendingUp className="w-5 h-5 text-amber-400" />
                            </div>
                            <span className="text-[10px] font-mono text-amber-400 px-2 py-1 rounded bg-amber-500/10">Continuous</span>
                          </div>
                          <h4 className="text-white font-bold mb-2">Predictive Analytics</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Ingests GA4 and Meta metrics to forecast ROAS and engagement trends. Reallocates multi-channel budgets dynamically instantly halting bad campaigns.
                          </p>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="rounded-3xl p-6 bg-[#091525]/80 border border-white/5 backdrop-blur-sm hover:border-rose-500/30 transition-colors flex flex-col"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-4">
                            <div className="p-2 bg-rose-500/10 rounded-xl">
                              <Activity className="w-5 h-5 text-rose-400" />
                            </div>
                            <span className="text-[10px] font-mono text-rose-400 px-2 py-1 rounded bg-rose-500/10">Real-Time</span>
                          </div>
                          <h4 className="text-white font-bold mb-2">Sentiment Pivoting</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">
                            Watches live social feeds and customer feedback. Upon detecting negative friction, the engine immediately pauses broad campaigns and drafts mitigation messaging.
                          </p>
                        </div>
                      </motion.div>

                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
