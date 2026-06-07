import React, { useState, useEffect, useRef } from "react";
import * as Icons from "lucide-react";
const {
  Bot,
  Play,
  Pause,
  Settings,
  Plus,
  Activity,
  Clock,
  Zap,
  Mail,
  Share2,
  Search,
  BarChart3,
  X,
  Download,
  Upload,
} = Icons;
import { motion, AnimatePresence } from "motion/react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  doc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectContext";
import { useNotifications } from "../context/NotificationContext";

export default function Automation() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { user } = useAuth();
  const { activeProject } = useProjects();
  const { sendNotification } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<"All" | "Active" | "Paused">("All");

  useEffect(() => {
    if (!user || !activeProject) return;

    const q = query(
      collection(db, "projects", activeProject.id, "automationRules"),
      where("uid", "==", user.uid),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const rules = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setTasks(rules);
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(
          error,
          OperationType.LIST,
          `projects/${activeProject.id}/automationRules`,
        );
      },
    );

    return () => unsubscribe();
  }, [user, activeProject]);

  const filteredTasks = tasks.filter(
    (t) => filter === "All" || t.status === filter,
  );

  const toggleTaskStatus = async (task: any) => {
    if (!activeProject) return;
    try {
      const taskRef = doc(
        db,
        "projects",
        activeProject.id,
        "automationRules",
        task.id,
      );
      await updateDoc(taskRef, {
        status: task.status === "Active" ? "Paused" : "Active",
      });
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.UPDATE,
        `projects/${activeProject.id}/automationRules`,
      );
    }
  };

  const addRule = async (rule: any) => {
    if (!user || !activeProject) return;
    try {
      await addDoc(
        collection(db, "projects", activeProject.id, "automationRules"),
        {
          ...rule,
          uid: user.uid,
          createdAt: serverTimestamp(),
        },
      );
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(
        error,
        OperationType.CREATE,
        `projects/${activeProject.id}/automationRules`,
      );
    }
  };

  const handleExport = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(tasks, null, 2));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "trimatrix_automations.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTasks = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedTasks)) {
          // Basic validation could be added here
          setTasks([
            ...tasks,
            ...importedTasks.map((t) => ({ ...t, id: Math.random() })),
          ]);
        }
      } catch (error) {
        console.error("Error parsing imported JSON:", error);
        sendNotification("Import Failed", "Invalid JSON file.", "error", "system");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">
            Automation Engine (Core Brain)
          </h1>
          <p className="text-theme-muted mt-1">
            Manage end-to-end service-wise automations and feedback loops.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input
            type="file"
            accept=".json"
            style={{ display: "none" }}
            ref={fileInputRef}
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-theme-surface border border-white/10 text-theme-main px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center shadow-lg"
          >
            <Upload className="w-4 h-4 mr-2" />
            Import
          </button>
          <button
            onClick={handleExport}
            className="bg-theme-surface border border-white/10 text-theme-main px-4 py-2.5 rounded-xl hover:bg-white/5 transition-colors flex items-center shadow-lg"
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-theme-primary hover:bg-theme-primary-hover text-white px-5 py-2.5 rounded-xl flex items-center transition-all shadow-lg shadow-theme-primary/20 font-medium"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Rule
          </button>
        </div>
      </div>

      {/* Dashboard Section */}
      <div className="glassy-neumorphic rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-theme-main mb-6 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-theme-primary" />
          Automation Performance Dashboard
        </h3>
        <div className="h-64">
          {tasks.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={tasks.map((t, i) => ({
                  name: `Task ${i + 1}`,
                  success: 98 + Math.random(),
                  time: 100 + Math.random() * 50,
                  error: Math.random(),
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="name" stroke="#a3a3a3" fontSize={12} />
                <YAxis stroke="#a3a3a3" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#171717",
                    border: "1px solid #ffffff10",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="success"
                  name="Success Rate (%)"
                  stroke="#10b981"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="time"
                  name="Exec Time (ms)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="error"
                  name="Error Rate (%)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              No automations active to track
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glassy-neumorphic rounded-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-black/10">
              <div className="flex items-center">
                <Bot className="w-5 h-5 mr-2 text-theme-primary" />
                <h3 className="text-lg font-semibold text-theme-main">
                  Automation Rules
                </h3>
              </div>
              <div className="flex bg-black/20 p-1 rounded-lg border border-white/5">
                {(["All", "Active", "Paused"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                      filter === f
                        ? "bg-theme-primary text-white shadow-lg"
                        : "text-theme-muted hover:text-white"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-white/5">
              {loading ? (
                <div className="p-12 text-center text-theme-muted flex flex-col items-center">
                  <Activity className="w-8 h-8 animate-pulse mb-4 text-theme-primary" />
                  Loading automation rules...
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                        className="p-6 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-start">
                            <div className="p-3 bg-black/20 rounded-xl border border-white/5 mr-4 hidden sm:block">
                              <task.icon
                                className={`w-6 h-6 ${task.status === "Active" ? "text-theme-primary" : "text-theme-muted"}`}
                              />
                            </div>
                            <div>
                              <div className="flex items-center space-x-3 mb-1.5">
                                <h4 className="text-theme-main font-medium text-lg">
                                  {task.name}
                                </h4>
                                <span
                                  className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded-full border ${
                                    task.type === "Scheduled"
                                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                                      : "bg-purple-500/10 text-purple-400 border-purple-500/20"
                                  }`}
                                >
                                  {task.type}
                                </span>
                              </div>
                              <p className="text-theme-muted text-sm mb-2 flex items-center">
                                <span className="font-medium mr-1.5 text-theme-main">
                                  Service:
                                </span>{" "}
                                {task.service}
                              </p>
                              <p className="text-theme-muted text-sm flex items-center bg-black/20 px-3 py-1.5 rounded-lg border border-white/5 inline-flex">
                                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                                {task.type === "Event-Based"
                                  ? `Trigger: ${task.trigger}`
                                  : `Schedule: ${task.trigger}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-4 sm:flex-col sm:items-end sm:space-x-0 sm:space-y-3">
                            <span
                              className={`flex items-center text-sm font-medium px-3 py-1 rounded-full border ${
                                task.status === "Active"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                              }`}
                            >
                              <span
                                className={`w-2 h-2 rounded-full mr-2 ${task.status === "Active" ? "bg-emerald-400 animate-pulse" : "bg-slate-400"}`}
                              ></span>
                              {task.status}
                            </span>
                            <div className="flex space-x-2">
                              <div className="flex space-x-1 border border-white/10 rounded-lg overflow-hidden bg-black/20">
                                <button
                                  onClick={() => toggleTaskStatus(task)}
                                  className={`p-2 transition-colors ${task.status === "Active" ? "bg-theme-primary text-white" : "text-theme-muted hover:text-white hover:bg-white/10"}`}
                                  title="Play"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => toggleTaskStatus(task)}
                                  className={`p-2 transition-colors ${task.status === "Paused" ? "bg-amber-500 text-white" : "text-theme-muted hover:text-white hover:bg-white/10"}`}
                                  title="Pause"
                                >
                                  <Pause className="w-4 h-4" />
                                </button>
                              </div>
                              <button className="p-2 text-theme-muted hover:text-white hover:bg-white/10 rounded-lg transition-colors border border-white/10 bg-black/20">
                                <Settings className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="p-12 text-center text-theme-muted"
                    >
                      No {filter.toLowerCase()} automation rules found.
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="glassy-neumorphic rounded-2xl p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-theme-main flex items-center">
                <Icons.BrainCircuit className="w-5 h-5 mr-2 text-indigo-400" />
                Autonomous Growth Agent
              </h3>
              <div className="relative inline-flex h-6 w-11 items-center rounded-full bg-slate-700 cursor-pointer">
                <span className="sr-only">Enable Growth Agent</span>
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition translate-x-1" />
              </div>
            </div>
            <p className="text-xs text-theme-muted mb-4">
              Our proprietary AI agent continuously monitors your campaigns and
              self-optimizes workflows using multi-armed bandit algorithms.
            </p>
            <div className="flex items-center text-[10px] font-bold text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 w-fit">
              <Icons.Sparkles className="w-3 h-3 mr-1" /> Futuristic Feature
            </div>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6 border border-emerald-500/20 bg-emerald-500/5">
            <h3 className="text-lg font-semibold text-theme-main mb-3 flex items-center">
              <Icons.MessageCircle className="w-5 h-5 mr-2 text-emerald-400" />{" "}
              Lead-Qualifying Auto-Responder
            </h3>
            <p className="text-sm text-theme-muted mb-4">
              AI-driven automated responses in comments and DMs that qualify
              leads based on intent and route them directly into your CRM.
            </p>
            <div className="bg-black/30 p-3 rounded-lg border border-white/5 space-y-2 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-theme-main">
                  Active Routing: Hubspot CRM
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </div>
              <div className="text-xs text-theme-muted">
                Qualified Leads today: 14
              </div>
            </div>
            <button className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-semibold py-2 rounded-lg transition-colors border border-emerald-500/30">
              Configure Lead Intents
            </button>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-6 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-theme-primary" />
              System Health
            </h3>
            <div className="space-y-5">
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center text-theme-muted">
                  <Activity className="w-5 h-5 mr-3 text-emerald-400" />
                  <span className="text-sm font-medium">API Connections</span>
                </div>
                <span className="text-sm font-bold text-emerald-400">100%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center text-theme-muted">
                  <Clock className="w-5 h-5 mr-3 text-blue-400" />
                  <span className="text-sm font-medium">Scheduler Uptime</span>
                </div>
                <span className="text-sm font-bold text-theme-main">99.9%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-black/20 rounded-xl border border-white/5">
                <div className="flex items-center text-theme-muted">
                  <Bot className="w-5 h-5 mr-3 text-purple-400" />
                  <span className="text-sm font-medium">
                    AI Decisions (24h)
                  </span>
                </div>
                <span className="text-sm font-bold text-theme-main">1,245</span>
              </div>
            </div>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-6">
              Feedback Loop Log
            </h3>
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-black bg-rose-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-white/5 bg-black/30 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-theme-main text-xs uppercase tracking-wider">
                      Analytics Drop
                    </div>
                    <time className="font-mono text-[10px] text-theme-muted bg-white/5 px-2 py-0.5 rounded">
                      10:00 AM
                    </time>
                  </div>
                  <div className="text-theme-muted text-sm">
                    Traffic on /pricing fell below threshold.
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-black bg-purple-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-white/5 bg-black/30 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-theme-main text-xs uppercase tracking-wider">
                      AI Decision
                    </div>
                    <time className="font-mono text-[10px] text-theme-muted bg-white/5 px-2 py-0.5 rounded">
                      10:01 AM
                    </time>
                  </div>
                  <div className="text-theme-muted text-sm">
                    Triggered A/B test for CTA button.
                  </div>
                </div>
              </div>

              <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-black bg-emerald-500 text-white shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] p-4 rounded-xl border border-white/5 bg-black/30 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-bold text-theme-main text-xs uppercase tracking-wider">
                      Action Taken
                    </div>
                    <time className="font-mono text-[10px] text-theme-muted bg-white/5 px-2 py-0.5 rounded">
                      10:05 AM
                    </time>
                  </div>
                  <div className="text-theme-muted text-sm">
                    Deployed variant B to 50% traffic.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Automation Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                <h3 className="text-xl font-bold text-theme-main">
                  Create Automation Rule
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-theme-muted hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-2">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Auto-post blog to Twitter"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-theme-main mb-2">
                      Service
                    </label>
                    <select className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all">
                      <option>Social Media</option>
                      <option>SEO Engine</option>
                      <option>Content Gen</option>
                      <option>Analytics</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-theme-main mb-2">
                      Trigger Type
                    </label>
                    <select className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all">
                      <option>Event-Based</option>
                      <option>Scheduled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-2">
                    Condition / Schedule
                  </label>
                  <input
                    type="text"
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all"
                    placeholder="e.g., Every Monday at 9AM"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-2">
                    Action
                  </label>
                  <textarea
                    className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary focus:border-transparent outline-none transition-all resize-none h-24"
                    placeholder="Describe the action to take..."
                  ></textarea>
                </div>
              </div>
              <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end space-x-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-theme-muted hover:text-white hover:bg-white/5 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="bg-theme-primary hover:bg-theme-primary-hover text-white px-6 py-2 rounded-xl transition-colors font-medium shadow-lg shadow-theme-primary/20"
                >
                  Create Rule
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
