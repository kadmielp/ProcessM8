
import React, { useState, useEffect } from 'react';
import { FormSchema, FormField } from '../types';
import { 
  Wand2, Loader2, FormInput, Sparkles, X, 
  Plus, Trash2, GripVertical, Settings2, 
  Type, Hash, Calendar, List, CheckSquare, AlignLeft,
  ChevronUp, ChevronDown, CheckCircle2
} from 'lucide-react';

interface FormEditorProps {
  data: FormSchema;
  onUpdate: (data: FormSchema) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const FIELD_TYPES = [
  { type: 'text', label: 'Short Text', icon: Type },
  { type: 'textarea', label: 'Long Text', icon: AlignLeft },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'date', label: 'Date Pick', icon: Calendar },
] as const;

const FormEditor: React.FC<FormEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      setShowAIModal(false);
    }
  };

  const addField = (type: FormField['type']) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      type,
      required: false,
      placeholder: `Enter ${type}...`,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined
    };
    onUpdate({ ...data, fields: [...(data.fields || []), newField] });
    setSelectedFieldId(newField.id);
  };

  const removeField = (id: string) => {
    onUpdate({ ...data, fields: data.fields.filter(f => f.id !== id) });
    if (selectedFieldId === id) setSelectedFieldId(null);
  };

  const updateField = (id: string, updates: Partial<FormField>) => {
    onUpdate({
      ...data,
      fields: data.fields.map(f => f.id === id ? { ...f, ...updates } : f)
    });
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const newFields = [...data.fields];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newFields.length) return;
    [newFields[index], newFields[targetIndex]] = [newFields[targetIndex], newFields[index]];
    onUpdate({ ...data, fields: newFields });
  };

  const selectedField = data.fields?.find(f => f.id === selectedFieldId);

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Header */}
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <FormInput size={20} />
          </div>
          <div>
            <input 
              value={data.title}
              onChange={(e) => onUpdate({ ...data, title: e.target.value })}
              className="font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 text-lg outline-none"
              placeholder="Form Title"
            />
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {data.fields?.length || 0} Components
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowAIModal(true)}
            disabled={isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 text-xs font-bold transition-all disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI Builder
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Palette */}
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col p-4 shrink-0 overflow-y-auto">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Component Palette</h3>
          <div className="grid grid-cols-1 gap-2">
            {FIELD_TYPES.map((f) => (
              <button
                key={f.type}
                onClick={() => addField(f.type)}
                className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-slate-700 text-sm font-medium transition-all group"
              >
                <div className="p-1.5 bg-white rounded-lg border border-slate-200 group-hover:border-indigo-100 text-slate-500 group-hover:text-indigo-600 shadow-sm">
                  <f.icon size={16} />
                </div>
                {f.label}
              </button>
            ))}
          </div>
          
          <div className="mt-auto p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
            <p className="text-[10px] text-indigo-700 font-bold uppercase mb-2">Pro Tip</p>
            <p className="text-[11px] text-indigo-600/80 leading-relaxed">
              Click any component on the canvas to edit its properties like labels and validation.
            </p>
          </div>
        </aside>

        {/* Center: Builder Canvas */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50 flex flex-col items-center">
          <div className="w-full max-w-2xl bg-white shadow-xl shadow-slate-200/50 rounded-3xl border border-slate-200 min-h-[600px] flex flex-col">
            <div className="p-8 border-b border-slate-100">
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">{data.title || 'New User Task'}</h2>
              <p className="text-slate-400 text-sm mt-1">Fill out the information below to proceed with the workflow.</p>
            </div>
            
            <div className="flex-1 p-8 space-y-2">
              {data.fields && data.fields.length > 0 ? (
                data.fields.map((field, idx) => {
                  const isSelected = selectedFieldId === field.id;
                  return (
                    <div 
                      key={field.id}
                      onClick={() => setSelectedFieldId(field.id)}
                      className={`group relative p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        isSelected 
                        ? 'bg-indigo-50/30 border-indigo-500 shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      {/* Drag/Actions Handle */}
                      <div className={`absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? 'opacity-100' : ''}`}>
                         <button onClick={(e) => { e.stopPropagation(); moveField(idx, 'up'); }} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30" disabled={idx === 0}><ChevronUp size={16}/></button>
                         <div className="text-slate-300"><GripVertical size={16}/></div>
                         <button onClick={(e) => { e.stopPropagation(); moveField(idx, 'down'); }} className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-30" disabled={idx === data.fields.length - 1}><ChevronDown size={16}/></button>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-bold text-slate-700">
                          {field.label} {field.required && <span className="text-red-500">*</span>}
                        </label>
                        
                        {field.type === 'textarea' ? (
                          <div className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl" />
                        ) : field.type === 'select' ? (
                          <div className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4 justify-between">
                            <span className="text-slate-400 text-sm">Select an option...</span>
                            <ChevronDown size={16} className="text-slate-400"/>
                          </div>
                        ) : field.type === 'checkbox' ? (
                          <div className="flex items-center gap-3 py-2">
                            <div className="w-5 h-5 border-2 border-slate-200 rounded-md bg-slate-50" />
                            <span className="text-sm text-slate-600">Yes, I agree.</span>
                          </div>
                        ) : (
                          <div className="w-full h-11 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4">
                            <span className="text-slate-400 text-sm">{field.placeholder}</span>
                          </div>
                        )}
                      </div>

                      {/* Delete Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeField(field.id); }}
                        className={`absolute -right-3 -top-3 p-2 bg-red-500 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 active:scale-90 ${isSelected ? 'opacity-100 scale-100' : 'scale-75'}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-20">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 text-slate-300">
                    <FormInput size={40} />
                  </div>
                  <h3 className="text-slate-400 font-bold mb-2">No Components Added</h3>
                  <p className="text-slate-400 text-xs max-w-[200px]">
                    Drag components from the left or use AI to generate a functional interface.
                  </p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 bg-slate-50/50 rounded-b-3xl">
              <button className="w-full py-4 bg-slate-200 text-slate-400 font-black text-sm uppercase tracking-widest rounded-2xl cursor-not-allowed">
                Complete Task
              </button>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Inspector */}
        <aside className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Settings2 size={12}/> Property Inspector
            </span>
          </div>

          <div className="p-5 flex-1 overflow-y-auto">
            {selectedField ? (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Component Label</label>
                  <input 
                    value={selectedField.label}
                    onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Placeholder Hint</label>
                  <input 
                    value={selectedField.placeholder || ''}
                    onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Enter your name..."
                  />
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Required Field</span>
                  <button 
                    onClick={() => updateField(selectedField.id, { required: !selectedField.required })}
                    className={`w-10 h-6 rounded-full transition-all relative ${selectedField.required ? 'bg-indigo-600' : 'bg-slate-300'}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${selectedField.required ? 'left-5' : 'left-1'}`} />
                  </button>
                </div>

                {selectedField.type === 'select' && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase">Dropdown Options</label>
                       <button 
                        onClick={() => updateField(selectedField.id, { options: [...(selectedField.options || []), `New Option ${selectedField.options?.length || 0 + 1}`] })}
                        className="text-[10px] text-indigo-600 font-bold hover:underline"
                       >
                        Add Option
                       </button>
                    </div>
                    <div className="space-y-2">
                      {selectedField.options?.map((opt, i) => (
                        <div key={i} className="flex gap-2">
                          <input 
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...(selectedField.options || [])];
                              newOpts[i] = e.target.value;
                              updateField(selectedField.id, { options: newOpts });
                            }}
                            className="flex-1 p-2 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button 
                            onClick={() => {
                              const newOpts = (selectedField.options || []).filter((_, idx) => idx !== i);
                              updateField(selectedField.id, { options: newOpts });
                            }}
                            className="p-2 text-slate-400 hover:text-red-500"
                          >
                            <X size={14}/>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-40">
                <Settings2 size={40} className="mb-4 text-slate-300"/>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select a component to inspect</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* AI Generator Modal */}
      {showAIModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3 text-indigo-700">
                <div className="p-2 bg-white rounded-xl shadow-sm">
                  <Sparkles size={20} className="text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black tracking-tight">AI Form Generator</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Semantic Interface Building</p>
                </div>
              </div>
              <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 bg-white p-2 rounded-full border border-slate-100">
                <X size={18} />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                Describe the purpose of this user task. The AI will determine the necessary data fields, validation rules, and layout.
              </p>
              <textarea 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                className="w-full h-40 p-4 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none shadow-inner"
                placeholder="e.g. Travel Request: Purpose, Destination, Departure Date, Estimated Cost, and Manager Comments..."
                autoFocus
              />
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <button onClick={() => setShowAIModal(false)} className="px-6 py-3 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">
                Cancel
              </button>
              <button 
                onClick={handleGenerate} 
                disabled={!prompt.trim() || isGenerating}
                className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Build Form
              </button>
            </div>
          </div>
        </div>
      )}

      {isGenerating && !showAIModal && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-[70] animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-indigo-100 rounded-full animate-pulse"></div>
              <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
            </div>
            <p className="text-indigo-900 font-black tracking-tight text-lg">Synthesizing User Interface...</p>
            <p className="text-slate-500 text-sm max-w-[200px]">Gemini is analyzing your workflow requirements to build a custom form.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FormEditor;
