
import React, { useState } from 'react';
import { Project } from '../types';
import { Plus, Box, ArrowRight, FolderKanban, X, Upload, Sparkles, Clock, LayoutGrid, Search } from 'lucide-react';

interface ProjectSelectionProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => void;
  onSelectProject: (projectId: string) => void;
  onImportBackup?: () => void;
  children?: React.ReactNode;
}

const ProjectSelection: React.FC<ProjectSelectionProps> = ({ projects, onCreateProject, onSelectProject, onImportBackup, children }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreateProject(newName, newDesc);
      setNewName('');
      setNewDesc('');
      setIsCreating(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center p-4 sm:p-8 relative overflow-hidden">
      {/* Background Polish */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-indigo-100 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px]" />
      </div>

      {children}

      <div className="max-w-6xl w-full z-10 flex flex-col h-full">
        {/* Compact Header */}
        <header className="flex flex-col sm:flex-row items-center justify-between mb-10 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <Box size={24} className="text-white" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">ProcessM8</h1>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">Enterprise Intelligence</span>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Search workspaces..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <button 
              onClick={onImportBackup}
              className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all"
              title="Restore Workspace"
            >
              <Upload size={20} />
            </button>
            <button 
              onClick={() => setIsCreating(true)}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95"
            >
              <Plus size={18} /> New Workspace
            </button>
          </div>
        </header>

        {/* Project Grid */}
        <div className="flex-1">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2 text-slate-400">
              <LayoutGrid size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Active Workspaces</span>
            </div>
            <div className="text-xs font-medium text-slate-400">
              {filteredProjects.length} projects found
            </div>
          </div>

          {filteredProjects.length === 0 ? (
            <div className="py-20 bg-white border border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <FolderKanban size={32} className="text-slate-300" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">No Projects Found</p>
              <p className="text-xs text-slate-500 mb-6">Start by creating a new workspace or restoring a backup.</p>
              <button 
                onClick={() => setIsCreating(true)}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all active:scale-95"
              >
                Create Workspace
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredProjects.map(project => (
                <div 
                  key={project.id} 
                  onClick={() => onSelectProject(project.id)} 
                  className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-400 hover:-translate-y-1 transition-all cursor-pointer group flex flex-col relative overflow-hidden min-h-[220px]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <FolderKanban size={20} />
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <Clock size={12} />
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-black text-slate-900 mb-2 group-hover:text-indigo-600 truncate transition-colors">
                    {project.name}
                  </h3>
                  
                  <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1 font-medium leading-relaxed">
                    {project.description || "Establish process boundaries and optimize operational efficiency."}
                  </p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                      Open Console
                    </span>
                    <ArrowRight size={18} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support Footer */}
        <footer className="mt-12 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            ProcessM8 v1.4.2
          </div>
        </footer>
      </div>

      {/* Modern Creation Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 slide-in-from-bottom-10 duration-500">
            <div className="p-8 pb-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles size={20} />
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">New Workspace</h2>
              </div>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="p-8 pt-4">
              <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Workspace Identity</label>
                <input 
                  type="text" 
                  value={newName} 
                  onChange={e => setNewName(e.target.value)} 
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-semibold" 
                  placeholder="e.g. Supply Chain Optimization" 
                  autoFocus 
                  required 
                />
              </div>
              <div className="mb-8">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 ml-1">Strategic Context</label>
                <textarea 
                  value={newDesc} 
                  onChange={e => setNewDesc(e.target.value)} 
                  className="w-full px-5 py-3.5 bg-slate-50 text-slate-900 border border-slate-200 rounded-2xl h-32 resize-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all font-medium" 
                  placeholder="Define the primary process objectives and KPIs..." 
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)} 
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black text-sm transition-all"
                >
                  Discard
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-50" 
                  disabled={!newName.trim()}
                >
                  Initialize Console
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSelection;
