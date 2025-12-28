
import React, { useState, useEffect, useRef } from 'react';
import { ViewState, Project, ProjectData, MetricData, SimulationResult, NodeType } from './types';
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
import { 
  generateProcessMapFromDescription, 
  generateVSMData, 
  generateSIPOCData, 
  generateDMNRules, 
  generateCMMNModel, 
  generateFormSchema,
  mineProcessFromLogs
} from './services/geminiService';
import { 
  LayoutDashboard, 
  GitMerge, 
  Settings2, 
  MessageSquare,
  Box,
  Menu,
  ArrowLeft,
  FishSymbol,
  Map,
  Table,
  Briefcase,
  FormInput,
  Target,
  X,
  Database,
  Download,
  Upload,
  ChevronRight,
  Workflow,
  Cpu,
  ShieldAlert
} from 'lucide-react';

const STORAGE_KEY = 'flowoptix_v1_store';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [allProjectData, setAllProjectData] = useState<Record<string, ProjectData>>({});

  const [view, setView] = useState<ViewState>('dashboard');
  const [showSimulation, setShowSimulation] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persistence: Load
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProjects(parsed.projects || []);
        setAllProjectData(parsed.allProjectData || {});
      } catch (e) { console.error("Persistence Load Error", e); }
    }
  }, []);

  // Persistence: Save
  useEffect(() => {
    if (projects.length > 0 || Object.keys(allProjectData).length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects, allProjectData }));
    }
  }, [projects, allProjectData]);

  const activeProject = projects.find(p => p.id === activeProjectId);
  const activeData = activeProjectId ? allProjectData[activeProjectId] : null;

  const handleExportAll = () => {
    const data = { projects, allProjectData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processm8_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.projects && parsed.allProjectData) {
          setProjects(parsed.projects);
          setAllProjectData(parsed.allProjectData);
          alert("Workspace restored successfully!");
        } else {
          alert("Invalid backup file format.");
        }
      } catch (err) {
        alert("Error parsing backup file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const calculateDynamicMetrics = (data: ProjectData): MetricData[] => {
    const metrics: MetricData[] = [];
    if (data.vsm?.steps?.length) {
        metrics.push({ name: 'Lead Time', value: data.vsm.totalLeadTime, unit: 'days', trend: 'stable', delta: 0 });
        metrics.push({ name: 'Flow Efficiency', value: data.vsm.efficiency || 0, unit: '%', trend: 'stable', delta: 0 });
        if (data.vsm.customerDemand && data.vsm.availableTime) {
          const takt = Math.round(data.vsm.availableTime / data.vsm.customerDemand);
          metrics.push({ name: 'Takt Time', value: takt, unit: 's', trend: 'stable', delta: 0 });
        }
    }
    if (data.processMap?.nodes?.length) {
        const totalCycle = data.processMap.nodes.reduce((acc, n) => acc + (n.metrics?.cycleTime || 0), 0);
        const totalCost = data.processMap.nodes.reduce((acc, n) => acc + (n.metrics?.resourceCost || 0) + (n.metrics?.cost || 0), 0);
        metrics.push({ name: 'Designed Cycle Time', value: totalCycle, unit: 'min', trend: 'stable', delta: 0 });
        metrics.push({ name: 'Operating Cost', value: totalCost, unit: 'USD', trend: 'stable', delta: 0 });
    }
    if (metrics.length >= 2) {
      const eff = metrics.find(m => m.name === 'Flow Efficiency')?.value || 50;
      const cycle = metrics.find(m => m.name === 'Designed Cycle Time')?.value || 100;
      const takt = metrics.find(m => m.name === 'Takt Time')?.value || 100;
      const taktRatio = Math.min(1.2, (cycle * 60) / (takt || 1));
      const health = Math.round((eff * 0.4) + (100 * (1 / (taktRatio || 1)) * 0.6));
      metrics.unshift({ name: 'Process Health', value: Math.min(100, health), unit: 'Score', trend: 'stable', delta: 0 });
    }
    return metrics;
  };

  const updateActiveProjectData = (partialData: Partial<ProjectData>) => {
    if (!activeProjectId) return;
    setAllProjectData(prev => {
      const current = prev[activeProjectId];
      let updated = { ...current, ...partialData };
      updated.metrics = calculateDynamicMetrics(updated);
      return { ...prev, [activeProjectId]: updated };
    });
    setProjects(prev => prev.map(p => p.id === activeProjectId ? { ...p, updatedAt: new Date().toISOString() } : p));
  };

  const handleCreateProject = (name: string, description: string) => {
    const newId = crypto.randomUUID();
    const newProject: Project = {
      id: newId,
      name,
      description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setProjects(prev => [newProject, ...prev]);
    setAllProjectData(prev => ({ ...prev, [newId]: getInitialProjectData() }));
    setActiveProjectId(newId);
    setView('dashboard');
  };

  const handleApplySimulation = (result: SimulationResult) => {
      if (!activeData) return;
      const currentMetrics = [...activeData.metrics];
      const currentMap = { ...activeData.processMap };
      result.improvements.forEach(imp => {
          const idx = currentMetrics.findIndex(m => m.name === imp.metric);
          const newM = { 
            name: imp.metric, 
            value: imp.after, 
            unit: imp.unit, 
            trend: imp.after < imp.before ? 'down' : 'up' as any, 
            delta: Number((((imp.after - imp.before) / (imp.before || 1)) * 100).toFixed(1)) 
          };
          if (idx >= 0) currentMetrics[idx] = newM; else currentMetrics.push(newM);
      });
      const timeImprovement = result.improvements.find(i => i.metric.toLowerCase().includes('cycle'));
      if (timeImprovement) {
          const ratio = timeImprovement.after / (timeImprovement.before || 1);
          currentMap.nodes = currentMap.nodes.map(node => {
              if (node.type === NodeType.TASK && node.metrics) {
                  return { ...node, metrics: { ...node.metrics, cycleTime: Number((node.metrics.cycleTime! * ratio).toFixed(2)) } };
              }
              return node;
          });
      }
      updateActiveProjectData({ metrics: currentMetrics, processMap: currentMap });
      setShowSimulation(false);
      alert("Simulation applied successfully.");
  };

  const handleGenerateProcess = async (description: string) => {
    if (!activeProjectId) return;
    setIsGenerating(true);
    const result = await generateProcessMapFromDescription(description);
    if (result) updateActiveProjectData({ processMap: result });
    setIsGenerating(false);
  };

  const handleMineProcess = async (logs: string) => {
    if (!activeProjectId) return;
    setIsGenerating(true);
    const result = await mineProcessFromLogs(logs);
    if (result) updateActiveProjectData({ processMap: result });
    setIsGenerating(false);
  };

  const handleGenerateSIPOC = async (desc: string) => { if (activeProjectId) { setIsGenerating(true); const res = await generateSIPOCData(desc); if (res) updateActiveProjectData({ sipoc: res }); setIsGenerating(false); } };
  const handleGenerateVSM = async (desc: string) => { if (activeProjectId) { setIsGenerating(true); const res = await generateVSMData(desc); if (res) updateActiveProjectData({ vsm: res }); setIsGenerating(false); } };
  const handleGenerateDMN = async (desc: string) => { if (activeProjectId) { setIsGenerating(true); const res = await generateDMNRules(desc); if (res) updateActiveProjectData({ dmn: res }); setIsGenerating(false); } };
  const handleGenerateCMMN = async (desc: string) => { if (activeProjectId) { setIsGenerating(true); const res = await generateCMMNModel(desc); if (res) updateActiveProjectData({ cmmn: res }); setIsGenerating(false); } };
  const handleGenerateForm = async (desc: string) => { if (activeProjectId) { setIsGenerating(true); const res = await generateFormSchema(desc); if (res) updateActiveProjectData({ form: res }); setIsGenerating(false); } };

  if (!activeProjectId || !activeData) {
    return (
      <ProjectSelection 
        projects={projects}
        onCreateProject={handleCreateProject}
        onSelectProject={setActiveProjectId}
        onImportBackup={() => fileInputRef.current?.click()}
      >
        <input type="file" ref={fileInputRef} onChange={handleImportAll} accept=".json" className="hidden" />
      </ProjectSelection>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Command Hub', icon: LayoutDashboard },
    { id: 'sipoc', label: 'SIPOC Scope', icon: Target },
    { id: 'vsm', label: 'Value Stream', icon: Map },
    { id: 'editor', label: 'BPMN Modeler', icon: GitMerge },
    { id: 'dmn', label: 'Decision Logic', icon: Table },
    { id: 'cmmn', label: 'Case Flow', icon: Briefcase },
    { id: 'form', label: 'Task UI', icon: FormInput },
    { id: 'rca', label: 'Root Cause', icon: FishSymbol },
  ] as const;

  return (
    <div className="flex h-screen w-screen bg-slate-50 text-slate-900 overflow-hidden relative">
      <input type="file" ref={fileInputRef} onChange={handleImportAll} accept=".json" className="hidden" />

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] lg:hidden animate-in fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modern Sleek Light-themed Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-72 bg-white flex-shrink-0 flex flex-col border-r border-slate-200 transition-transform duration-500 z-[70] lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-xl lg:shadow-none`}>
        
        {/* Branding Area */}
        <div className="h-20 flex items-center px-6 border-b border-slate-100 justify-between shrink-0">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-indigo-600/20 group">
                <Box size={22} className="text-white group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-slate-900 text-lg tracking-tight">ProcessM8</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] leading-tight">Process Intelligence</span>
            </div>
          </div>
          <button className="lg:hidden text-slate-400 hover:text-slate-600" onClick={() => setIsSidebarOpen(false)}><X size={20} /></button>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 py-6 space-y-1 px-4 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button 
              key={item.id} 
              onClick={() => { setView(item.id); setIsSidebarOpen(false); }} 
              className={`w-full flex items-center p-3.5 rounded-2xl transition-all group relative overflow-hidden ${view === item.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:bg-indigo-50/50 hover:text-indigo-600'}`}
            >
                <item.icon size={18} className={`${view === item.id ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'} transition-colors shrink-0`} />
                <span className="ml-4 font-bold text-sm flex-1 text-left">{item.label}</span>
                {view === item.id && <ChevronRight size={14} className="opacity-60" />}
            </button>
          ))}
        </nav>

        {/* Bottom Section: Workspace Management */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <div className="grid grid-cols-2 gap-2 mt-2">
                <button onClick={handleExportAll} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white hover:bg-white text-slate-400 hover:text-indigo-600 transition-all border border-slate-200 shadow-sm group">
                    <Download size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Export</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white hover:bg-white text-slate-400 hover:text-indigo-600 transition-all border border-slate-200 shadow-sm group">
                    <Upload size={16} className="mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">Backup</span>
                </button>
            </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50">
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-sm z-10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-xl" onClick={() => setIsSidebarOpen(true)}><Menu size={20} /></button>
            <button onClick={() => setActiveProjectId(null)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Back to Workspaces"><ArrowLeft size={20} /></button>
            <div className="flex flex-col min-w-0">
              <h1 className="text-sm font-black text-slate-900 truncate tracking-tight">{activeProject?.name}</h1>
              <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Secure Cloud Workspace</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" />
            <button onClick={() => setShowChat(!showChat)} className={`p-2.5 rounded-xl transition-all ${showChat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}`} title="AI Assistant"><MessageSquare size={20} /></button>
            <button onClick={() => setShowSimulation(!showSimulation)} className={`p-2.5 rounded-xl transition-all ${showSimulation ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-600'}`} title="Deep Simulation"><Workflow size={20} /></button>
          </div>
        </header>

        <div className="flex-1 relative flex overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 relative overflow-hidden">
                <div className="flex-1 overflow-auto">
                    {view === 'dashboard' && <Dashboard metrics={activeData.metrics} processMap={activeData.processMap} onNavigate={setView} />}
                    {view === 'sipoc' && <div className="p-4 sm:p-8 h-full"><SIPOCEditor data={activeData.sipoc} onUpdate={(sipoc) => updateActiveProjectData({ sipoc })} isGenerating={isGenerating} onGenerate={handleGenerateSIPOC} /></div>}
                    {view === 'vsm' && <div className="p-4 sm:p-8 h-full"><VSMEditor data={activeData.vsm} onUpdate={(vsm) => updateActiveProjectData({ vsm })} isGenerating={isGenerating} onGenerate={handleGenerateVSM} sipocData={activeData.sipoc} /></div>}
                    {view === 'editor' && <div className="p-4 sm:p-8 h-full"><ProcessEditor data={activeData.processMap} onUpdate={(map) => updateActiveProjectData({ processMap: map })} onGenerate={handleGenerateProcess} onMine={handleMineProcess} isGenerating={isGenerating} vsmData={activeData.vsm} /></div>}
                    {view === 'dmn' && <div className="p-4 sm:p-8 h-full"><DMNEditor data={activeData.dmn} onUpdate={(dmn) => updateActiveProjectData({ dmn })} isGenerating={isGenerating} onGenerate={handleGenerateDMN} /></div>}
                    {view === 'cmmn' && <div className="p-4 sm:p-8 h-full"><CMMNEditor data={activeData.cmmn} onUpdate={(cmmn) => updateActiveProjectData({ cmmn })} isGenerating={isGenerating} onGenerate={handleGenerateCMMN} /></div>}
                    {view === 'form' && <div className="p-4 sm:p-8 h-full"><FormEditor data={activeData.form} onUpdate={(form) => updateActiveProjectData({ form })} isGenerating={isGenerating} onGenerate={handleGenerateForm} /></div>}
                    {view === 'rca' && <div className="p-4 sm:p-8 h-full"><FishboneEditor data={activeData.fishbone} onUpdate={(fishbone) => updateActiveProjectData({ fishbone })} contextDesc={activeProject?.description} /></div>}
                </div>
            </div>

            {showSimulation && (
              <>
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden" onClick={() => setShowSimulation(false)} />
                <div className="fixed inset-y-0 right-0 w-full sm:w-[28rem] lg:relative lg:inset-auto bg-white border-l border-slate-200 shadow-2xl flex flex-col z-50 animate-in slide-in-from-right duration-500">
                    <SimulationPanel 
                      processMap={activeData.processMap} 
                      insights={activeData.insights} 
                      onUpdateInsights={(insights) => updateActiveProjectData({ insights })} 
                      onApplySimulation={handleApplySimulation}
                      onClose={() => setShowSimulation(false)}
                    />
                </div>
              </>
            )}
            
            {showChat && (
              <div className="fixed bottom-0 right-0 w-full sm:bottom-8 sm:right-8 sm:w-[22rem] h-[85vh] sm:h-[32rem] z-50 shadow-[0_32px_64px_rgba(0,0,0,0.15)] rounded-t-[2.5rem] sm:rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom-10 duration-500">
                  <ChatAssistant messages={activeData.chatHistory} onUpdateMessages={(chatHistory) => updateActiveProjectData({ chatHistory })} />
              </div>
            )}
        </div>
      </main>
    </div>
  );
};

export default App;
