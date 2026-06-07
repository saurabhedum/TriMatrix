import React, { useState } from "react";
import {
  Key,
  Link,
  ToggleRight,
  Save,
  Shield,
  Bell,
  BarChart3,
  Search,
  Twitter,
  Linkedin,
  Youtube,
  Instagram,
  Zap,
  Facebook,
  Mail,
  MessageSquare,
  Video,
  Music,
  Image as ImageIcon,
  Briefcase,
  Globe,
  Plus,
  Trash2,
  Building2,
  Database,
  Loader2,
} from "lucide-react";
import { motion } from "motion/react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { collection, addDoc } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("api");

  const [apiKeys, setApiKeys] = useLocalStorage("trimatrix_api_keys", [
    {
      id: "openai",
      name: "OpenAI API Key",
      value: "",
      desc: "Used for content generation and performance AI.",
    },
    {
      id: "anthropic",
      name: "Anthropic API Key",
      value: "",
      desc: "Alternative LLM for complex reasoning tasks.",
    },
    {
      id: "gcloud",
      name: "Google Cloud JSON Key",
      value: "",
      desc: "Required for Google Analytics & Search Console integration.",
    },
    {
      id: "ahrefs",
      name: "Ahrefs API Key",
      value: "",
      desc: "Used for advanced SEO backlink and keyword data.",
    },
    {
      id: "semrush",
      name: "SEMrush API Key",
      value: "",
      desc: "Alternative SEO data provider.",
    },
    {
      id: "sendgrid",
      name: "SendGrid API Key",
      value: "",
      desc: "Used for transactional email delivery.",
    },
  ]);

  const [automationToggles, setAutomationToggles] = useLocalStorage(
    "trimatrix_automation_toggles_v2",
    [
      {
        id: "auto_publish",
        name: "Auto Publish",
        desc: "Let AI post without asking.",
        iconName: "Shield",
        color: "text-indigo-400",
        enabled: false,
      },
      {
        id: "auto_ab",
        name: "Auto Testing",
        desc: "Test different versions of your pages to see what works.",
        iconName: "Zap",
        color: "text-amber-400",
        enabled: true,
      },
      {
        id: "critical_alerts",
        name: "Only Important Alerts",
        desc: "Only tell me when something is broken.",
        iconName: "Bell",
        color: "text-emerald-400",
        enabled: true,
      },
      {
        id: "auto_reply",
        name: "Auto-Reply to Comments",
        desc: "Allow AI to reply to positive social media comments automatically.",
        iconName: "MessageSquare",
        color: "text-blue-400",
        enabled: false,
      },
      {
        id: "dynamic_budget",
        name: "Smart Budget",
        desc: "Move money to ads that work best.",
        iconName: "BarChart3",
        color: "text-purple-400",
        enabled: false,
      },
      {
        id: "auto_seo",
        name: "Auto SEO",
        desc: "Let AI fix SEO for your site automatically.",
        iconName: "Search",
        color: "text-sky-400",
        enabled: true,
      },
    ],
  );

  const iconMap: { [key: string]: any } = {
    Shield,
    Zap,
    Bell,
    MessageSquare,
    BarChart3,
    Search,
  };

  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyDesc, setNewKeyDesc] = useState("");
  const [isAddingKey, setIsAddingKey] = useState(false);

  // API Tester State
  const [testUrl, setTestUrl] = useState("");
  const [testMethod, setTestMethod] = useState("GET");
  const [testHeaders, setTestHeaders] = useState(
    '{\n  "Content-Type": "application/json"\n}',
  );
  const [testBody, setTestBody] = useState("{}");
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingApi, setIsTestingApi] = useState(false);

  const testCustomApi = async () => {
    setIsTestingApi(true);
    setTestResult(null);
    try {
      let parsedHeaders = {};
      try {
        if (testHeaders.trim()) parsedHeaders = JSON.parse(testHeaders);
      } catch (e) {
        throw new Error("Invalid JSON in Headers");
      }

      const options: RequestInit = {
        method: testMethod,
        headers: parsedHeaders,
      };

      if (testMethod !== "GET" && testMethod !== "HEAD") {
        try {
          if (testBody.trim()) {
            // Validate JSON but send as string
            JSON.parse(testBody);
            options.body = testBody;
          }
        } catch (e) {
          throw new Error("Invalid JSON in Body");
        }
      }

      const response = await fetch(testUrl, options);
      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      setTestResult({
        status: response.status,
        statusText: response.statusText,
        data,
      });
    } catch (err: any) {
      setTestResult({ error: err.message || "Network error or CORS issue." });
    } finally {
      setIsTestingApi(false);
    }
  };

  const handleApiKeyChange = (id: string, value: string) => {
    setApiKeys(apiKeys.map((k: any) => (k.id === id ? { ...k, value } : k)));
  };

  const removeApiKey = (id: string) => {
    setApiKeys(apiKeys.filter((k: any) => k.id !== id));
  };

  const addApiKey = () => {
    if (!newKeyName.trim()) return;
    const newId = newKeyName.toLowerCase().replace(/\s+/g, "_");
    setApiKeys([
      ...apiKeys,
      { id: newId, name: newKeyName, value: "", desc: newKeyDesc },
    ]);
    setNewKeyName("");
    setNewKeyDesc("");
    setIsAddingKey(false);
  };

  const [businessProfile, setBusinessProfile] = useLocalStorage(
    "trimatrix_business_profile",
    {
      companyName: "",
      industry: "",
      targetAudience: "",
      mainGoals: "",
      brandVoice: "",
    },
  );

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [ga4PropertyId, setGa4PropertyId] = useState(() => {
    return apiKeys.find((k: any) => k.id === "google_analytics")?.value || "";
  });

  const handleSaveGa4 = () => {
    const exists = apiKeys.find((k: any) => k.id === "google_analytics");
    if (exists) {
      setApiKeys(
        apiKeys.map((k: any) =>
          k.id === "google_analytics" ? { ...k, value: ga4PropertyId } : k,
        ),
      );
    } else {
      setApiKeys([
        ...apiKeys,
        {
          id: "google_analytics",
          name: "Google Analytics 4",
          value: ga4PropertyId,
          desc: "Used for GA4 tracking and reports.",
        },
      ]);
    }
    setExpandedPlatform(null);
  };

  const [notificationPrefs, setNotificationPrefs] = useLocalStorage(
    "trimatrix_notification_prefs",
    {
      emailAlerts: true,
      inAppAlerts: true,
      kpiAlerts: true,
      automationAlerts: true,
      systemAlerts: true,
      weeklyDigest: false,
    },
  );

  const { user } = useAuth();

  const handleNotifPrefChange = (field: string) => {
    setNotificationPrefs({
      ...notificationPrefs,
      [field]: !(notificationPrefs as any)[field],
    });
  };

  const handleProfileChange = (field: string, value: string) => {
    setBusinessProfile({ ...businessProfile, [field]: value });
  };

  const saveProfile = () => {
    setIsSavingProfile(true);
    setTimeout(() => setIsSavingProfile(false), 800);
  };

  const handleToggleChange = (id: string) => {
    setAutomationToggles(
      automationToggles.map((t: any) =>
        t.id === id ? { ...t, enabled: !t.enabled } : t,
      ),
    );
  };

  const platforms = [
    {
      id: "google_analytics",
      name: "Google Analytics 4",
      icon: BarChart3,
      color: "text-amber-500",
    },
    {
      id: "google_search_console",
      name: "Google Search Console",
      icon: Search,
      color: "text-blue-500",
    },
    {
      id: "social_instagram",
      name: "Instagram Graph API",
      icon: Instagram,
      color: "text-pink-500",
    },
    {
      id: "social_whatsapp",
      name: "WhatsApp Business API",
      icon: MessageSquare,
      color: "text-emerald-500",
    },
    {
      id: "mailchimp",
      name: "Mailchimp API",
      icon: Mail,
      color: "text-yellow-500",
    },
    {
      id: "salesforce",
      name: "Salesforce API",
      icon: Briefcase,
      color: "text-blue-400",
    },
    {
      id: "wordpress",
      name: "WordPress API",
      icon: Globe,
      color: "text-blue-300",
    },
  ].map((p) => ({
    ...p,
    status: apiKeys.find((k: any) => k.id === p.id)
      ? "Connected"
      : "Disconnected",
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6 lg:p-8">
      <div>
        <h1 className="text-3xl font-bold text-theme-main tracking-tight">
          Settings
        </h1>
        <p className="text-theme-muted mt-2">
          Manage your account, tools, and auto-settings.
        </p>
      </div>

      <div className="flex border-b border-white/10 overflow-x-auto custom-scrollbar pb-px">
        {[
          { id: "api", name: "Keys", icon: Key },
          { id: "integrations", name: "Connections", icon: Link },
          { id: "api_testing", name: "Test Settings", icon: Zap },
          { id: "automation", name: "Auto-Settings", icon: ToggleRight },
          { id: "notifications", name: "Alerts", icon: Bell },
          { id: "business", name: "Business Info", icon: Building2 },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap flex items-center ${
              activeTab === tab.id
                ? "border-theme-primary text-theme-primary bg-theme-primary/5"
                : "border-transparent text-theme-muted hover:text-theme-main hover:border-white/20 hover:bg-white/5"
            }`}
          >
            <tab.icon className="w-4 h-4 mr-2" />
            {tab.name}
          </button>
        ))}
      </div>

      <div className="glassy-neumorphic rounded-2xl p-6 lg:p-8">
        {activeTab === "api" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-theme-main flex items-center">
                <Key className="w-5 h-5 mr-2 text-theme-primary" />
                Keys & Services
              </h3>
              <button
                onClick={() => setIsAddingKey(!isAddingKey)}
                className="flex items-center text-sm text-theme-primary hover:text-theme-primary-hover transition-colors"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Custom Key
              </button>
            </div>

            {isAddingKey && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-theme-primary/10 rounded-xl border border-theme-primary/20 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g., Custom Provider API"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={newKeyDesc}
                    onChange={(e) => setNewKeyDesc(e.target.value)}
                    placeholder="What is this key used for?"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingKey(false)}
                    className="px-4 py-2 text-sm text-theme-muted hover:text-theme-main transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addApiKey}
                    className="px-4 py-2 text-sm bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover transition-colors"
                  >
                    Add Key
                  </button>
                </div>
              </motion.div>
            )}

            <div className="space-y-6">
              {apiKeys.map((key: any) => (
                <div
                  key={key.id}
                  className="p-4 bg-black/20 rounded-xl border border-white/5 relative group"
                >
                  <button
                    onClick={() => removeApiKey(key.id)}
                    className="absolute top-4 right-4 text-theme-muted hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove Key"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <label className="block text-sm font-medium text-theme-main mb-2 pr-8">
                    {key.name}
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="password"
                      value={key.value}
                      onChange={(e) =>
                        handleApiKeyChange(key.id, e.target.value)
                      }
                      placeholder="Enter API Key"
                      className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary focus:border-transparent transition-all"
                    />
                    <button className="bg-white/5 hover:bg-white/10 text-theme-main px-6 py-3 rounded-xl border border-white/10 transition-colors font-medium whitespace-nowrap">
                      {key.value ? "Update" : "Connect"}
                    </button>
                  </div>
                  <p className="text-xs text-theme-muted mt-2">{key.desc}</p>
                </div>
              ))}
            </div>

            <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
              <button className="bg-theme-primary hover:bg-theme-primary-hover text-white px-6 py-3 rounded-xl flex items-center transition-all shadow-lg shadow-theme-primary/20 font-medium">
                <Save className="w-5 h-5 mr-2" />
                Save All Changes
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === "integrations" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-theme-main flex items-center">
                <Link className="w-5 h-5 mr-2 text-theme-primary" />
                Platform Connections
              </h3>
              <span className="text-sm text-theme-muted bg-black/20 px-3 py-1 rounded-full border border-white/5">
                {platforms.filter((p) => p.status === "Connected").length} /{" "}
                {platforms.length} Connected
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="flex flex-col p-4 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div
                        className={`w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center mr-4 ${platform.color}`}
                      >
                        <platform.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-theme-main">
                          {platform.name}
                        </h4>
                        <span
                          className={`text-xs font-medium ${platform.status === "Connected" ? "text-emerald-400" : "text-theme-muted"}`}
                        >
                          {platform.status}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (platform.id === "google_analytics") {
                          setExpandedPlatform(
                            expandedPlatform === platform.id
                              ? null
                              : platform.id,
                          );
                        }
                      }}
                      className={`px-4 py-2 text-xs font-medium rounded-lg transition-all border ${
                        platform.status === "Connected"
                          ? "bg-black/40 text-theme-muted hover:text-white border-white/10 hover:border-white/20"
                          : "bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 border-theme-primary/20"
                      }`}
                    >
                      {platform.id === "google_analytics" &&
                      expandedPlatform === platform.id
                        ? "Cancel"
                        : platform.status === "Connected"
                          ? "Manage"
                          : "Connect"}
                    </button>
                  </div>
                  {platform.id === "google_analytics" &&
                    expandedPlatform === platform.id && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 pt-4 border-t border-white/10"
                      >
                        <label className="block text-sm font-medium text-theme-main mb-2">
                          GA4 Property ID
                        </label>
                        <div className="flex space-x-3">
                          <input
                            type="text"
                            value={ga4PropertyId}
                            onChange={(e) => setGa4PropertyId(e.target.value)}
                            placeholder="e.g., 123456789"
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                          />
                          <button
                            onClick={handleSaveGa4}
                            className="bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 rounded-xl transition-all shadow-lg shadow-theme-primary/20 font-medium whitespace-nowrap"
                          >
                            Save
                          </button>
                        </div>
                        <p className="text-xs text-theme-muted mt-2">
                          Find your Property ID in Google Analytics Admin &gt;
                          Property Settings.
                        </p>
                      </motion.div>
                    )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === "api_testing" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <h3 className="text-xl font-semibold text-theme-main flex items-center mb-4">
              <Zap className="w-5 h-5 mr-2 text-theme-primary" />
              Custom API Tester
            </h3>
            <p className="text-sm text-theme-muted mb-6">
              Test your custom webhooks or third-party APIs (including WhatsApp,
              Twilio, etc.) live to ensure they connect perfectly to actual
              devices.
            </p>

            <div className="bg-black/20 p-6 rounded-xl border border-white/5 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="w-full md:w-1/4">
                  <label className="block text-sm font-medium text-theme-main mb-1">
                    Method
                  </label>
                  <select
                    value={testMethod}
                    onChange={(e) => setTestMethod(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                </div>
                <div className="w-full md:w-3/4">
                  <label className="block text-sm font-medium text-theme-main mb-1">
                    Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={testUrl}
                    onChange={(e) => setTestUrl(e.target.value)}
                    placeholder="https://api.whatsapp.com/v1/messages"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-main mb-1">
                  Headers (JSON)
                </label>
                <textarea
                  value={testHeaders}
                  onChange={(e) => setTestHeaders(e.target.value)}
                  rows={4}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all font-mono text-sm resize-none custom-scrollbar"
                />
              </div>

              {testMethod !== "GET" && testMethod !== "HEAD" && (
                <div>
                  <label className="block text-sm font-medium text-theme-main mb-1">
                    Body (JSON)
                  </label>
                  <textarea
                    value={testBody}
                    onChange={(e) => setTestBody(e.target.value)}
                    rows={6}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-theme-main focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all font-mono text-sm resize-none custom-scrollbar"
                    placeholder='{"message": "Hello World"}'
                  />
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  onClick={testCustomApi}
                  disabled={!testUrl || isTestingApi}
                  className="bg-theme-primary hover:bg-theme-primary-hover disabled:bg-theme-muted disabled:text-gray-500 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-medium transition-colors flex items-center shadow-lg shadow-theme-primary/20"
                >
                  {isTestingApi ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Testing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" /> Send Request
                    </>
                  )}
                </button>
              </div>
            </div>

            {testResult && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-black/30 rounded-xl border border-white/10 p-4"
              >
                <h4 className="text-sm font-semibold text-theme-main mb-2">
                  Response:
                </h4>
                {testResult.error ? (
                  <div className="text-rose-400 text-sm font-mono">
                    {testResult.error}
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${testResult.status >= 200 && testResult.status < 300 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"}`}
                      >
                        {testResult.status} {testResult.statusText}
                      </span>
                    </div>
                    <pre className="text-xs text-theme-muted font-mono overflow-x-auto custom-scrollbar p-3 bg-black/50 rounded-lg">
                      {typeof testResult.data === "object"
                        ? JSON.stringify(testResult.data, null, 2)
                        : testResult.data}
                    </pre>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {activeTab === "automation" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <h3 className="text-xl font-semibold text-theme-main flex items-center">
              <ToggleRight className="w-5 h-5 mr-2 text-theme-primary" />
              Global Automation Toggles
            </h3>

            <div className="space-y-4">
              {automationToggles.map((toggle: any) => (
                <div
                  key={toggle.id}
                  className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors"
                >
                  <div className="pr-4">
                    <h4 className="text-sm font-medium text-theme-main flex items-center mb-1">
                      {React.createElement(iconMap[toggle.iconName], {
                        className: `w-4 h-4 mr-2 ${toggle.color}`,
                      })}
                      {toggle.name}
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      {toggle.desc}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={toggle.enabled}
                      onChange={() => handleToggleChange(toggle.id)}
                    />
                    <div className="w-11 h-6 bg-black/40 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-white peer-checked:border-theme-primary"></div>
                  </label>
                </div>
              ))}
            </div>
            <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
              <button className="bg-theme-primary hover:bg-theme-primary-hover text-white px-6 py-3 rounded-xl flex items-center transition-all shadow-lg shadow-theme-primary/20 font-medium">
                <Save className="w-5 h-5 mr-2" />
                Save Preferences
              </button>
            </div>
          </motion.div>
        )}
        {activeTab === "notifications" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <h3 className="text-xl font-semibold text-theme-main flex items-center">
              <Bell className="w-5 h-5 mr-2 text-theme-primary" />
              Notification Preferences
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-theme-muted uppercase tracking-wider mb-2">
                  Delivery Methods
                </h4>

                <div className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="pr-4">
                    <h4 className="text-sm font-medium text-theme-main flex items-center mb-1">
                      <Mail className="w-4 h-4 mr-2 text-blue-400" />
                      Email Alerts
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      Receive notifications directly to your connected email
                      address.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationPrefs.emailAlerts}
                      onChange={() => handleNotifPrefChange("emailAlerts")}
                    />
                    <div className="w-11 h-6 bg-black/40 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-white peer-checked:border-theme-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="pr-4">
                    <h4 className="text-sm font-medium text-theme-main flex items-center mb-1">
                      <Bell className="w-4 h-4 mr-2 text-emerald-400" />
                      In-App Notifications
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      Show notifications in the app's slide-out panel.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationPrefs.inAppAlerts}
                      onChange={() => handleNotifPrefChange("inAppAlerts")}
                    />
                    <div className="w-11 h-6 bg-black/40 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-white peer-checked:border-theme-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="pr-4">
                    <h4 className="text-sm font-medium text-theme-main flex items-center mb-1">
                      <Briefcase className="w-4 h-4 mr-2 text-purple-400" />
                      Weekly Digest
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      A summary of the most important events at the end of the
                      week.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationPrefs.weeklyDigest}
                      onChange={() => handleNotifPrefChange("weeklyDigest")}
                    />
                    <div className="w-11 h-6 bg-black/40 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-white peer-checked:border-theme-primary"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-theme-muted uppercase tracking-wider mb-2">
                  Notification Categories
                </h4>

                <div className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="pr-4">
                    <h4 className="text-sm font-medium text-theme-main flex items-center mb-1">
                      <BarChart3 className="w-4 h-4 mr-2 text-indigo-400" />
                      KPI Alerts
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      Get notified when key performance indicators drop or
                      spike.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationPrefs.kpiAlerts}
                      onChange={() => handleNotifPrefChange("kpiAlerts")}
                    />
                    <div className="w-11 h-6 bg-black/40 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-white peer-checked:border-theme-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="pr-4">
                    <h4 className="text-sm font-medium text-theme-main flex items-center mb-1">
                      <Zap className="w-4 h-4 mr-2 text-amber-400" />
                      Automation Events
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      Alerts for workflow successes, failures, and critical
                      blocks.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationPrefs.automationAlerts}
                      onChange={() => handleNotifPrefChange("automationAlerts")}
                    />
                    <div className="w-11 h-6 bg-black/40 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-white peer-checked:border-theme-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-5 bg-black/20 rounded-xl border border-white/5 hover:bg-white/5 transition-colors">
                  <div className="pr-4">
                    <h4 className="text-sm font-medium text-theme-main flex items-center mb-1">
                      <Shield className="w-4 h-4 mr-2 text-sky-400" />
                      System Errors
                    </h4>
                    <p className="text-xs text-theme-muted leading-relaxed">
                      Critical database errors, API connection drops, and
                      security updates.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={notificationPrefs.systemAlerts}
                      onChange={() => handleNotifPrefChange("systemAlerts")}
                    />
                    <div className="w-11 h-6 bg-black/40 border border-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-theme-muted after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-white peer-checked:border-theme-primary"></div>
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/10 flex justify-end">
              <button className="bg-theme-primary hover:bg-theme-primary-hover text-white px-6 py-3 rounded-xl flex items-center transition-all shadow-lg shadow-theme-primary/20 font-medium">
                <Save className="w-5 h-5 mr-2" />
                Save Preferences
              </button>
            </div>
          </motion.div>
        )}
        {activeTab === "business" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-theme-main flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-theme-primary" />
                Business Profile
              </h3>
              <button
                onClick={saveProfile}
                className="bg-theme-primary hover:bg-theme-primary-hover text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-lg shadow-theme-primary/20"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSavingProfile ? "Saved!" : "Save Profile"}
              </button>
            </div>
            <p className="text-sm text-theme-muted mb-6">
              This information is used by the AI to provide tailored
              suggestions, generate relevant content, and optimize campaigns
              specifically for your business needs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme-main mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={businessProfile.companyName}
                  onChange={(e) =>
                    handleProfileChange("companyName", e.target.value)
                  }
                  placeholder="e.g., Acme Corp"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-theme-main mb-2">
                  Industry / Niche
                </label>
                <input
                  type="text"
                  value={businessProfile.industry}
                  onChange={(e) =>
                    handleProfileChange("industry", e.target.value)
                  }
                  placeholder="e.g., B2B SaaS, E-commerce"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-main mb-2">
                  Target Audience
                </label>
                <textarea
                  value={businessProfile.targetAudience}
                  onChange={(e) =>
                    handleProfileChange("targetAudience", e.target.value)
                  }
                  placeholder="Describe your ideal customers (demographics, pain points, etc.)"
                  rows={3}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-main mb-2">
                  Main Business Goals
                </label>
                <textarea
                  value={businessProfile.mainGoals}
                  onChange={(e) =>
                    handleProfileChange("mainGoals", e.target.value)
                  }
                  placeholder="e.g., Increase brand awareness, generate 500 leads/month"
                  rows={2}
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none resize-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-main mb-2">
                  Brand Voice & Tone
                </label>
                <input
                  type="text"
                  value={businessProfile.brandVoice}
                  onChange={(e) =>
                    handleProfileChange("brandVoice", e.target.value)
                  }
                  placeholder="e.g., Professional yet conversational, authoritative"
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-theme-main focus:ring-2 focus:ring-theme-primary outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
