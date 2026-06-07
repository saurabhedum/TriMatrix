import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Share2,
  Search,
  Mail,
  Download,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Archive,
  RefreshCw,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { motion } from "motion/react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectContext";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981"];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("google");
  const { user } = useAuth();
  const { activeProject } = useProjects();
  const [trafficData, setTrafficData] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !activeProject) return;
    const qTraffic = query(
      collection(db, "projects", activeProject.id, "analytics"),
      where("uid", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(7),
    );
    const unsubscribe = onSnapshot(qTraffic, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setTrafficData(data.reverse());
    });
    return () => unsubscribe();
  }, [user, activeProject]);

  const deviceData =
    trafficData.length > 0
      ? [
          { name: "Mobile", value: Math.round(trafficData[0].traffic * 0.65) },
          { name: "Desktop", value: Math.round(trafficData[0].traffic * 0.3) },
          { name: "Tablet", value: Math.round(trafficData[0].traffic * 0.05) },
        ]
      : [];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">
            Analytics & Tracking Engine
          </h1>
          <p className="text-theme-muted mt-1">
            Platform-wise performance metrics and insights.
          </p>
        </div>
        <div className="flex space-x-3">
          <select className="bg-black/20 border border-white/10 text-theme-main text-sm rounded-lg focus:ring-theme-primary focus:border-theme-primary block p-2.5 transition-colors">
            <option>Last 7 days</option>
            <option>Last 30 days</option>
            <option>This month</option>
            <option>Last year</option>
          </select>
          <button className="bg-white/5 hover:bg-white/10 text-theme-main px-4 py-2 rounded-lg flex items-center transition-colors border border-white/10">
            <Download className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Platform Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
        {[
          { id: "google", name: "Google Analytics", icon: Globe },
          { id: "social", name: "Social Media", icon: Share2 },
          { id: "attribution", name: "Revenue Attribution", icon: DollarSign },
          { id: "history", name: "Historical Index", icon: Archive },
          { id: "seo", name: "Search Console", icon: Search },
          { id: "email", name: "Email Campaigns", icon: Mail },
          {
            id: "compliance",
            name: "Ethical AI Compliance",
            icon: ShieldCheck,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-theme-primary text-white shadow-lg shadow-theme-primary/20"
                : "bg-black/20 text-theme-muted hover:bg-white/5 hover:text-theme-main border border-white/5"
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === "attribution" ? (
        <div className="space-y-8">
          <div className="glassy-neumorphic rounded-2xl p-6 border border-emerald-500/20 bg-gradient-to-br from-black/40 to-emerald-900/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row gap-8 justify-between">
              <div>
                <h3 className="text-xl font-bold text-theme-main flex items-center mb-2">
                  <DollarSign className="w-6 h-6 mr-2 text-emerald-400" />{" "}
                  Revenue Attribution Engine
                </h3>
                <p className="text-sm text-theme-muted max-w-lg mb-6">
                  Hard dollar-value ROI mapping per content asset. We attribute
                  conversions from organic and ad-driven traffic to the precise
                  social post or email that originated it.
                </p>

                <div className="grid grid-cols-2 gap-6 max-w-sm">
                  <div>
                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">
                      Total Sourced Rev
                    </p>
                    <p className="text-3xl font-bold text-emerald-400 mt-1">
                      $42,850
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-theme-muted uppercase tracking-wider font-semibold">
                      Top Channel
                    </p>
                    <p className="text-lg font-bold text-theme-main mt-2">
                      LinkedIn (45%)
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-md bg-black/30 rounded-xl p-4 border border-white/5">
                <h4 className="text-sm font-semibold text-theme-main mb-3">
                  Top Converting Assets (Last 30d)
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      title: "Q3 Tech Report Thread",
                      rev: "$12,400",
                      platform: "LinkedIn",
                    },
                    {
                      title: "SaaS Discount Promo",
                      rev: "$8,200",
                      platform: "Twitter",
                    },
                    {
                      title: "Newsletter Edition #42",
                      rev: "$3,150",
                      platform: "Email",
                    },
                  ].map((asset, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-sm p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <span className="text-theme-muted flex items-center w-2/3 truncate">
                        <Share2 className="w-3 h-3 mr-2 hidden sm:block" />
                        {asset.title}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-black rounded text-theme-muted">
                        {asset.platform}
                      </span>
                      <span className="text-emerald-400 font-bold">
                        {asset.rev}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === "history" ? (
        <div className="space-y-8">
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-xl font-bold text-theme-main flex items-center mb-2">
              <Archive className="w-5 h-5 mr-2 text-theme-primary" /> Historical
              Performance Retrieval
            </h3>
            <p className="text-sm text-theme-muted max-w-2xl mb-6">
              AI indexes your top-performing legacy assets and suggests ways to
              modernize and repurpose them.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {[
                {
                  old: "2024 Ultimate Guide to SEO",
                  hook: "Did you know SEO changed completely in 12 months?",
                  action: "Convert to Twitter Thread",
                },
                {
                  old: "Video: Getting started with API",
                  hook: "3 mistakes you're making with APIs in 2026.",
                  action: "Repurpose to TikTok/Reels",
                },
                {
                  old: "Webinar: Sales mastery",
                  hook: "The 1 framework that closed $1M in sales.",
                  action: "Extract to LinkedIn Carousel",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-black/20 p-5 rounded-xl border border-white/5 hover:border-theme-primary/30 transition-colors flex flex-col justify-between h-full"
                >
                  <div>
                    <div className="text-xs text-theme-primary mb-2 font-medium bg-theme-primary/10 inline-block px-2 py-1 rounded">
                      Top Asset from 2 Years Ago
                    </div>
                    <h4 className="text-theme-main font-bold mb-3">
                      "{item.old}"
                    </h4>
                    <p className="text-xs text-theme-muted mb-1">
                      AI Suggested Modern Hook:
                    </p>
                    <p className="text-sm text-amber-100 italic bg-amber-500/10 p-2 rounded border border-amber-500/20">
                      "{item.hook}"
                    </p>
                  </div>
                  <button className="mt-4 w-full bg-white/5 hover:bg-theme-primary hover:text-white text-theme-main text-sm py-2 rounded-lg transition-colors flex items-center justify-center">
                    <RefreshCw className="w-3 h-3 mr-2" />
                    {item.action}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === "compliance" ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glassy-neumorphic rounded-2xl p-6 border border-emerald-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-theme-main font-semibold">
                  Overall Compliance Score
                </h3>
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-4xl font-bold text-emerald-400">N/A</p>
              <p className="text-sm text-theme-muted mt-2">No data yet.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glassy-neumorphic rounded-2xl p-6 border border-amber-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-theme-main font-semibold">
                  Potential Bias Flags
                </h3>
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-4xl font-bold text-amber-400">0</p>
              <p className="text-sm text-theme-muted mt-2">
                No flags to review.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glassy-neumorphic rounded-2xl p-6 border border-blue-500/20"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-theme-main font-semibold">
                  Data Privacy (GDPR/CCPA)
                </h3>
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-4xl font-bold text-blue-400">N/A</p>
              <p className="text-sm text-theme-muted mt-2">
                Evaluation pending.
              </p>
            </motion.div>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-6">
              Recent Compliance Audits
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-black/20 rounded-xl border border-white/5 text-theme-muted">
                No recent audits found.
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Total Users",
                value:
                  trafficData.length > 0
                    ? trafficData.reduce(
                        (acc, curr) => acc + (curr.users || 0),
                        0,
                      )
                    : "0",
                change: "+0%",
                trend: "up",
                icon: Users,
                color: "text-blue-400",
              },
              {
                name: "Sessions",
                value:
                  trafficData.length > 0
                    ? trafficData.reduce(
                        (acc, curr) => acc + (curr.traffic || 0),
                        0,
                      )
                    : "0",
                change: "+0%",
                trend: "up",
                icon: MousePointerClick,
                color: "text-purple-400",
              },
              {
                name: "Avg. Session Duration",
                value: trafficData.length > 0 ? "1m 20s" : "0m 0s",
                change: "0%",
                trend: "down",
                icon: TrendingUp,
                color: "text-amber-400",
              },
              {
                name: "Bounce Rate",
                value: trafficData.length > 0 ? "45%" : "0%",
                change: "0%",
                trend: "up",
                icon: BarChart3,
                color: "text-emerald-400",
              },
            ].map((stat, i) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                key={stat.name}
                className="glassy-neumorphic rounded-2xl p-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-theme-muted font-medium text-sm">
                    {stat.name}
                  </h3>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="mt-4 flex items-baseline">
                  <p className="text-3xl font-bold text-theme-main">
                    {stat.value}
                  </p>
                  <p
                    className={`ml-2 flex items-baseline text-sm font-semibold ${stat.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight
                        className="self-center flex-shrink-0 h-4 w-4"
                        aria-hidden="true"
                      />
                    ) : (
                      <ArrowDownRight
                        className="self-center flex-shrink-0 h-4 w-4"
                        aria-hidden="true"
                      />
                    )}
                    <span className="sr-only">
                      {stat.trend === "up" ? "Increased" : "Decreased"} by
                    </span>
                    {stat.change}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart */}
            <div className="lg:col-span-2 glassy-neumorphic rounded-2xl p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-theme-main mb-6">
                Traffic Acquisition
              </h3>
              <div className="flex-1 min-h-[300px]">
                {trafficData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trafficData}>
                      <defs>
                        <linearGradient
                          id="colorTraffic"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#3b82f6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                        <linearGradient
                          id="colorSpend"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#8b5cf6"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#8b5cf6"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.05)"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="name"
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="var(--text-muted)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--bg-surface)",
                          borderColor: "rgba(255,255,255,0.1)",
                          color: "var(--text-main)",
                          borderRadius: "8px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="traffic"
                        stackId="1"
                        stroke="#3b82f6"
                        fill="url(#colorTraffic)"
                      />
                      <Area
                        type="monotone"
                        dataKey="spend"
                        stackId="1"
                        stroke="#8b5cf6"
                        fill="url(#colorSpend)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500">
                    No data available
                  </div>
                )}
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="glassy-neumorphic rounded-2xl p-6 flex flex-col">
              <h3 className="text-lg font-semibold text-theme-main mb-6">
                Device Breakdown
              </h3>
              <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
                {deviceData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={deviceData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {deviceData.map((entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "var(--bg-surface)",
                            borderColor: "rgba(255,255,255,0.1)",
                            color: "var(--text-main)",
                            borderRadius: "8px",
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                      <span className="text-2xl font-bold text-theme-main">
                        65%
                      </span>
                      <span className="text-xs text-theme-muted">Mobile</span>
                    </div>
                  </>
                ) : (
                  <div className="text-slate-500">No data available</div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {deviceData.map((device: any, i: number) => (
                  <div key={device.name}>
                    <div className="flex items-center justify-center mb-1">
                      <div
                        className="w-3 h-3 rounded-full mr-1.5"
                        style={{ backgroundColor: COLORS[i] }}
                      ></div>
                      <span className="text-xs text-theme-muted">
                        {device.name}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-theme-main">
                      {device.value}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Pages Table */}
          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-6">
              Top Performing Pages
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-theme-muted">
                <thead className="bg-black/20 text-xs uppercase text-theme-main">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-lg">Page Path</th>
                    <th className="px-6 py-4 text-right">Views</th>
                    <th className="px-6 py-4 text-right">Users</th>
                    <th className="px-6 py-4 text-right">Bounce Rate</th>
                    <th className="px-6 py-4 text-right rounded-tr-lg">
                      Conv. Rate
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-theme-muted"
                    >
                      No page data available.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
