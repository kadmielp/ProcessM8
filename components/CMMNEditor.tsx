import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CMMNModel, CMMNNodeType, CMMNNode, CMMNEdge } from '../types';
import { 
  Wand2, Loader2, Sparkles, X, Plus, Trash2, 
  ZoomIn, ZoomOut, RotateCcw, Briefcase, Flag, 
  PlayCircle, Layers, MoveRight, Share2, Settings2,
  ChevronDown, Type, AlignLeft
} from 'lucide-react';

interface CMMNEditorProps {
  data: CMMNModel;
  onUpdate: (data: CMMNModel) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const CMMNEditor: React.FC<CMMNEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
  const [prompt, setPrompt] = useState('');
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const hasPanningMoved = useRef(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [connectMode, setConnectMode] = useState<'association' | 'dependency' | null>(null);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const GRID_SIZE = 10;

  const toLocalCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - viewState.x) / viewState.scale,
      y: (clientY - rect.top - viewState.y) / viewState.scale
    };
  };

  const handleZoom = (delta: number) => setViewState(prev => ({ ...prev, scale: Math.max(0.2, Math.min(3, prev.scale + delta)) }));
  
  const handleFitView = useCallback(() => {
    if (!data.nodes.length || !containerRef.current) return;
    const minX = Math.min(...data.nodes.map(n => n.x));
    const maxX = Math.max(...data.nodes.map(n => n.x + (n.width || 120)));
    const minY = Math.min(...data.nodes.map(n => n.y));
    const maxY = Math.max(...data.nodes.map(n => n.y + (n.height || 60)));
    const { clientWidth, clientHeight } = containerRef.current;
    const width = maxX - minX;
    const height = maxY - minY;
    const scale = Math.min(clientWidth / (width + 200), clientHeight / (height + 200), 1);
    setViewState({ x: (clientWidth - width * scale) / 2 - minX * scale, y: (clientHeight - height * scale) / 2 - minY * scale, scale });
  }, [data.nodes]);

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    hasPanningMoved.current = false;
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
      hasPanningMoved.current = true;
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    } else if (draggedNodeId) {
      const local = toLocalCoordinates(e.clientX, e.clientY);
      const snappedX = Math.round((local.x - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
      const snappedY = Math.round((local.y - dragOffset.y) / GRID_SIZE) * GRID_SIZE;
      onUpdate({ ...data, nodes: data.nodes.map(n => n.id === draggedNodeId ? { ...n, x: snappedX, y: snappedY } : n) });
    }
  }, [isPanning, draggedNodeId, lastMousePos, dragOffset, viewState.scale, data.nodes]);

  const handleMouseUp = useCallback(() => { setIsPanning(false); setDraggedNodeId(null); }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => { window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mouseup', handleMouseUp); };
  }, [handleMouseMove, handleMouseUp]);

  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (connectMode) {
      if (!connectionSource) setConnectionSource(id);
      else {
        if (connectionSource !== id) {
          onUpdate({ ...data, edges: [...data.edges, { id: crypto.randomUUID(), source: connectionSource, target: id, type: connectMode }] });
        }
        setConnectionSource(null);
        setConnectMode(null);
      }
      return;
    }
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setDraggedNodeId(id);
    const local = toLocalCoordinates(e.clientX, e.clientY);
    const node = data.nodes.find(n => n.id === id);
    if (node) setDragOffset({ x: local.x - node.x, y: local.y - node.y });
  };

  const handleAddNode = (type: CMMNNodeType) => {
    const local = toLocalCoordinates(window.innerWidth / 2, window.innerHeight / 2);
    const newNode: CMMNNode = {
      id: crypto.randomUUID(),
      type,
      label: type.charAt(0).toUpperCase() + type.slice(1),
      x: Math.round(local.x / GRID_SIZE) * GRID_SIZE,
      y: Math.round(local.y / GRID_SIZE) * GRID_SIZE,
      width: type === CMMNNodeType.STAGE ? 220 : type === CMMNNodeType.MILESTONE ? 160 : type === CMMNNodeType.EVENT_LISTENER ? 50 : 140,
      height: type === CMMNNodeType.STAGE ? 160 : type === CMMNNodeType.MILESTONE ? 40 : type === CMMNNodeType.EVENT_LISTENER ? 50 : 60
    };
    onUpdate({ ...data, nodes: [...data.nodes, newNode] });
    setSelectedNodeId(newNode.id);
  };

  const deleteSelection = () => {
    if (selectedNodeId) {
      onUpdate({ ...data, nodes: data.nodes.filter(n => n.id !== selectedNodeId), edges: data.edges.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId) });
      setSelectedNodeId(null);
    } else if (selectedEdgeId) {
      onUpdate({ ...data, edges: data.edges.filter(e => e.id !== selectedEdgeId) });
      setSelectedEdgeId(null);
    }
  };

  const renderShape = (node: CMMNNode) => {
    const isSelected = selectedNodeId === node.id;
    const isSource = connectionSource === node.id;
    const stroke = isSource ? '#ec4899' : isSelected ? '#4f46e5' : '#475569';
    const strokeWidth = isSelected || isSource ? 3 : 2;
    switch (node.type) {
      case CMMNNodeType.STAGE: return (
        <g className="cursor-pointer">
          <rect width={node.width} height={node.height} fill="white" stroke={stroke} strokeWidth={strokeWidth} strokeDasharray="6,4" />
          <rect width={node.width} height="32" fill="#f8fafc" stroke={stroke} strokeWidth="1" />
          <text x="12" y="21" className="text-[10px] font-black fill-slate-500 uppercase tracking-widest">{node.label}</text>
        </g>
      );
      case CMMNNodeType.MILESTONE: return (
        <g className="cursor-pointer">
          <rect width={node.width} height={node.height} rx={node.height! / 2} fill="#eff6ff" stroke={stroke} strokeWidth={strokeWidth} />
          <text x={node.width! / 2} y={node.height! / 2 + 5} textAnchor="middle" className="text-xs font-bold fill-blue-900">{node.label}</text>
        </g>
      );
      case CMMNNodeType.EVENT_LISTENER: return (
        <g className="cursor-pointer">
          <circle cx="25" cy="25" r="25" fill="white" stroke={stroke} strokeWidth={strokeWidth} />
          <circle cx="25" cy="25" r="20" fill="none" stroke={stroke} strokeWidth="1" />
          <text x="25" y="65" textAnchor="middle" className="text-[10px] font-bold fill-slate-600">{node.label}</text>
        </g>
      );
      default: return (
        <g className="cursor-pointer">
          <rect width={node.width} height={node.height} rx="12" fill="white" stroke={stroke} strokeWidth={strokeWidth} />
          <text x={node.width! / 2} y={node.height! / 2 + 5} textAnchor="middle" className="text-sm font-bold fill-slate-800">{node.label}</text>
        </g>
      );
    }
  };

  const selectedNode = data.nodes.find(n => n.id === selectedNodeId);

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-white shrink-0 z-10">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Briefcase size={20} /></div>
          <div>
            <h2 className="font-bold text-slate-800 text-sm">Case (CMMN)</h2>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{data.nodes.length} Elements</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAIModal(true)} disabled={isGenerating} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-100 text-xs font-bold transition-all disabled:opacity-50">
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            AI Case Modeler
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col p-4 shrink-0 overflow-y-auto">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Case Elements</h3>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => handleAddNode(CMMNNodeType.STAGE)} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-slate-700 text-sm font-medium transition-all group">
              <div className="p-1.5 bg-white rounded-lg border text-slate-500 group-hover:text-indigo-600 shadow-sm"><Layers size={16}/></div> Stage
            </button>
            <button onClick={() => handleAddNode(CMMNNodeType.TASK)} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-slate-700 text-sm font-medium transition-all group">
              <div className="p-1.5 bg-white rounded-lg border text-slate-500 group-hover:text-indigo-600 shadow-sm"><Briefcase size={16}/></div> Task
            </button>
            <button onClick={() => handleAddNode(CMMNNodeType.MILESTONE)} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl text-slate-700 text-sm font-medium transition-all group">
              <div className="p-1.5 bg-white rounded-lg border text-slate-500 group-hover:text-indigo-600 shadow-sm"><Flag size={16}/></div> Milestone
            </button>
          </div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-6 mb-4">Connections</h3>
          <div className="grid grid-cols-1 gap-2">
            <button onClick={() => setConnectMode('dependency')} className={`flex items-center gap-3 p-3 rounded-xl text-sm font-medium transition-all ${connectMode === 'dependency' ? 'bg-indigo-100 border-indigo-300' : 'bg-slate-50 border border-slate-200'}`}>
              <Share2 size={16} /> Dependency
            </button>
          </div>
        </aside>

        <main ref={containerRef} className="flex-1 relative overflow-hidden bg-slate-50" onMouseDown={handleCanvasMouseDown}>
          <svg ref={svgRef} className="w-full h-full block">
            <defs>
               <marker id="cmmn-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="#64748b" /></marker>
               <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cbd5e1" fillOpacity="0.5"/></pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
              {data.edges?.map(edge => {
                const s = data.nodes.find(n => n.id === edge.source);
                const t = data.nodes.find(n => n.id === edge.target);
                if (!s || !t) return null;
                return (
                  <line key={edge.id} x1={s.x + (s.width||0)/2} y1={s.y + (s.height||0)/2} x2={t.x + (t.width||0)/2} y2={t.y + (t.height||0)/2} stroke="#64748b" strokeWidth="2" markerEnd="url(#cmmn-arrow)" strokeDasharray={edge.type === 'dependency' ? '5,5' : ''}/>
                );
              })}
              {data.nodes?.map(node => (
                <g key={node.id} transform={`translate(${node.x},${node.y})`} onMouseDown={(e) => handleNodeMouseDown(e, node.id)}>{renderShape(node)}</g>
              ))}
            </g>
          </svg>
          <div className="absolute bottom-4 left-4 flex gap-2">
             <button onClick={() => handleZoom(0.1)} className="p-2 bg-white border rounded-lg shadow-sm"><ZoomIn size={16}/></button>
             <button onClick={() => handleZoom(-0.1)} className="p-2 bg-white border rounded-lg shadow-sm"><ZoomOut size={16}/></button>
             <button onClick={handleFitView} className="p-2 bg-white border rounded-lg shadow-sm"><RotateCcw size={16}/></button>
          </div>
        </main>

        <aside className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 animate-in slide-in-from-right">
          <div className="p-4 border-b bg-slate-50/50 flex items-center gap-2"><Settings2 size={12}/><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Case Inspector</span></div>
          <div className="p-5 flex-1 overflow-y-auto">
            {selectedNode ? (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2">Element Name</label>
                  <input 
                    value={selectedNode.label}
                    onChange={(e) => onUpdate({ ...data, nodes: data.nodes.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n) })}
                    className="w-full p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500"
                  />
                </div>
                <button onClick={deleteSelection} className="w-full py-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2">
                  <Trash2 size={14}/> Delete Element
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40 text-center py-20">
                <Settings2 size={40} className="mb-4 text-slate-300"/>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select an element to inspect</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {showAIModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="bg-slate-50 p-8 border-b flex justify-between items-center">
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-white rounded-2xl shadow-sm"><Sparkles size={24} className="text-indigo-600"/></div>
                 <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Build Case Model</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Declarative Flow Synthesis</p>
                 </div>
               </div>
               <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2"><X size={20} /></button>
            </div>
            <div className="p-8">
               <textarea 
                  value={prompt} 
                  onChange={e => setPrompt(e.target.value)} 
                  className="w-full h-40 p-5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400" 
                  placeholder="Describe the case lifecycle: 'Handle insurance claim from filing to payout, including expert review stages...'"
                  autoFocus
                />
            </div>
            <div className="p-8 bg-slate-50 border-t flex justify-end gap-3">
               <button onClick={() => setShowAIModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
               <button onClick={() => { onGenerate(prompt); setShowAIModal(false); }} className="px-8 py-2.5 text-sm font-black bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Generate Model</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CMMNEditor;