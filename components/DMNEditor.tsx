
import React, { useState, useRef, useEffect } from 'react';
import { DMNTable } from '../types';
import { INITIAL_DMN_XML } from '../constants';
import { fixDmnNamespace } from '../services/geminiService';
import { Wand2, Loader2, Sparkles, X, Maximize, Minimize } from 'lucide-react';

// Declare DmnJS on window for TypeScript
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
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [modeler, setModeler] = useState<any>(null);
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize DMN-JS
  useEffect(() => {
    if (!containerRef.current) return;

    if (!window.DmnJS) {
        setError("DMN-JS library not loaded. Check internet connection.");
        return;
    }

    const dmnModeler = new window.DmnJS({
      container: containerRef.current,
      keyboard: {
        bindTo: document
      },
      drd: {
          className: 'dmn-drd-container'
      }
    });

    setModeler(dmnModeler);

    // Initial Import with Namespace Fix
    let xmlToImport = data.xml || INITIAL_DMN_XML;
    xmlToImport = fixDmnNamespace(xmlToImport);
    
    dmnModeler.importXML(xmlToImport).then(({ warnings }: any) => {
        if (warnings && warnings.length) {
            console.warn('DMN Import warnings', warnings);
        }
        
        // Auto-open the decision table view if there is a decision, otherwise default view
        const activeView = dmnModeler.getViews()[0];
        if (activeView) {
            dmnModeler.open(activeView);
        }

    }).catch((err: any) => {
        console.error("Error rendering DMN:", err);
        setError("Failed to render DMN XML: " + err.message);
    });

    return () => {
      dmnModeler.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle Updates from AI or Props
  const isInternalUpdate = useRef(false);

  useEffect(() => {
      if (modeler && !isInternalUpdate.current && data.xml) {
          // If external update comes in (e.g. from AI generation)
          // We must be careful not to overwrite user work unless it's a distinct change
          modeler.saveXML({ format: true }).then(({ xml }: any) => {
               if (xml !== data.xml) {
                   // Ensure incoming XML is also fixed for compatibility
                   const safeXml = fixDmnNamespace(data.xml!);
                   modeler.importXML(safeXml).then(() => {
                        const activeView = modeler.getViews()[0];
                        if (activeView) modeler.open(activeView);
                   }).catch(console.error);
               }
          });
      }
      isInternalUpdate.current = false;
  }, [data.xml, modeler]);


  // Hook into modeler events for changes
  useEffect(() => {
    if (!modeler) return;

    const handleChanged = async () => {
        isInternalUpdate.current = true;
        try {
            const { xml } = await modeler.saveXML({ format: true });
            onUpdate({ ...data, xml });
        } catch (err) {
            console.error("Error saving DMN:", err);
        }
    };

    modeler.on('views.changed', handleChanged);
    modeler.on('commandStack.changed', handleChanged);

    return () => {
        modeler.off('views.changed', handleChanged);
        modeler.off('commandStack.changed', handleChanged);
    };
  }, [modeler, onUpdate, data]);


  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      setShowAIModal(false);
    }
  };

  const toggleFullScreen = () => {
      if (!wrapperRef.current) return;
      if (!document.fullscreenElement) {
          wrapperRef.current.requestFullscreen();
      } else {
          document.exitFullscreen();
      }
  };

  useEffect(() => {
      const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFS);
      return () => document.removeEventListener('fullscreenchange', handleFS);
  }, []);

  return (
    <div ref={wrapperRef} className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative transition-all">
      {/* Toolbar */}
      <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
              <h2 className="font-semibold text-slate-700">DMN Editor</h2>
              <div className="h-6 w-px bg-slate-300"></div>
               <button 
                  onClick={toggleFullScreen} 
                  className="px-3 py-1.5 hover:bg-slate-100 text-slate-700 text-xs font-medium rounded flex items-center justify-center gap-2"
              >
                  {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
                  {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              </button>
          </div>
          <div className="flex items-center gap-4">
               <button 
                     disabled={true}
                     title="Coming Soon"
                     className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-400 cursor-not-allowed rounded-lg shadow-sm text-xs font-medium transition-all"
                 >
                     <Sparkles size={14} />
                     AI Assistant
                 </button>
          </div>
      </div>

      {/* DMN Container */}
      <div className="flex-1 relative bg-white overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
        
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/90 z-40">
                <div className="text-red-600 font-medium p-4 border border-red-200 bg-red-50 rounded-lg">
                    {error}
                </div>
            </div>
        )}

        <div className="absolute bottom-4 right-4 bg-white/90 px-3 py-1 rounded text-[10px] text-slate-400 pointer-events-none z-10">
            Powered by dmn-js
        </div>
      </div>

      {/* AI Generator Modal */}
      {showAIModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-white/20 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <h3>Generate DMN Model</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-500 mb-3">
                            Describe the decision logic. The AI will attempt to generate a DMN 1.3 XML file. 
                            <span className="block mt-1 text-amber-600 text-xs">Note: Complex logic may require manual adjustment.</span>
                        </p>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full h-32 p-3 text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed shadow-sm"
                            placeholder="e.g. Determine discount: If customer is VIP, discount is 10%. If purchase > 1000, discount is 5%. Default is 0%."
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
        
        {isGenerating && !showAIModal && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <p className="text-indigo-900 font-medium">Generating DMN XML...</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default DMNEditor;
