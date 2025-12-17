
import React, { useState } from 'react';
import { SIPOCData } from '../types';
import { Wand2, Loader2, ArrowRight, Sparkles, X } from 'lucide-react';

interface SIPOCEditorProps {
  data: SIPOCData;
  onUpdate: (data: SIPOCData) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const SIPOCEditor: React.FC<SIPOCEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      setShowAIModal(false);
    }
  };

  const categories = [
      { key: 'suppliers' as keyof SIPOCData, label: 'Suppliers', color: 'bg-red-50 text-red-900 border-red-200' },
      { key: 'inputs' as keyof SIPOCData, label: 'Inputs', color: 'bg-orange-50 text-orange-900 border-orange-200' },
      { key: 'process' as keyof SIPOCData, label: 'Process', color: 'bg-blue-50 text-blue-900 border-blue-200' },
      { key: 'outputs' as keyof SIPOCData, label: 'Outputs', color: 'bg-green-50 text-green-900 border-green-200' },
      { key: 'customers' as keyof SIPOCData, label: 'Customers', color: 'bg-purple-50 text-purple-900 border-purple-200' },
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-4">
                <h2 className="font-semibold text-slate-700">Scope: SIPOC Diagram</h2>
                <div className="h-6 w-px bg-slate-300"></div>
            </div>
            <div className="flex items-center gap-4">
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

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50/50 p-6 relative">
             <div className="grid grid-cols-5 gap-4 h-full min-w-[1000px]">
                 {categories.map((cat, idx) => (
                     <div key={cat.key} className="flex flex-col h-full">
                         {/* Header */}
                         <div className={`p-4 rounded-t-xl border-b-0 border border-slate-200 shadow-sm font-bold text-center uppercase tracking-wider text-sm flex items-center justify-center relative ${cat.color}`}>
                             {cat.label}
                             {idx < 4 && (
                                 <div className="absolute -right-6 top-1/2 -translate-y-1/2 z-10 text-slate-300">
                                     <ArrowRight size={24} />
                                 </div>
                             )}
                         </div>
                         
                         {/* List */}
                         <div className="bg-white flex-1 border border-slate-200 rounded-b-xl shadow-sm p-4 overflow-y-auto">
                            {(!data[cat.key] || data[cat.key].length === 0) ? (
                                <div className="text-center text-slate-400 text-sm italic mt-10 opacity-50">
                                    No {cat.label.toLowerCase()} defined
                                </div>
                            ) : (
                                <ul className="space-y-3">
                                    {(data[cat.key] as string[]).map((item, i) => (
                                        <li key={i} className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700 shadow-sm">
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}
                         </div>
                     </div>
                 ))}
             </div>
        </div>

        {/* AI Generator Modal */}
        {showAIModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-white/20 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <h3>Generate SIPOC Diagram</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-500 mb-3">
                            Describe the process scope. The AI will identify Suppliers, Inputs, the core Process, Outputs, and Customers.
                        </p>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full h-32 p-3 text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed shadow-sm"
                            placeholder="e.g. Making a pizza in a restaurant, from ordering ingredients to delivering it to the customer table."
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
                    <p className="text-indigo-900 font-medium">Scoping Process...</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default SIPOCEditor;
