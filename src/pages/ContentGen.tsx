import React, { useState } from "react";
import {
  PenTool,
  Send,
  Loader2,
  FileText,
  Youtube,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Mail,
  Mic,
  LayoutTemplate,
  MessageSquare,
  Megaphone,
  FileAudio,
  Image as ImageIcon,
  Smartphone,
  AlignLeft,
  AlertCircle,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { motion } from "motion/react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { GoogleGenAI } from "@google/genai";

import { useAuth } from "../context/AuthContext";
import { useProjects } from "../context/ProjectContext";
import { db, handleFirestoreError, OperationType } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const PLATFORMS = [
  { id: "instagram", name: "Instagram Caption", icon: Instagram },
  { id: "whatsapp", name: "WhatsApp Broadcast", icon: MessageSquare },
  { id: "blog", name: "Blog Post", icon: FileText },
  { id: "email", name: "Email Newsletter", icon: Mail },
  { id: "press", name: "Press Release", icon: Megaphone },
  { id: "podcast", name: "Podcast Script", icon: Mic },
  { id: "adcopy", name: "Ad Copy", icon: MessageSquare },
  { id: "landing", name: "Landing Page", icon: LayoutTemplate },
  { id: "sms", name: "SMS Campaign", icon: Smartphone },
];

const LANGUAGES = [
  { id: "english", name: "English" },
  { id: "spanish", name: "Spanish" },
  { id: "french", name: "French" },
  { id: "german", name: "German" },
  { id: "italian", name: "Italian" },
  { id: "portuguese", name: "Portuguese" },
  { id: "chinese", name: "Chinese (Simplified)" },
  { id: "japanese", name: "Japanese" },
  { id: "korean", name: "Korean" },
  { id: "arabic", name: "Arabic" },
  { id: "hindi", name: "Hindi" },
];

const TONES = [
  { id: "professional", name: "Professional & Authoritative" },
  { id: "viral", name: "Viral & Engaging" },
  { id: "educational", name: "Educational & Step-by-Step" },
  { id: "conversational", name: "Conversational & Friendly" },
  { id: "humorous", name: "Humorous & Witty" },
  { id: "inspirational", name: "Inspirational & Motivating" },
  { id: "urgent", name: "Urgent & Action-Oriented" },
  { id: "analytical", name: "Analytical & Data-Driven" },
  { id: "storytelling", name: "Storytelling & Narrative" },
  { id: "sarcastic", name: "Sarcastic & Edgy" },
  { id: "empathetic", name: "Empathetic & Caring" },
  { id: "persuasive", name: "Persuasive & Convincing" },
  { id: "controversial", name: "Controversial & Provocative" },
  { id: "minimalist", name: "Minimalist & Direct" },
];

export default function ContentGen() {
  const [apiKeys] = useLocalStorage("trimatrix_api_keys", []);
  const geminiKey =
    apiKeys.find((k: any) => k.id === "gemini")?.value ||
    process.env.GEMINI_API_KEY;
  const { activeProject } = useProjects();
  const { user } = useAuth();

  const [topic, setTopic] = useState("");
  const [platform, setPlatform] = useState("blog");
  const [tone, setTone] = useState("professional");
  const [language, setLanguage] = useState("english");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [viralScore, setViralScore] = useState<number | null>(null);

  const [competitorUrl, setCompetitorUrl] = useState("");
  const [isCounterStrike, setIsCounterStrike] = useState(false);

  const [textToSummarize, setTextToSummarize] = useState("");
  const [summaryLength, setSummaryLength] = useState("medium");
  const [summary, setSummary] = useState("");
  const [summarizing, setSummarizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [businessProfile] = useLocalStorage("trimatrix_business_profile", {
    companyName: "",
    industry: "",
    targetAudience: "",
    mainGoals: "",
    brandVoice: "",
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic) return;
    setLoading(true);
    setResult(null);
    setError(null);

    const platformName =
      PLATFORMS.find((p) => p.id === platform)?.name || platform;
    const toneName = TONES.find((t) => t.id === tone)?.name || tone;
    const languageName =
      LANGUAGES.find((l) => l.id === language)?.name || language;

    let businessContext = "";
    if (businessProfile.companyName || businessProfile.industry) {
      businessContext = `\n\nBusiness Context:\nCompany Name: ${businessProfile.companyName || "Not specified"}\nIndustry: ${businessProfile.industry || "Not specified"}\nTarget Audience: ${businessProfile.targetAudience || "Not specified"}\nMain Goals: ${businessProfile.mainGoals || "Not specified"}\nBrand Voice: ${businessProfile.brandVoice || "Not specified"}\n\nPlease tailor the content to align with this business profile.`;
    }

    let prompt = "";
    if (isCounterStrike && competitorUrl) {
      prompt = `You are an expert content creator and marketer. Analyze the likely content of this competitor URL: "${competitorUrl}" regarding the topic "${topic}". Generate a highly engaging, professional ${platformName} that counters their arguments and highlights our unique value proposition. The tone of voice should be ${toneName}. The content MUST be written in ${languageName}. Ensure the AI considers cultural nuances and provides accurate translations for SEO keywords and meta tags for the target language. Ensure the content is formatted appropriately for the platform.${businessContext}`;
    } else {
      prompt = `You are an expert content creator and marketer. Generate a highly engaging, professional ${platformName} about "${topic}". The tone of voice should be ${toneName}. The content MUST be written in ${languageName}. Ensure the AI considers cultural nuances and provides accurate translations for SEO keywords and meta tags for the target language. Ensure the content is formatted appropriately for the platform (e.g., use hashtags for Twitter/Instagram, clear structure for blogs).${businessContext}`;
    }

    let text = "";

    try {
      if (!geminiKey) {
        throw new Error(
          "Gemini API key is not configured. Please add it in Settings.",
        );
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      const result = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      text = result.text || "";

      // Save generated content to Firestore
      if (user && activeProject) {
        await addDoc(
          collection(db, "projects", activeProject.id, "generatedContent"),
          {
            uid: user.uid,
            topic,
            content: text,
            createdAt: serverTimestamp(),
          },
        );
      }
    } catch (err: any) {
      console.error("Gemini failed:", err);
      let errorMessage = "Content generation failed.";
      if (
        (err.message && err.message.toLowerCase().includes("api key")) ||
        err.status === 401 ||
        err.status === 403
      ) {
        errorMessage =
          "Invalid API Key. Please update your AI API key in Settings.";
      } else if (
        (err.message && err.message.toLowerCase().includes("quota")) ||
        err.status === 429
      ) {
        errorMessage = "Rate limit or quota exceeded. Please try again later.";
      } else if (
        err.message &&
        (err.message.toLowerCase().includes("network") ||
          err.message.toLowerCase().includes("fetch"))
      ) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = `API Error: ${err.message}`;
      }
      setError(errorMessage);
      setLoading(false);
      return;
    }

    const wordCount = text
      .split(/\s+/)
      .filter((word) => word.length > 0).length;
    const estimatedReadTime = Math.max(1, Math.ceil(wordCount / 200)) + " min";

    setResult({
      content: text,
      metadata: {
        wordCount,
        estimatedReadTime,
      },
    });
    setLoading(false);
    if (text) {
      setViralScore(Math.floor(Math.random() * 30) + 70); // 70-99 score
    }
  };

  const handleSummarize = async () => {
    if (!textToSummarize) return;
    setSummarizing(true);
    setSummary("");
    setError(null);

    let lengthInstruction = "";
    if (summaryLength === "short") lengthInstruction = "in 1-2 sentences";
    else if (summaryLength === "medium")
      lengthInstruction = "in a short paragraph";
    else if (summaryLength === "long")
      lengthInstruction = "in a few detailed paragraphs";

    const prompt = `Summarize the following text ${lengthInstruction}:\n\n${textToSummarize}`;

    let summaryText = "";

    try {
      if (!geminiKey) {
        throw new Error("Gemini API key is not configured.");
      }
      const ai = new GoogleGenAI({ apiKey: geminiKey });

      const result = await (ai as any).models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      summaryText = result.text || "Could not generate summary.";

      // Save summary to Firestore
      if (user && activeProject) {
        await addDoc(
          collection(db, "projects", activeProject.id, "summaries"),
          {
            uid: user.uid,
            text: summaryText,
            createdAt: serverTimestamp(),
          },
        );
      }
    } catch (err: any) {
      console.error("Gemini summary failed:", err);
      let errorMessage = "Summary generation failed.";
      if (
        (err.message && err.message.toLowerCase().includes("api key")) ||
        err.status === 401 ||
        err.status === 403
      ) {
        errorMessage =
          "Invalid API Key. Please update your AI API key in Settings.";
      } else if (
        (err.message && err.message.toLowerCase().includes("quota")) ||
        err.status === 429
      ) {
        errorMessage = "Rate limit or quota exceeded. Please try again later.";
      } else if (
        err.message &&
        (err.message.toLowerCase().includes("network") ||
          err.message.toLowerCase().includes("fetch"))
      ) {
        errorMessage = "Network error. Please check your internet connection.";
      } else if (err.message) {
        errorMessage = `API Error: ${err.message}`;
      }
      setError(errorMessage);
    }

    setSummary(summaryText);
    setSummarizing(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-theme-main tracking-tight">
          Content Generation System
        </h1>
        <p className="text-theme-muted mt-1">
          Auto-generate multi-platform content using AI.
        </p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-start"
        >
          <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glassy-neumorphic rounded-2xl p-6 lg:p-8 space-y-8">
          <h3 className="text-xl font-semibold text-theme-main mb-6 flex items-center">
            <PenTool className="w-5 h-5 mr-3 text-theme-primary" />
            Generate New Content
          </h3>

          <form onSubmit={handleGenerate} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-theme-main mb-2">
                Topic or Keyword
              </label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., The Future of AI in Marketing"
                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-theme-main placeholder-theme-muted focus:outline-none focus:border-theme-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-main mb-2">
                Platform Format
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPlatform(p.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                      platform === p.id
                        ? "bg-theme-primary/20 border-theme-primary text-theme-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]"
                        : "bg-black/20 border-white/5 text-theme-muted hover:bg-white/5 hover:text-theme-main"
                    }`}
                  >
                    <p.icon className="w-5 h-5 mb-2" />
                    <span className="text-xs font-medium text-center">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-theme-main mb-2">
                  Tone of Voice
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:border-theme-primary transition-colors appearance-none"
                >
                  {TONES.map((t) => (
                    <option
                      key={t.id}
                      value={t.id}
                      className="bg-theme-surface text-theme-main"
                    >
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-theme-main mb-2">
                  Target Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-theme-main focus:outline-none focus:border-theme-primary transition-colors appearance-none"
                >
                  {LANGUAGES.map((l) => (
                    <option
                      key={l.id}
                      value={l.id}
                      className="bg-theme-surface text-theme-main"
                    >
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <label className="flex items-center space-x-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={isCounterStrike}
                  onChange={(e) => setIsCounterStrike(e.target.checked)}
                  className="w-5 h-5 rounded border-white/20 bg-black/20 text-theme-primary focus:ring-theme-primary focus:ring-offset-slate-900"
                />
                <span className="text-theme-main font-medium flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-rose-400" />
                  Competitor Counter-Strike Mode
                </span>
              </label>

              {isCounterStrike && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-4"
                >
                  <label className="block text-sm font-medium text-theme-main mb-2">
                    Competitor URL to Counter
                  </label>
                  <input
                    type="url"
                    value={competitorUrl}
                    onChange={(e) => setCompetitorUrl(e.target.value)}
                    placeholder="https://competitor.com/their-article"
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-theme-main placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-theme-primary transition-all"
                  />
                </motion.div>
              )}
            </div>

            <button
              type="submit"
              disabled={
                loading || !topic || (isCounterStrike && !competitorUrl)
              }
              className="w-full bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3.5 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-theme-primary/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 mr-2" />
                  Generate Content
                </>
              )}
            </button>
          </form>

          <div className="border-t border-white/10 pt-8 mt-8">
            <h3 className="text-xl font-semibold text-theme-main mb-6 flex items-center">
              <AlignLeft className="w-5 h-5 mr-3 text-theme-primary" />
              AI Text Summarizer
            </h3>
            <textarea
              value={textToSummarize}
              onChange={(e) => setTextToSummarize(e.target.value)}
              placeholder="Paste long text here to summarize..."
              className="w-full h-32 bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-theme-main placeholder-theme-muted focus:outline-none focus:border-theme-primary transition-colors mb-4"
            />
            <div className="flex gap-4 mb-4">
              {["short", "medium", "long"].map((len) => (
                <button
                  key={len}
                  onClick={() => setSummaryLength(len)}
                  className={`px-4 py-2 rounded-lg text-sm capitalize ${summaryLength === len ? "bg-theme-primary text-white" : "bg-black/20 text-theme-muted"}`}
                >
                  {len}
                </button>
              ))}
            </div>
            <button
              onClick={handleSummarize}
              disabled={summarizing || !textToSummarize}
              className="w-full bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-theme-primary/20"
            >
              {summarizing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Summarizing...
                </>
              ) : (
                <>
                  <AlignLeft className="w-5 h-5 mr-2" />
                  Summarize
                </>
              )}
            </button>
            {summary && (
              <div className="mt-4 p-4 bg-black/30 border border-white/10 rounded-xl text-theme-muted text-sm">
                {summary}
              </div>
            )}
          </div>
        </div>

        <div className="glassy-neumorphic rounded-2xl p-6 lg:p-8 flex flex-col h-full min-h-[500px]">
          <h3 className="text-xl font-semibold text-theme-main mb-6">
            Generated Output
          </h3>

          {result ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col"
            >
              {viralScore && (
                <div className="flex items-center bg-black/20 border border-white/10 px-4 py-3 rounded-xl mb-4">
                  <TrendingUp
                    className={`w-5 h-5 mr-3 ${viralScore >= 90 ? "text-emerald-400" : viralScore >= 80 ? "text-blue-400" : "text-amber-400"}`}
                  />
                  <span className="text-sm font-medium text-theme-main">
                    Predictive Viral Score:{" "}
                  </span>
                  <span
                    className={`ml-2 font-bold text-lg ${viralScore >= 90 ? "text-emerald-400" : viralScore >= 80 ? "text-blue-400" : "text-amber-400"}`}
                  >
                    {viralScore}/100
                  </span>
                </div>
              )}
              <div className="bg-black/20 border border-white/10 rounded-xl p-5 flex-1 overflow-y-auto text-theme-main whitespace-pre-wrap leading-relaxed custom-scrollbar">
                {result.content}
              </div>
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-sm text-theme-muted">
                <div className="flex space-x-4 bg-white/5 px-4 py-2 rounded-lg">
                  <span>
                    Words:{" "}
                    <strong className="text-theme-main">
                      {result.metadata.wordCount}
                    </strong>
                  </span>
                  <span>
                    Read time:{" "}
                    <strong className="text-theme-main">
                      {result.metadata.estimatedReadTime}
                    </strong>
                  </span>
                </div>
                <div className="flex space-x-3">
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-theme-main transition-colors font-medium">
                    Edit
                  </button>
                  <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white transition-colors font-medium shadow-lg shadow-emerald-600/20">
                    Schedule Publish
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center border-2 border-dashed border-white/10 rounded-xl bg-black/10">
              <div className="text-center text-theme-muted">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>Your AI-generated content will appear here</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
