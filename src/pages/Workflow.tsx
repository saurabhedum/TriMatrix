import React, { useState, useRef, useCallback, useEffect, useMemo, Component, ErrorInfo, ReactNode } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
  Handle,
  Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectContext';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

// ============================================================================
// Error Boundary Component
// ============================================================================
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("WorkflowBuilder ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full bg-slate-950 text-white p-8">
          <Icons.AlertTriangle className="w-16 h-16 text-rose-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Something went wrong in the Workflow Builder.</h2>
          <p className="text-slate-400 mb-6 text-center max-w-md">
            An unexpected error occurred. Please try refreshing the page or clearing your local storage if the problem persists.
          </p>
          <div className="bg-slate-900 p-4 rounded-lg border border-white/10 w-full max-w-2xl overflow-auto text-sm font-mono text-rose-300">
            {this.state.error?.toString()}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Custom Node Component for Animations and Styling
// ============================================================================
const CustomNode = ({ data, isConnectable }: any) => {
  const IconComponent = (Icons as any)[data.iconName] || Icons.Bot;
  
  const onViewLog = () => {
    window.dispatchEvent(new CustomEvent('viewNodeLog', { detail: data }));
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bg-slate-900 border-2 ${data.status === 'error' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : data.borderClass} text-white rounded-lg shadow-lg p-3 w-48 relative group`}
    >
      <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="w-3 h-3 bg-slate-400 border-none" />
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <IconComponent className={`w-4 h-4 ${data.color}`} />
          <span className="text-sm font-medium ml-2">{data.label}</span>
        </div>
        {data.status === 'success' && <Icons.CheckCircle className="w-4 h-4 text-emerald-500" />}
        {data.status === 'error' && <Icons.AlertTriangle className="w-4 h-4 text-rose-500" />}
        {data.status === 'running' && <Icons.Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
      </div>
      {data.status && (
        <button 
          onClick={onViewLog}
          className={`mt-2 text-xs w-full text-left flex items-center ${data.status === 'error' ? 'text-rose-400 hover:text-rose-300' : 'text-indigo-400 hover:text-indigo-300'}`}
        >
          <Icons.FileText className="w-3 h-3 mr-1" /> View Log
        </button>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="w-3 h-3 bg-slate-400 border-none" />
    </motion.div>
  );
};

const nodeTypes = { custom: CustomNode };

// ============================================================================
// PREMADE_NODES: Defines the available nodes in the sidebar palette.
// ============================================================================
const PREMADE_NODES = [
  // Triggers
  { type: 'trigger', label: 'Schedule Trigger', iconName: 'Clock', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Triggers the workflow at a specific time or interval.' },
  { type: 'trigger', label: 'Webhook Receive', iconName: 'Webhook', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Listens for incoming webhooks from external applications.' },
  { type: 'trigger', label: 'New Email', iconName: 'Mail', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Triggers when a new email matches specific criteria.' },
  { type: 'trigger', label: 'Form Submission', iconName: 'FileText', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Starts the workflow when a lead form is submitted.' },
  { type: 'trigger', label: 'New Follower', iconName: 'UserPlus', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Triggers when a new user follows your social account.' },
  { type: 'trigger', label: 'Keyword Mention', iconName: 'MessageCircle', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Listens for specific brand or keyword mentions online.' },
  { type: 'trigger', label: 'Traffic Spike', iconName: 'TrendingUp', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Triggers when website traffic exceeds a certain threshold.' },
  { type: 'trigger', label: 'Ad Spend Limit', iconName: 'DollarSign', color: 'text-indigo-500', border: 'border-indigo-500', description: 'Triggers when ad spend reaches a predefined limit.' },
  // SEO
  { type: 'seo', label: 'Fetch Keywords', iconName: 'Search', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Retrieves high-volume keywords for a given topic.' },
  { type: 'seo', label: 'Analyze Backlinks', iconName: 'Link', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Analyzes the backlink profile of a specific URL.' },
  { type: 'seo', label: 'Audit Page Speed', iconName: 'Zap', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Checks the Core Web Vitals and load speed of a page.' },
  { type: 'seo', label: 'Check SERP Rank', iconName: 'ListOrdered', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Checks the search engine ranking for specific keywords.' },
  { type: 'seo', label: 'Generate Meta Tags', iconName: 'Tag', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Uses AI to generate SEO-optimized title and meta descriptions.' },
  { type: 'seo', label: 'Optimize Images', iconName: 'Image', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Compresses and adds alt text to images for better SEO.' },
  { type: 'seo', label: 'Find Broken Links', iconName: 'Unlink', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Scans a website to identify 404 errors and broken links.' },
  { type: 'seo', label: 'Competitor Analysis', iconName: 'Target', color: 'text-emerald-500', border: 'border-emerald-500', description: 'Analyzes competitor domains for keyword gaps and strategies.' },
  // Content
  { type: 'content', label: 'Generate Blog', iconName: 'PenTool', color: 'text-purple-500', border: 'border-purple-500', description: 'Generates a full-length, SEO-optimized blog post.' },
  { type: 'content', label: 'Write Ad Copy', iconName: 'Edit3', color: 'text-purple-500', border: 'border-purple-500', description: 'Creates persuasive ad copy for various platforms.' },
  { type: 'content', label: 'Create Newsletter', iconName: 'MailOpen', color: 'text-purple-500', border: 'border-purple-500', description: 'Drafts an engaging email newsletter based on recent content.' },
  { type: 'content', label: 'Generate Image', iconName: 'Image', color: 'text-purple-500', border: 'border-purple-500', description: 'Uses AI to generate custom images for marketing campaigns.' },
  { type: 'content', label: 'Translate Text', iconName: 'Languages', color: 'text-purple-500', border: 'border-purple-500', description: 'Translates content into multiple languages automatically.' },
  { type: 'content', label: 'Summarize Article', iconName: 'AlignLeft', color: 'text-purple-500', border: 'border-purple-500', description: 'Condenses long-form content into short summaries.' },
  { type: 'content', label: 'Extract Keywords', iconName: 'Key', color: 'text-purple-500', border: 'border-purple-500', description: 'Identifies the main keywords and entities from a text.' },
  { type: 'content', label: 'Proofread Content', iconName: 'CheckCircle', color: 'text-purple-500', border: 'border-purple-500', description: 'Checks text for grammar, spelling, and stylistic errors.' },
  { type: 'content', label: 'Generate Video Script', iconName: 'FileText', color: 'text-purple-500', border: 'border-purple-500', description: 'Creates a script for YouTube, TikTok, or Reels.' },
  // Social
  { type: 'social', label: 'Post to Twitter', iconName: 'Twitter', color: 'text-sky-500', border: 'border-sky-500', description: 'Publishes a tweet or a thread to Twitter/X.' },
  { type: 'social', label: 'Post to LinkedIn', iconName: 'Linkedin', color: 'text-blue-600', border: 'border-blue-600', description: 'Shares a professional post or article on LinkedIn.' },
  { type: 'social', label: 'Post to Facebook', iconName: 'Facebook', color: 'text-blue-500', border: 'border-blue-500', description: 'Publishes an update to a Facebook Page or Group.' },
  { type: 'social', label: 'Post to Instagram', iconName: 'Instagram', color: 'text-pink-500', border: 'border-pink-500', description: 'Publishes a photo or reel to Instagram.' },
  { type: 'social', label: 'Reply to Comment', iconName: 'MessageSquare', color: 'text-sky-400', border: 'border-sky-400', description: 'Automatically replies to comments using AI.' },
  { type: 'social', label: 'Like Mention', iconName: 'Heart', color: 'text-rose-500', border: 'border-rose-500', description: 'Automatically likes posts that mention your brand.' },
  { type: 'social', label: 'Scrape Hashtag', iconName: 'Hash', color: 'text-slate-400', border: 'border-slate-400', description: 'Collects top posts and engagement metrics for a hashtag.' },
  { type: 'social', label: 'DM Follower', iconName: 'Send', color: 'text-sky-500', border: 'border-sky-500', description: 'Sends a direct message to a new or existing follower.' },
  // Analytics
  { type: 'analytics', label: 'Fetch GA4 Data', iconName: 'BarChart3', color: 'text-amber-500', border: 'border-amber-500', description: 'Retrieves traffic and engagement data from Google Analytics 4.' },
  { type: 'analytics', label: 'Calculate ROI', iconName: 'Calculator', color: 'text-amber-500', border: 'border-amber-500', description: 'Calculates Return on Investment based on spend and revenue.' },
  { type: 'analytics', label: 'Generate Report', iconName: 'FileBarChart', color: 'text-amber-500', border: 'border-amber-500', description: 'Compiles data into a comprehensive PDF or HTML report.' },
  { type: 'analytics', label: 'Track Conversion', iconName: 'MousePointerClick', color: 'text-amber-500', border: 'border-amber-500', description: 'Records a successful conversion event.' },
  { type: 'analytics', label: 'A/B Test Result', iconName: 'SplitSquareHorizontal', color: 'text-amber-500', border: 'border-amber-500', description: 'Analyzes the statistical significance of an A/B test.' },
  { type: 'analytics', label: 'A/B Test Configuration', iconName: 'SplitSquareHorizontal', color: 'text-amber-500', border: 'border-amber-500', description: 'Configures parameters for an A/B test.' },
  { type: 'analytics', label: 'Predict Churn', iconName: 'Activity', color: 'text-amber-500', border: 'border-amber-500', description: 'Uses machine learning to predict which users might churn.' },
  { type: 'analytics', label: 'Segment Users', iconName: 'Users', color: 'text-amber-500', border: 'border-amber-500', description: 'Groups users based on behavior, demographics, or engagement.' },
  { type: 'analytics', label: 'Alert Anomaly', iconName: 'AlertTriangle', color: 'text-amber-500', border: 'border-amber-500', description: 'Sends an alert if unusual data patterns are detected.' },
  // Email
  { type: 'email', label: 'Send Email', iconName: 'Send', color: 'text-red-400', border: 'border-red-400', description: 'Sends an email to a specific address or segment.' },
  { type: 'email', label: 'Add to List', iconName: 'ListPlus', color: 'text-red-400', border: 'border-red-400', description: 'Adds a contact to a specific email marketing list.' },
  { type: 'email', label: 'Update CRM', iconName: 'UserCircle', color: 'text-red-400', border: 'border-red-400', description: 'Updates a contact record in your CRM system.' },
  { type: 'email', label: 'Tag Subscriber', iconName: 'Tag', color: 'text-red-400', border: 'border-red-400', description: 'Applies a tag to a subscriber for better segmentation.' },
  { type: 'email', label: 'Remove from List', iconName: 'ListMinus', color: 'text-red-400', border: 'border-red-400', description: 'Removes a contact from an email list.' },
  { type: 'email', label: 'Lead Scoring', iconName: 'Activity', color: 'text-red-400', border: 'border-red-400', description: 'Assigns a score to a lead based on their interactions.' },
  // Ads
  { type: 'ads', label: 'Pause Ad', iconName: 'PauseCircle', color: 'text-green-500', border: 'border-green-500', description: 'Pauses an underperforming ad campaign.' },
  { type: 'ads', label: 'Increase Budget', iconName: 'TrendingUp', color: 'text-green-500', border: 'border-green-500', description: 'Increases the daily budget for a high-performing ad.' },
  { type: 'ads', label: 'Launch Retargeting', iconName: 'Repeat', color: 'text-green-500', border: 'border-green-500', description: 'Starts a retargeting campaign for recent website visitors.' },
  { type: 'ads', label: 'Update Creative', iconName: 'ImagePlus', color: 'text-green-500', border: 'border-green-500', description: 'Swaps out the image or video in an active ad.' },
  { type: 'ads', label: 'Fetch CPA', iconName: 'DollarSign', color: 'text-green-500', border: 'border-green-500', description: 'Retrieves the current Cost Per Acquisition for a campaign.' },
  { type: 'ads', label: 'Sync Audience', iconName: 'Users', color: 'text-green-500', border: 'border-green-500', description: 'Syncs a custom audience segment to an ad platform.' },
  // CRM Integration
  { type: 'crm', label: 'Create Lead', iconName: 'UserPlus', color: 'text-orange-500', border: 'border-orange-500', description: 'Creates a new lead in the connected CRM system.' },
  { type: 'crm', label: 'Update Contact', iconName: 'Edit3', color: 'text-orange-500', border: 'border-orange-500', description: 'Updates an existing contact record with new information.' },
  { type: 'crm', label: 'Add Note', iconName: 'FileText', color: 'text-orange-500', border: 'border-orange-500', description: 'Appends a note or activity log to a customer profile.' },
  { type: 'crm', label: 'Fetch Pipeline', iconName: 'Database', color: 'text-orange-500', border: 'border-orange-500', description: 'Retrieves current deal stages from the sales pipeline.' },
  // Reporting
  { type: 'reporting', label: 'Generate PDF', iconName: 'FileBarChart', color: 'text-teal-500', border: 'border-teal-500', description: 'Generates a formatted PDF report of campaign performance.' },
  { type: 'reporting', label: 'Send Slack Alert', iconName: 'MessageSquare', color: 'text-teal-500', border: 'border-teal-500', description: 'Sends a summary report or alert to a designated Slack channel.' },
  { type: 'reporting', label: 'Export to Sheets', iconName: 'ListOrdered', color: 'text-teal-500', border: 'border-teal-500', description: 'Exports workflow data directly to Google Sheets.' },
  { type: 'reporting', label: 'Visual Dashboard', iconName: 'PieChart', color: 'text-teal-500', border: 'border-teal-500', description: 'Updates a real-time visual dashboard with new metrics.' },
  // AI Analysis
  { type: 'ai analysis', label: 'Analyze Sentiment', iconName: 'Heart', color: 'text-fuchsia-500', border: 'border-fuchsia-500', description: 'Analyzes the sentiment of customer feedback or social mentions.' },
  { type: 'ai analysis', label: 'Predict Intent', iconName: 'Target', color: 'text-fuchsia-500', border: 'border-fuchsia-500', description: 'Predicts user purchase intent based on behavior and data.' },
  { type: 'ai analysis', label: 'Extract Entities', iconName: 'Key', color: 'text-fuchsia-500', border: 'border-fuchsia-500', description: 'Extracts key entities (names, locations, orgs) from unstructured text.' },
  { type: 'ai analysis', label: 'Smart Routing', iconName: 'BrainCircuit', color: 'text-fuchsia-500', border: 'border-fuchsia-500', description: 'Uses AI to route leads or tickets to the most appropriate team.' },
  { type: 'ai analysis', label: 'Customer Segmentation', iconName: 'Users', color: 'text-fuchsia-500', border: 'border-fuchsia-500', description: 'Segments customers based on AI analysis of their behavior.' },
  // Web3 & Decentralization
  { type: 'web3', label: 'Mint NFT Reward', iconName: 'Hexagon', color: 'text-yellow-500', border: 'border-yellow-500', description: 'Mints an NFT reward for high-value customer actions.' },
  { type: 'web3', label: 'Verify Credential', iconName: 'ShieldCheck', color: 'text-yellow-500', border: 'border-yellow-500', description: 'Verifies a decentralized identity credential.' },
  { type: 'web3', label: 'Store on IPFS', iconName: 'Database', color: 'text-yellow-500', border: 'border-yellow-500', description: 'Stores campaign assets permanently on IPFS.' },
  // Futuristic Features
  { type: 'futuristic', label: 'Sentiment Pivot', iconName: 'RefreshCw', color: 'text-rose-400', border: 'border-rose-400', description: 'Automatically pivots campaign strategy based on real-time audience sentiment.' },
  { type: 'futuristic', label: 'Web3 Ad Audit', iconName: 'ShieldCheck', color: 'text-emerald-400', border: 'border-emerald-400', description: 'Verifies ad impressions on-chain to eliminate bot fraud.' },
  { type: 'futuristic', label: 'Simulate Journey', iconName: 'Users', color: 'text-indigo-400', border: 'border-indigo-400', description: 'Simulates 10k virtual customer journeys to predict conversion rates.' },
  { type: 'futuristic', label: 'AI Video Synth', iconName: 'Video', color: 'text-purple-400', border: 'border-purple-400', description: 'Generates hyper-personalized AI avatar videos for each lead.' },
];

const initialNodes = [
  {
    id: '1',
    type: 'custom',
    data: { 
      label: 'Schedule Trigger',
      iconName: 'Clock',
      color: 'text-indigo-500',
      borderClass: 'border-indigo-500'
    },
    position: { x: 250, y: 50 },
  },
  {
    id: '2',
    type: 'custom',
    data: { 
      label: 'Fetch Keywords',
      iconName: 'Search',
      color: 'text-emerald-500',
      borderClass: 'border-emerald-500'
    },
    position: { x: 250, y: 150 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#6366f1' } },
];

const WORKFLOW_TEMPLATES = [
  {
    id: 'seo-content',
    name: 'SEO Content Pipeline',
    description: 'Automatically fetch keywords and generate a blog post.',
    nodes: [
      { id: 't1', type: 'custom', data: { label: 'Schedule Trigger', iconName: 'Clock', color: 'text-indigo-500', borderClass: 'border-indigo-500' }, position: { x: 250, y: 50 } },
      { id: 't2', type: 'custom', data: { label: 'Fetch Keywords', iconName: 'Search', color: 'text-emerald-500', borderClass: 'border-emerald-500' }, position: { x: 250, y: 150 } },
      { id: 't3', type: 'custom', data: { label: 'Generate Blog', iconName: 'PenTool', color: 'text-purple-500', borderClass: 'border-purple-500' }, position: { x: 250, y: 250 } },
    ],
    edges: [
      { id: 'e1-2', source: 't1', target: 't2', animated: true, style: { stroke: '#6366f1' } },
      { id: 'e2-3', source: 't2', target: 't3', animated: true, style: { stroke: '#6366f1' } },
    ]
  },
  {
    id: 'social-campaign',
    name: 'Social Media Campaign',
    description: 'Generate an image and post to multiple social networks.',
    nodes: [
      { id: 't1', type: 'custom', data: { label: 'Schedule Trigger', iconName: 'Clock', color: 'text-indigo-500', borderClass: 'border-indigo-500' }, position: { x: 250, y: 50 } },
      { id: 't2', type: 'custom', data: { label: 'Generate Image', iconName: 'Image', color: 'text-purple-500', borderClass: 'border-purple-500' }, position: { x: 250, y: 150 } },
      { id: 't3', type: 'custom', data: { label: 'Post to Twitter', iconName: 'Twitter', color: 'text-sky-500', borderClass: 'border-sky-500' }, position: { x: 150, y: 250 } },
      { id: 't4', type: 'custom', data: { label: 'Post to LinkedIn', iconName: 'Linkedin', color: 'text-blue-600', borderClass: 'border-blue-600' }, position: { x: 350, y: 250 } },
    ],
    edges: [
      { id: 'e1-2', source: 't1', target: 't2', animated: true, style: { stroke: '#6366f1' } },
      { id: 'e2-3', source: 't2', target: 't3', animated: true, style: { stroke: '#6366f1' } },
      { id: 'e2-4', source: 't2', target: 't4', animated: true, style: { stroke: '#6366f1' } },
    ]
  }
];

let id = 3;
const getId = () => `${id++}`;

// ============================================================================
// Reusable Variable Inserter Component
// ============================================================================
const VariableInserter = ({ onInsert, upstreamNodes, dynamicVariables }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block ml-2">
      <button onClick={() => setIsOpen(!isOpen)} className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-slate-700 transition-colors flex items-center border border-white/10">
        <Icons.Code className="w-3 h-3 mr-1" /> Insert Variable
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-56 bg-slate-800 border border-white/10 rounded-lg shadow-xl z-50 py-1 max-h-60 overflow-y-auto custom-scrollbar">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Upstream Outputs</div>
          {upstreamNodes.map((un: any) => (
            <button key={un.id} onClick={() => { onInsert(`${un.id}.output`); setIsOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 flex items-center">
              <span className={`w-2 h-2 rounded-full mr-2 bg-indigo-500`} />
              {un.data.label} Output
            </button>
          ))}
          {upstreamNodes.length === 0 && <div className="px-3 py-1 text-xs text-slate-500 italic">No upstream nodes</div>}
          
          <div className="px-3 py-1 mt-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-t border-white/5 pt-2">Dynamic Variables</div>
          {dynamicVariables.map((dv: any) => (
            <button key={dv.key} onClick={() => { onInsert(dv.key.replace(/[{}]/g, '')); setIsOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 font-mono">
              {dv.key}
            </button>
          ))}
          {dynamicVariables.length === 0 && <div className="px-3 py-1 text-xs text-slate-500 italic">No dynamic variables</div>}
        </div>
      )}
    </div>
  );
};

export default function WorkflowBuilderWrapper() {
  return (
    <ErrorBoundary>
      <WorkflowBuilder />
    </ErrorBoundary>
  );
}

function WorkflowBuilder() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  
  // React Flow state hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  // UI state hooks
  const [activeCategory, setActiveCategory] = useState('trigger');
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showSimulationResults, setShowSimulationResults] = useState(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<{status: 'success' | 'error', message: string} | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [selectedLogNode, setSelectedLogNode] = useState<any | null>(null);
  const [selectedNode, setSelectedNode] = useState<any | null>(null);

  const simulateJourney = async () => {
    if (nodes.length < 2) {
      alert("Please add at least a trigger and one action node to simulate.");
      return;
    }
    setIsSimulating(true);
    // Simulate 10k journeys
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setSimulationData({
      totalJourneys: 10000,
      conversions: Math.floor(Math.random() * 800) + 200,
      dropoffs: [
        { node: nodes[0]?.data.label, rate: '0%' },
        { node: nodes[1]?.data.label, rate: (Math.random() * 15 + 5).toFixed(1) + '%' },
        { node: nodes[2]?.data.label || 'End', rate: (Math.random() * 30 + 10).toFixed(1) + '%' },
      ],
      predictedROI: (Math.random() * 3 + 1.5).toFixed(2) + 'x',
      bottleneck: nodes[1]?.data.label || 'Unknown'
    });
    
    setIsSimulating(false);
    setShowSimulationResults(true);
  };
  
  // Custom Nodes State
  const [userCustomNodes, setUserCustomNodes] = useState<any[]>([]);
  const [showCustomNodeModal, setShowCustomNodeModal] = useState(false);
  const [customNodeForm, setCustomNodeForm] = useState({ label: '', type: 'custom', description: '', color: 'text-indigo-500', border: 'border-indigo-500', iconName: 'Bot' });

  // New State
  const [searchQuery, setSearchQuery] = useState('');
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [dynamicVariables, setDynamicVariables] = useState<any[]>([]);
  const { activeProject } = useProjects();
  const { user, isAuthReady } = useAuth();

  // Load saved workflow and custom nodes on mount
  useEffect(() => {
    if (!activeProject || !user) return;
    
    // Default fallback locally if not found online
    const savedCustomNodes = localStorage.getItem(`customNodes_${activeProject.id}`);
    if (savedCustomNodes) {
      try {
        setUserCustomNodes(JSON.parse(savedCustomNodes));
      } catch (e) {
        console.error("Failed to load custom nodes", e);
      }
    }

    // Load from Firestore
    const unsubscribe = onSnapshot(doc(db, 'projects', activeProject.id, 'workflows', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data && data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.customNodes) {
             setUserCustomNodes(data.customNodes);
          }
          // Update ID counter to prevent collisions
          const maxId = Math.max(...data.nodes.map((n: any) => parseInt(n.id.replace(/\D/g, '')) || 0));
          if (maxId >= id) id = maxId + 1;
        }
      } else {
        // Fallback to local storage if Firestore doc doesn't exist
        const savedWorkflow = localStorage.getItem(`savedWorkflow_${activeProject.id}`);
        if (savedWorkflow) {
          try {
            const { nodes: savedNodes, edges: savedEdges } = JSON.parse(savedWorkflow);
            setNodes(savedNodes);
            setEdges(savedEdges);
            // Update ID counter to prevent collisions
            const maxId = Math.max(...savedNodes.map((n: any) => parseInt(n.id.replace(/\D/g, '')) || 0));
            if (maxId >= id) id = maxId + 1;
          } catch (e) {
            console.error("Failed to load saved workflow", e);
          }
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `projects/${activeProject.id}/workflows/main`);
    });

    return () => unsubscribe();
  }, [setNodes, setEdges, activeProject, user]);

  // Load dynamic variables from Firebase
  useEffect(() => {
    if (!isAuthReady || !user || !activeProject) {
      setDynamicVariables([]);
      return;
    }

    const q = query(collection(db, 'projects', activeProject.id, 'dynamicVariables'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const vars = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDynamicVariables(vars);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `projects/${activeProject.id}/dynamicVariables`);
    });

    return () => unsubscribe();
  }, [user, isAuthReady, activeProject]);

  // Listen for view log events from CustomNode
  useEffect(() => {
    const handleViewLog = (e: any) => setSelectedLogNode(e.detail);
    window.addEventListener('viewNodeLog', handleViewLog);
    return () => window.removeEventListener('viewNodeLog', handleViewLog);
  }, []);

  const allNodes = [...PREMADE_NODES, ...userCustomNodes];
  const categories = Array.from(new Set(allNodes.map(n => n.type)));

  const filteredNodes = allNodes.filter(n => 
    n.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    n.description.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const displayNodes = searchQuery ? filteredNodes : allNodes.filter(n => n.type === activeCategory);

  const handleCreateCustomNode = () => {
    if (!customNodeForm.label) return;
    const newNode = { ...customNodeForm };
    const updated = [...userCustomNodes, newNode];
    setUserCustomNodes(updated);
    localStorage.setItem('customNodes', JSON.stringify(updated));
    setShowCustomNodeModal(false);
    setCustomNodeForm({ label: '', type: 'custom', description: '', color: 'text-indigo-500', border: 'border-indigo-500', iconName: 'Bot' });
  };

  const saveWorkflow = async () => {
    if (!activeProject || !user) return;
    const workflow = {
      nodes: nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          status: undefined,
          log: undefined
        }
      })),
      edges,
      customNodes: userCustomNodes,
      uid: user.uid,
      updatedAt: serverTimestamp()
    };
    
    // Save to local storage as fallback
    localStorage.setItem(`savedWorkflow_${activeProject.id}`, JSON.stringify(workflow));
    localStorage.setItem(`customNodes_${activeProject.id}`, JSON.stringify(userCustomNodes));

    try {
      await setDoc(doc(db, 'projects', activeProject.id, 'workflows', 'main'), workflow);
      setExecutionResult({ status: 'success', message: 'Workflow saved to cloud.' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `projects/${activeProject.id}/workflows/main`);
      setExecutionResult({ status: 'error', message: 'Failed to save workflow online, but saved locally.' });
    }

    setTimeout(() => setExecutionResult(null), 3000);
  };

  const loadTemplate = (template: any) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    const maxId = Math.max(...template.nodes.map((n: any) => parseInt(n.id.replace(/\D/g, '')) || 0));
    if (maxId >= id) id = maxId + 1;
    setShowTemplatesModal(false);
    setExecutionResult({ status: 'success', message: `Loaded template: ${template.name}` });
    setTimeout(() => setExecutionResult(null), 3000);
  };

  // Handle connecting nodes
  const onConnect = useCallback(
    (params: any) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  // Handle drag start from sidebar
  const onDragStart = (event: React.DragEvent, nodeType: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeType));
    event.dataTransfer.effectAllowed = 'move';
    
    // Create a ghost image for drag feedback
    const ghost = document.createElement('div');
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.className = `bg-slate-900 border-2 ${nodeType.border} text-white rounded-lg shadow-lg p-3 w-48 flex items-center`;
    ghost.innerHTML = `<span class="text-sm font-medium ml-6">${nodeType.label}</span>`;
    document.body.appendChild(ghost);
    
    event.dataTransfer.setDragImage(ghost, 20, 20);
    
    setTimeout(() => {
      if (document.body.contains(ghost)) {
        document.body.removeChild(ghost);
      }
    }, 0);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setIsDraggingOver(true);
  }, []);

  const onDragLeave = useCallback(() => {
    setIsDraggingOver(false);
  }, []);

  // Handle drop onto canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDraggingOver(false);

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeDataStr = event.dataTransfer.getData('application/reactflow');

      if (!nodeDataStr || !reactFlowBounds || !reactFlowInstance) {
        return;
      }

      const nodeData = JSON.parse(nodeDataStr);
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: getId(),
        type: 'custom',
        position,
        data: { 
          label: nodeData.label,
          iconName: nodeData.iconName || 'Bot',
          color: nodeData.color,
          borderClass: nodeData.border
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes],
  );

  // Execute workflow logic with validation and core logic simulation
  const executeWorkflow = async () => {
    if (nodes.length === 0) {
      setExecutionResult({ status: 'error', message: 'Workflow is empty. Add nodes to execute.' });
      setTimeout(() => setExecutionResult(null), 4000);
      return;
    }

    // Validation: Check for disconnected nodes
    if (nodes.length > 1) {
      const connectedNodeIds = new Set();
      edges.forEach(edge => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });

      const disconnectedNodes = nodes.filter(node => !connectedNodeIds.has(node.id));
      
      if (disconnectedNodes.length > 0) {
        setExecutionResult({ 
          status: 'error', 
          message: `Validation Error: Found ${disconnectedNodes.length} disconnected node(s). Please connect all nodes before executing.` 
        });
        setTimeout(() => setExecutionResult(null), 5000);
        return;
      }
    }
    
    setIsExecuting(true);
    setExecutionResult(null);

    // Reset node statuses
    setNodes(nds => nds.map(n => ({ ...n, data: { ...n.data, status: undefined, log: undefined } })));

    // Simple sequential execution based on topological sort / BFS
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const adjacencyList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach(n => {
      adjacencyList.set(n.id, []);
      if (!inDegree.has(n.id)) inDegree.set(n.id, 0);
    });
    
    edges.forEach(e => {
      adjacencyList.get(e.source)?.push(e.target);
      inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
    });
    
    const queue = nodes.filter(n => inDegree.get(n.id) === 0).map(n => n.id);
    const nodeOutputs = new Map<string, any>();
    
    const updateNodeStatus = (id: string, status: string, log: string) => {
      setNodes(nds => nds.map(n => n.id === id ? { ...n, data: { ...n.data, status, log } } : n));
    };

    let hasError = false;

    // Initialize Gemini AI
    let ai: any = null;
    try {
      const { GoogleGenAI } = await import('@google/genai');
      ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.error("Failed to initialize Gemini API", e);
    }

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const node = nodeMap.get(currentId)!;
      
      updateNodeStatus(currentId, 'running', 'Executing...');
      
      let output = {};
      let log = `Executing ${node.data.label}...\nTimestamp: ${new Date().toISOString()}`;
      
      const replaceVariables = (text: string) => {
        if (!text) return text;
        let processed = text;
        const matches = processed.match(/{{([^}]+)}}/g);
        if (matches) {
          matches.forEach(match => {
            const varName = match.replace(/[{}]/g, '').trim();
            if (varName.endsWith('.output')) {
              const nodeId = varName.replace('.output', '');
              const out = nodeOutputs.get(nodeId);
              if (out) {
                let val = '';
                if (typeof out === 'object') {
                  val = Object.values(out)[0] as string; // take first value
                  if (Array.isArray(val)) {
                    val = val.join(', ');
                  } else if (typeof val === 'object') {
                    val = JSON.stringify(val);
                  }
                } else {
                  val = String(out);
                }
                processed = processed.replace(match, val);
              }
            } else {
              const dynVar = dynamicVariables.find((v: any) => v.key.replace(/[{}]/g, '') === varName);
              if (dynVar) {
                processed = processed.replace(match, dynVar.value || '');
              }
            }
          });
        }
        return processed;
      };
      
      try {
        // Core logic for specific nodes
        if (node.data.label === 'Fetch Keywords') {
          const rawTopic = (node.data as any).config?.topic || 'digital marketing';
          const topic = replaceVariables(rawTopic);
          
          if (ai) {
            log += `\n\nCalling Gemini API for topic: ${topic}...`;
            updateNodeStatus(currentId, 'running', log);
            
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: `Generate a list of 5 highly relevant SEO keywords for the topic: "${topic}". Return ONLY a JSON array of strings.`,
              config: {
                responseMimeType: "application/json",
              }
            });
            const keywords = JSON.parse(response.text || '[]');
            output = { keywords };
            log += `\n\nOutput:\nFetched keywords: ${JSON.stringify(keywords, null, 2)}`;
          } else {
            // Fallback if AI fails to init
            await new Promise(resolve => setTimeout(resolve, 1000));
            output = { keywords: [`${topic} strategies`, `${topic} tools`, `${topic} trends`, 'seo optimization'] };
            log += `\n\nInput Configuration:\nTopic: ${topic}\n\nOutput (Simulated):\nFetched keywords: ${JSON.stringify((output as any).keywords, null, 2)}`;
          }
        } else if (node.data.label === 'Generate Blog') {
          const predecessors = edges.filter(e => e.target === currentId).map(e => e.source);
          let inputKeywords: string[] = [];
          predecessors.forEach(p => {
            const pOut = nodeOutputs.get(p) as any;
            if (pOut && pOut.keywords) {
              inputKeywords = inputKeywords.concat(pOut.keywords);
            }
          });
          
          const tone = (node.data as any).config?.tone || 'professional';
          const rawTopic = (node.data as any).config?.topic || '';
          const topic = replaceVariables(rawTopic);
          
          const prompt = topic 
            ? `Write a short, engaging blog post introduction (about 100 words) with a ${tone} tone about "${topic}"${inputKeywords.length > 0 ? `, incorporating the following keywords: ${inputKeywords.join(', ')}` : ''}.`
            : `Write a short, engaging blog post introduction (about 100 words) with a ${tone} tone${inputKeywords.length > 0 ? `, incorporating the following keywords: ${inputKeywords.join(', ')}` : ''}.`;
            
          if (ai) {
            log += `\n\nCalling Gemini API to generate blog with tone: ${tone}...`;
            updateNodeStatus(currentId, 'running', log);
            
            const response = await ai.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt,
            });
            output = { blogContent: response.text };
            log += `\n\nInput Configuration:\nTone: ${tone}\nTopic: ${topic}\n\nInput received: ${JSON.stringify({ keywords: inputKeywords })}\n\nOutput:\n${response.text}`;
          } else {
            await new Promise(resolve => setTimeout(resolve, 1000));
            output = { blogContent: `Generated ${tone} blog post...` };
            log += `\n\nInput Configuration:\nTone: ${tone}\nTopic: ${topic}\n\nOutput (Simulated):\nGenerated blog.`;
          }
        } else if (node.data.label === 'Send Email') {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const recipient = replaceVariables((node.data as any).config?.recipient || 'No recipient specified');
          const subject = replaceVariables((node.data as any).config?.subject || 'No subject specified');
          const body = replaceVariables((node.data as any).config?.body || 'No body specified');
          output = { status: 'sent', recipient, subject, body };
          log += `\n\nInput Configuration:\nRecipient: ${recipient}\nSubject: ${subject}\nBody:\n${body}\n\nOutput (Simulated):\nEmail sent successfully.`;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          log += `\n\nGeneric execution completed.`;
        }
        
        nodeOutputs.set(currentId, output);
        updateNodeStatus(currentId, 'success', log);
        
        adjacencyList.get(currentId)?.forEach(neighbor => {
          inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
          if (inDegree.get(neighbor) === 0) {
            queue.push(neighbor);
          }
        });
      } catch (error: any) {
        log = `🚨 CRITICAL ERROR in node [${node.data.label}]\nTimestamp: ${new Date().toISOString()}\n\nError Details:\n${error.message}`;
        updateNodeStatus(currentId, 'error', log);
        hasError = true;
        break; // Stop execution on error
      }
    }

    // Persist node outputs to local storage
    if (activeProject) {
      const outputsObj = Object.fromEntries(nodeOutputs);
      localStorage.setItem(`lastWorkflowOutputs_${activeProject.id}`, JSON.stringify(outputsObj));
      
      // Save execution result to Firestore
      if (user) {
        await addDoc(collection(db, 'projects', activeProject.id, 'workflowExecutions'), {
          uid: user.uid,
          status: hasError ? 'error' : 'success',
          createdAt: serverTimestamp()
        });
      }
    }

    setIsExecuting(false);
    
    if (hasError) {
      setExecutionResult({ 
        status: 'error', 
        message: `Workflow execution failed. Check node logs for details.` 
      });
    } else {
      setExecutionResult({ 
        status: 'success', 
        message: `Successfully executed workflow with ${nodes.length} nodes and ${edges.length} connections.` 
      });
    }
    setTimeout(() => setExecutionResult(null), 5000);
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: any) => {
    setSelectedNode(node);
  }, []);

  const [menu, setMenu] = useState<any>(null);

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      setMenu({
        id: node.id,
        top: event.clientY,
        left: event.clientX,
        type: 'node'
      });
    },
    []
  );

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setMenu({
        top: event.clientY,
        left: event.clientX,
        type: 'pane'
      });
    },
    []
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setMenu(null);
  }, []);

  const updateNodeConfig = (key: string, value: string) => {
    if (!selectedNode) return;
    
    setNodes(nds => nds.map(n => {
      if (n.id === selectedNode.id) {
        const updatedNode = {
          ...n,
          data: {
            ...n.data,
            config: {
              ...(n.data.config || {}),
              [key]: value
            }
          }
        };
        setSelectedNode(updatedNode);
        return updatedNode;
      }
      return n;
    }));
  };

  const upstreamNodes = useMemo(() => {
    if (!selectedNode) return [];
    const visited = new Set<string>();
    const upstream: any[] = [];
    
    const traverse = (nodeId: string) => {
      const incomingEdges = edges.filter(e => e.target === nodeId);
      incomingEdges.forEach(edge => {
        if (!visited.has(edge.source)) {
          visited.add(edge.source);
          const sourceNode = nodes.find(n => n.id === edge.source);
          if (sourceNode) {
            upstream.push(sourceNode);
            traverse(edge.source);
          }
        }
      });
    };
    
    traverse(selectedNode.id);
    return upstream;
  }, [selectedNode, edges, nodes]);

  const insertVariable = (key: string, variable: string) => {
    if (!selectedNode) return;
    const currentValue = selectedNode.data.config?.[key] || '';
    updateNodeConfig(key, `${currentValue} {{${variable}}}`);
  };

  return (
    <div className="h-[calc(100vh-8rem)] w-full flex flex-col relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {executionResult && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`absolute bottom-6 right-6 p-4 rounded-xl shadow-2xl z-50 flex items-center max-w-md ${
              executionResult.status === 'success' ? 'bg-emerald-900/90 border border-emerald-500/50 text-emerald-100' : 'bg-rose-900/90 border border-rose-500/50 text-rose-100'
            }`}
          >
            {executionResult.status === 'success' ? <Icons.CheckCircle className="w-6 h-6 mr-3 text-emerald-400 flex-shrink-0" /> : <Icons.AlertTriangle className="w-6 h-6 mr-3 text-rose-400 flex-shrink-0" />}
            <p className="text-sm">{executionResult.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Log Modal */}
      <AnimatePresence>
        {selectedLogNode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Icons.FileText className="w-5 h-5 mr-2 text-indigo-400" />
                  Execution Log: {selectedLogNode.label}
                </h3>
                <button onClick={() => setSelectedLogNode(null)} className="text-slate-400 hover:text-white transition-colors">
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <pre className="text-sm text-slate-300 font-mono whitespace-pre-wrap bg-black/30 p-4 rounded-lg border border-white/5">
                  {selectedLogNode.log || 'No log available.'}
                </pre>
              </div>
              <div className="p-4 border-t border-white/10 bg-slate-800/50 flex justify-end">
                <button 
                  onClick={() => setSelectedLogNode(null)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Custom Node Modal */}
      <AnimatePresence>
        {showCustomNodeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Icons.Plus className="w-5 h-5 mr-2 text-indigo-400" />
                  Create Custom Node
                </h3>
                <button onClick={() => setShowCustomNodeModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Node Label</label>
                  <input 
                    type="text" 
                    value={customNodeForm.label}
                    onChange={e => setCustomNodeForm({...customNodeForm, label: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., Custom API Call"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <input 
                    type="text" 
                    value={customNodeForm.type}
                    onChange={e => setCustomNodeForm({...customNodeForm, type: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    placeholder="e.g., custom"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                  <textarea 
                    value={customNodeForm.description}
                    onChange={e => setCustomNodeForm({...customNodeForm, description: e.target.value})}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 h-20 resize-none"
                    placeholder="Describe what this node does..."
                  />
                </div>
              </div>
              <div className="p-4 border-t border-white/10 bg-slate-800/50 flex justify-end space-x-3">
                <button 
                  onClick={() => setShowCustomNodeModal(false)}
                  className="px-4 py-2 bg-transparent hover:bg-white/5 text-slate-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateCustomNode}
                  disabled={!customNodeForm.label}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  Create Node
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-4 px-6 lg:px-8">
        <div>
          <h1 className="text-3xl font-bold text-theme-main tracking-tight">Workflow Builder</h1>
          <p className="text-theme-muted mt-1">Drag and drop nodes to create autonomous marketing sequences.</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => setShowTemplatesModal(true)}
            className="bg-theme-surface border border-white/10 text-theme-main px-4 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center"
          >
            <Icons.LayoutTemplate className="w-4 h-4 mr-2" />
            Templates
          </button>
          <button 
            onClick={saveWorkflow}
            className="bg-theme-surface border border-white/10 text-theme-main px-4 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center"
          >
            <Icons.Save className="w-4 h-4 mr-2" />
            Save Workflow
          </button>
          <button 
            onClick={simulateJourney}
            disabled={isSimulating || isExecuting}
            className="bg-theme-surface border border-white/10 text-theme-main px-4 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center"
          >
            {isSimulating ? <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icons.Zap className="w-4 h-4 mr-2 text-amber-400" />}
            {isSimulating ? 'Simulating...' : 'Simulate 10k Journeys'}
          </button>
          <button 
            onClick={executeWorkflow}
            disabled={isExecuting}
            className="bg-theme-primary hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center transition-colors shadow-lg shadow-theme-primary/20"
          >
            {isExecuting ? <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Icons.Play className="w-4 h-4 mr-2" />}
            {isExecuting ? 'Executing...' : 'Execute Workflow'}
          </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden border-t border-white/10">
        {/* Sidebar for Nodes */}
        <div className="w-64 bg-theme-surface border-r border-white/10 flex flex-col h-full z-20">
          <div className="p-4 border-b border-white/10">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-theme-main">Node Library</h3>
              <button 
                onClick={() => setShowCustomNodeModal(true)}
                className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors"
                title="Create Custom Node"
              >
                <Icons.Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-3 relative">
              <Icons.Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search nodes..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            {!searchQuery && (
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                {categories.map(cat => (
                  <button 
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`text-xs px-2 py-1 rounded-full capitalize ${activeCategory === cat ? 'bg-theme-primary text-white' : 'bg-black/20 text-theme-muted hover:text-theme-main'}`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-2 custom-scrollbar">
            {displayNodes.map((node, i) => {
              const IconComponent = (Icons as any)[node.iconName] || Icons.Bot;
              return (
                <div 
                  key={i}
                  className="p-3 rounded-lg border border-white/10 bg-black/20 cursor-grab active:cursor-grabbing hover:bg-white/5 transition-colors flex flex-col items-center justify-center text-center relative group"
                  onDragStart={(event) => onDragStart(event, node)}
                  draggable
                >
                  <IconComponent className={`w-6 h-6 mb-2 ${node.color}`} />
                  <span className="text-[10px] text-theme-main truncate w-full">{node.label}</span>
                  {/* Tooltip for Node Description */}
                  <div className="absolute left-full ml-2 top-0 w-56 p-3 bg-slate-800 border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-[100]">
                    <p className="text-xs text-theme-muted leading-relaxed">{node.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Canvas */}
        <div 
          className={`flex-1 h-full relative transition-colors duration-300 ${isDraggingOver ? 'bg-indigo-900/20' : ''}`} 
          ref={reactFlowWrapper}
        >
          {isDraggingOver && (
            <div className="absolute inset-0 border-4 border-indigo-500/30 border-dashed z-10 pointer-events-none m-4 rounded-2xl" />
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodeContextMenu={onNodeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            snapToGrid={true}
            snapGrid={[15, 15]}
            fitView
            colorMode="dark"
            className="bg-slate-950"
          >
            {menu && (
              <div 
                className="absolute z-50 bg-slate-800 border border-white/10 rounded-lg shadow-xl py-1 w-40"
                style={{ top: menu.top, left: menu.left }}
              >
                {menu.type === 'node' && (
                  <button 
                    onClick={() => {
                      setNodes(nds => nds.filter(n => n.id !== menu.id));
                      setMenu(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-rose-900/20"
                  >
                    Delete Node
                  </button>
                )}
                {menu.type === 'pane' && (
                  <button 
                    onClick={() => {
                      setMenu(null);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5"
                  >
                    Add Node
                  </button>
                )}
              </div>
            )}
            <Controls className="bg-slate-900 border-white/10 fill-white" />
            <MiniMap 
              nodeColor={(node) => {
                return '#6366f1';
              }}
              maskColor="rgba(0, 0, 0, 0.7)"
              className="bg-slate-900 border-white/10"
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#334155" />
          </ReactFlow>
        </div>
        
        {/* Configuration Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div 
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-80 bg-slate-900 border-l border-white/10 flex flex-col h-full z-20 absolute right-0 top-0 shadow-2xl"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                <h3 className="font-semibold text-white flex items-center">
                  <Icons.Settings className="w-4 h-4 mr-2 text-indigo-400" />
                  Configure Node
                </h3>
                <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white transition-colors">
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-white mb-1">{selectedNode.data.label}</h4>
                  <p className="text-xs text-slate-400">{selectedNode.data.description || 'Configure parameters for this node.'}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-slate-300 mb-1">Node Label</label>
                    <input 
                      type="text" 
                      value={selectedNode.data.label}
                      onChange={e => {
                        const newLabel = e.target.value;
                        setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: newLabel } } : n));
                        setSelectedNode((prev: any) => ({ ...prev, data: { ...prev.data, label: newLabel } }));
                      }}
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                    />
                  </div>
                  {selectedNode.data.label === 'Fetch Keywords' && (
                    <div>
                      <div className="flex justify-between items-center mb-1 group relative">
                        <label className="block text-sm font-medium text-slate-300">Topic</label>
                        <Icons.Info className="w-3 h-3 text-slate-500 ml-1 cursor-help" />
                        <div className="absolute top-0 right-32 hidden group-hover:block bg-slate-800 text-xs text-slate-200 p-2 rounded shadow-lg border border-white/10 w-48 z-50">
                          Enter the topic to fetch keywords for. You can insert dynamic variables (e.g., {'{{projectName}}'}) or upstream outputs.
                        </div>
                        <VariableInserter 
                          onInsert={(v: string) => insertVariable('topic', v)} 
                          upstreamNodes={upstreamNodes} 
                          dynamicVariables={dynamicVariables} 
                        />
                      </div>
                      <input 
                        type="text" 
                        value={selectedNode.data.config?.topic || ''}
                        onChange={e => updateNodeConfig('topic', e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        placeholder="e.g., digital marketing"
                      />
                    </div>
                  )}
                  
                  {selectedNode.data.label === 'Generate Blog' && (
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-1 group relative">
                          <label className="block text-sm font-medium text-slate-300">Topic / Instructions</label>
                          <Icons.Info className="w-3 h-3 text-slate-500 ml-1 cursor-help" />
                          <div className="absolute top-0 right-32 hidden group-hover:block bg-slate-800 text-xs text-slate-200 p-2 rounded shadow-lg border border-white/10 w-48 z-50">
                            Provide the topic or instructions to generate the blog. You can use dynamic variables here.
                          </div>
                          <VariableInserter 
                            onInsert={(v: string) => insertVariable('topic', v)} 
                            upstreamNodes={upstreamNodes} 
                            dynamicVariables={dynamicVariables} 
                          />
                        </div>
                        <textarea 
                          value={selectedNode.data.config?.topic || ''}
                          onChange={e => updateNodeConfig('topic', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 h-20 resize-none text-sm"
                          placeholder="What should the blog be about?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1 group relative flex items-center">
                          Tone
                          <Icons.Info className="w-3 h-3 text-slate-500 ml-1 cursor-help" />
                          <div className="absolute top-0 right-32 hidden group-hover:block bg-slate-800 text-xs text-slate-200 p-2 rounded shadow-lg border border-white/10 w-48 z-50">
                            Select the stylistic tone for the generated blog post.
                          </div>
                        </label>
                        <select 
                          value={selectedNode.data.config?.tone || 'professional'}
                          onChange={e => updateNodeConfig('tone', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        >
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="humorous">Humorous</option>
                          <option value="informative">Informative</option>
                        </select>
                      </div>
                    </div>
                  )}
                  
                  {selectedNode.data.label === 'Send Email' && (
                    <>
                      <div>
                        <div className="flex justify-between items-center mb-1 group relative">
                          <label className="block text-sm font-medium text-slate-300">Recipient</label>
                          <Icons.Info className="w-3 h-3 text-slate-500 ml-1 cursor-help" />
                          <div className="absolute top-0 right-32 hidden group-hover:block bg-slate-800 text-xs text-slate-200 p-2 rounded shadow-lg border border-white/10 w-48 z-50">
                            Email address of the recipient. Insert variables to send to dynamic recipients.
                          </div>
                          <VariableInserter 
                            onInsert={(v: string) => insertVariable('recipient', v)} 
                            upstreamNodes={upstreamNodes} 
                            dynamicVariables={dynamicVariables} 
                          />
                        </div>
                        <input 
                          type="email" 
                          value={selectedNode.data.config?.recipient || ''}
                          onChange={e => updateNodeConfig('recipient', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                          placeholder="user@example.com"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1 group relative">
                          <label className="block text-sm font-medium text-slate-300">Subject</label>
                          <Icons.Info className="w-3 h-3 text-slate-500 ml-1 cursor-help" />
                          <div className="absolute top-0 right-32 hidden group-hover:block bg-slate-800 text-xs text-slate-200 p-2 rounded shadow-lg border border-white/10 w-48 z-50">
                            Subject line for the email. Dynamic variables are supported.
                          </div>
                          <VariableInserter 
                            onInsert={(v: string) => insertVariable('subject', v)} 
                            upstreamNodes={upstreamNodes} 
                            dynamicVariables={dynamicVariables} 
                          />
                        </div>
                        <input 
                          type="text" 
                          value={selectedNode.data.config?.subject || ''}
                          onChange={e => updateNodeConfig('subject', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                          placeholder="Email Subject"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1 group relative">
                          <label className="block text-sm font-medium text-slate-300">Body</label>
                          <Icons.Info className="w-3 h-3 text-slate-500 ml-1 cursor-help" />
                          <div className="absolute bottom-6 right-0 hidden group-hover:block bg-slate-800 text-xs text-slate-200 p-2 rounded shadow-lg border border-white/10 w-48 z-50">
                            Contents of the email. You can insert variables directly into the body.
                          </div>
                          <VariableInserter 
                            onInsert={(v: string) => insertVariable('body', v)} 
                            upstreamNodes={upstreamNodes} 
                            dynamicVariables={dynamicVariables} 
                          />
                        </div>
                        <textarea 
                          value={selectedNode.data.config?.body || ''}
                          onChange={e => updateNodeConfig('body', e.target.value)}
                          className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 h-24 resize-none text-sm"
                          placeholder="Email content..."
                        />
                      </div>
                    </>
                  )}
                  
                  {/* Generic configuration for other nodes or custom nodes */}
                  {selectedNode.data.label !== 'Fetch Keywords' && selectedNode.data.label !== 'Generate Blog' && selectedNode.data.label !== 'Send Email' && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-slate-300">Custom Parameter</label>
                        <VariableInserter 
                          onInsert={(v: string) => insertVariable('customParam', v)} 
                          upstreamNodes={upstreamNodes} 
                          dynamicVariables={dynamicVariables} 
                        />
                      </div>
                      <input 
                        type="text" 
                        value={selectedNode.data.config?.customParam || ''}
                        onChange={e => updateNodeConfig('customParam', e.target.value)}
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500 text-sm"
                        placeholder="Enter value..."
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Simulation Results Modal */}
      <AnimatePresence>
        {showSimulationResults && simulationData && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-white/10 flex justify-between items-center bg-indigo-500/10">
                <h3 className="text-xl font-bold text-white flex items-center">
                  <Icons.Sparkles className="w-6 h-6 mr-3 text-indigo-400" />
                  Predictive Simulation Results
                </h3>
                <button onClick={() => setShowSimulationResults(false)} className="text-slate-400 hover:text-white transition-colors">
                  <Icons.X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Total Journeys</div>
                    <div className="text-2xl font-bold text-white">{simulationData.totalJourneys.toLocaleString()}</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Conversions</div>
                    <div className="text-2xl font-bold text-emerald-400">{simulationData.conversions.toLocaleString()}</div>
                  </div>
                  <div className="bg-black/40 p-4 rounded-xl border border-white/5 text-center">
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-widest mb-1">Predicted ROI</div>
                    <div className="text-2xl font-bold text-indigo-400">{simulationData.predictedROI}</div>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Funnel Drop-off Analysis</h4>
                  <div className="space-y-4">
                    {simulationData.dropoffs.map((d: any, i: number) => (
                      <div key={i} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-white font-medium">{d.node}</span>
                          <span className="text-rose-400 font-bold">{d.rate} drop-off</span>
                        </div>
                        <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${100 - parseFloat(d.rate)}%` }}
                            transition={{ duration: 1, delay: 0.5 + (i * 0.2) }}
                            className={`h-full rounded-full ${i === 0 ? 'bg-indigo-500' : i === 1 ? 'bg-indigo-600' : 'bg-indigo-700'}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex items-start">
                  <Icons.AlertTriangle className="w-5 h-5 text-amber-400 mr-3 mt-0.5" />
                  <div>
                    <h5 className="text-amber-400 font-bold text-sm">Identified Bottleneck</h5>
                    <p className="text-slate-300 text-sm">The simulation indicates a significant drop-off at the <span className="text-white font-bold">"{simulationData.bottleneck}"</span> node. Consider refining the configuration or adding a fallback path.</p>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-white/10 bg-black/20 flex justify-end">
                <button 
                  onClick={() => setShowSimulationResults(false)}
                  className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20"
                >
                  Optimize Workflow
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Templates Modal */}
      <AnimatePresence>
        {showTemplatesModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Icons.LayoutTemplate className="w-5 h-5 mr-2 text-indigo-400" />
                  Predefined Templates
                </h3>
                <button onClick={() => setShowTemplatesModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <Icons.X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-4">
                {WORKFLOW_TEMPLATES.map(template => (
                  <div key={template.id} className="bg-black/30 border border-white/10 rounded-xl p-5 hover:border-indigo-500/50 transition-colors flex flex-col">
                    <h4 className="text-lg font-semibold text-white mb-2">{template.name}</h4>
                    <p className="text-sm text-slate-400 mb-4 flex-1">{template.description}</p>
                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                      <span className="text-xs text-slate-500">{template.nodes.length} Nodes</span>
                      <button 
                        onClick={() => loadTemplate(template)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                      >
                        Load Template
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Execution Log Modal */}
      <AnimatePresence>
        {selectedLogNode && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className={`p-4 border-b border-white/10 flex justify-between items-center ${selectedLogNode.status === 'error' ? 'bg-rose-500/10' : 'bg-slate-800/50'}`}>
                <h3 className="text-lg font-semibold text-white flex items-center">
                  <Icons.Terminal className="w-5 h-5 mr-2 text-indigo-400" />
                  Execution Log: {selectedLogNode.label}
                </h3>
                 <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 flex items-center text-xs font-bold rounded uppercase tracking-wider ${
                      selectedLogNode.status === 'error' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/20' : 
                      selectedLogNode.status === 'success' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20' : 
                      'bg-indigo-500/20 text-indigo-400 border border-indigo-500/20'
                    }`}>
                      {selectedLogNode.status}
                    </span>
                    <button onClick={() => setSelectedLogNode(null)} className="text-slate-400 hover:text-white transition-colors">
                      <Icons.X className="w-5 h-5" />
                    </button>
                 </div>
              </div>
              <div className="p-6 overflow-y-auto custom-scrollbar bg-black/50 text-white font-mono text-sm whitespace-pre-wrap leading-relaxed">
                {selectedLogNode.log || 'No execution log available. Please run the workflow first.'}
              </div>
              <div className="p-4 border-t border-white/10 bg-slate-800/50 flex justify-end">
                 <button 
                  onClick={() => setSelectedLogNode(null)}
                  className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors"
                 >
                   Close
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
