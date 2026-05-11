import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  const apiRouter = express.Router();

  // 1. Dashboard Analytics
  apiRouter.get('/analytics/dashboard', (req, res) => {
    res.json({
      traffic: 124500,
      ctr: 4.2,
      conversions: 3120,
      trends: [
        { name: 'Mon', traffic: 12000, conversions: 300 },
        { name: 'Tue', traffic: 15000, conversions: 400 },
        { name: 'Wed', traffic: 14000, conversions: 350 },
        { name: 'Thu', traffic: 18000, conversions: 500 },
        { name: 'Fri', traffic: 22000, conversions: 600 },
        { name: 'Sat', traffic: 25000, conversions: 700 },
        { name: 'Sun', traffic: 18500, conversions: 470 },
      ]
    });
  });

  // 2. SEO Automation
  apiRouter.get('/seo/keywords', (req, res) => {
    res.json([
      { id: 1, keyword: 'ai marketing automation', volume: 12500, difficulty: 65, trend: '+15%' },
      { id: 2, keyword: 'seo automation tools', volume: 8400, difficulty: 45, trend: '+8%' },
      { id: 3, keyword: 'content generation ai', volume: 22000, difficulty: 78, trend: '+22%' },
      { id: 4, keyword: 'social media scheduler', volume: 45000, difficulty: 82, trend: '-2%' },
      { id: 5, keyword: 'predictive analytics marketing', volume: 5600, difficulty: 55, trend: '+45%' },
    ]);
  });

  // 3. Content Generation
  apiRouter.post('/content/generate', (req, res) => {
    const { topic, platform, tone } = req.body;
    res.json({
      success: true,
      content: `Generated ${tone} content for ${platform} about ${topic}. This is a simulated AI response. In a real app, this would call OpenAI or Gemini APIs.`,
      metadata: {
        wordCount: 45,
        estimatedReadTime: '1 min'
      }
    });
  });

  // Proxy for actual social media publishing
  apiRouter.post('/social/publish', async (req, res) => {
    const { platform, content, apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(401).json({ success: false, error: 'Missing API Key for this platform. Please connect it in settings.' });
    }

    try {
      // In a fully production environment, we would use official SDKs (e.g. twitter-api-v2) 
      // and proper OAuth 2.0 flows. This executes a best-effort client-provided bearer token request.
      if (platform === 'Twitter' || platform === 'X (Twitter)') {
        const response = await fetch('https://api.twitter.com/2/tweets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ text: content })
        });
        const data = await response.json();
        
        // Even if unauthorized/failed, we return it to the client to see the real API response
        return res.json({ success: response.ok, data, provider: 'Twitter v2 API' });
      } else if (platform === 'LinkedIn') {
         // LinkedIn standard ugcPosts format
         const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              'X-Restli-Protocol-Version': '2.0.0',
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              author: `urn:li:person:ME`, // Typically requires extracting user URN
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: {text: content},
                  shareMediaCategory: 'NONE'
                }
              },
              visibility: {'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'}
            })
         });
         const data = await response.json();
         return res.json({ success: response.ok, data, provider: 'LinkedIn API' });
      }

      // Fallback for unsupported simulation direct APIs
      return res.json({ 
        success: true, 
        simulated: true,
        message: `Simulated successful post to ${platform} via proxy due to complex authentication requirements.` 
      });

    } catch (error) {
      return res.status(500).json({ success: false, error: (error as Error).message });
    }
  });
  
  // 5. Automation Tasks
  apiRouter.get('/automation/tasks', (req, res) => {
    res.json([
      { id: 1, name: 'Daily SEO Keyword Refresh', type: 'Scheduled', status: 'Active', nextRun: '2026-03-22T00:00:00Z' },
      { id: 2, name: 'Traffic Drop Alert -> Generate Content', type: 'Event-Based', status: 'Active', trigger: 'Traffic < 1000/hr' },
      { id: 3, name: 'Weekly Performance Report', type: 'Scheduled', status: 'Paused', nextRun: null },
    ]);
  });

  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, '..', 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
