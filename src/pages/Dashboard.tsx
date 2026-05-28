import { useState, useEffect } from 'react';
import { useProjects } from '../context/ProjectContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import { 
  ArrowUpRight, Users, MousePointerClick, TrendingUp, 
  Briefcase, CheckCircle2, Clock, AlertCircle, Plus,
  MoreVertical, Calendar, Target, Zap, Building2, ArrowRight,
  Activity, BarChart3, Trash2, X, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';

export default function Dashboard() {
  const [timeframe, setTimeframe] = useState('7d');
  const { user, isAuthReady } = useAuth();
  const { activeProject, setActiveProject } = useProjects();
  const [activeProjects, setActiveProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [trafficData, setTrafficData] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [businessProfile] = useLocalStorage('trimatrix_business_profile', {
    companyName: '',
    industry: '',
    targetAudience: '',
    mainGoals: '',
    brandVoice: ''
  });

  const [apiKeys] = useLocalStorage('trimatrix_api_keys', []);
  const geminiKey = apiKeys.find((k: any) => k.id === 'gemini')?.value || process.env.GEMINI_API_KEY;

  const [onboardingData] = useLocalStorage('trimatrix_onboarding', null);

  const isProfileIncomplete = !businessProfile.companyName || !businessProfile.industry || !businessProfile.targetAudience;

  const navigate = useNavigate();

  useEffect(() => {
    if (user && !onboardingData) {
      navigate('/onboarding');
    }
  }, [user, onboardingData, navigate]);

  const handleQuickAction = (actionLabel: string) => {
    switch (actionLabel) {
      case 'Create Campaign':
        window.dispatchEvent(new CustomEvent('open-launch-modal'));
        break;
      case 'Generate Report':
        navigate('/analytics');
        break;
      case 'Review Approvals':
        navigate('/workflow');
        break;
      case 'System Alerts':
        navigate('/performance');
        break;
    }
  };

  const createProject = async () => {
    if (!user || !newProjectName.trim()) return;
    setErrorMsg(null);
    try {
      await addDoc(collection(db, 'projects'), {
        name: newProjectName,
        uid: user.uid,
        createdAt: serverTimestamp(),
        progress: 0,
        status: 'Active'
      });
      setNewProjectName('');
    } catch (err) {
      setErrorMsg('Failed to create project. Check permissions.');
      handleFirestoreError(err, OperationType.CREATE, 'projects');
    }
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);
    try {
      await deleteDoc(doc(db, 'projects', projectToDelete.id));
      if (activeProject?.id === projectToDelete.id) {
        setActiveProject(null);
      }
      setProjectToDelete(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error deleting project. Insufficient permissions.');
      handleFirestoreError(err, OperationType.DELETE, `projects/${projectToDelete.id}`);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!isAuthReady || !user) {
      setActiveProjects([]);
      setActivities([]);
      return;
    }

    const qProjects = query(collection(db, 'projects'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribeProjects = onSnapshot(qProjects, (snapshot) => {
      const projects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveProjects(projects);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'projects'));

    let unsubscribeActivities = () => {};
    let unsubscribeTraffic = () => {};

    if (activeProject) {
      const qActivities = query(collection(db, 'projects', activeProject.id, 'activities'), orderBy('createdAt', 'desc'), limit(5));
      unsubscribeActivities = onSnapshot(qActivities, (snapshot) => {
        const acts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActivities(acts);
      }, (error) => handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/activities`));

      const qTraffic = query(collection(db, 'projects', activeProject.id, 'analytics'), orderBy('createdAt', 'desc'), limit(7));
      unsubscribeTraffic = onSnapshot(qTraffic, (snapshot) => {
        if (snapshot.empty) {
          setTrafficData([]);
        } else {
          const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setTrafficData(data.reverse());
        }
      }, (error) => handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/analytics`));
    } else {
      setActivities([]);
      setTrafficData([]);
    }

    return () => {
      unsubscribeProjects();
      unsubscribeActivities();
      unsubscribeTraffic();
    };
  }, [user, isAuthReady, activeProject]);

  const generateAnalyzeData = async () => {
    if (!user || !activeProject) return;
    setLoadingData(true);
    try {
      if (!geminiKey) {
        throw new Error("Gemini API key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      const prompt = `Based on a company answering to this profile: ${JSON.stringify(businessProfile)}, generate a realistic 7-day marketing analytics dataset. Provide exactly 7 items representing the last 7 days. Include 'name' (e.g., 'Mon'), 'traffic' (integer), 'conversions' (integer), and 'spend' (integer).
      Return ONLY a JSON array with exactly these keys. Example: [{"name":"Mon","traffic":1500,"conversions":120,"spend":450}]`;
      
      const result = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const content = result.text || '';
      
      const parsedData = JSON.parse(content.replace(/```json|```/g, '').trim());
      if (Array.isArray(parsedData) && parsedData.length > 0) {
        for (const item of parsedData) {
           await addDoc(collection(db, 'projects', activeProject.id, 'analytics'), {
             ...item,
             uid: user.uid,
             createdAt: serverTimestamp()
           });
        }
      }
    } catch (e: any) {
      console.error('Failed to generate mock analytics via Gemini', e);
    } finally {
      setLoadingData(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">Project Management</h1>
          <p className="text-theme-muted mt-1">End-to-end digital marketing overview.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={activeProject?.id || ''}
            onChange={(e) => setActiveProject(activeProjects.find(p => p.id === e.target.value) || null)}
            className="bg-theme-surface border border-white/10 text-theme-main rounded-lg px-4 py-2 focus:outline-none focus:border-theme-primary transition-colors"
          >
            <option value="">Select Project</option>
            {activeProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {activeProject && (
            <button 
              onClick={() => setProjectToDelete(activeProject)}
              className="bg-red-500/10 text-red-400 hover:bg-red-500/20 p-2 rounded-lg transition-colors border border-red-500/20"
              title="Delete Active Project"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          <input 
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New Project Name"
            className="bg-theme-surface border border-white/10 text-theme-main rounded-lg px-4 py-2 focus:outline-none focus:border-theme-primary transition-colors"
          />
          <button 
            onClick={createProject}
            className="bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-lg shadow-theme-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Project
          </button>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start">
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{errorMsg}</p>
        </motion.div>
      )}

      {isProfileIncomplete && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-r from-theme-primary/20 to-purple-500/20 border border-theme-primary/30 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start">
            <div className="bg-theme-primary/20 p-2 rounded-lg mr-4 mt-1">
              <Building2 className="w-6 h-6 text-theme-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-theme-main">Complete Your Business Profile</h3>
              <p className="text-theme-muted text-sm mt-1">Help TriMatrix AI provide better, more tailored suggestions and content by telling us about your business.</p>
            </div>
          </div>
          <Link to="/settings" className="shrink-0 bg-white/10 hover:bg-white/20 text-theme-main px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center">
            Setup Profile <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Active Projects', value: activeProjects.length.toString(), change: '+1', icon: Briefcase, color: 'text-blue-400' },
          { label: 'Total Spend', value: trafficData.length > 0 ? `$${trafficData.reduce((acc, curr) => acc + (curr.spend || 0), 0).toLocaleString()}` : '$0', change: '+12.5%', icon: Target, color: 'text-emerald-400' },
          { label: 'Avg. Traffic', value: trafficData.length > 0 ? `${Math.round(trafficData.reduce((acc, curr) => acc + (curr.traffic || 0), 0) / trafficData.length).toLocaleString()}` : '0', change: '+4.2%', icon: TrendingUp, color: 'text-purple-400' },
          { label: 'Activities', value: activities.length.toString(), change: '', icon: Clock, color: 'text-amber-400' },
        ].map((kpi, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={kpi.label} 
            className="glassy-neumorphic rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-theme-muted font-medium text-sm">{kpi.label}</h3>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <div className="mt-4 flex items-baseline">
              <p className="text-3xl font-bold text-theme-main">{kpi.value}</p>
              {kpi.change && (
                <p className={`ml-2 flex items-baseline text-sm font-semibold ${kpi.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {kpi.change}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glassy-neumorphic rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-theme-main">Performance Overview</h3>
            <div className="flex items-center gap-3">
               {trafficData.length === 0 && (
                 <button 
                   onClick={generateAnalyzeData}
                   disabled={loadingData}
                   className="text-xs bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary px-3 py-1.5 rounded-lg transition-colors flex items-center"
                 >
                   <Activity className="w-3 h-3 mr-1" />
                   {loadingData ? 'Generating...' : 'Analyze Real Data'}
                 </button>
               )}
               <button className="text-theme-muted hover:text-theme-main transition-colors"><MoreVertical size={18} /></button>
            </div>
          </div>
          <div className="h-80">
            {trafficData.length === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-black/20">
                <BarChart3 className="w-10 h-10 text-theme-muted mb-3" />
                <p className="text-theme-main font-medium">No performance data yet</p>
                <p className="text-theme-muted text-sm max-w-sm text-center mt-1">Connect your platforms in Settings or click "Analyze Real Data" to run an AI simulation based on your business profile.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', borderRadius: '8px' }}
                    itemStyle={{ color: 'var(--primary)' }}
                  />
                  <Area type="monotone" dataKey="traffic" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorTraffic)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="glassy-neumorphic rounded-2xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-theme-main">Active Projects</h3>
            <button className="text-theme-primary text-sm hover:underline">View All</button>
          </div>
          <div className="flex-1 space-y-5 overflow-y-auto pr-2">
            {activeProjects.map(project => (
              <div key={project.id} className="group p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-theme-main group-hover:text-theme-primary transition-colors">{project.name}</h4>
                    <p className="text-xs text-theme-muted">{project.client || (project.channels ? project.channels.join(', ') : 'Internal')}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${project.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {project.status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-theme-muted">Progress</span>
                    <span className="text-theme-main font-medium">{project.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-black/20 rounded-full h-1.5">
                    <div className="bg-theme-primary h-1.5 rounded-full" style={{ width: `${project.progress || 0}%` }}></div>
                  </div>
                </div>
                <div className="mt-3 flex items-center text-xs text-theme-muted">
                  <Calendar className="w-3 h-3 mr-1" />
                  {project.deadline ? `Due ${project.deadline}` : 'Ongoing'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Activity Feed */}
        <div className="glassy-neumorphic rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-theme-main mb-6">Recent Activities</h3>
          <div className="space-y-6">
            {activities.map((activity, i) => (
              <div key={activity.id} className="flex items-start relative">
                {i !== activities.length - 1 && (
                  <div className="absolute top-8 left-4 bottom-[-24px] w-px bg-white/10"></div>
                )}
                <div className="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center flex-shrink-0 z-10 border border-theme-primary/30">
                  <Zap className="w-4 h-4 text-theme-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm text-theme-main">
                    <span className="font-medium">{activity.user}</span> {activity.action}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-theme-muted">
                    <span>{activity.project}</span>
                    <span className="mx-2">•</span>
                    <span>{activity.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="glassy-neumorphic rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-theme-main mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Create Campaign', icon: Target, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
              { label: 'Generate Report', icon: BarChart, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
              { label: 'Review Approvals', icon: CheckCircle2, color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
              { label: 'System Alerts', icon: AlertCircle, color: 'bg-rose-500/10 text-rose-400 border-rose-500/20' },
            ].map(action => (
              <button 
                key={action.label} 
                onClick={() => handleQuickAction(action.label)}
                className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors ${action.color}`}
              >
                <action.icon className="w-6 h-6 mb-2" />
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {projectToDelete && (
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
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-red-500/10">
                <h2 className="text-xl font-bold text-red-500 flex items-center">
                  <AlertCircle className="w-6 h-6 mr-3" />
                  Delete Project
                </h2>
                <button onClick={() => setProjectToDelete(null)} className="text-theme-muted hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <p className="text-theme-main mb-4">
                  Are you sure you want to delete the project <span className="font-bold">"{projectToDelete.name}"</span>?
                </p>
                <p className="text-theme-muted text-sm border-l-2 border-red-500 pl-3">
                  This action cannot be undone. All project-specific data including activities, social posts, generated content, and analytics will be permanently deleted.
                </p>
                <div className="flex items-center justify-end gap-3 mt-8">
                  <button
                    onClick={() => setProjectToDelete(null)}
                    disabled={isDeleting}
                    className="px-4 py-2 rounded-lg text-theme-muted hover:text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDeleteProject}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium flex items-center transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                    Delete Project
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
