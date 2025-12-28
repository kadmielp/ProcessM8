
import React, { useState, useRef, useEffect } from 'react';
import { SIPOCData } from '../types';
import { Wand2, Loader2, ArrowRight, Sparkles, X, Plus, Trash2, Edit2, Check } from 'lucide-react';

interface SIPOCEditorProps {
  data: SIPOCData;
  onUpdate: (data: SIPOCData) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const SIPOCEditor: React.FC<SIPOCEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [editingLoc, setEditingLoc] = useState<{ key: keyof SIPOCData; index: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [addingKey, setAddingKey] = useState<keyof SIPOCData | null>(null);
  const [addValue, setAddValue] = useState('');

  const addInputRef = useRef<HTMLTextAreaElement>(null);
  const editInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (addingKey && addInputRef.current) addInputRef.current.focus();
  }, [addingKey]);

  useEffect(() => {
    if (editingLoc && editInputRef.current) editInputRef.current.focus();
  }, [editingLoc]);

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

  const handleAddItem = (key: keyof SIPOCData) => {
      if (!addValue.trim()) return;
      const newItems = [...(data[key] || []), addValue.trim()];
      onUpdate({ ...data, [key]: newItems });
      setAddValue('');
  };

  const handleSaveEdit = () => {
      if (!editingLoc) return;
      const { key, index } = editingLoc;
      const newItems = [...(data[key] || [])];
      if (!editValue.trim()) newItems.splice(index, 1);
      else newItems[index] = editValue.trim();
      onUpdate({ ...data, [key]: newItems });
      setEditingLoc(null);
      setEditValue('');
  };

  const handleDeleteItem = (key: keyof SIPOCData, index: number) => {
      const newItems = [...(data[key] || [])];
      newItems.splice(index, 1);
      onUpdate({ ...data, [key]: newItems });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="h-16 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between bg-slate-50 z-10 shrink-0">
            <div className="flex items-center gap-3">
                <h2 className="font-semibold text-slate-700 text-sm sm:text-base">SIPOC Scope</h2>
                <div className="hidden sm:block h-6 w-px bg-slate-300"></div>
                <div className="hidden sm:block text-xs text-slate-500">Define process boundaries</div>
            </div>
            <button 
                onClick={() => setShowAIModal(true)}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 rounded-lg shadow-sm text-xs font-medium transition-all disabled:opacity-50"
            >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                <span className="hidden xs:inline">AI Assistant</span>
            </button>
        </div>

        <div className="flex-1 overflow-auto bg-slate-50/50 p-3 sm:p-6">
             <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                 {categories.map((cat, idx) => (
                     <div key={cat.key} className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <div className={`p-3 border-b border-slate-200 font-bold text-center uppercase tracking-wider text-xs relative select-none shrink-0 ${cat.color}`}>
                             {cat.label}
                             {idx < 4 && (
                                 <div className="absolute -right-6 top-1/2 -translate-y-1/2 z-10 text-slate-300 hidden lg:block">
                                     <ArrowRight size={20} />
                                 </div>
                             )}
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[120px]">
                                {(!data[cat.key] || data[cat.key].length === 0) && !addingKey && (
                                    <div className="text-center text-slate-300 text-[10px] italic mt-4">Empty</div>
                                )}

                                {(data[cat.key] as string[])?.map((item, i) => {
                                    const isEditing = editingLoc?.key === cat.key && editingLoc?.index === i;
                                    if (isEditing) {
                                        return (
                                            <div key={i} className="p-2 bg-white border-2 border-indigo-500 rounded-lg shadow-md">
                                                <textarea ref={editInputRef} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSaveEdit()} className="w-full text-xs outline-none resize-none bg-transparent" rows={2}/>
                                                <div className="flex justify-end gap-2 mt-1">
                                                    <button onClick={() => setEditingLoc(null)} className="p-1 text-slate-400"><X size={12}/></button>
                                                    <button onClick={handleSaveEdit} className="p-1 text-indigo-600"><Check size={12}/></button>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return (
                                        <div key={i} className="group relative p-2 bg-slate-50 border border-slate-100 hover:border-indigo-200 rounded-lg text-xs text-slate-700 transition-all">
                                            <div className="pr-6 whitespace-pre-wrap">{item}</div>
                                            <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => { setEditingLoc({ key: cat.key, index: i }); setEditValue(item); setAddingKey(null); }} className="p-1 text-slate-400 hover:text-indigo-600 bg-white/80 rounded"><Edit2 size={10} /></button>
                                                <button onClick={() => handleDeleteItem(cat.key, i)} className="p-1 text-slate-400 hover:text-red-600 bg-white/80 rounded"><Trash2 size={10} /></button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {addingKey === cat.key && (
                                    <div className="p-2 bg-white border border-indigo-200 rounded-lg shadow-sm">
                                        <textarea ref={addInputRef} value={addValue} onChange={(e) => setAddValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddItem(cat.key)} placeholder="Add item..." className="w-full text-xs outline-none resize-none bg-transparent" rows={2}/>
                                        <div className="flex justify-end gap-2 mt-1">
                                             <button onClick={() => setAddingKey(null)} className="text-[10px] text-slate-400">Cancel</button>
                                             <button onClick={() => handleAddItem(cat.key)} className="text-[10px] text-indigo-600 font-bold">Add</button>
                                        </div>
                                    </div>
                                )}
                         </div>
                         <button onClick={() => { setAddingKey(cat.key); setEditingLoc(null); }} className="p-2 border-t border-slate-100 text-[10px] font-medium text-slate-400 hover:text-indigo-600 hover:bg-slate-50 transition-colors shrink-0">
                             <Plus size={12} className="inline mr-1" /> Add
                         </button>
                     </div>
                 ))}
             </div>
        </div>

        {showAIModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
                    <div className="bg-slate-50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <h3>Scoping AI Assistant</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-4 sm:p-5">
                        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-32 p-3 text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-sm shadow-sm" placeholder="e.g. Pizza delivery process from order to customer..."/>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
                        <button onClick={() => setShowAIModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-lg">Cancel</button>
                        <button onClick={handleGenerate} disabled={!prompt.trim() || isGenerating} className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm disabled:opacity-50">Generate</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default SIPOCEditor;
