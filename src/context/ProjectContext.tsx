import React, { createContext, useContext, useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './AuthContext';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  progress: number;
}

interface ProjectContextType {
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (project: Project | null) => void;
  createProject: (name: string, client: string) => Promise<void>;
  loading: boolean;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setActiveProject(null);
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'projects'), where('uid', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projectsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Project[];
      setProjects(projectsData);
      
      // Auto-set the first project if none active
      if (!activeProject && projectsData.length > 0) {
        setActiveProject(projectsData[0]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const createProject = async (name: string, client: string) => {
    if (!user) return;
    await addDoc(collection(db, 'projects'), {
      uid: user.uid,
      name,
      client,
      status: 'Active',
      progress: 0,
      deadline: new Date().toISOString(),
      createdAt: serverTimestamp()
    });
  };

  return (
    <ProjectContext.Provider value={{ projects, activeProject, setActiveProject, createProject, loading }}>
        {children}
    </ProjectContext.Provider>
  );
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProjects must be used within ProjectProvider');
  return context;
};
