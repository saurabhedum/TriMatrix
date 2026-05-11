import { useEffect, useRef } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useProjects } from '../context/ProjectContext';

export function useAutoSave(collectionName: string, docId: string, data: any, delay = 2000) {
  const { activeProject } = useProjects();
  const initialData = useRef(data);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Only auto-save if data changed
    if (JSON.stringify(initialData.current) === JSON.stringify(data)) return;
    
    // Clear previous timer
    if (timerRef.current) clearTimeout(timerRef.current);

    // Debounce save
    timerRef.current = setTimeout(async () => {
      try {
        if (!activeProject || !docId) return;
        
        const docRef = doc(db, 'projects', activeProject.id, collectionName, docId);
        await updateDoc(docRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
        initialData.current = data;
      } catch (error) {
        console.error('AutoSave failed:', error);
      }
    }, delay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [data, collectionName, docId, activeProject, delay]);
}
