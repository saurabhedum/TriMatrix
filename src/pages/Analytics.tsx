import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Users, MousePointerClick, ArrowUpRight, ArrowDownRight,
  Globe, Share2, Search, Mail, Download, ShieldCheck, AlertTriangle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { motion } from 'motion/react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';

const COLORS = ['#3b82f6', '#8b5cf6', '#10b981'];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState('google');
  const { user } = useAuth();
  const { activeProject } = useProjects();
  const [trafficData, setTrafficData] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !activeProject) return;
    const qTraffic = query(collection(db, 'projects', activeProject.id, 'analytics'), where('uid', '==', user.uid), orderBy('createdAt', 'desc'), limit(7));
    const unsubscribe = onSnapshot(qTraffic, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTrafficData(data.reverse());
    });
    return () => unsubscribe();
  }, [user, activeProject]);

  const mockDevices = trafficData.length > 0 ? [
    { name: 'Mobile', value: Math.round(trafficData[0].traffic * 0.65) },
    { name: 'Desktop', value: Math.round(trafficData[0].traffic * 0.30) },
    { name: 'Tablet', value: Math.round(trafficData[0].traffic * 0.05) },
  ] : [];

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">Analytics & Tracking Engine</h1>
          <p className="text-theme-muted mt-1">Platform-wise performance metrics and insights.</p>
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
          { id: 'google', name: 'Google Analytics', icon: Globe },
          { id: 'social', name: 'Social Media', icon: Share2 },
          { id: 'seo', name: 'Search Console', icon: Search },
          { id: 'email', name: 'Email Campaigns', icon: Mail },
          { id: 'compliance', name: 'Ethical AI Compliance', icon: ShieldCheck },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id 
                ? 'bg-theme-primary text-white shadow-lg shadow-theme-primary/20' 
                : 'bg-black/20 text-theme-muted hover:bg-white/5 hover:text-theme-main border border-white/5'
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab === 'compliance' ? (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glassy-neumorphic rounded-2xl p-6 border border-emerald-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-theme-main font-semibold">Overall Compliance Score</h3>
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-4xl font-bold text-emerald-400">98%</p>
              <p className="text-sm text-theme-muted mt-2">Excellent standing across all active campaigns.</p>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glassy-neumorphic rounded-2xl p-6 border border-amber-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-theme-main font-semibold">Potential Bias Flags</h3>
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
              <p className="text-4xl font-bold text-amber-400">2</p>
              <p className="text-sm text-theme-muted mt-2">Minor language adjustments recommended in draft posts.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glassy-neumorphic rounded-2xl p-6 border border-blue-500/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-theme-main font-semibold">Data Privacy (GDPR/CCPA)</h3>
                <Globe className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-4xl font-bold text-blue-400">100%</p>
              <p className="text-sm text-theme-muted mt-2">All data collection methods are fully compliant.</p>
            </motion.div>
          </div>

          <div className="glassy-neumorphic rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-theme-main mb-6">Recent Compliance Audits</h3>
            <div className="space-y-4">
              {[
                { id: 1, title: 'Q3 Email Campaign Drafts', status: 'Passed', date: '2 hours ago', icon: Mail, color: 'text-emerald-400' },
                { id: 2, title: 'New Audience Targeting Model', status: 'Flagged - Review Needed', date: '5 hours ago', icon: Users, color: 'text-amber-400' },
                { id: 3, title: 'Social Media Content Calendar', status: 'Passed', date: '1 day ago', icon: Share2, color: 'text-emerald-400' },
              ].map(audit => (
                <div key={audit.id} className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/5">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg bg-white/5 mr-4`}>
                      <audit.icon className={`w-5 h-5 ${audit.color}`} />
                    </div>
                    <div>
                      <p className="text-theme-main font-medium">{audit.title}</p>
                      <p className="text-xs text-theme-muted">{audit.date}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium px-3 py-1 rounded-full ${audit.status === 'Passed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                    {audit.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { name: 'Total Users', value: '124.5K', change: '+12.5%', trend: 'up', icon: Users, color: 'text-blue-400' },
          { name: 'Sessions', value: '145.2K', change: '+8.2%', trend: 'up', icon: MousePointerClick, color: 'text-purple-400' },
          { name: 'Avg. Session Duration', value: '2m 45s', change: '-0.4%', trend: 'down', icon: TrendingUp, color: 'text-amber-400' },
          { name: 'Bounce Rate', value: '42.1%', change: '-2.1%', trend: 'up', icon: BarChart3, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.name} 
            className="glassy-neumorphic rounded-2xl p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-theme-muted font-medium text-sm">{stat.name}</h3>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="mt-4 flex items-baseline">
              <p className="text-3xl font-bold text-theme-main">{stat.value}</p>
              <p className={`ml-2 flex items-baseline text-sm font-semibold ${stat.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="self-center flex-shrink-0 h-4 w-4" aria-hidden="true" />
                ) : (
                  <ArrowDownRight className="self-center flex-shrink-0 h-4 w-4" aria-hidden="true" />
                )}
                <span className="sr-only">{stat.trend === 'up' ? 'Increased' : 'Decreased'} by</span>
                {stat.change}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <div className="lg:col-span-2 glassy-neumorphic rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-theme-main mb-6">Traffic Acquisition</h3>
          <div className="flex-1 min-h-[300px]">
            {trafficData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="traffic" stackId="1" stroke="#3b82f6" fill="url(#colorTraffic)" />
                  <Area type="monotone" dataKey="spend" stackId="1" stroke="#8b5cf6" fill="url(#colorSpend)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">No data available</div>
            )}
          </div>
        </div>

        {/* Device Breakdown */}
        <div className="glassy-neumorphic rounded-2xl p-6 flex flex-col">
          <h3 className="text-lg font-semibold text-theme-main mb-6">Device Breakdown</h3>
          <div className="flex-1 min-h-[200px] flex items-center justify-center relative">
            {mockDevices.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={mockDevices}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {mockDevices.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-main)', borderRadius: '8px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none flex-col">
                  <span className="text-2xl font-bold text-theme-main">65%</span>
                  <span className="text-xs text-theme-muted">Mobile</span>
                </div>
              </>
            ) : (
              <div className="text-slate-500">No data available</div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            {mockDevices.map((device: any, i: number) => (
              <div key={device.name}>
                <div className="flex items-center justify-center mb-1">
                  <div className="w-3 h-3 rounded-full mr-1.5" style={{ backgroundColor: COLORS[i] }}></div>
                  <span className="text-xs text-theme-muted">{device.name}</span>
                </div>
                <span className="text-sm font-semibold text-theme-main">{device.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Pages Table */}
      <div className="glassy-neumorphic rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-theme-main mb-6">Top Performing Pages</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-theme-muted">
            <thead className="bg-black/20 text-xs uppercase text-theme-main">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Page Path</th>
                <th className="px-6 py-4 text-right">Views</th>
                <th className="px-6 py-4 text-right">Users</th>
                <th className="px-6 py-4 text-right">Bounce Rate</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Conv. Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                { path: '/blog/ai-marketing-trends', views: '12,450', users: '9,230', bounce: '32%', conv: '4.2%' },
                { path: '/tools/seo-analyzer', views: '8,230', users: '6,100', bounce: '28%', conv: '8.5%' },
                { path: '/pricing', views: '5,120', users: '4,800', bounce: '45%', conv: '12.1%' },
                { path: '/blog/content-generation', views: '4,890', users: '3,900', bounce: '38%', conv: '3.1%' },
                { path: '/about', views: '2,100', users: '1,850', bounce: '52%', conv: '1.2%' },
              ].map((page, i) => (
                <tr key={i} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-4 font-medium text-theme-primary truncate max-w-[200px]">{page.path}</td>
                  <td className="px-6 py-4 text-right text-theme-main">{page.views}</td>
                  <td className="px-6 py-4 text-right text-theme-main">{page.users}</td>
                  <td className="px-6 py-4 text-right text-theme-main">{page.bounce}</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-medium">{page.conv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}
