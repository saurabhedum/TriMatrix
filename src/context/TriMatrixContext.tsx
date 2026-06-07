import React, { createContext, useContext, useState, useEffect } from 'react';

// This context acts as the "TriMatrix Nexus" - the AI brain that connects all modules
interface TriMatrixContextType {
  isAutoOptimizing: boolean;
  toggleAutoOptimize: () => void;
  // Could hold shared metrics across pages
  globalSentimentScore: number;
  setGlobalSentimentScore: (score: number) => void;
  predictiveInsights: string[];
  systemHealth: number;
}

const TriMatrixContext = createContext<TriMatrixContextType | undefined>(undefined);

export const TriMatrixProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAutoOptimizing, setIsAutoOptimizing] = useState(false);
  const [globalSentimentScore, setGlobalSentimentScore] = useState(85);
  const [systemHealth, setSystemHealth] = useState(99.8);
  const [predictiveInsights, setPredictiveInsights] = useState([
    "Audience fatigue detected on Facebook; shifting 15% budget to TikTok.",
    "Optimal posting window shifted due to global event; rescheduling next 3 drops.",
    "A/B test 'Variant C' showing 42% higher CTR. Auto-scaling campaign."
  ]);

  const toggleAutoOptimize = () => setIsAutoOptimizing(!isAutoOptimizing);

  return (
    <TriMatrixContext.Provider value={{ isAutoOptimizing, toggleAutoOptimize, globalSentimentScore, setGlobalSentimentScore, predictiveInsights, systemHealth }}>
      {children}
    </TriMatrixContext.Provider>
  );
};

export const useTriMatrix = () => {
  const context = useContext(TriMatrixContext);
  if (!context) throw new Error('useTriMatrix must be used within a TriMatrixProvider');
  return context;
};
