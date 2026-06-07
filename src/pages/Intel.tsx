import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BrainCircuit,
  BookOpen,
  Share2,
  MessageCircle,
  Calendar,
  Plus,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Zap,
  Target,
  Instagram,
  Linkedin,
  Facebook,
  Send,
  Loader2,
  Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectContext";
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { format } from "date-fns";
import { useNotifications } from "../context/NotificationContext";

export default function Intel() {
  const { user, isAuthReady } = useAuth();
  const { activeProject } = useProjects();
  const { sendNotification } = useNotifications();
  const [activeTab, setActiveTab] = useState<
    "brain" | "content" | "spy" | "influencers"
  >("brain");
  const [postContent, setPostContent] = useState("");
  const [showCompose, setShowCompose] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "whatsapp",
  ]);
  const [isPublishing, setIsPublishing] = useState(false);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);

  useEffect(() => {
    if (!isAuthReady || !user || !activeProject) {
      setRecentPosts([]);
      return;
    }

    const q = query(
      collection(db, "projects", activeProject.id, "socialPosts"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(5),
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecentPosts(fetchedPosts);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, activeProject]);

  const togglePlatform = (platform: string) => {
    if (selectedPlatforms.includes(platform)) {
      setSelectedPlatforms(selectedPlatforms.filter((p) => p !== platform));
    } else {
      setSelectedPlatforms([...selectedPlatforms, platform]);
    }
  };

  const handleBroadcast = async (status: "Published" | "Scheduled") => {
    if (
      !user ||
      !activeProject ||
      !postContent.trim() ||
      selectedPlatforms.length === 0
    )
      return;
    setIsPublishing(true);
    try {
      for (const platform of selectedPlatforms) {
        await addDoc(
          collection(db, "projects", activeProject.id, "socialPosts"),
          {
            uid: user.uid,
            platform: platform.charAt(0).toUpperCase() + platform.slice(1),
            content: postContent,
            status: status,
            scheduledFor:
              status === "Scheduled"
                ? new Date(Date.now() + 86400000).toISOString()
                : null, // Default schedule for 24h later
            engagement: { likes: 0, retweets: 0, comments: 0 },
            createdAt: serverTimestamp(),
          },
        );
      }

      await addDoc(collection(db, "projects", activeProject.id, "activities"), {
        uid: user.uid,
        user: user.displayName || "User",
        action: `omni-broadcasted to ${selectedPlatforms.join(", ")}`,
        project: activeProject.name,
        time: "Just now",
        createdAt: serverTimestamp(),
      });

      sendNotification(
        "Content Queued",
        `Content successfully queued for ${selectedPlatforms.length} platforms.`,
        "success",
        "system",
      );
      setPostContent("");
      setShowCompose(false);
    } catch (err) {
      handleFirestoreError(
        err,
        OperationType.CREATE,
        `projects/${activeProject.id}/socialPosts`,
      );
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8 pb-32">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-bold text-theme-main tracking-tight flex items-center">
            <BrainCircuit className="w-10 h-10 mr-4 text-theme-primary" />
            Trimatrix Intel
          </h1>
          <p className="text-theme-muted mt-2 text-lg">
            Central Business Marketing Hub & AI Brain
          </p>
        </div>
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab("brain")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "brain"
                ? "bg-theme-primary text-white shadow-lg shadow-theme-primary/20"
                : "text-theme-muted hover:text-theme-main"
            }`}
          >
            Intel Hub
          </button>
          <button
            onClick={() => setActiveTab("spy")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "spy"
                ? "bg-theme-primary text-white shadow-lg shadow-theme-primary/20"
                : "text-theme-muted hover:text-theme-main"
            }`}
          >
            Spy Lens
          </button>
          <button
            onClick={() => setActiveTab("influencers")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "influencers"
                ? "bg-theme-primary text-white shadow-lg shadow-theme-primary/20"
                : "text-theme-muted hover:text-theme-main"
            }`}
          >
            Influencers
          </button>
          <button
            onClick={() => setActiveTab("content")}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === "content"
                ? "bg-theme-primary text-white shadow-lg shadow-theme-primary/20"
                : "text-theme-muted hover:text-theme-main"
            }`}
          >
            Content & Execution
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "brain" && (
          <motion.div
            key="brain"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {/* Intel Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="glassy-neumorphic p-6 rounded-2xl border border-white/10 hover:border-theme-primary/30 transition-colors relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-500/10 rounded-full blur-2xl"></div>
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center mb-4 text-red-500 font-bold animate-pulse">
                  🔥
                </div>
                <h3 className="text-xl font-bold text-theme-main mb-2">
                  Auto-Trend Hijacker
                </h3>
                <p className="text-sm text-theme-muted mb-4">
                  Real-time trend detected: "AI Productivity Hacks". Suggesting
                  context-aware drafts aligning with this viral theme.
                </p>
                <button
                  onClick={() => {
                    setActiveTab("content");
                    setPostContent(
                      "Just implemented #AI Productivity Hacks into our workflow... 🚀 The results are shocking! Are you still doing manual tasks?",
                    );
                    setShowCompose(true);
                  }}
                  className="bg-red-500/20 hover:bg-red-500/30 text-red-400 px-3 py-2 rounded-lg text-xs font-bold transition-colors w-full"
                >
                  Generate Viral Draft
                </button>
              </div>

              <div className="glassy-neumorphic p-6 rounded-2xl border border-white/10 hover:border-theme-primary/30 transition-colors">
                <div className="w-12 h-12 bg-theme-primary/20 rounded-xl flex items-center justify-center mb-4 text-theme-primary">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-theme-main mb-2">
                  Mathematical Modeling
                </h3>
                <p className="text-sm text-theme-muted mb-4">
                  Predictive LTV models and ROAS velocity calculations suggest
                  increasing ad spend by 14% on Meta platform during weekends.
                </p>
                <button className="text-theme-primary text-sm font-medium flex items-center hover:underline">
                  View Data <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="glassy-neumorphic p-6 rounded-2xl border border-white/10 hover:border-theme-primary/30 transition-colors relative overflow-hidden">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-4 text-purple-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-theme-main mb-2">
                  Behavioral Psychology
                </h3>
                <p className="text-sm text-theme-muted mb-4">
                  Current audience sentiment shows high receptiveness to "fear
                  of missing out" (FOMO) messaging. Consider scarcity-based
                  campaigns.
                </p>
                <button className="text-purple-400 text-sm font-medium flex items-center hover:underline">
                  Apply Strategy <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>

              <div className="glassy-neumorphic p-6 rounded-2xl border border-white/10 hover:border-theme-primary/30 transition-colors">
                <div className="w-12 h-12 bg-sky-500/20 rounded-xl flex items-center justify-center mb-4 text-sky-400">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-theme-main mb-2">
                  Market AI Research
                </h3>
                <p className="text-sm text-theme-muted mb-4">
                  Trend analysis indicates a 22% spike in searches for
                  sustainable alternatives in your niche. Adjust SEO keyword
                  targeting immediately.
                </p>
                <button className="text-sky-400 text-sm font-medium flex items-center hover:underline">
                  Update Keywords <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>

            {/* Strategic Advice Panel */}
            <div className="glassy-neumorphic rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-black/20 flex justify-between items-center">
                <h2 className="text-xl font-bold text-theme-main flex items-center">
                  <Target className="w-5 h-5 mr-2 text-theme-primary" />
                  Strategic Directives
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-3 py-1 rounded-full font-medium">
                  Updated just now
                </span>
              </div>
              <div className="p-6">
                <ul className="space-y-4">
                  {[
                    "Shift 20% of Google Search budget to WhatsApp remarketing based on recent conversion lags.",
                    "Your latest blog template has a reading complexity that is too high. Simplify terminology for better engagement.",
                    "Instagram reach is plateauing. Deploy Carousel posts rather than single images to trigger algorithm changes.",
                  ].map((directive, idx) => (
                    <li
                      key={idx}
                      className="flex items-start bg-black/20 p-4 rounded-xl border border-white/5"
                    >
                      <div className="w-8 h-8 rounded-full bg-theme-primary/10 text-theme-primary flex items-center justify-center flex-shrink-0 font-bold mr-4">
                        {idx + 1}
                      </div>
                      <p className="text-theme-muted text-sm leading-relaxed pt-1">
                        {directive}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "spy" && (
          <motion.div
            key="spy"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-theme-main">
                Competitor Spy Lens
              </h2>
              <button className="bg-black/30 hover:bg-white/10 text-theme-main px-4 py-2 border border-white/10 rounded-lg text-sm">
                Add Competitor
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  name: "TechCorp Global",
                  sentiment: "Neutral",
                  freq: "3 posts/day",
                  topPost: "New API release 🚀 #developer",
                  change: "+12% engagement",
                },
                {
                  name: "Innovate AI",
                  sentiment: "Highly Positive",
                  freq: "5 posts/day",
                  topPost: "Why AI is the future. Report inside 👇",
                  change: "+45% engagement",
                },
              ].map((comp, i) => (
                <div
                  key={i}
                  className="glassy-neumorphic p-6 rounded-2xl border border-white/10"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-theme-main">
                        {comp.name}
                      </h3>
                      <p className="text-xs text-theme-muted mt-1 flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1 text-emerald-400" />{" "}
                        {comp.change}
                      </p>
                    </div>
                    <span className="bg-theme-primary/20 text-theme-primary text-xs px-2 py-1 rounded-md font-medium">
                      {comp.freq}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                      <div className="text-xs text-theme-muted mb-1">
                        Top Performing Post Format
                      </div>
                      <div className="text-sm text-theme-main">
                        "{comp.topPost}"
                      </div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg border border-white/5">
                      <div className="text-xs text-theme-muted mb-1">
                        Audience Sentiment Analysis
                      </div>
                      <div
                        className={`text-sm ${comp.sentiment === "Highly Positive" ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {comp.sentiment}
                      </div>
                    </div>
                    <button className="w-full mt-2 py-2 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary text-sm rounded-lg transition-colors">
                      Pivot Strategy based on this
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "influencers" && (
          <motion.div
            key="influencers"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-theme-main">
                  Influencer Alignment Scout
                </h2>
                <p className="text-sm text-theme-muted mt-1">
                  Analyzing influencer demographics against your brand persona.
                </p>
              </div>
              <button className="bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 rounded-lg text-sm transition-colors shadow-lg shadow-theme-primary/20">
                Run Discovery Scan
              </button>
            </div>

            <div className="glassy-neumorphic rounded-2xl border border-white/5 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/10 text-xs text-theme-muted uppercase tracking-wider">
                    <th className="p-4 font-medium">Influencer</th>
                    <th className="p-4 font-medium">Alignment Score</th>
                    <th className="p-4 font-medium">Est. ROI</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm">
                  {[
                    {
                      name: "@techguru_x",
                      score: "98%",
                      roi: "$4.2K",
                      status: "Outreach Sent",
                    },
                    {
                      name: "@ai_builders",
                      score: "92%",
                      roi: "$2.8K",
                      status: "Discovered",
                    },
                    {
                      name: "@saas_insider",
                      score: "85%",
                      roi: "$1.5K",
                      status: "Collaborating",
                    },
                  ].map((inf, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors">
                      <td className="p-4 font-medium text-theme-main flex items-center">
                        <div className="w-8 h-8 rounded-full bg-theme-primary/20 mr-3 flex justify-center items-center text-xs text-theme-primary">
                          {inf.name.charAt(1).toUpperCase()}
                        </div>
                        {inf.name}
                      </td>
                      <td className="p-4 text-emerald-400 font-bold">
                        {inf.score}
                      </td>
                      <td className="p-4 text-theme-main">{inf.roi}</td>
                      <td className="p-4">
                        <span className="bg-white/10 px-2 py-1 rounded text-xs text-theme-muted">
                          {inf.status}
                        </span>
                      </td>
                      <td className="p-4">
                        <button className="text-theme-primary hover:underline text-xs font-medium">
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {activeTab === "content" && (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-theme-main">
                Content Execution
              </h2>
              <button
                onClick={() => setShowCompose(!showCompose)}
                className="bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-lg shadow-theme-primary/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Compose
              </button>
            </div>

            {showCompose && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="glassy-neumorphic p-6 rounded-2xl border border-white/10"
              >
                <h3 className="text-lg font-semibold text-theme-main mb-4">
                  Omnichannel Broadcaster
                </h3>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-xl p-4 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary resize-none min-h-[150px] mb-4"
                  placeholder="Draft your message, post, or template here... Our AI will automatically format it for the selected platforms."
                />

                <div className="flex flex-wrap gap-4 items-center justify-between mt-4">
                  <div className="flex items-center gap-3 w-full mb-2">
                    <label className="flex items-center space-x-2 text-sm text-theme-muted cursor-pointer">
                      <input
                        type="checkbox"
                        className="form-checkbox bg-black/30 border-white/10 rounded text-theme-primary focus:ring-theme-primary focus:ring-offset-0 focus:ring-2"
                        defaultChecked
                      />
                      <span>
                        Algorithm-Tunable Deployment (Auto-adjusts timing for
                        peak reach)
                      </span>
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => togglePlatform("whatsapp")}
                      className={`p-3 rounded-xl border transition-all ${selectedPlatforms.includes("whatsapp") ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" : "bg-black/20 border-white/10 text-theme-muted hover:bg-white/10"}`}
                      title="WhatsApp / SMS"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => togglePlatform("instagram")}
                      className={`p-3 rounded-xl border transition-all ${selectedPlatforms.includes("instagram") ? "bg-pink-500/20 border-pink-500 text-pink-400" : "bg-black/20 border-white/10 text-theme-muted hover:bg-white/10"}`}
                      title="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleBroadcast("Scheduled")}
                      disabled={
                        isPublishing ||
                        !postContent.trim() ||
                        selectedPlatforms.length === 0
                      }
                      className="bg-black/30 hover:bg-white/10 text-theme-main px-6 py-2.5 rounded-xl font-medium transition-colors border border-white/10 flex items-center text-sm disabled:opacity-50"
                    >
                      <Calendar className="w-4 h-4 mr-2" /> Schedule
                    </button>
                    <button
                      onClick={() => handleBroadcast("Published")}
                      disabled={
                        isPublishing ||
                        !postContent.trim() ||
                        selectedPlatforms.length === 0
                      }
                      className="bg-theme-primary hover:bg-theme-primary-hover text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-lg shadow-theme-primary/20 text-sm disabled:opacity-50"
                    >
                      {isPublishing ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4 mr-2" />
                      )}
                      Publish Now
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Smart Content Calendar */}
            <div className="glassy-neumorphic rounded-2xl border border-white/5 overflow-hidden">
              <div className="p-6 border-b border-white/5 bg-black/20">
                <h3 className="text-xl font-semibold text-theme-main">
                  Upcoming Smart Deployments
                </h3>
                <p className="text-xs text-theme-muted mt-1">
                  Trimatrix automatically times posts based on audience
                  behavioral intelligence. Real-time entries mapped from
                  database.
                </p>
              </div>
              <div className="divide-y divide-white/5">
                {recentPosts.length === 0 ? (
                  <div className="p-6 text-center text-theme-muted">
                    No active deployments found for {activeProject?.name}.
                  </div>
                ) : (
                  recentPosts.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-6 flex flex-col md:flex-row justify-between items-start md:items-center hover:bg-white/5 transition-colors gap-4"
                    >
                      <div>
                        <h4 className="text-theme-main font-medium">
                          {item.content?.substring(0, 50)}
                          {item.content?.length > 50 ? "..." : ""}
                        </h4>
                        <p className="text-sm text-theme-muted flex items-center mt-1">
                          <Share2 className="w-3 h-3 mr-1" /> {item.platform}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs px-3 py-1 bg-black/30 border border-white/10 text-theme-muted rounded-full flex items-center">
                          {item.status === "Scheduled" ? (
                            <Clock className="w-3 h-3 mr-1" />
                          ) : (
                            <Send className="w-3 h-3 mr-1" />
                          )}
                          {item.scheduledFor
                            ? format(
                                new Date(item.scheduledFor),
                                "MMM d, h:mm a",
                              )
                            : "Published"}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded-md font-medium ${item.status === "Published" ? "bg-emerald-500/20 text-emerald-400" : "bg-theme-primary/20 text-theme-primary"}`}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
