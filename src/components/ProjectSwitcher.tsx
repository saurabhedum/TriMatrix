import { useState } from 'react';
import { useProjects } from '../context/ProjectContext';
import { ChevronDown, Plus, Layout } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ProjectSwitcher() {
  const { projects, activeProject, setActiveProject, createProject } = useProjects();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName) return;
    await createProject(newName, 'Default Client');
    setNewName('');
    setIsCreating(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 text-theme-main transition-colors"
      >
        <span className="flex items-center text-sm truncate">
          <Layout className="w-4 h-4 mr-2 text-theme-primary" />
          {activeProject?.name || 'Select Project'}
        </span>
        <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute top-full left-0 right-0 mt-2 bg-theme-surface border border-white/10 rounded-lg shadow-xl z-[60] overflow-hidden"
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {projects.map(p => (
                <button
                  key={p.id}
                  onClick={() => { setActiveProject(p); setIsOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-white/5 ${activeProject?.id === p.id ? 'text-theme-primary font-bold' : 'text-theme-muted'}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
            
            <div className="p-2 border-t border-white/10">
              {isCreating ? (
                <div className="space-y-2">
                  <input
                    autoFocus
                    placeholder="Project Name"
                    className="w-full bg-black/20 border border-white/10 rounded px-2 py-1 text-xs"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <button onClick={handleCreate} className="w-full bg-theme-primary text-white text-xs py-1 rounded">Create</button>
                </div>
              ) : (
                <button onClick={() => setIsCreating(true)} className="w-full flex items-center justify-center text-xs py-2 text-theme-primary hover:bg-theme-primary/10 rounded">
                  <Plus className="w-3 h-3 mr-1" /> New Project
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
