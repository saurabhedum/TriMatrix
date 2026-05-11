/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProjectProvider } from './context/ProjectContext';
import { NotificationProvider } from './context/NotificationContext';
import Layout from './components/Layout';
import Hero from './pages/Hero';
import Dashboard from './pages/Dashboard';
import SeoEngine from './pages/SeoEngine';
import ContentGen from './pages/ContentGen';
import SocialMedia from './pages/SocialMedia';
import Analytics from './pages/Analytics';
import Performance from './pages/Performance';
import Automation from './pages/Automation';
import Settings from './pages/Settings';
import Workflow from './pages/Workflow';
import AI from './pages/AI';
import Magic from './pages/Magic';
import Onboarding from './pages/Onboarding';
import AuthPage from './pages/AuthPage';

// A wrapper to handle authentication state
function AppRoutes() {
  const { user, isAuthReady } = useAuth();

  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen bg-theme-base flex items-center justify-center">
        <div className="w-8 h-8 flex items-center justify-center border-4 border-theme-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Hero />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="seo" element={<SeoEngine />} />
        <Route path="content" element={<ContentGen />} />
        <Route path="social" element={<SocialMedia />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="performance" element={<Performance />} />
        <Route path="automation" element={<Automation />} />
        <Route path="ai" element={<AI />} />
        <Route path="magic" element={<Magic />} />
        <Route path="onboarding" element={<Onboarding />} />
        <Route path="settings" element={<Settings />} />
        <Route path="workflow" element={<Workflow />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <NotificationProvider>
            <ThemeProvider>
              <AppRoutes />
            </ThemeProvider>
          </NotificationProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
