import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DMNTable } from '../types';
import { INITIAL_DMN_XML } from '../constants';
import { fixDmnNamespace } from '../services/geminiService';
import { Wand2, Loader2, Sparkles, X, Table as TableIcon, Save } from 'lucide-react';

declare global {
  interface Window {
    DmnJS: any;
  }
}

interface DMNEditorProps {
  data: DMNTable;
  onUpdate: (data: DMNTable) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const DMNEditor: React.FC<DMNEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [modeler, setModeler] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Track previous XML to avoid redundant imports
  const prevXmlRef = useRef<string | undefined>(data.xml);
  const isUpdatingRef = useRef(false);

  // Initialize Modeler
  useEffect(() => {
    if (!containerRef.current || !window.DmnJS) return;

    const dmnModeler = new window.DmnJS({
      container: containerRef.current,
      keyboard: { bindTo: document }
    });

    setModeler(dmnModeler);

    const initialXml = data.xml || INITIAL_DMN_XML;
    const fixedXml = fixDmnNamespace(initialXml);

    dmnModeler.importXML(fixedXml).then(() => {
        const activeView = dmnModeler.getViews().find((v: any) => v.type === 'drd') || dmnModeler.getViews()[0];
        if (activeView) dmnModeler.open(activeView);
    }).catch((err: any) => {
        console.error('DMN Import Error:', err);
        setError(err.message);
    });

    return () => {
      if (dmnModeler && dmnModeler.destroy) dmnModeler.destroy();
    };
  }, []);

  // Handle External Data Changes
  useEffect(() => {
    if (modeler && data.xml && data.xml !== prevXmlRef.current && !isUpdatingRef.current) {
        const fixedXml = fixDmnNamespace(data.xml);
        modeler.importXML(fixedXml).then(() => {
            prevXmlRef.current = data.xml;
        }).catch((err: any) => {
            console.warn('Silent DMN Update Error:', err);
        });
    }
  }, [data.xml, modeler]);

  // Handle Internal Changes
  useEffect(() => {
    if (!modeler) return;

    const handleChanged = async () => {
        isUpdatingRef.current = true;
        try {
            const { xml } = await modeler.saveXML({ format: true });
            if (xml !== prevXmlRef.current) {
                prevXmlRef.current = xml;
                onUpdate({ ...data, xml });
            }
        } catch (err) {
            console.error('DMN Save Error:', err);
        } finally {
            isUpdatingRef.current = false;
        }
    };

    modeler.on('views.changed', handleChanged);
    modeler.on('commandStack.changed', handleChanged);

    return () => {
        modeler.off('views.changed', handleChanged);
        modeler.off('commandStack.changed', handleChanged);
    };
  }, [modeler, onUpdate, data]);

  const handleGenerate = useCallback(() => {
    if (prompt.trim()) {
      onGenerate(prompt);
      setShowAIModal(false);
    }
  }, [prompt, onGenerate]);

  const handleManualSave = async () => {
      if (!modeler) return;
      try {
          const { xml } = await modeler.saveXML({ format: true });
          onUpdate({ ...data, xml });
          alert('Logic state synchronized.');
      } catch (e) {
          alert('Failed to save logic.');
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <TableIcon size={18}/>
              </div>
              <div>
                <h2 className="font-bold text-slate-800 text-sm">Logic (DMN)</h2>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Decision Requirements Diagram
                </div>
              </div>
          </div>
          <div className="flex items-center gap-3">
               <button 
                   onClick={handleManualSave}
                   className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all"
               >
                   <Save size={14} /> Sync
               </button>
               <button 
                     onClick={() => setShowAIModal(true)}
                     disabled={isGenerating}
                     className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 text-xs font-bold transition-all disabled:opacity-50"
                 >
                     {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                     AI Assistant
                 </button>
          </div>
      </div>

      {/* Modeler Container */}
      <div className="flex-1 relative bg-white overflow-hidden">
        <div ref={containerRef} className="w-full h-full dmn-js-parent" />
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/95 z-40 p-10 text-center">
                <div className="max-w-md">
                    <div className="text-red-600 p-4 border rounded-xl bg-red-50 mb-4 font-mono text-xs overflow-auto max-h-40">
                        {error}
                    </div>
                    <p className="text-sm text-slate-500 mb-6">
                        The DMN XML provided is incompatible or malformed. Try using the AI Assistant to generate a fresh model.
                    </p>
                    <button onClick={() => window.location.reload()} className="px-6 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">
                        Reload Editor
                    </button>
                </div>
            </div>
        )}
      </div>

      {/* AI Modal */}
      {showAIModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-white/20 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3 text-indigo-700">
                            <Sparkles size={20} className="text-indigo-600" />
                            <h3 className="text-lg font-black tracking-tight">AI Logic Generator</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-6">
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full h-40 p-4 text-slate-700 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm"
                            placeholder="Describe the decision logic: 'If purchase amount > 1000 and customer is VIP, give 15% discount. If VIP but amount < 1000, 10%. Otherwise 5%.'"
                            autoFocus
                        />
                    </div>
                    <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                        <button onClick={() => setShowAIModal(false)} className="px-6 py-3 text-sm font-bold text-slate-600">Cancel</button>
                        <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-100">
                            Generate Logic
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {isGenerating && !showAIModal && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-md flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-indigo-900 font-black tracking-tight">Synthesizing Decision Logic...</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default DMNEditor;