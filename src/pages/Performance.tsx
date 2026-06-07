import { useState, useEffect } from 'react';
import { Zap, AlertTriangle, CheckCircle, RefreshCcw, ArrowRight, Loader2, Play, Check, TrendingUp, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot, query, where, orderBy, updateDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';

export default function Performance() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isAutoOptimizeEnabled, setIsAutoOptimizeEnabled] = useState(false);
  const { user } = useAuth();
  const { activeProject } = useProjects();

  useEffect(() => {
    if (!user || !activeProject) return;

    const alertsQ = query(collection(db, 'projects', activeProject.id, 'performanceAlerts'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribeAlerts = onSnapshot(alertsQ, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/performanceAlerts`);
    });

    const logsQ = query(collection(db, 'projects', activeProject.id, 'performanceLogs'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'));
    const unsubscribeLogs = onSnapshot(logsQ, (snapshot) => {
      setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/performanceLogs`);
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeLogs();
    };
  }, [user, activeProject]);

  const runAnalysis = async () => {
    if (!user || !activeProject) return;
    setIsAnalyzing(true);
    try {
      // Logic to trigger analysis and add new alerts/logs
      await addDoc(collection(db, 'projects', activeProject.id, 'performanceAlerts'), {
        uid: user.uid,
        title: 'New Analysis Result',
        issue: 'Detected potential improvement',
        action: 'Review suggestions',
        status: 'Pending',
        createdAt: serverTimestamp()
      });
      await addDoc(collection(db, 'projects', activeProject.id, 'performanceLogs'), {
        uid: user.uid,
        text: 'Completed full performance scan.',
        type: 'success',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `projects/${activeProject.id}/performanceAlerts`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyFix = async (alert: any) => {
    if (!user || !activeProject) return;
    setProcessingId(alert.id);
    try {
      const alertRef = doc(db, 'projects', activeProject.id, 'performanceAlerts', alert.id);
      await updateDoc(alertRef, { status: 'Resolved' });
      await addDoc(collection(db, 'projects', activeProject.id, 'performanceLogs'), {
        uid: user.uid,
        text: `Applied fix: ${alert.action}`,
        type: 'success',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `projects/${activeProject.id}/performanceAlerts`);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">Improvements</h1>
          <p className="text-theme-muted mt-1">See what is slowing you down and how to fix it.</p>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center space-x-3 cursor-pointer bg-black/20 border border-white/10 px-4 py-2.5 rounded-xl">
            <input 
              type="checkbox" 
              checked={isAutoOptimizeEnabled}
              onChange={(e) => setIsAutoOptimizeEnabled(e.target.checked)}
              className="w-5 h-5 rounded border-white/20 bg-black/20 text-theme-primary focus:ring-theme-primary focus:ring-offset-slate-900"
            />
            <span className="text-theme-main font-medium flex items-center text-sm">
              <Settings className="w-4 h-4 mr-2 text-theme-primary" />
              Auto Improvements
            </span>
          </label>
          <button 
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl flex items-center transition-all shadow-lg shadow-theme-primary/20 font-medium"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Zap className="w-5 h-5 mr-2" />}
            {isAnalyzing ? 'Checking...' : 'Check Now'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glassy-neumorphic rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/10">
              <h3 className="text-lg font-semibold text-theme-main flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-theme-primary" />
                Predictive Campaign Adjustments
              </h3>
              {isAutoOptimizeEnabled && (
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-medium border border-emerald-500/20 flex items-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></div>
                  Auto-Pilot Active
                </span>
              )}
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-start justify-between">
                  <div>
                    <h4 className="text-theme-main font-medium mb-1">Budget Reallocation</h4>
                    <p className="text-sm text-theme-muted">Shift $500 from Facebook Ads to LinkedIn based on predicted B2B engagement surge.</p>
                  </div>
                  <button className="text-theme-primary hover:text-theme-primary-hover text-sm font-medium px-3 py-1.5 bg-theme-primary/10 rounded-lg transition-colors">
                    Apply
                  </button>
                </div>
                <div className="bg-black/20 border border-white/5 rounded-xl p-4 flex items-start justify-between">
                  <div>
                    <h4 className="text-theme-main font-medium mb-1">Audience Expansion</h4>
                    <p className="text-sm text-theme-muted">Include "Tech Enthusiasts" in targeting for Campaign Alpha. Predicted CTR increase: +1.2%.</p>
                  </div>
                  <button className="text-theme-primary hover:text-theme-primary-hover text-sm font-medium px-3 py-1.5 bg-theme-primary/10 rounded-lg transition-colors">
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="glassy-neumorphic rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/10">
              <h3 className="text-lg font-semibold text-theme-main flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-amber-400" />
                Underperforming Content Alerts
              </h3>
              <span className="bg-amber-500/10 text-amber-400 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-500/20">
                {alerts.filter(a => a.status === 'Pending').length} Issues Found
              </span>
            </div>
            
            <div className="divide-y divide-white/5">
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div 
                    key={alert.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`p-6 transition-colors ${alert.status === 'Resolved' ? 'bg-emerald-500/5' : 'hover:bg-white/5'}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h4 className="text-theme-main font-medium mb-1 text-lg">{alert.title}</h4>
                        <p className="text-rose-400 text-sm mb-3 font-medium flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1.5" />
                          Issue: {alert.issue}
                        </p>
                        <div className="flex items-center text-sm text-theme-muted bg-black/20 px-3 py-2 rounded-lg border border-white/5">
                          <Zap className="w-4 h-4 text-theme-primary mr-2" />
                          <span className="font-medium text-theme-main mr-2">AI Suggestion:</span>
                          {alert.action}
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-3 min-w-[120px]">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${
                          alert.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                          alert.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          'bg-theme-primary/10 text-theme-primary border-theme-primary/20'
                        }`}>
                          {alert.status}
                        </span>
                        {alert.status === 'Pending' && (
                          <button 
                            onClick={() => applyFix(alert)}
                            disabled={processingId === alert.id}
                            className="text-sm bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary px-3 py-1.5 rounded-lg flex items-center transition-colors border border-theme-primary/20 disabled:opacity-50"
                          >
                            {processingId === alert.id ? (
                              <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Fixing...</>
                            ) : (
                              <><Play className="w-4 h-4 mr-1.5" /> Apply Fix</>
                            )}
                          </button>
                        )}
                        {alert.status === 'Resolved' && (
                          <span className="text-sm text-emerald-400 flex items-center px-3 py-1.5">
                            <Check className="w-4 h-4 mr-1.5" /> Fixed
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-6 flex items-center">
              <RefreshCcw className="w-5 h-5 mr-2 text-theme-primary" />
              A/B Testing Engine
            </h3>
            <div className="space-y-4">
              <div className="p-4 bg-black/20 rounded-xl border border-white/5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-theme-main">Landing Page Headline</span>
                  <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Running</span>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <div className="flex justify-between text-theme-muted mb-1">
                      <span>A: "Automate Your Marketing"</span>
                      <span className="text-theme-main">45%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5"><div className="bg-theme-muted h-1.5 rounded-full" style={{ width: '45%' }}></div></div>
                  </div>
                  <div>
                    <div className="flex justify-between text-theme-muted mb-1">
                      <span className="text-emerald-400 font-medium">B: "AI Marketing on Autopilot"</span>
                      <span className="text-emerald-400 font-medium">55%</span>
                    </div>
                    <div className="w-full bg-black/40 rounded-full h-1.5"><div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: '55%' }}></div></div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-black/20 rounded-xl border border-white/5 relative overflow-hidden opacity-70">
                <div className="absolute top-0 left-0 w-1 h-full bg-theme-muted"></div>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-theme-main">Email Subject Line</span>
                  <span className="text-xs text-theme-muted bg-white/10 px-2 py-0.5 rounded-full border border-white/10">Completed</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-theme-muted p-2 bg-white/5 rounded-lg border border-white/5">
                    <span>Winner: "Unlock AI Growth"</span>
                    <span className="text-emerald-400 font-medium">68% Open</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="glassy-neumorphic rounded-2xl p-6 flex flex-col max-h-[400px]">
            <h3 className="text-lg font-semibold text-theme-main mb-6">Auto-Update Log</h3>
            <ul className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
              <AnimatePresence>
                {logs.map((log) => (
                  <motion.li 
                    key={log.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start p-3 bg-black/20 rounded-xl border border-white/5"
                  >
                    {log.type === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400 mr-3 flex-shrink-0 mt-0.5" />
                    ) : (
                      <RefreshCcw className="w-5 h-5 text-theme-primary mr-3 flex-shrink-0 mt-0.5" />
                    )}
                    <span className="text-sm text-theme-muted leading-relaxed">{log.text}</span>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
