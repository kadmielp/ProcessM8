
import React, { useState, useRef } from 'react';
import { CMMNModel, CMMNNodeType } from '../types';
import { Wand2, Loader2, Sparkles, X } from 'lucide-react';

interface CMMNEditorProps {
  data: CMMNModel;
  onUpdate: (data: CMMNModel) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const CMMNEditor: React.FC<CMMNEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  
  const handleGenerate = () => {
    if (prompt.trim()) {
      onGenerate(prompt);
      setShowAIModal(false);
    }
  };

  const renderShape = (node: any) => {
      const strokeColor = '#334155';
      const strokeWidth = 2;

      switch (node.type) {
          case CMMNNodeType.STAGE:
              // Rectangle with cut corners or dashed line
              return (
                  <g>
                    <rect x="0" y="0" width={node.width || 200} height={node.height || 150} fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <rect x="0" y="0" width={node.width || 200} height="24" fill="#f1f5f9" stroke={strokeColor} strokeWidth="1" />
                    <text x="10" y="16" className="text-xs font-bold fill-slate-700 uppercase">{node.label}</text>
                  </g>
              );
          case CMMNNodeType.MILESTONE:
              // Pill shape
              const w = node.width || 140;
              const h = node.height || 40;
              const r = h / 2;
              return (
                  <g>
                      <rect x="0" y="0" width={w} height={h} rx={r} fill="#e0e7ff" stroke="#4338ca" strokeWidth={strokeWidth} />
                      <text x={w/2} y={h/2 + 4} textAnchor="middle" className="text-sm font-medium fill-indigo-900">{node.label}</text>
                  </g>
              );
          case CMMNNodeType.EVENT_LISTENER:
              // Circle with double line
              return (
                  <g>
                      <circle cx="20" cy="20" r="20" fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
                      <circle cx="20" cy="20" r="16" fill="none" stroke={strokeColor} strokeWidth="1" />
                      <text x="20" y="55" textAnchor="middle" className="text-xs fill-slate-600">{node.label}</text>
                  </g>
              );
          case CMMNNodeType.TASK:
          default:
              // Rounded Rect
              const tw = node.width || 120;
              const th = node.height || 60;
              return (
                  <g>
                      <rect x="0" y="0" width={tw} height={th} rx="8" fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
                      <text x={tw/2} y={th/2 + 4} textAnchor="middle" className="text-sm fill-slate-800">{node.label}</text>
                  </g>
              );
      }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        {/* Toolbar */}
        <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-4">
                <h2 className="font-semibold text-slate-700">CMMN: Case Management</h2>
                <div className="h-6 w-px bg-slate-300"></div>
                <div className="text-xs text-slate-500">
                  Unstructured Process Model
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

        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-slate-50/50 relative">
            <svg 
                ref={svgRef}
                className="w-full h-full min-w-[800px] min-h-[600px]"
            >
                <defs>
                    <marker id="cmmn-arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#64748b" />
                    </marker>
                    <pattern id="cmmn-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="1" fill="#cbd5e1"/>
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#cmmn-grid)" />

                {/* Edges */}
                {data.edges?.map(edge => {
                    const source = data.nodes.find(n => n.id === edge.source);
                    const target = data.nodes.find(n => n.id === edge.target);
                    if (!source || !target) return null;

                    // Simple center-to-center logic for now
                    const sx = source.x + (source.width || 100) / 2;
                    const sy = source.y + (source.height || 50) / 2;
                    const tx = target.x + (target.width || 100) / 2;
                    const ty = target.y + (target.height || 50) / 2;

                    return (
                        <line 
                            key={edge.id}
                            x1={sx} y1={sy} x2={tx} y2={ty}
                            stroke="#64748b" strokeWidth="1" strokeDasharray={edge.type === 'dependency' ? "5,5" : ""}
                            markerEnd="url(#cmmn-arrow)"
                        />
                    );
                })}

                {/* Nodes */}
                {data.nodes?.map(node => (
                    <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                        {renderShape(node)}
                    </g>
                ))}
            </svg>
        </div>

        {/* AI Generator Modal */}
        {showAIModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-white/20 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <h3>Generate Case Model</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-500 mb-3">
                            Describe the case management scenario. The AI will create milestones, stages, and tasks.
                        </p>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full h-32 p-3 text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed shadow-sm"
                            placeholder="e.g. Insurance Claim Handling: Claim Received -> Review Documents -> Assess Damage -> Approval/Rejection -> Payment or Notification."
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
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <p className="text-indigo-900 font-medium">Modeling Case Workflow...</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default CMMNEditor;
