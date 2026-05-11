import { useState, useRef, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Search, PenTool, Share2, BarChart3, 
  Zap, Settings as SettingsIcon, Bot, Menu, X, ChevronLeft, ChevronRight, Plus, Palette,
  Sparkles, BrainCircuit, LogIn, LogOut, User, Target,
  Rocket, Copy, PauseCircle, TrendingUp, TestTube,
  Users, DownloadCloud, UserPlus,
  FileText, MessageSquare, Image as ImageIcon, Video, Languages,
  Reply, Gift, Mail, Calendar, BellRing,
  PieChart, Activity, Bell
} from 'lucide-react';
import { clsx } from 'clsx';
import { useTheme } from '../context/ThemeContext';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import ProjectSwitcher from './ProjectSwitcher';
import LaunchCampaignModal from './LaunchCampaignModal';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Onboarding', href: '/onboarding', icon: Target },
  { name: 'SEO Engine', href: '/seo', icon: Search },
  { name: 'Content Gen', href: '/content', icon: PenTool },
  { name: 'Social Media', href: '/social', icon: Share2 },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Performance AI', href: '/performance', icon: Zap },
  { name: 'Automation Core', href: '/automation', icon: Bot },
  { name: 'AI Assistant', href: '/ai', icon: BrainCircuit },
  { name: 'Magic Tools', href: '/magic', icon: Sparkles },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isNotifPanelOpen, setIsNotifPanelOpen] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [isLaunchModalOpen, setIsLaunchModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { theme, setTheme } = useTheme();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigate = useNavigate();
  const constraintsRef = useRef(null);
  const { user, login, logout, isAuthReady } = useAuth();

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const quickActions = [
    // Campaign Management
    { name: 'Launch Campaign', desc: 'Deploy pre-configured campaigns across selected channels (Google, Meta, etc.)', icon: Rocket, category: 'Campaign Management', action: () => { setIsMenuOpen(false); setIsLaunchModalOpen(true); } },
    { name: 'Clone Campaign', desc: 'Duplicate existing campaigns with settings, creatives, and targeting intact', icon: Copy, category: 'Campaign Management', action: () => showToast('Campaign cloned successfully!') },
    { name: 'Pause/Resume', desc: 'Instantly control campaign activity based on performance or budget constraints', icon: PauseCircle, category: 'Campaign Management', action: () => showToast('Campaign status updated!') },
    { name: 'Scale Budget', desc: 'Increase/decrease budget allocation based on performance metrics', icon: TrendingUp, category: 'Campaign Management', action: () => showToast('Budget scaled successfully!') },
    { name: 'A/B Test', desc: 'Generate and launch multiple variations for controlled experimentation', icon: TestTube, category: 'Campaign Management', action: () => showToast('A/B test initiated!') },
    // Audience & Targeting
    { name: 'Smart Audience', desc: 'Build AI-driven audiences using behavioral and demographic data', icon: Users, category: 'Audience & Targeting', action: () => showToast('Smart audience created!') },
    { name: 'Import/Sync', desc: 'Upload CRM data or sync with external sources for targeting', icon: DownloadCloud, category: 'Audience & Targeting', action: () => showToast('Audience synced successfully!') },
    { name: 'Lookalike Audience', desc: 'Create similar audiences based on high-value user segments', icon: UserPlus, category: 'Audience & Targeting', action: () => showToast('Lookalike audience generated!') },
    // Content & Creative
    { name: 'Content Pack', desc: 'Create ad copies, captions, blogs, and hashtags automatically', icon: FileText, category: 'Content & Creative', action: () => showToast('Content pack generated!') },
    { name: 'Optimize Copy', desc: 'Improve messaging for higher engagement and conversion rates', icon: MessageSquare, category: 'Content & Creative', action: () => showToast('Ad copy optimized!') },
    { name: 'Creative Assets', desc: 'Produce images, banners, or ad visuals from existing inputs', icon: ImageIcon, category: 'Content & Creative', action: () => showToast('Creative assets generated!') },
    { name: 'Video Ad', desc: 'Convert text or product data into short-form video creatives', icon: Video, category: 'Content & Creative', action: () => showToast('Video ad created!') },
    { name: 'Translate Content', desc: 'Localize content into multiple languages for broader reach', icon: Languages, category: 'Content & Creative', action: () => showToast('Content translated successfully!') },
    // Lead Management
    { name: 'Auto Respond', desc: 'Trigger instant replies via email, WhatsApp, or SMS', icon: Reply, category: 'Lead Management', action: () => showToast('Auto-responder activated!') },
    { name: 'Lead Magnet', desc: 'Deliver gated assets (eBooks, offers) upon form submission', icon: Gift, category: 'Lead Management', action: () => showToast('Lead magnet sent!') },
    { name: 'Nurture Sequence', desc: 'Initiate automated drip campaigns for lead engagement', icon: Mail, category: 'Lead Management', action: () => showToast('Nurture sequence started!') },
    { name: 'Schedule Call', desc: 'Enable instant booking and calendar integration', icon: Calendar, category: 'Lead Management', action: () => showToast('Sales call scheduled!') },
    { name: 'Hot Lead Alert', desc: 'Alert sales team based on predefined intent signals', icon: BellRing, category: 'Lead Management', action: () => showToast('Hot lead notification sent!') },
    // Analytics & Optimization
    { name: 'Performance Snapshot', desc: 'Display real-time KPIs (CTR, CPC, ROI, conversions)', icon: PieChart, category: 'Analytics & Optimization', action: () => showToast('Performance snapshot generated!') },
    { name: 'Health Check', desc: 'Identify underperforming campaigns and recommend corrective actions', icon: Activity, category: 'Analytics & Optimization', action: () => showToast('Campaign health check completed!') },
  ];

  const filteredActions = quickActions.filter(action => 
    action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  useEffect(() => {
    const handleOpenModal = () => setIsLaunchModalOpen(true);
    window.addEventListener('open-launch-modal', handleOpenModal);
    return () => window.removeEventListener('open-launch-modal', handleOpenModal);
  }, []);

  return (
    <div className="flex h-screen bg-theme-base text-theme-main overflow-hidden transition-colors duration-500" ref={constraintsRef}>
      {/* Sidebar */}
      <div className={clsx(
        "border-r border-white/10 bg-theme-surface flex flex-col transition-all duration-300 relative z-50",
        isSidebarOpen ? "w-64" : "w-20"
      )}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-6 bg-theme-primary text-white rounded-full p-1 shadow-lg z-10 hover:bg-theme-primary-hover transition-colors"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="h-16 flex items-center px-4 border-b border-white/10 cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/')}>
          <Bot className="w-8 h-8 text-theme-primary flex-shrink-0" />
          {isSidebarOpen && (
            <div className="ml-3 flex flex-col">
              <span className="font-bold text-xl tracking-tight whitespace-nowrap">TriMatrix</span>
              <div className="flex items-center text-[10px] text-emerald-400 font-mono">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                SYSTEM ONLINE
              </div>
            </div>
          )}
        </div>
        
        <div className="p-4 space-y-2">
          {isSidebarOpen && <ProjectSwitcher />}
          <button 
            onClick={() => setIsCommandPaletteOpen(true)}
            className={clsx(
              "w-full flex items-center bg-white/5 border border-white/10 text-theme-muted rounded-lg transition-all hover:bg-white/10 hover:border-white/20",
              isSidebarOpen ? "px-3 py-2" : "p-2 justify-center"
            )}
            title="Search actions (⌘K)"
          >
            <Search className="w-4 h-4 flex-shrink-0" />
            {isSidebarOpen && (
              <div className="ml-2 flex flex-1 justify-between items-center">
                <span className="text-xs">Search...</span>
                <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded border border-white/10">⌘K</span>
              </div>
            )}
          </button>
          <button 
            onClick={() => navigate('/workflow')}
            className={clsx(
              "w-full flex items-center justify-center bg-theme-primary hover:bg-theme-primary-hover text-white rounded-lg transition-colors shadow-lg shadow-theme-primary/20",
              isSidebarOpen ? "px-4 py-2" : "p-2"
            )}
            title="Create a digital marketing workflow"
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            {isSidebarOpen && <span className="ml-2 text-sm font-medium whitespace-nowrap">Create Workflow</span>}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-3 space-y-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              className={({ isActive }) =>
                clsx(
                  isActive
                    ? 'bg-theme-primary/20 text-theme-primary'
                    : 'text-theme-muted hover:bg-white/5 hover:text-theme-main',
                  'group relative flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 hover:brightness-110'
                )
              }
            >
              <item.icon className="flex-shrink-0 h-5 w-5" aria-hidden="true" />
              {isSidebarOpen ? (
                <span className="ml-3 whitespace-nowrap">{item.name}</span>
              ) : (
                <span className="absolute left-14 bg-theme-surface border border-white/10 text-theme-main px-2 py-1 rounded-md text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                  {item.name}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        
        {/* User Profile / Login Section */}
        <div className="p-4 border-t border-white/10">
          {isAuthReady ? (
            user ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full flex-shrink-0" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-theme-primary/20 flex items-center justify-center flex-shrink-0">
                      <User size={16} className="text-theme-primary" />
                    </div>
                  )}
                  {isSidebarOpen && (
                    <div className="ml-3 truncate">
                      <p className="text-sm font-medium truncate">{user.displayName || 'User'}</p>
                      <p className="text-xs text-theme-muted truncate">{user.email}</p>
                    </div>
                  )}
                </div>
                {isSidebarOpen && (
                  <button onClick={logout} className="p-1.5 text-theme-muted hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors" title="Log out">
                    <LogOut size={16} />
                  </button>
                )}
              </div>
            ) : (
              <button 
                onClick={login}
                className={clsx(
                  "w-full flex items-center justify-center border border-theme-primary/50 hover:bg-theme-primary/10 text-theme-primary rounded-lg transition-colors",
                  isSidebarOpen ? "px-4 py-2" : "p-2"
                )}
                title="Log in with Google"
              >
                <LogIn className="w-5 h-5 flex-shrink-0" />
                {isSidebarOpen && <span className="ml-2 text-sm font-medium whitespace-nowrap">Log In</span>}
              </button>
            )
          ) : (
            <div className="flex items-center justify-center h-10">
              <div className="w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="min-h-full">
          <Outlet />
        </div>
      </main>

      {/* Top Right Floating Navigation Area */}
      <div className="fixed top-6 right-6 z-[60] flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsNotifPanelOpen(!isNotifPanelOpen);
            setIsMenuOpen(false);
          }}
          className="glassy-neumorphic p-3 rounded-full text-theme-main hover:text-theme-primary transition-colors shadow-xl shadow-black/50 relative"
        >
          <Bell size={24} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-theme-base">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </motion.button>
        <motion.button 
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsMenuOpen(!isMenuOpen);
            setIsNotifPanelOpen(false);
          }}
          className="glassy-neumorphic p-3 rounded-full text-theme-main hover:text-theme-primary transition-colors shadow-xl shadow-black/50"
        >
          <Menu size={24} />
        </motion.button>
      </div>

      {/* Notifications Slide-out Panel */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-80 lg:w-96 glassy-panel z-50 transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl",
        isNotifPanelOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold flex items-center">
            <Bell size={20} className="mr-2 text-theme-primary" />
            Notifications
          </h2>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="text-xs text-theme-primary hover:text-theme-primary-hover transition-colors"
              >
                Mark all read
              </button>
            )}
            <button onClick={() => setIsNotifPanelOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors ml-2">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="text-center py-10 flex flex-col items-center opacity-50">
              <Bell size={40} className="mb-4 text-theme-muted" />
              <p className="text-theme-muted mb-2">No notifications yet.</p>
            </div>
          ) : (
            notifications.map((notif: any) => (
              <div 
                key={notif.id} 
                onClick={() => {
                  if (!notif.read) markAsRead(notif.id);
                }}
                className={clsx(
                  "p-4 rounded-xl border transition-colors cursor-pointer",
                  notif.read ? "bg-black/20 border-white/5 opacity-70 hover:opacity-100" : "bg-black/40 border-theme-primary/30 hover:bg-black/50",
                  notif.type === 'error' ? 'border-l-4 border-l-rose-500' : 
                  notif.type === 'success' ? 'border-l-4 border-l-emerald-500' :
                  notif.type === 'warning' ? 'border-l-4 border-l-amber-500' :
                  'border-l-4 border-l-blue-500'
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={clsx("font-semibold text-sm", notif.read ? "text-theme-main" : "text-white")}>{notif.title}</h4>
                  {!notif.read && <span className="w-2 h-2 rounded-full bg-theme-primary flex-shrink-0 mt-1" />}
                </div>
                <p className="text-xs text-theme-muted line-clamp-2 leading-relaxed">{notif.message}</p>
                <div className="mt-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">{notif.category}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Slide-out Menu */}
      <div className={clsx(
        "fixed inset-y-0 right-0 w-80 glassy-panel z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
        isMenuOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Quick Actions</h2>
          <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          {showThemeSelector ? (
            <div className="space-y-4">
              <button 
                onClick={() => setShowThemeSelector(false)}
                className="flex items-center text-sm text-theme-muted hover:text-theme-main mb-4 transition-colors"
              >
                <ChevronLeft size={16} className="mr-1" /> Back to menu
              </button>
              <h3 className="font-medium mb-4">Select Theme</h3>
              <div className="grid grid-cols-5 gap-3">
                {Array.from({ length: 20 }, (_, i) => i + 1).map(t => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={clsx(
                      `theme-${t}`,
                      "aspect-square rounded-full border-2 transition-all overflow-hidden relative",
                      theme === t ? "border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "border-transparent hover:scale-105 shadow-lg"
                    )}
                    title={`Theme ${t}`}
                  >
                    <div className="absolute inset-0 bg-theme-base"></div>
                    <div className="absolute inset-0 bg-theme-primary opacity-80 rotate-45 transform translate-x-1/2"></div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(
                quickActions.reduce((acc, action) => {
                  if (!acc[action.category]) acc[action.category] = [];
                  acc[action.category].push(action);
                  return acc;
                }, {} as Record<string, typeof quickActions>)
              ).map(([category, actions]) => (
                <div key={category}>
                  <h4 className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-3">{category}</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {actions.map((action, idx) => (
                      <button 
                        key={idx} 
                        onClick={() => {
                          action.action();
                          setIsMenuOpen(false);
                        }}
                        className="glassy-neumorphic p-2 rounded-lg text-xs font-medium hover:text-theme-primary transition-colors flex flex-col items-center justify-center text-center gap-1 h-20"
                        title={action.desc}
                      >
                        <action.icon size={20} className="mb-1" />
                        <span className="line-clamp-2 leading-tight">{action.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setShowThemeSelector(true)}
                className="w-full mt-4 glassy-neumorphic py-3 rounded-lg text-sm font-medium flex items-center justify-center text-theme-primary transition-colors"
              >
                <Palette size={16} className="mr-2" />
                Theme Selector
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Overlay for menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={clsx(
              "fixed bottom-6 right-6 z-[70] px-6 py-3 rounded-lg shadow-xl text-white font-medium flex items-center",
              toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
            )}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Command Palette Modal */}
      <AnimatePresence>
        {isCommandPaletteOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setIsCommandPaletteOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 border-b border-white/10 flex items-center bg-black/20">
                <Search className="w-5 h-5 text-theme-primary mr-3" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder="Search actions, tools, or documentation..." 
                  className="bg-transparent border-none outline-none text-white w-full text-lg"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setIsCommandPaletteOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                  <X size={20} />
                </button>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
                {filteredActions.length > 0 ? (
                  <div className="space-y-1">
                    {filteredActions.map((action, idx) => (
                      <button 
                        key={idx}
                        onClick={() => {
                          action.action();
                          setIsCommandPaletteOpen(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center p-3 rounded-xl hover:bg-white/5 transition-colors group text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mr-4 group-hover:bg-theme-primary/20 transition-colors">
                          <action.icon className="w-5 h-5 text-theme-muted group-hover:text-theme-primary transition-colors" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-white group-hover:text-theme-primary transition-colors">{action.name}</div>
                          <div className="text-xs text-theme-muted line-clamp-1">{action.desc}</div>
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest ml-4">{action.category}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500">
                    <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No actions found for "{searchQuery}"</p>
                  </div>
                )}
              </div>
              
              <div className="p-3 border-t border-white/5 bg-black/40 flex justify-between items-center text-[10px] text-slate-500 font-bold tracking-widest">
                <div className="flex gap-4">
                  <span className="flex items-center"><span className="bg-white/10 px-1 rounded mr-1">↑↓</span> Navigate</span>
                  <span className="flex items-center"><span className="bg-white/10 px-1 rounded mr-1">Enter</span> Select</span>
                </div>
                <span className="flex items-center"><span className="bg-white/10 px-1 rounded mr-1">ESC</span> Close</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LaunchCampaignModal 
        isOpen={isLaunchModalOpen} 
        onClose={() => setIsLaunchModalOpen(false)} 
        onSuccess={() => showToast('Campaign successfully deployed to all selected channels!')} 
      />
    </div>
  );
}
