
import React, { useState } from 'react';
import { Project } from '../types';
import { Plus, Box, ArrowRight, FolderKanban } from 'lucide-react';

interface ProjectSelectionProps {
  projects: Project[];
  onCreateProject: (name: string, description: string) => void;
  onSelectProject: (projectId: string) => void;
}

const ProjectSelection: React.FC<ProjectSelectionProps> = ({ projects, onCreateProject, onSelectProject }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onCreateProject(newName, newDesc);
      setNewName('');
      setNewDesc('');
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-200 mb-6">
            <Box size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Welcome to ProcessM8</h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Your intelligent platform for process visualization and optimization. 
            Select an existing project or create a new one to get started.
          </p>
        </div>

        {isCreating ? (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-slate-800 mb-6">Create New Project</h2>
            <form onSubmit={handleCreate}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Name</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                  placeholder="e.g. Order Fulfillment V2"
                  autoFocus
                  required
                />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  className="w-full p-3 bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all h-24 resize-none placeholder:text-slate-400"
                  placeholder="Briefly describe the goals of this process..."
                />
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsCreating(false)}
                  className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
                  disabled={!newName.trim()}
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button 
              onClick={() => setIsCreating(true)}
              className="group flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50/50 transition-all"
            >
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                <Plus size={24} />
              </div>
              <span className="font-semibold text-slate-700 group-hover:text-indigo-700">Create New Project</span>
            </button>

            {projects.map(project => (
              <div 
                key={project.id} 
                onClick={() => onSelectProject(project.id)}
                className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer group flex flex-col"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <FolderKanban size={24} />
                  </div>
                  <span className="text-xs text-slate-400 font-medium">
                    {project.updatedAt.toLocaleDateString()}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1">
                  {project.description || "No description provided."}
                </p>
                <div className="flex items-center text-indigo-600 text-sm font-medium">
                  Open Project <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectSelection;
