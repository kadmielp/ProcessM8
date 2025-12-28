import React, { useState, useRef, useEffect } from 'react';
import { ProcessMap, NodeType, VSMData, SIPOCData } from '../types';
import { jsonToBpmnXml, extractProcessMapFromModeler } from '../services/bpmnConverter';
import { Wand2, Loader2, Sparkles, X, Maximize, Minimize, Settings, Download, Database, Import } from 'lucide-react';

declare global {
  interface Window {
    BpmnJS: any;
  }
}

interface ProcessEditorProps {
  data: ProcessMap;
  onUpdate: (newData: ProcessMap) => void;
  onGenerate: (desc: string) => void;
  onMine: (logs: string) => void;
  isGenerating: boolean;
  vsmData?: VSMData;
  sipocData?: SIPOCData;
}

const ProcessEditor: React.FC<ProcessEditorProps> = ({ data, onUpdate, onGenerate, onMine, isGenerating, vsmData, sipocData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [modeler, setModeler] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [mineInput, setMineInput] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [showMineModal, setShowMineModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !window.BpmnJS) return;
    const bpmnModeler = new window.BpmnJS({
      container: containerRef.current,
      keyboard: { bindTo: document }
    });
    setModeler(bpmnModeler);
    let xmlToImport = data.xml || jsonToBpmnXml(data);
    bpmnModeler.importXML(xmlToImport).catch(console.error);
    bpmnModeler.on('selection.changed', (e: any) => setSelectedElementId(e.newSelection[0]?.id || null));
    return () => bpmnModeler.destroy();
  }, []); 

  const isInternalUpdate = useRef(false);
  useEffect(() => {
      if (modeler && !isInternalUpdate.current && data.nodes.length > 0) {
          let xmlToImport = data.xml || jsonToBpmnXml(data);
          modeler.importXML(xmlToImport).catch(console.error);
      }
      isInternalUpdate.current = false; 
  }, [data, modeler]);

  const handleExport = async () => {
    if (!modeler) return;
    const { xml } = await modeler.saveXML({ format: true });
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'process_design.bpmn';
    a.click();
  };

  const handleMetricChange = (field: string, value: string) => {
      if (!selectedElementId) return;
      const numValue = parseFloat(value) || 0;
      const updatedNodes = data.nodes.map(node => node.id === selectedElementId ? { ...node, metrics: { ...node.metrics, [field]: numValue } } : node);
      isInternalUpdate.current = true;
      onUpdate({ ...data, nodes: updatedNodes });
  };

  return (
    <div ref={wrapperRef} className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50 gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-4 flex-nowrap shrink-0">
                <h2 className="font-semibold text-slate-700 text-sm whitespace-nowrap">Design (BPMN)</h2>
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1 flex-nowrap">
                    <button onClick={() => modeler?.get('canvas').zoom(modeler.get('canvas').zoom() * 1.1)} className="px-2 py-1 hover:bg-slate-100 text-xs rounded">+</button>
                    <button onClick={() => modeler?.get('canvas').zoom(modeler.get('canvas').zoom() * 0.9)} className="px-2 py-1 hover:bg-slate-100 text-xs rounded">-</button>
                    <button onClick={handleExport} className="px-2 py-1 hover:bg-slate-100 text-xs rounded flex items-center gap-1"><Download size={12}/> <span className="hidden sm:inline">Export</span></button>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-nowrap shrink-0">
                 <button onClick={() => setShowMineModal(true)} className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm text-xs font-medium flex items-center gap-2 whitespace-nowrap">
                     <Database size={14} /> Mining
                 </button>
                 <button onClick={() => setShowAIModal(true)} disabled={isGenerating} className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm text-xs font-medium flex items-center gap-2 disabled:opacity-50 whitespace-nowrap">
                     {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} <span className="hidden xs:inline">AI Generate</span>
                 </button>
            </div>
        </div>

        <div className="flex-1 relative bg-white">
            <div ref={containerRef} className="w-full h-full" />
            {selectedElementId && (
                <div className="absolute top-4 right-4 w-64 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-30 max-w-[calc(100%-32px)]">
                    <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold uppercase text-slate-400">Task Metrics</span><button onClick={() => modeler?.get('selection').select([])}><X size={14}/></button></div>
                    <div className="space-y-3">
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Cycle Time (min)</label>
                        <input type="number" className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-md" value={data.nodes.find(n => n.id === selectedElementId)?.metrics?.cycleTime || ''} onChange={(e) => handleMetricChange('cycleTime', e.target.value)} /></div>
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Resource Cost ($)</label>
                        <input type="number" className="w-full p-2 text-sm bg-slate-50 border border-slate-200 rounded-md" value={data.nodes.find(n => n.id === selectedElementId)?.metrics?.resourceCost || ''} onChange={(e) => handleMetricChange('resourceCost', e.target.value)} /></div>
                    </div>
                </div>
            )}
        </div>

        {showAIModal && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">AI Process Generator</h3>
                    <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  className="w-full h-40 p-4 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl mb-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400" 
                  placeholder="Describe the workflow in detail..."
                  autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowAIModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button onClick={() => { onGenerate(prompt); setShowAIModal(false); }} className="px-8 py-2.5 text-sm font-black text-white bg-indigo-600 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Generate</button>
                </div>
            </div>
        </div>}

        {showMineModal && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2"><Database size={24} className="text-emerald-600"/> Process Mining</h3>
                  <button onClick={() => setShowMineModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <p className="text-xs font-medium text-slate-500 mb-4 leading-relaxed">Paste event logs (CSV or text format) to auto-generate the actual observed process flow from system data.</p>
                <textarea 
                  value={mineInput} 
                  onChange={e => setMineInput(e.target.value)} 
                  className="w-full h-48 p-4 text-sm font-mono bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl mb-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400" 
                  placeholder="CaseID, Activity, Timestamp, User..."
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => setShowMineModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                  <button onClick={() => { onMine(mineInput); setShowMineModal(false); }} className="px-8 py-2.5 text-sm font-black text-white bg-emerald-600 rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">Mine Process</button>
                </div>
            </div>
        </div>}
    </div>
  );
};

export default ProcessEditor;