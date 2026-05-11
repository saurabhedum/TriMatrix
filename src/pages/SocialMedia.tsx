import React, { useState, useEffect } from 'react';
import { Share2, Clock, CheckCircle, Edit3, Trash2, Plus, X, Hash, Loader2, Activity, Sparkles, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { GoogleGenAI } from '@google/genai';
import { useLocalStorage } from '../hooks/useLocalStorage';

const MOCK_POSTS = [
  { id: 1, platform: 'Twitter', status: 'Published', content: 'Just launched our new AI marketing suite! 🚀 Check it out at trimatrix.ai', scheduledFor: new Date().toISOString(), engagement: { likes: 124, retweets: 45, comments: 12 } },
  { id: 2, platform: 'LinkedIn', status: 'Scheduled', content: 'How predictive analytics is changing the B2B landscape. Read our latest case study.', scheduledFor: new Date(Date.now() + 86400000).toISOString() },
  { id: 3, platform: 'Instagram', status: 'Draft', content: 'Behind the scenes at TriMatrix HQ. 📸', scheduledFor: null },
];

const PLATFORMS = [
  { id: 'social_twitter', name: 'X (Twitter)', connected: false, color: 'bg-sky-500', short: 'X' },
  { id: 'social_linkedin', name: 'LinkedIn', connected: false, color: 'bg-blue-600', short: 'in' },
  { id: 'social_youtube', name: 'YouTube', connected: false, color: 'bg-rose-600', short: 'YT' },
  { id: 'social_instagram', name: 'Instagram', connected: false, color: 'bg-pink-600', short: 'IG' },
  { id: 'social_facebook', name: 'Facebook', connected: false, color: 'bg-blue-500', short: 'FB' },
  { id: 'social_tiktok', name: 'TikTok', connected: false, color: 'bg-black', short: 'TT' },
  { id: 'social_pinterest', name: 'Pinterest', connected: false, color: 'bg-red-600', short: 'Pin' },
  { id: 'social_reddit', name: 'Reddit', connected: false, color: 'bg-orange-500', short: 'Rd' },
  { id: 'social_spotify', name: 'Spotify', connected: false, color: 'bg-green-500', short: 'Sp' },
  { id: 'social_wordpress', name: 'WordPress', connected: false, color: 'bg-blue-400', short: 'WP' },
];

export default function SocialMedia() {
  const { user, isAuthReady } = useAuth();
  const { activeProject } = useProjects();
  const [posts, setPosts] = useState<any[]>(MOCK_POSTS);
  const [hashtags, setHashtags] = useState(['MarketingAI', 'Automation', 'GrowthHacking', 'SEO']);
  const [newHashtag, setNewHashtag] = useState('');
  const [platforms, setPlatforms] = useState(PLATFORMS);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostPlatform, setNewPostPlatform] = useState('Twitter');
  const [newPostScheduledFor, setNewPostScheduledFor] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
  const [sentimentScore, setSentimentScore] = useState(85);
  const [sentimentLoading, setSentimentLoading] = useState(false);
  const [apiKeys, setApiKeys] = useLocalStorage('trimatrix_api_keys', []);
  const [connectModalPlatform, setConnectModalPlatform] = useState<any>(null);
  const [connectApiKey, setConnectApiKey] = useState('');

  // Update platforms based on stored keys
  useEffect(() => {
    setPlatforms(p => p.map(plat => {
      const isConnected = !!apiKeys.find((k: any) => k.id === `social_${plat.id}`);
      return { ...plat, connected: isConnected };
    }));
  }, [apiKeys]);

  // Use real data to analyze sentiment instead of simulation
  useEffect(() => {
    if (!user || posts.length === 0) return;
    const analyzeSentiment = async () => {
      setSentimentLoading(true);
      try {
        const groqKey = apiKeys.find((k: any) => k.id === 'groq')?.value || import.meta.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY;
        const { default: Groq } = await import('groq-sdk');
        const groq = new Groq({ apiKey: groqKey, dangerouslyAllowBrowser: true });
        
        const contentSample = posts.slice(0, 5).map(p => p.content).join(' | ');
        const prompt = `Analyze the sentiment of the following brand social media posts: "${contentSample}". Return ONLY a single integer from 0 to 100 where 100 is extremely positive, 50 is neutral, and 0 is extremely negative. No extra text.`;
        
        const response = await groq.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          model: 'llama-3.3-70b-versatile',
        });
        
        const score = parseInt(response.choices[0]?.message?.content?.trim() || '85', 10);
        if (!isNaN(score)) {
          setSentimentScore(Math.min(100, Math.max(0, score)));
        }
      } catch (e) {
        console.error('Sentiment Analysis Error:', e);
      } finally {
        setSentimentLoading(false);
      }
    };
    
    analyzeSentiment();
  }, [posts, user]);

  useEffect(() => {
    if (!isAuthReady || !user) {
      setPosts([]);
      return;
    }

    let unsubscribe = () => {};
    if (activeProject) {
        const q = query(
          collection(db, 'projects', activeProject.id, 'socialPosts'),
          where('uid', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(20)
        );

        unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedPosts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setPosts(fetchedPosts);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/socialPosts`);
        });
    } else {
        setPosts([]);
    }

    return () => unsubscribe();
  }, [user, isAuthReady, activeProject]);

  const addHashtag = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ((e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') || !newHashtag.trim()) return;
    
    const tag = newHashtag.trim().replace(/^#/, '');
    if (!hashtags.includes(tag)) {
      setHashtags([...hashtags, tag]);
    }
    setNewHashtag('');
  };

  const removeHashtag = (tagToRemove: string) => {
    setHashtags(hashtags.filter(tag => tag !== tagToRemove));
  };

  const toggleConnection = (id: string) => {
    const platform = platforms.find(p => p.id === id);
    if (!platform) return;
    
    if (platform.connected) {
      // Disconnect
      setApiKeys(apiKeys.filter((k: any) => k.id !== id));
    } else {
      // Open connect modal
      setConnectModalPlatform(platform);
      setConnectApiKey('');
    }
  };

  const handleConnectSave = () => {
    if (!connectModalPlatform || !connectApiKey.trim()) return;
    const newKeyList = [...apiKeys.filter((k:any) => k.id !== connectModalPlatform.id), {
      id: connectModalPlatform.id,
      name: `${connectModalPlatform.name} API Key`,
      value: connectApiKey,
      desc: `Used to publish to ${connectModalPlatform.name}`
    }];
    setApiKeys(newKeyList);
    setConnectModalPlatform(null);
    setConnectApiKey('');
  };

  const handleGenerateHashtags = async () => {
    if (!newPostContent.trim()) return;
    setIsGeneratingHashtags(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Generate 5 relevant, trending hashtags for this social media post. Return ONLY the hashtags separated by spaces, no other text. Post: "${newPostContent}"`,
      });
      
      if (response.text) {
        const generatedTags = response.text.split(' ').map(t => t.trim().replace(/^#/, '')).filter(t => t);
        setNewPostContent(prev => prev + '\n\n' + generatedTags.map(t => `#${t}`).join(' '));
      }
    } catch (error) {
      console.error('Failed to generate hashtags:', error);
    } finally {
      setIsGeneratingHashtags(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user) return;
    setIsCreating(true);
    try {
      const status = newPostScheduledFor ? 'Scheduled' : 'Published';
      
      let proxyResponse = null;
      if (status === 'Published') {
        // Attempt to execute user input through our proxy
        const platformObj = platforms.find(p => p.name === newPostPlatform);
        const apiKeyObj = apiKeys.find((k: any) => k.id === platformObj?.id);
        
        try {
          const res = await fetch('/api/social/publish', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platform: newPostPlatform,
              content: newPostContent,
              apiKey: apiKeyObj?.value
            })
          });
          const proxyData = await res.json();
          proxyResponse = proxyData;
        } catch (e) {
          console.error("Failed to execute proxy request:", e);
        }
      }

      if (activeProject) {
        await addDoc(collection(db, 'projects', activeProject.id, 'socialPosts'), {
          uid: user.uid,
          platform: newPostPlatform,
          content: newPostContent,
          status: status,
          scheduledFor: newPostScheduledFor ? new Date(newPostScheduledFor).toISOString() : null,
          engagement: { likes: 0, retweets: 0, comments: 0 },
          proxyResponse: proxyResponse ? JSON.stringify(proxyResponse) : null,
          createdAt: serverTimestamp()
        });
      }
      
      if (activeProject) {
        await addDoc(collection(db, 'projects', activeProject.id, 'activities'), {
          uid: user.uid,
          user: user.displayName || 'User',
          action: `created a new ${status.toLowerCase()} post for ${newPostPlatform}`,
          project: activeProject.name,
          time: 'Just now',
          createdAt: serverTimestamp()
        });
      }

      if (proxyResponse && proxyResponse.error) {
        alert(`Post saved to workspace, but backend execution returned: ${proxyResponse.error}`);
      } else if (proxyResponse && proxyResponse.simulated) {
        alert(proxyResponse.message);
      } else if (proxyResponse && proxyResponse.success) {
        alert(`Successfully published to ${newPostPlatform} via API!`);
      }

      setNewPostContent('');
      setNewPostScheduledFor('');
      setIsCreateModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `projects/${activeProject.id}/socialPosts`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">Social Media Automation</h1>
          <p className="text-theme-muted mt-1">Manage connected APIs and auto-posting schedules.</p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-lg shadow-theme-primary/20"
        >
          <Edit3 className="w-4 h-4 mr-2" />
          Create Post
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-3 space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glassy-neumorphic rounded-2xl p-6 border border-theme-primary/20 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-theme-main flex items-center mb-1">
                <Activity className="w-5 h-5 mr-2 text-theme-primary" />
                Cross-Channel Sentiment Sync
              </h3>
              <p className="text-sm text-theme-muted">Real-time unified sentiment across all connected platforms.</p>
            </div>
            <div className="flex items-center">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-white/10"
                    strokeWidth="3"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={`${sentimentScore >= 70 ? 'text-emerald-400' : sentimentScore >= 40 ? 'text-amber-400' : 'text-rose-400'} transition-all duration-1000 ease-out`}
                    strokeDasharray={`${sentimentScore}, 100`}
                    strokeWidth="3"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute text-lg font-bold text-theme-main">{sentimentScore}</span>
              </div>
              <div className="ml-4">
                <p className={`text-sm font-medium ${sentimentScore >= 70 ? 'text-emerald-400' : sentimentScore >= 40 ? 'text-amber-400' : 'text-rose-400'}`}>
                  {sentimentScore >= 70 ? 'Positive' : sentimentScore >= 40 ? 'Neutral' : 'Negative'}
                </p>
                <p className="text-xs text-theme-muted">Updated just now</p>
              </div>
            </div>
          </motion.div>

          <div className="glassy-neumorphic rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h3 className="text-lg font-semibold text-theme-main flex items-center">
                <Share2 className="w-5 h-5 mr-2 text-theme-primary" />
                Content Pipeline
              </h3>
              <div className="flex space-x-2">
                <button className="px-3 py-1.5 text-xs font-medium bg-theme-primary/20 text-theme-primary rounded-lg transition-colors">All</button>
                <button className="px-3 py-1.5 text-xs font-medium bg-white/5 text-theme-muted hover:bg-white/10 rounded-lg transition-colors">Scheduled</button>
                <button className="px-3 py-1.5 text-xs font-medium bg-white/5 text-theme-muted hover:bg-white/10 rounded-lg transition-colors">Drafts</button>
              </div>
            </div>
            
            {posts.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center border-t border-white/5">
                <MessageSquare className="w-12 h-12 text-theme-muted mb-4 opacity-50" />
                <h4 className="text-lg font-medium text-theme-main">No posts yet</h4>
                <p className="text-theme-muted max-w-sm mt-2 mb-6">Create your first social media post or AI-generated campaign to start tracking engagement and analyzing real sentiment.</p>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-theme-primary/20 text-theme-primary hover:bg-theme-primary/30 px-6 py-2 rounded-xl transition-colors font-medium border border-theme-primary/30"
                >
                  Create First Post
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {posts.map((post) => (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={post.id} 
                    className="p-6 hover:bg-white/5 transition-colors group relative"
                  >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-theme-primary/20 text-theme-primary border border-theme-primary/30`}>
                        <span className="font-bold text-sm">{post.platform[0]}</span>
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-theme-main">{post.platform}</span>
                          <span className="text-theme-muted">•</span>
                          {post.status === 'Published' ? (
                            <span className="inline-flex items-center text-xs text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                              <CheckCircle className="w-3 h-3 mr-1" /> Published
                            </span>
                          ) : post.status === 'Scheduled' ? (
                            <span className="inline-flex items-center text-xs text-theme-primary bg-theme-primary/10 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3 mr-1" /> {post.scheduledFor ? format(new Date(post.scheduledFor), 'MMM d, h:mm a') : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="text-theme-muted text-sm leading-relaxed">{post.content}</p>
                        
                        {post.engagement && typeof post.engagement === 'string' ? (
                          <div className="mt-4 flex space-x-4 text-xs text-theme-muted bg-black/20 inline-flex px-3 py-1.5 rounded-lg border border-white/5">
                            <span><strong className="text-theme-main">{JSON.parse(post.engagement).likes || 0}</strong> Likes</span>
                            <span><strong className="text-theme-main">{JSON.parse(post.engagement).retweets || 0}</strong> Shares</span>
                            <span><strong className="text-theme-main">{JSON.parse(post.engagement).comments || 0}</strong> Comments</span>
                          </div>
                        ) : post.engagement && typeof post.engagement === 'object' ? (
                          <div className="mt-4 flex space-x-4 text-xs text-theme-muted bg-black/20 inline-flex px-3 py-1.5 rounded-lg border border-white/5">
                            <span><strong className="text-theme-main">{post.engagement.likes || 0}</strong> Likes</span>
                            <span><strong className="text-theme-main">{post.engagement.retweets || 0}</strong> Shares</span>
                            <span><strong className="text-theme-main">{post.engagement.comments || 0}</strong> Comments</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity absolute top-6 right-6">
                      <button className="p-2 text-theme-muted hover:text-theme-main hover:bg-white/10 rounded-lg transition-colors">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-theme-muted hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-4">Hashtag Optimizer</h3>
            <div className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Hash className="w-4 h-4 text-theme-muted absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input 
                  type="text" 
                  value={newHashtag}
                  onChange={(e) => setNewHashtag(e.target.value)}
                  onKeyDown={addHashtag}
                  placeholder="Add hashtag..."
                  className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-theme-main focus:outline-none focus:border-theme-primary transition-colors"
                />
              </div>
              <button 
                onClick={addHashtag}
                className="bg-theme-primary hover:bg-theme-primary-hover text-white p-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
              {hashtags.map(tag => (
                <span key={tag} className="group flex items-center px-2.5 py-1 bg-white/5 hover:bg-white/10 text-theme-muted hover:text-theme-main text-xs rounded-lg border border-white/10 transition-colors">
                  #{tag}
                  <button 
                    onClick={() => removeHashtag(tag)}
                    className="ml-1.5 text-theme-muted hover:text-rose-400 opacity-50 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6 flex flex-col h-[400px]">
            <h3 className="text-lg font-semibold text-theme-main mb-4">Connected Accounts</h3>
            <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scrollbar">
              {platforms.map(platform => (
                <div key={platform.id} className={`flex items-center justify-between p-3 rounded-xl border transition-colors ${platform.connected ? 'bg-black/20 border-white/10' : 'bg-black/10 border-white/5 opacity-60'}`}>
                  <div className="flex items-center">
                    <div className={`w-8 h-8 rounded-lg ${platform.color} flex items-center justify-center text-white font-bold text-xs mr-3 shadow-md`}>
                      {platform.short}
                    </div>
                    <span className="text-sm font-medium text-theme-main">{platform.name}</span>
                  </div>
                  {platform.connected ? (
                    <button onClick={() => toggleConnection(platform.id)} className="text-xs text-rose-400 hover:text-rose-300 px-2 py-1 rounded-md hover:bg-rose-400/10 transition-colors">Disconnect</button>
                  ) : (
                    <button onClick={() => toggleConnection(platform.id)} className="text-xs text-theme-primary hover:text-theme-primary-hover px-2 py-1 rounded-md hover:bg-theme-primary/10 transition-colors">Connect</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {isCreateModalOpen && (
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
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h2 className="text-xl font-bold text-theme-main flex items-center">
                  <Edit3 className="w-5 h-5 mr-2 text-theme-primary" />
                  Create New Post
                </h2>
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-theme-muted hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-2">Platform</label>
                  <select 
                    value={newPostPlatform}
                    onChange={(e) => setNewPostPlatform(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                  >
                    {PLATFORMS.filter(p => p.connected).map(p => (
                      <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-theme-main">Content</label>
                    <button 
                      onClick={handleGenerateHashtags}
                      disabled={isGeneratingHashtags || !newPostContent.trim()}
                      className="text-xs flex items-center text-theme-primary hover:text-theme-primary-hover disabled:opacity-50 transition-colors"
                    >
                      {isGeneratingHashtags ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                      AI Hashtags
                    </button>
                  </div>
                  <textarea 
                    value={newPostContent}
                    onChange={(e) => setNewPostContent(e.target.value)}
                    rows={4}
                    placeholder="What do you want to share?"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all resize-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-2">Schedule For (Optional)</label>
                  <input 
                    type="datetime-local" 
                    value={newPostScheduledFor}
                    onChange={(e) => setNewPostScheduledFor(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all [color-scheme:dark]"
                  />
                  <p className="text-xs text-theme-muted mt-2">Leave blank to publish immediately.</p>
                </div>
              </div>
              
              <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end space-x-4">
                <button 
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-medium text-theme-muted hover:text-theme-main hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreatePost}
                  disabled={isCreating || !newPostContent.trim()}
                  className="bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-lg shadow-theme-primary/20"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    newPostScheduledFor ? 'Schedule Post' : 'Publish Now'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {connectModalPlatform && (
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
              className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h2 className="text-xl font-bold text-theme-main flex items-center">
                  Connect {connectModalPlatform.name}
                </h2>
                <button 
                  onClick={() => setConnectModalPlatform(null)}
                  className="text-theme-muted hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-theme-muted">
                  To publish campaigns and posts directly to {connectModalPlatform.name}, please provide your API Bearer Token or Access Key.
                </p>
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-2">API Key / Token</label>
                  <input
                    type="password"
                    value={connectApiKey}
                    onChange={(e) => setConnectApiKey(e.target.value)}
                    placeholder="Enter your API token..."
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setConnectModalPlatform(null)}
                    className="flex-1 px-4 py-3 border border-white/10 text-theme-main rounded-xl hover:bg-white/5 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleConnectSave}
                    disabled={!connectApiKey.trim()}
                    className="flex-1 bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 text-white px-4 py-3 rounded-xl font-medium transition-colors shadow-lg shadow-theme-primary/20"
                  >
                    Connect Account
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
