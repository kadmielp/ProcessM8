
import React, { useState, useRef, useEffect } from 'react';
import { ProcessMap } from '../types';
import { jsonToBpmnXml, extractProcessMapFromModeler } from '../services/bpmnConverter';
import { Wand2, Loader2, Sparkles, X, Maximize, Minimize } from 'lucide-react';

// Declare BpmnJS on window for TypeScript since we load it via script tag
declare global {
  interface Window {
    BpmnJS: any;
  }
}

interface ProcessEditorProps {
  data: ProcessMap;
  onUpdate: (newData: ProcessMap) => void;
  onGenerate: (desc: string) => void;
  isGenerating: boolean;
}

const ProcessEditor: React.FC<ProcessEditorProps> = ({ data, onUpdate, onGenerate, isGenerating }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [modeler, setModeler] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [xmlError, setXmlError] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Initialize BPMN-JS
  useEffect(() => {
    if (!containerRef.current) return;

    // Check if BpmnJS is loaded
    if (!window.BpmnJS) {
        setXmlError("BPMN-JS library not loaded. Check internet connection.");
        return;
    }

    const bpmnModeler = new window.BpmnJS({
      container: containerRef.current,
      keyboard: {
        bindTo: document
      },
      additionalModules: [
        // Basic drag drop is included in modeler
      ]
    });

    setModeler(bpmnModeler);

    // Initial Load Strategy:
    // 1. If we have raw XML (saved from previous session), use it. It is lossless.
    // 2. If not, generate XML from the JSON structure (lossy but valid).
    let xmlToImport = data.xml;
    if (!xmlToImport) {
        xmlToImport = jsonToBpmnXml(data);
    }

    bpmnModeler.importXML(xmlToImport).catch((err: any) => {
        console.error("Error rendering BPMN:", err);
        setXmlError(err.message);
    });

    return () => {
      bpmnModeler.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); 

  // Track if update is coming from within the editor to avoid loops
  const isInternalUpdate = useRef(false);

  // Listen to external data changes (e.g. AI generation)
  useEffect(() => {
      if (modeler && !isInternalUpdate.current && data.nodes.length > 0) {
          // If we have an external update (like AI generation), we prefer the generated JSON
          // UNLESS the incoming data actually has a new XML string attached (which AI usually doesn't provide, it provides JSON)
          
          let xmlToImport = data.xml;
          
          // If no XML is provided in the update (typical for AI generation), convert the new JSON to XML
          if (!xmlToImport) {
              xmlToImport = jsonToBpmnXml(data);
          }
          
          modeler.importXML(xmlToImport).catch((console.error));
      }
      isInternalUpdate.current = false; // Reset
  }, [data, modeler]);

  // Hook into modeler events to update parent
  useEffect(() => {
      if (!modeler) return;
      
      const eventBus = modeler.get('eventBus');
      
      const handleChanged = async () => {
          isInternalUpdate.current = true;
          try {
              // 1. Save Visual State (XML) - This preserves edge waypoints and exact layout
              const { xml } = await modeler.saveXML({ format: true });
              
              // 2. Save Logical State (JSON) - This drives the Simulation Engine
              const newData = extractProcessMapFromModeler(modeler);
              
              // 3. Merge and Update
              newData.xml = xml;
              onUpdate(newData);
          } catch (err) {
              console.error("Error saving diagram:", err);
          }
      };

      // 'commandStack.changed' fires whenever an operation (drag, resize, label edit) finishes
      eventBus.on('commandStack.changed', handleChanged);
      
      return () => {
          eventBus.off('commandStack.changed', handleChanged);
      }
  }, [modeler, onUpdate]);

  // Full Screen Logic
  const toggleFullScreen = () => {
    if (!wrapperRef.current) return;
    
    if (!document.fullscreenElement) {
        wrapperRef.current.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // Notify modeler of resize to ensure canvas handles it correctly
      if (modeler) {
          try {
             modeler.get('canvas').resized();
          } catch(e) {
              // ignore
          }
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [modeler]);

  const handleZoom = (type: 'in' | 'out' | 'fit') => {
      if (!modeler) return;
      const canvas = modeler.get('canvas');
      if (type === 'fit') canvas.zoom('fit-viewport');
      else if (type === 'in') canvas.zoom(canvas.zoom() * 1.1);
      else canvas.zoom(canvas.zoom() * 0.9);
  };

  const handleGenerate = () => {
      if (!prompt.trim()) return;
      onGenerate(prompt);
      setShowAIModal(false);
  };

  return (
    <div ref={wrapperRef} className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative transition-all">
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-4">
                <h2 className="font-semibold text-slate-700">Design (BPMN 2.0)</h2>
                <div className="h-6 w-px bg-slate-300"></div>
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1">
                    <button onClick={() => handleZoom('in')} className="px-3 py-1.5 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded">
                        +
                    </button>
                    <button onClick={() => handleZoom('out')} className="px-3 py-1.5 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded">
                        -
                    </button>
                    <button onClick={() => handleZoom('fit')} className="px-3 py-1.5 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded">
                        Fit
                    </button>
                    <div className="w-px bg-slate-200 my-1"></div>
                    <button 
                        onClick={toggleFullScreen} 
                        className="px-3 py-1.5 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded flex items-center justify-center"
                        title={isFullscreen ? "Exit Full Screen" : "Enter Full Screen"}
                    >
                        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-2">
                 <button 
                     onClick={() => setShowAIModal(true)}
                     disabled={isGenerating}
                     className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 rounded-lg shadow-sm text-xs font-medium transition-all disabled:opacity-50"
                 >
                     {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                     AI Assistant
                 </button>
            </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative bg-white overflow-hidden">
            <div ref={containerRef} className="w-full h-full" />
            
            {xmlError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-40">
                    <div className="text-red-600 font-medium">
                        Error loading BPMN engine: {xmlError}
                    </div>
                </div>
            )}
            
            <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded text-[10px] text-slate-400 pointer-events-none">
                Powered by bpmn.io
            </div>
        </div>

        {/* AI Generator Modal */}
        {showAIModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-white/20 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <h3>Generate Process Model</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-500 mb-3">
                            Describe your business process flow. The AI will automatically construct the BPMN diagram with standard notation.
                        </p>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full h-32 p-3 text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed shadow-sm"
                            placeholder="e.g. An employee submits an expense report. The manager reviews it. If approved, finance processes payment. If rejected, notify the employee."
                            autoFocus
                        />
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                        <button 
                            onClick={() => setShowAIModal(false)} 
                            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleGenerate} 
                            disabled={!prompt.trim() || isGenerating}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2 transition-all"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            Generate
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Global Loader Overlay when generating (optional fallback) */}
        {isGenerating && !showAIModal && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <p className="text-indigo-900 font-medium">Generating BPMN Model...</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default ProcessEditor;
