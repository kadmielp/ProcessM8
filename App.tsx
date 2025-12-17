
import React, { useState } from 'react';
import { ViewState, Project, ProjectData } from './types';
import { getInitialProjectData } from './constants';
import ProcessEditor from './components/ProcessEditor';
import Dashboard from './components/Dashboard';
import SimulationPanel from './components/SimulationPanel';
import ChatAssistant from './components/ChatAssistant';
import FishboneEditor from './components/FishboneEditor';
import VSMEditor from './components/VSMEditor';
import SIPOCEditor from './components/SIPOCEditor';
import DMNEditor from './components/DMNEditor';
import CMMNEditor from './components/CMMNEditor';
import FormEditor from './components/FormEditor';
import ProjectSelection from './components/ProjectSelection';
import { generateProcessMapFromDescription, generateVSMData, generateSIPOCData, generateDMNRules, generateCMMNModel, generateFormSchema } from './services/geminiService';
import { 
  LayoutDashboard, 
  GitMerge, 
  Settings2, 
  MessageSquare,
  Box,
  Menu,
  Bell,
  ArrowLeft,
  FishSymbol,
  Map,
  Table,
  Briefcase,
  FormInput,
  Target
} from 'lucide-react';

const App: React.FC = () => {
  // Project Management State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [allProjectData, setAllProjectData] = useState<Record<string, ProjectData>>({});

  // View State (Dashboard is default now)
  const [view, setView] = useState<ViewState>('dashboard');
  const [showSimulation, setShowSimulation] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Derived state for current project
  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeData = activeProjectId ? allProjectData[activeProjectId] : null;

  // Actions
  const handleCreateProject = (name: string, description: string) => {
    const newId = crypto.randomUUID();
    const newProject: Project = {
      id: newId,
      name,
      description,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    setProjects(prev => [newProject, ...prev]);
    setAllProjectData(prev => ({
      ...prev,
      [newId]: getInitialProjectData()
    }));
    setActiveProjectId(newId);
    setView('dashboard'); // Start at dashboard
  };

  const updateActiveProjectData = (partialData: Partial<ProjectData>) => {
    if (!activeProjectId) return;
    
    setAllProjectData(prev => ({
      ...prev,
      [activeProjectId]: {
        ...prev[activeProjectId],
        ...partialData
      }
    }));
    
    // Update timestamp
    setProjects(prev => prev.map(p => 
      p.id === activeProjectId ? { ...p, updatedAt: new Date() } : p
    ));
  };

  const handleGenerateProcess = async (description: string) => {
    if (!activeProjectId) return;
    setIsGenerating(true);
    const newMap = await generateProcessMapFromDescription(description);
    if (newMap) {
      updateActiveProjectData({ processMap: newMap });
    }
    setIsGenerating(false);
  };

  const handleGenerateVSM = async (description: string) => {
      if (!activeProjectId) return;
      setIsGenerating(true);
      const newVSM = await generateVSMData(description);
      if (newVSM) {
          updateActiveProjectData({ vsm: newVSM });
      }
      setIsGenerating(false);
  };

  const handleGenerateSIPOC = async (description: string) => {
    if (!activeProjectId) return;
    setIsGenerating(true);
    const newSIPOC = await generateSIPOCData(description);
    if (newSIPOC) {
        updateActiveProjectData({ sipoc: newSIPOC });
    }
    setIsGenerating(false);
  };

  const handleGenerateDMN = async (description: string) => {
    if (!activeProjectId) return;
    setIsGenerating(true);
    const newDMN = await generateDMNRules(description);
    if (newDMN) {
      updateActiveProjectData({ dmn: newDMN });
    }
    setIsGenerating(false);
  };

  const handleGenerateCMMN = async (description: string) => {
    if (!activeProjectId) return;
    setIsGenerating(true);
    const newCMMN = await generateCMMNModel(description);
    if (newCMMN) {
      updateActiveProjectData({ cmmn: newCMMN });
    }
    setIsGenerating(false);
  };

  const handleGenerateForm = async (description: string) => {
    if (!activeProjectId) return;
    setIsGenerating(true);
    const newForm = await generateFormSchema(description);
    if (newForm) {
      updateActiveProjectData({ form: newForm });
    }
    setIsGenerating(false);
  };

  // If no project selected, show selection screen
  if (!activeProjectId || !activeData) {
    return (
      <ProjectSelection 
        projects={projects}
        onCreateProject={handleCreateProject}
        onSelectProject={setActiveProjectId}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden">
      
      {/* Sidebar */}
      <aside className="w-20 lg:w-64 bg-slate-900 flex-shrink-0 flex flex-col items-center lg:items-stretch text-white transition-all duration-300">
        <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center mr-0 lg:mr-3 shadow-lg shadow-indigo-500/30">
            <Box size={20} className="text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden lg:block">ProcessM8</span>
        </div>

        <nav className="flex-1 py-6 space-y-2 px-2 lg:px-4">
          <div className="px-3 pb-2 text-xs font-bold text-slate-500 uppercase tracking-wider hidden lg:block">Lifecycle</div>
          
          <button 
            onClick={() => setView('dashboard')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <LayoutDashboard size={20} />
            <span className="ml-3 font-medium hidden lg:block">Dashboard</span>
          </button>

          <button 
            onClick={() => setView('sipoc')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'sipoc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Target size={20} />
            <span className="ml-3 font-medium hidden lg:block">Scope (SIPOC)</span>
          </button>

          <button 
            onClick={() => setView('vsm')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'vsm' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Map size={20} />
            <span className="ml-3 font-medium hidden lg:block">Strategy (VSM)</span>
          </button>

          <button 
            onClick={() => setView('editor')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'editor' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <GitMerge size={20} />
            <span className="ml-3 font-medium hidden lg:block">Design (BPMN)</span>
          </button>

          <button 
            onClick={() => setView('dmn')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'dmn' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Table size={20} />
            <span className="ml-3 font-medium hidden lg:block">Logic (DMN)</span>
          </button>

          <button 
            onClick={() => setView('cmmn')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'cmmn' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <Briefcase size={20} />
            <span className="ml-3 font-medium hidden lg:block">Case (CMMN)</span>
          </button>

          <button 
            onClick={() => setView('form')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'form' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <FormInput size={20} />
            <span className="ml-3 font-medium hidden lg:block">Forms (UI)</span>
          </button>

          <button 
            onClick={() => setView('rca')}
            className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all ${view === 'rca' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
          >
            <FishSymbol size={20} />
            <span className="ml-3 font-medium hidden lg:block">Analysis (RCA)</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800">
             <div className="flex items-center justify-center lg:justify-start gap-3 p-2 rounded-xl bg-slate-800/50">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">JD</div>
                 <div className="hidden lg:block">
                     <div className="text-sm font-medium">John Doe</div>
                     <div className="text-xs text-slate-400">Process Owner</div>
                 </div>
             </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveProjectId(null)}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft size={20} />
            </button>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">{activeProject?.name}</span>
              <span className="text-xs text-slate-500">Last updated: {activeProject?.updatedAt.toLocaleTimeString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
                onClick={() => setShowChat(!showChat)}
                className={`p-2 rounded-full transition-colors relative ${showChat ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <MessageSquare size={20} />
            </button>
            <button 
                onClick={() => setShowSimulation(!showSimulation)}
                className={`p-2 rounded-full transition-colors ${showSimulation ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
            >
                <Settings2 size={20} />
            </button>
            <button className="p-2 text-slate-500 hover:bg-slate-100 rounded-full relative">
                <Bell size={20} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        {/* View Area */}
        <div className="flex-1 relative flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50/50">
                {view === 'dashboard' && (
                  <Dashboard metrics={activeData.metrics} />
                )}
                {view === 'sipoc' && (
                  <div className="flex-1 p-6 h-full">
                    <SIPOCEditor
                      data={activeData.sipoc}
                      onUpdate={(sipoc) => updateActiveProjectData({ sipoc })}
                      isGenerating={isGenerating}
                      onGenerate={handleGenerateSIPOC}
                    />
                  </div>
                )}
                {view === 'vsm' && (
                    <div className="flex-1 p-6 h-full">
                        <VSMEditor 
                            data={activeData.vsm}
                            onUpdate={(vsm) => updateActiveProjectData({ vsm })}
                            isGenerating={isGenerating}
                            onGenerate={handleGenerateVSM}
                        />
                    </div>
                )}
                {view === 'editor' && (
                  <div className="flex-1 p-6 h-full">
                    <ProcessEditor 
                      data={activeData.processMap} 
                      onUpdate={(map) => updateActiveProjectData({ processMap: map })} 
                      onGenerate={handleGenerateProcess}
                      isGenerating={isGenerating}
                    />
                  </div>
                )}
                {view === 'dmn' && (
                  <div className="flex-1 p-6 h-full">
                    <DMNEditor
                      data={activeData.dmn}
                      onUpdate={(dmn) => updateActiveProjectData({ dmn })}
                      isGenerating={isGenerating}
                      onGenerate={handleGenerateDMN}
                    />
                  </div>
                )}
                {view === 'cmmn' && (
                  <div className="flex-1 p-6 h-full">
                    <CMMNEditor
                      data={activeData.cmmn}
                      onUpdate={(cmmn) => updateActiveProjectData({ cmmn })}
                      isGenerating={isGenerating}
                      onGenerate={handleGenerateCMMN}
                    />
                  </div>
                )}
                {view === 'form' && (
                  <div className="flex-1 p-6 h-full">
                    <FormEditor
                      data={activeData.form}
                      onUpdate={(form) => updateActiveProjectData({ form })}
                      isGenerating={isGenerating}
                      onGenerate={handleGenerateForm}
                    />
                  </div>
                )}
                {view === 'rca' && (
                   <div className="flex-1 p-6 h-full">
                     <FishboneEditor
                       data={activeData.fishbone}
                       onUpdate={(fishbone) => updateActiveProjectData({ fishbone })}
                       contextDesc={activeProject?.description}
                     />
                   </div>
                )}
            </div>

            {/* Right Side Panels (Overlays or Split) */}
            {showSimulation && (
                <div className="relative z-20 h-full transition-all duration-300">
                    <SimulationPanel 
                      processMap={activeData.processMap} 
                      insights={activeData.insights}
                      onUpdateInsights={(insights) => updateActiveProjectData({ insights })}
                    />
                </div>
            )}
            
            {/* Chat Overlay */}
            {showChat && (
                <div className="absolute bottom-6 right-6 w-80 h-96 z-50 shadow-2xl rounded-xl animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <ChatAssistant 
                      messages={activeData.chatHistory}
                      onUpdateMessages={(chatHistory) => updateActiveProjectData({ chatHistory })}
                    />
                </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
