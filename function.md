# TriMatrix: Application Architecture & Developer Guide

Welcome to the TriMatrix developer documentation. This document is designed to help new team members understand the system architecture, core modules, and state management of the TriMatrix application to easily maintain and scale the codebase.

## 1. High-Level Overview
TriMatrix is an AI-powered, project-centric digital marketing automation platform. It allows users to manage multiple projects (or clients) simultaneously, generate marketing content, build automated workflows, track SEO, schedule social media posts, and monitor analytics.

## 2. Tech Stack
*   **Frontend Framework:** React 18+ with Vite
*   **Routing:** React Router v7
*   **Styling & UI:** Tailwind CSS, Framer Motion (animations), Lucide React (icons)
*   **Database & Auth:** Firebase (Firestore, Authentication)
*   **AI Integrations:** Google GenAI (Gemini)
*   **Data Visualization:** Recharts
*   **Workflow UI:** React Flow (`@xyflow/react`)

## 3. Application Architecture

The application relies heavily on React Contexts for global state management and Firebase Firestore for real-time data persistence. 

### Global Contexts (`/src/context`)
*   **`AuthContext.tsx`**: Manages user authentication state via Firebase Auth.
*   **`ProjectContext.tsx`**: Manages the multi-tenant aspect. All data (SEO, Social, Content) is scoped to the `activeProject`. Ensure you use `useProjects()` to retrieve the `activeProject.id` before fetching data.
*   **`NotificationContext.tsx`**: A system-wide notification hub tied to Firestore notifications.

### Database Design (Firestore)
The database utilizes a **Project-Centric Data Model**. This prevents cross-client data spills.
*   `/users/{uid}`: Stores user roles.
*   `/projects/{projectId}`: Core document defining a workspace.
    *   ↳ `/seoStrategies`, `/generatedContent`, `/socialPosts`, `/workflows`, `/analytics`, `/activities`, `/aiChatMessages`, `/automationRules` (Nested subcollections scoped by project).

*(See `/firestore.rules` for exact security rules enforcing this structure).*

## 4. Core Modules Breakdown

### `src/pages/Dashboard.tsx`
*   **Purpose:** The main hub showing high-level KPIs, activity feeds, and active projects.
*   **Key Logic:** Fetches `trafficData` and `activities` scoped to the current active project. Provides AI-powered mock data generation for demoing analytics.

### `src/pages/SeoEngine.tsx`
*   **Purpose:** Keyword tracking, competitor gap analysis, and strategic SEO planning.
*   **Key Logic:** Users can create custom SEO strategies mapped dynamically to keywords. Uses Gemini to suggest long-tail keywords and content clusters (`generateAISuggestions`).

### `src/pages/ContentGen.tsx`
*   **Purpose:** AI content generation tailored to specific platforms (Blog, Twitter, Instagram).
*   **Key Logic:** Fetches user business profile, generates platform-specific prompts, and pings the Gemini API to return content. Also offers a summarization tool. Output is saved to `generatedContent`.

### `src/pages/SocialMedia.tsx`
*   **Purpose:** Content calendar and publishing queue.
*   **Key Logic:** Features a custom Calendar UI that fetches `socialPosts`. Users can create new posts mapped to specific dates and statuses (Draft, Scheduled, Published).

### `src/pages/Workflow.tsx`
*   **Purpose:** A visual node-based workflow editor for email drips, approvals, or multi-step logic.
*   **Key Logic:** Uses `React Flow`. The `executeWorkflow` function traverses nodes sequentially. Special nodes like "Fetch Keywords" or "Generate Blog" will automatically call the Gemini API during execution. Connects inputs to outputs dynamically using `dynamicVariables`.

### `src/pages/Analytics.tsx` & `src/pages/Performance.tsx`
*   **Purpose:** Data visualization and system health monitoring.
*   **Key Logic:** Integrates `Recharts`. Pulls time-series data from Firestore. Performance monitors API latency, automated rule execution times, and triggers alerts.

### `src/pages/Automation.tsx`
*   **Purpose:** Rule-based event listeners.
*   **Key Logic:** Triggers backend jobs based on conditions (e.g., "Every Monday at 9AM"). Currently acts as a UI layer for managing triggers stored in the `automationRules` collection.

### `src/pages/AI.tsx`
*   **Purpose:** The central AI assistant hub and persona generator.
*   **Key Logic:** Maintains a chat history (`aiChatMessages`) tied to the active project. Also features a custom persona generator requiring the Target Audience input.

### `src/pages/Settings.tsx`
*   **Purpose:** System config, billing, platform integrations, and team management.
*   **Key Logic:** This is where the user's `businessProfile` (synced to localized storage and AI context) and third-party API Keys are managed.

## 5. Adding New Features (Dev Workflow)

If your team needs to build a new feature (e.g., a "CRM Sync" tool), follow this process:

1.  **Define state:** Check if data is purely local (use `useLocalStorage`) or shared (use `Firestore`).
2.  **Backend Structure:** If adding to Firestore, create a nested collection under `projects/{projectId}/crmData` so it automatically scales across different clients.
3.  **Security Rules:** Immediately add the new path rule to `firestore.rules`.
    *Example:* `match /crmData/{crmId} { allow read, write: if isProjectOwner(projectId) || isAdmin(); }`
4.  **UI Construction:** Create the page in `src/pages`, import standard icons from `lucide-react`, wrap page content in standard `<div className="glassy-neumorphic">` containers to persist the theme.
5.  **Router:** Register the page in `src/App.tsx`.

## 6. Important Design Patterns to Maintain

*   **Error Boundaries & Fallbacks:** Wrap sensitive operations (like parsing AI responses) in `try/catch`. Always use the shared `handleFirestoreError(error, OperationType.xxx, path)` utility for unhandled database promises.
*   **Dark Mode / Theming:** Rely entirely on Tailwind utility classes (e.g., `text-theme-main`, `bg-theme-surface`, `bg-black/20`). Do NOT use inline styles.
*   **AI API Security:** API usage should ideally be channeled through server-side functions in production. In this architecture, it is performed client-side using `import.meta.env` or user-provided keys from the Settings page.

---
*Created by TriMatrix AI for Team Onboarding & Handoff.*
