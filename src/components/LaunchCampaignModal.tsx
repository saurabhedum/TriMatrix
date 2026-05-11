import React, { useState } from 'react';
import { X, Rocket, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';

const CHANNELS = [
  'Google Ads', 'Meta Ads', 'LinkedIn Ads', 'Twitter Ads', 
  'TikTok Ads', 'Pinterest Ads', 'Snapchat Ads', 'Reddit Ads', 
  'Quora Ads', 'Amazon Ads', 'Microsoft Ads', 'Apple Search Ads'
];

interface LaunchCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LaunchCampaignModal({ isOpen, onClose, onSuccess }: LaunchCampaignModalProps) {
  const { user } = useAuth();
  const { activeProject } = useProjects();
  const [name, setName] = useState('');
  const [budget, setBudget] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const toggleChannel = (channel: string) => {
    setSelectedChannels(prev => 
      prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
    );
  };

  const handleLaunch = async () => {
    if (!name.trim() || !budget || selectedChannels.length === 0) {
      setErrorMsg('Please fill in all fields and select at least one channel.');
      setStatus('error');
      return;
    }

    if (!user) {
      setErrorMsg('You must be logged in to launch a campaign.');
      setStatus('error');
      return;
    }

    setStatus('deploying');
    setErrorMsg('');

    try {
      // Simulate API deployment delay for realism
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Save to Firestore 'projects' collection
      await addDoc(collection(db, 'projects'), {
        uid: user.uid,
        name,
        budget: Number(budget),
        channels: selectedChannels,
        status: 'Active',
        progress: 0,
        createdAt: serverTimestamp(),
        type: 'Campaign'
      });

      // Add to activities feed
      if (activeProject) {
        await addDoc(collection(db, 'projects', activeProject.id, 'activities'), {
          uid: user.uid,
          user: user.displayName || 'User',
          action: `launched campaign on ${selectedChannels.length} channels`,
          project: name,
          time: 'Just now',
          createdAt: serverTimestamp()
        });
      }

      setStatus('success');
      setTimeout(() => {
        onSuccess();
        onClose();
        // Reset state
        setName('');
        setBudget('');
        setSelectedChannels([]);
        setStatus('idle');
      }, 2000);
    } catch (error) {
      console.error("Error launching campaign:", error);
      setStatus('error');
      setErrorMsg('Failed to deploy campaign. Please try again.');
      // We don't throw here to keep the modal open and show the error
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
            <h2 className="text-xl font-bold text-white flex items-center">
              <Rocket className="w-5 h-5 mr-2 text-theme-primary" />
              Launch New Campaign
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
            {status === 'error' && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-start">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{errorMsg}</p>
              </div>
            )}

            {status === 'success' ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <CheckCircle2 className="w-20 h-20 text-emerald-500 mb-6" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white mb-2">Campaign Deployed!</h3>
                <p className="text-slate-400">Your campaign is now live across {selectedChannels.length} channels.</p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Campaign Name</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Q3 Product Launch"
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-theme-primary outline-none"
                    disabled={status === 'deploying'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Total Budget (USD)</label>
                  <input 
                    type="number" 
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="e.g., 5000"
                    className="w-full bg-black/30 border border-white/10 rounded-xl p-3 text-white focus:ring-2 focus:ring-theme-primary outline-none"
                    disabled={status === 'deploying'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Select Channels ({selectedChannels.length}/12)</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {CHANNELS.map(channel => (
                      <button
                        key={channel}
                        onClick={() => toggleChannel(channel)}
                        disabled={status === 'deploying'}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all text-left ${
                          selectedChannels.includes(channel) 
                            ? 'bg-theme-primary/20 border-theme-primary text-theme-primary' 
                            : 'bg-black/20 border-white/5 text-slate-400 hover:border-white/20'
                        }`}
                      >
                        {channel}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {status !== 'success' && (
            <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end gap-3">
              <button 
                onClick={onClose}
                disabled={status === 'deploying'}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleLaunch}
                disabled={status === 'deploying'}
                className="bg-theme-primary hover:bg-theme-primary-hover text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center disabled:opacity-50"
              >
                {status === 'deploying' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  <>
                    <Rocket className="w-4 h-4 mr-2" />
                    Launch Campaign
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
