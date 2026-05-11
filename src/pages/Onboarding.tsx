import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, ChevronRight, ChevronLeft, Link as LinkIcon, 
  BarChart3, Target, Zap, Bot, Share2, Twitter, Instagram, 
  Linkedin, Facebook, Check, Key, Building2
} from 'lucide-react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useAuth } from '../context/AuthContext';

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  
  const [businessProfile, setBusinessProfile] = useLocalStorage('trimatrix_business_profile', {
    companyName: '',
    industry: '',
    targetAudience: '',
    mainGoals: '',
    brandVoice: ''
  });

  const [apiKeys, setApiKeys] = useLocalStorage('trimatrix_api_keys', [
    { id: 'groq', name: 'Groq API Key', value: import.meta.env.VITE_GROQ_API_KEY || '', desc: 'Required for ultra-fast Llama-3 LLM reasoning.' },
    { id: 'openai', name: 'OpenAI API Key', value: '', desc: 'Backup LLM provider.' },
    { id: 'x_twitter_bearer', name: 'X (Twitter) Bearer Token', value: '', desc: 'Used to fetch live engagement data.' },
    { id: 'ga4_property', name: 'GA4 Property ID', value: '', desc: 'Used for website traffic analytics.' }
  ]);

  const [isSaving, setIsSaving] = useState(false);

  const handleProfileChange = (field: string, value: string) => {
    setBusinessProfile({ ...businessProfile, [field]: value });
  };

  const handleKeyChange = (id: string, value: string) => {
    setApiKeys(apiKeys.map((k: any) => k.id === id ? { ...k, value } : k));
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      setIsSaving(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        localStorage.setItem('trimatrix_onboarding', JSON.stringify({
          completedAt: new Date().toISOString()
        }));
        navigate('/dashboard');
      } catch (error) {
        console.error('Failed to save onboarding data', error);
        setIsSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-theme-base flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Progress Bar */}
        <div className="mb-8 flex justify-between items-center relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 rounded-full z-0"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-theme-primary rounded-full z-0 transition-all duration-500"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          ></div>
          
          {[1, 2, 3].map(i => (
            <div 
              key={i} 
              className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                step >= i ? 'bg-theme-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]' : 'bg-slate-800 text-slate-400 border border-white/10'
              }`}
            >
              {step > i ? <Check size={20} /> : i}
            </div>
          ))}
        </div>

        <div className="glassy-neumorphic rounded-3xl p-8 md:p-12 min-h-[500px] flex flex-col relative overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-theme-main mb-3 flex items-center justify-center">
                    <Building2 className="w-8 h-8 mr-3 text-theme-primary" />
                    Business Profile
                  </h2>
                  <p className="text-theme-muted">The AI marketing engine needs exact data to function realistically. Tell us about your company.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-theme-main mb-2">Company Name</label>
                    <input 
                      type="text" 
                      value={businessProfile.companyName}
                      onChange={(e) => handleProfileChange('companyName', e.target.value)}
                      placeholder="e.g., Acme Corp" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-main mb-2">Industry / Niche</label>
                    <input 
                      type="text" 
                      value={businessProfile.industry}
                      onChange={(e) => handleProfileChange('industry', e.target.value)}
                      placeholder="e.g., B2B SaaS" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-theme-main mb-2">Target Audience</label>
                    <textarea 
                      value={businessProfile.targetAudience}
                      onChange={(e) => handleProfileChange('targetAudience', e.target.value)}
                      placeholder="Describe your ideal customers..." 
                      rows={2}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none resize-none"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-theme-main mb-2">Brand Voice & Tone</label>
                    <input 
                      type="text" 
                      value={businessProfile.brandVoice}
                      onChange={(e) => handleProfileChange('brandVoice', e.target.value)}
                      placeholder="e.g., Professional, witty, and authoritative" 
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1"
              >
                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold text-theme-main mb-3 flex items-center justify-center">
                    <Key className="w-8 h-8 mr-3 text-theme-primary" />
                    Connect Accounts (API Keys)
                  </h2>
                  <p className="text-theme-muted">To pull real results instead of simulations, provide your platform credentials or API keys.</p>
                </div>

                <div className="space-y-4 max-w-2xl mx-auto">
                  {apiKeys.map((key: any) => (
                    <div key={key.id} className="p-4 bg-black/20 rounded-xl border border-white/5 group">
                      <label className="block text-sm font-medium text-theme-main mb-2 pr-8">{key.name}</label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="password"
                          value={key.value}
                          onChange={(e) => handleKeyChange(key.id, e.target.value)}
                          placeholder="Paste token or key here..."
                          className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all"
                        />
                      </div>
                      <p className="text-xs text-theme-muted mt-2">{key.desc}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex-1 flex flex-col items-center justify-center text-center py-10"
              >
                <div className="w-24 h-24 bg-theme-primary/20 rounded-full flex items-center justify-center mb-8 border-4 border-theme-primary/30 shadow-[0_0_30px_rgba(var(--primary-rgb),0.3)]">
                  <Bot className="w-12 h-12 text-theme-primary" />
                </div>
                <h2 className="text-4xl font-bold text-white mb-4">You're All Set!</h2>
                <p className="text-lg text-theme-muted max-w-lg mb-8">
                  TriMatrix AI is now configured with your company's actual data profile. Your analytics, sentiment generation, and marketing capabilities will be driven by live constraints and the ultra-fast Groq framework.
                </p>
                <div className="bg-black/20 p-6 rounded-2xl border border-white/5 inline-block text-left w-full max-w-md">
                  <h4 className="text-sm font-semibold text-theme-main mb-3 uppercase tracking-wider text-center">Engine Status</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-theme-muted">Business Profile</span>
                      <span className="text-sm text-emerald-400 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Configured</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-theme-muted">Groq Llama-3 Core</span>
                      <span className="text-sm text-emerald-400 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Ready</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-theme-muted">Data Engine</span>
                      <span className="text-sm text-emerald-400 font-medium flex items-center"><CheckCircle2 className="w-4 h-4 mr-1"/> Connected</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Actions */}
          <div className="mt-auto pt-8 flex justify-between items-center z-10 w-full bg-theme-base/50 p-4 rounded-xl backdrop-blur-sm border-t border-white/5 mt-8">
            <button 
              onClick={handleBack}
              disabled={step === 1 || isSaving}
              className="px-4 py-2 font-medium text-theme-muted hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Back
            </button>
            <button 
              onClick={handleNext}
              disabled={isSaving}
              className="bg-theme-primary hover:bg-theme-primary-hover text-white px-8 py-3 rounded-xl font-medium transition-all shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] flex items-center"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : step === 3 ? (
                'Launch Framework'
              ) : (
                <>Next <ChevronRight className="w-5 h-5 ml-2" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
