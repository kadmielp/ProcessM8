
import React, { useState } from 'react';
import { FormSchema } from '../types';
import { Wand2, Loader2, FormInput, Sparkles, X } from 'lucide-react';

interface FormEditorProps {
  data: FormSchema;
  onUpdate: (data: FormSchema) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const FormEditor: React.FC<FormEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);

  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      setShowAIModal(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Toolbar */}
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
              <h2 className="font-semibold text-slate-700">Form Builder: User Tasks</h2>
              <div className="h-6 w-px bg-slate-300"></div>
              <div className="text-xs text-slate-500">
                  {data.fields?.length || 0} Fields Configured
              </div>
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

      <div className="flex flex-1 overflow-hidden">
          {/* Preview Area */}
          <div className="flex-1 overflow-auto bg-slate-50 p-8 flex justify-center">
              <div className="w-full max-w-2xl bg-white shadow-lg rounded-xl border border-slate-200 p-8">
                  <div className="mb-6 border-b border-slate-100 pb-4">
                      <h3 className="text-2xl font-bold text-slate-800">{data.title || "Untitled Form"}</h3>
                      <p className="text-slate-500 text-sm mt-1">User Task Form Preview</p>
                  </div>
                  
                  <div className="space-y-6">
                      {data.fields && data.fields.length > 0 ? (
                          data.fields.map((field, idx) => (
                              <div key={idx} className="space-y-2">
                                  <label className="block text-sm font-medium text-slate-700">
                                      {field.label} {field.required && <span className="text-red-500">*</span>}
                                  </label>
                                  
                                  {field.type === 'textarea' ? (
                                      <textarea 
                                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                          placeholder={field.placeholder}
                                          rows={3}
                                      />
                                  ) : field.type === 'select' ? (
                                      <select className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
                                          <option value="">Select an option...</option>
                                          {field.options?.map((opt, i) => (
                                              <option key={i} value={opt}>{opt}</option>
                                          ))}
                                      </select>
                                  ) : field.type === 'checkbox' ? (
                                      <div className="flex items-center gap-2">
                                          <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"/>
                                          <span className="text-sm text-slate-600">Yes, {field.label.toLowerCase()}</span>
                                      </div>
                                  ) : (
                                      <input 
                                          type={field.type} 
                                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                          placeholder={field.placeholder}
                                      />
                                  )}
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-xl">
                              <FormInput size={48} className="mx-auto text-slate-300 mb-4"/>
                              <p className="text-slate-500">No fields yet. Use AI to generate a form.</p>
                          </div>
                      )}
                  </div>
                  
                  {data.fields && data.fields.length > 0 && (
                      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                          <button className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-50 rounded-lg">Cancel</button>
                          <button className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 shadow-sm">Complete Task</button>
                      </div>
                  )}
              </div>
          </div>
      </div>
      
      {/* AI Generator Modal */}
      {showAIModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-white/20 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <h3>Generate Task Form</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-500 mb-3">
                            Describe the user task requirements. The AI will create a structured data entry form.
                        </p>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full h-32 p-3 text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed shadow-sm"
                            placeholder="e.g. Employee Onboarding: Collect Name, Start Date, Department (Sales, Tech, HR), and Laptop Preference (Mac/PC)."
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
                    <p className="text-indigo-900 font-medium">Building Interface...</p>
                </div>
            </div>
      )}
    </div>
  );
};

export default FormEditor;
