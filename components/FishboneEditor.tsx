import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FishboneDiagram } from '../types';
import { generateFishboneAnalysis, generateCausesForCategory, generateRcaConclusion } from '../services/geminiService';
import { 
    Wand2, Loader2, Save, Sparkles, X, 
    ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, 
    Edit3, Lightbulb, Move, MousePointer2, CheckCircle2, Target,
    PanelRightOpen
} from 'lucide-react';

interface FishboneEditorProps {
  data: FishboneDiagram;
  onUpdate: (data: FishboneDiagram) => void;
  contextDesc?: string;
}

type SelectionType = 
  | { type: 'problem' }
  | { type: 'category', id: string }
  | { type: 'cause', categoryId: string, index: number }
  | null;

const FishboneEditor: React.FC<FishboneEditorProps> = ({ data, onUpdate, contextDesc }) => {
  // Modal State
  const [problemInput, setProblemInput] = useState(data.problemStatement);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  
  // Canvas View State
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  
  // Selection State
  const [selection, setSelection] = useState<SelectionType>(null);
  
  // View Modes
  const [showOutcomePanel, setShowOutcomePanel] = useState(false);
  
  // Local Edit State (for sidebar inputs)
  const [editValue, setEditValue] = useState('');
  
  // AI Loading States
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isConcluding, setIsConcluding] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const hasPanningMoved = useRef(false);

  // SVG Geometry Constants
  // Head is on LEFT.
  const BASE_WIDTH = 1200;
  const BASE_HEIGHT = 800;
  const SPINE_Y = BASE_HEIGHT / 2;
  
  // Head on Left
  const HEAD_X = 50;
  const HEAD_WIDTH = 220;
  const SPINE_HEAD_X = HEAD_X + HEAD_WIDTH; // Connection point at Head
  const SPINE_TAIL_X = BASE_WIDTH - 50; // Tail start point

  // --- View Control Handlers ---

  const handleZoom = (delta: number) => {
    setViewState(prev => ({
        ...prev,
        scale: Math.max(0.2, Math.min(3, prev.scale + delta))
    }));
  };

  const handleResetView = useCallback(() => {
    if (!containerRef.current) {
        setViewState({ x: 0, y: 0, scale: 1 });
        return;
    }

    const { clientWidth, clientHeight } = containerRef.current;
    
    // Calculate the best fit
    const padding = 40;
    const contentWidth = BASE_WIDTH;
    const contentHeight = BASE_HEIGHT;
    
    // Scale to fit whichever dimension is more constrained
    const scaleX = (clientWidth - padding) / contentWidth;
    const scaleY = (clientHeight - padding) / contentHeight;
    const fitScale = Math.min(scaleX, scaleY, 1); // Clamp to 1.0 max to avoid over-zooming on large screens

    setViewState({ 
        x: (clientWidth - contentWidth * fitScale) / 2, 
        y: (clientHeight - contentHeight * fitScale) / 2, 
        scale: fitScale 
    });
  }, []);

  // Fit to view on mount
  useEffect(() => {
      // Small timeout to ensure DOM is ready and layout is calculated
      const timer = setTimeout(() => {
          handleResetView();
      }, 100);
      return () => clearTimeout(timer);
  }, [handleResetView]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
      // Only start pan if clicking on background (svg)
      if ((e.target as Element).tagName === 'svg' || (e.target as Element).id === 'bg-rect') {
          setIsPanning(true);
          hasPanningMoved.current = false;
          setLastMousePos({ x: e.clientX, y: e.clientY });
          
          // Clear selection and panels on background click
          if (!hasPanningMoved.current) {
             setSelection(null);
             setShowOutcomePanel(false);
          }
      }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isPanning) {
        hasPanningMoved.current = true;
        const dx = e.clientX - lastMousePos.x;
        const dy = e.clientY - lastMousePos.y;
        setViewState(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  // --- Data Manipulation Handlers ---

  const handleFullGenerate = async () => {
    if (!problemInput.trim()) return;
    setIsGenerating(true);
    setShowAIModal(false);
    const result = await generateFishboneAnalysis(problemInput, contextDesc);
    if (result) {
      onUpdate(result);
      setSelection(null);
      setTimeout(handleResetView, 100);
    }
    setIsGenerating(false);
  };

  const handleGenerateConclusion = async () => {
      if (data.categories.length === 0) return;
      setIsConcluding(true);
      const result = await generateRcaConclusion(data);
      if (result) {
          onUpdate({ ...data, ...result });
      }
      setIsConcluding(false);
  }

  const updateProblemStatement = (text: string) => {
      onUpdate({ ...data, problemStatement: text });
  };

  const updateCategoryName = (id: string, name: string) => {
      const newCats = data.categories.map(c => c.id === id ? { ...c, name } : c);
      onUpdate({ ...data, categories: newCats });
  };

  const updateCauseText = (catId: string, index: number, text: string) => {
      const newCats = data.categories.map(c => {
          if (c.id === catId) {
              const newCauses = [...c.causes];
              newCauses[index] = text;
              return { ...c, causes: newCauses };
          }
          return c;
      });
      onUpdate({ ...data, categories: newCats });
  };

  const setAsRootCause = (text: string) => {
      onUpdate({ ...data, rootCause: text });
  };

  const addCategory = () => {
      const newCat = {
          id: crypto.randomUUID(),
          name: 'New Category',
          causes: []
      };
      onUpdate({ ...data, categories: [...data.categories, newCat] });
      // Select the new category
      setTimeout(() => setSelection({ type: 'category', id: newCat.id }), 100);
      setShowOutcomePanel(false);
  };

  const deleteCategory = (id: string) => {
      onUpdate({ ...data, categories: data.categories.filter(c => c.id !== id) });
      setSelection(null);
  };

  const addCause = (catId: string) => {
      const newCats = data.categories.map(c => {
          if (c.id === catId) {
              return { ...c, causes: [...c.causes, 'New Cause'] };
          }
          return c;
      });
      onUpdate({ ...data, categories: newCats });
      // Select the new cause
      const cat = newCats.find(c => c.id === catId);
      if (cat) {
        setTimeout(() => setSelection({ type: 'cause', categoryId: catId, index: cat.causes.length - 1 }), 100);
      }
  };

  const deleteCause = (catId: string, index: number) => {
      const newCats = data.categories.map(c => {
          if (c.id === catId) {
              return { ...c, causes: c.causes.filter((_, i) => i !== index) };
          }
          return c;
      });
      onUpdate({ ...data, categories: newCats });
      setSelection(null);
  };

  const handleSuggestCauses = async (catId: string) => {
      const cat = data.categories.find(c => c.id === catId);
      if (!cat) return;
      
      setIsSuggesting(true);
      const suggestions = await generateCausesForCategory(data.problemStatement, cat.name, cat.causes);
      
      if (suggestions && suggestions.length > 0) {
          const newCats = data.categories.map(c => {
              if (c.id === catId) {
                  return { ...c, causes: [...c.causes, ...suggestions] };
              }
              return c;
          });
          onUpdate({ ...data, categories: newCats });
      }
      setIsSuggesting(false);
  };

  const handleToggleOutcome = () => {
      setShowOutcomePanel(!showOutcomePanel);
      if (!showOutcomePanel) setSelection(null);
  };

  // Sync editValue with selection
  useEffect(() => {
      if (!selection) {
          setEditValue('');
          return;
      }
      // Ensure outcome panel is closed when selecting diagram elements
      setShowOutcomePanel(false);

      if (selection.type === 'problem') {
          setEditValue(data.problemStatement);
      } else if (selection.type === 'category') {
          const cat = data.categories.find(c => c.id === selection.id);
          if (cat) setEditValue(cat.name);
      } else if (selection.type === 'cause') {
          const cat = data.categories.find(c => c.id === selection.categoryId);
          if (cat && cat.causes[selection.index]) setEditValue(cat.causes[selection.index]);
      }
  }, [selection, data]);

  // --- Rendering Helpers ---

  const renderRibs = () => {
    // Dynamic spacing based on number of categories
    const categoryCount = data.categories.length;
    // Space available along the spine (Tail to Head)
    const availableSpace = SPINE_TAIL_X - SPINE_HEAD_X - 150;
    // Calculate spacing
    const calculatedSpacing = Math.max(180, availableSpace / Math.ceil(categoryCount / 2));
    
    return data.categories.map((cat, index) => {
      const isTop = index % 2 === 0;
      const pairIndex = Math.floor(index / 2);
      
      // Distribute from Left (Near Head) to Right (Tail)
      const startX = SPINE_HEAD_X + 150 + (pairIndex * calculatedSpacing);
      
      // Angle for Ribs
      // Flow is Right -> Left (Towards Head).
      // We want ribs to slant "back" towards the Right (Tail).
      // Top Rib: Up-Right (-60 deg).
      // Bottom Rib: Down-Right (60 deg).
      
      const angle = isTop ? -60 : 60;
      const length = 220;
      const rad = (angle * Math.PI) / 180;
      
      // Outer End Point
      const endX = startX + length * Math.cos(rad);
      const endY = SPINE_Y + length * Math.sin(rad);

      // Label Position
      const labelX = endX;
      const labelY = endY + (isTop ? -25 : 25);
      
      const isSelected = selection?.type === 'category' && selection.id === cat.id;

      return (
        <g key={cat.id || index}>
          {/* Main Rib Line: Outer -> Spine */}
          <line 
            x1={endX} y1={endY} 
            x2={startX} y2={SPINE_Y} 
            stroke={isSelected ? "#4f46e5" : "#64748b"} 
            strokeWidth={isSelected ? 4 : 2} 
          />
          
          {/* Category Label Box (Interactive) */}
          <g 
            className="cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => { e.stopPropagation(); setSelection({ type: 'category', id: cat.id }); }}
          >
              <rect 
                x={labelX - 70} y={labelY - 18} 
                width="140" height="36" 
                rx="6" 
                fill={isSelected ? "#e0e7ff" : "white"} 
                stroke={isSelected ? "#4338ca" : "#475569"} 
                strokeWidth={isSelected ? 2 : 1} 
                className="shadow-sm"
              />
              <text 
                x={labelX} y={labelY} 
                dy="5" textAnchor="middle" 
                className={`text-xs font-bold uppercase select-none ${isSelected ? 'fill-indigo-900' : 'fill-slate-700'}`}
              >
                {cat.name}
              </text>
          </g>

          {/* Causes */}
          {cat.causes.map((cause, cIdx) => {
            // Distribute causes along the rib
            const dist = 0.25 + (cIdx * 0.18); 
            
            // Point on the rib
            const ribPointX = startX + (endX - startX) * dist;
            const ribPointY = SPINE_Y + (endY - SPINE_Y) * dist;
            
            // Cause line sticks out horizontally
            // If Head is Left, Flow is Left. Causes should trail to Right.
            const lineLen = 140;
            const causeEndX = ribPointX + lineLen; 
            
            const isCauseSelected = selection?.type === 'cause' && selection.categoryId === cat.id && selection.index === cIdx;
            const isRootCause = data.rootCause === cause;

            return (
              <g 
                key={cIdx} 
                className="cursor-pointer group"
                onClick={(e) => { e.stopPropagation(); setSelection({ type: 'cause', categoryId: cat.id, index: cIdx }); }}
              >
                {/* Cause Line */}
                <line 
                  x1={ribPointX} y1={ribPointY} 
                  x2={causeEndX} y2={ribPointY} 
                  stroke={isCauseSelected ? "#4f46e5" : isRootCause ? "#ef4444" : "#94a3b8"} 
                  strokeWidth={isCauseSelected || isRootCause ? 2 : 1} 
                />
                
                {/* Interactive Click Area */}
                <rect 
                    x={ribPointX} y={ribPointY - 10} width={lineLen} height={20} 
                    fill="transparent" 
                />

                <text 
                  x={ribPointX + 5} y={ribPointY - 4} 
                  className={`text-[11px] font-medium select-none ${isCauseSelected ? 'fill-indigo-700 font-bold' : isRootCause ? 'fill-red-600 font-bold' : 'fill-slate-600'}`}
                >
                  {cause}
                </text>
                
                {/* Root Cause Indicator */}
                {isRootCause && (
                    <circle cx={ribPointX} cy={ribPointY} r="3" fill="#ef4444" />
                )}
              </g>
            );
          })}
          
          {/* Add Cause Button */}
          {isSelected && (
              <g 
                onClick={(e) => { e.stopPropagation(); addCause(cat.id); }}
                className="cursor-pointer hover:scale-110 transition-transform"
                style={{transformBox: 'fill-box', transformOrigin: 'center'}}
              >
                  <circle cx={endX} cy={endY + (isTop ? -45 : 45)} r="10" fill="#4f46e5" />
                  <line x1={endX-4} y1={endY + (isTop ? -45 : 45)} x2={endX+4} y2={endY + (isTop ? -45 : 45)} stroke="white" strokeWidth="2"/>
                  <line x1={endX} y1={endY + (isTop ? -49 : 41)} x2={endX} y2={endY + (isTop ? -41 : 49)} stroke="white" strokeWidth="2"/>
              </g>
          )}
        </g>
      );
    });
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
      {/* Toolbar */}
      <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between bg-slate-50 z-10">
          <div className="flex items-center gap-4">
              <h2 className="font-semibold text-slate-700">Root Cause Analysis</h2>
              <div className="h-6 w-px bg-slate-300"></div>
              
               <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1">
                   <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Zoom In"><ZoomIn size={16}/></button>
                   <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Zoom Out"><ZoomOut size={16}/></button>
                   <button onClick={handleResetView} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Fit to View"><RotateCcw size={16}/></button>
              </div>

              <button 
                  onClick={addCategory}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg shadow-sm text-xs font-medium transition-all"
              >
                  <Plus size={14} /> Category
              </button>
          </div>
          
          <div className="flex items-center gap-4">
              <button 
                   onClick={handleToggleOutcome}
                   className={`flex items-center gap-2 px-3 py-1.5 border rounded-lg shadow-sm text-xs font-medium transition-all ${showOutcomePanel ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}
               >
                   <CheckCircle2 size={14} />
                   Analysis Outcome
               </button>

              <button 
                   onClick={() => setShowAIModal(true)}
                   disabled={isGenerating}
                   className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 rounded-lg shadow-sm text-xs font-medium transition-all disabled:opacity-50"
               >
                   {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                   {data.categories.some(c => c.causes.length > 0) ? 'Regenerate Analysis' : 'Generate Analysis'}
               </button>
          </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Canvas (Center) */}
        <div 
            ref={containerRef}
            className="flex-1 overflow-hidden bg-slate-50/50 flex items-center justify-center relative cursor-move"
            onMouseDown={handleMouseDown}
            onWheel={handleWheel}
        >
             {/* Hint Overlay when empty state */}
             {data.categories.length === 0 && (
                 <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                     <p className="text-slate-400 text-sm">Use AI or Add Category to start...</p>
                 </div>
             )}

            <svg 
                width="100%" 
                height="100%" 
                id="fishbone-svg"
            >
                <defs>
                    <marker id="arrowhead-lg" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                        <polygon points="0 0, 10 3.5, 0 7" fill="#334155" />
                    </marker>
                    <pattern id="fish-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <circle cx="1" cy="1" r="1" fill="#cbd5e1" fillOpacity="0.4"/>
                    </pattern>
                </defs>

                <rect id="bg-rect" width="100%" height="100%" fill="url(#fish-grid)" />

                <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
                    
                    {/* Spine (Right to Left) */}
                    <line 
                        x1={SPINE_TAIL_X} y1={SPINE_Y} 
                        x2={SPINE_HEAD_X} y2={SPINE_Y} 
                        stroke="#334155" strokeWidth="4" 
                        markerEnd="url(#arrowhead-lg)"
                    />

                    {/* Head (Problem) - Positioned on LEFT */}
                    <g 
                        transform={`translate(${HEAD_X}, ${SPINE_Y - 40})`}
                        onClick={(e) => { e.stopPropagation(); setSelection({ type: 'problem' }); }}
                        className="cursor-pointer hover:opacity-90"
                    >
                        <rect 
                            width={HEAD_WIDTH} height="80" 
                            rx="8" 
                            fill={selection?.type === 'problem' ? "#e0e7ff" : "white"} 
                            stroke={selection?.type === 'problem' ? "#4338ca" : "#334155"} 
                            strokeWidth={selection?.type === 'problem' ? 3 : 2}
                            className="shadow-md"
                        />
                        <foreignObject x="10" y="10" width="200" height="60" style={{pointerEvents: 'none'}}>
                            <div className={`w-full h-full flex items-center justify-center text-center text-sm font-bold ${selection?.type === 'problem' ? 'text-indigo-900' : 'text-slate-800'} line-clamp-3 leading-tight`}>
                                {data.problemStatement || "Define Problem"}
                            </div>
                        </foreignObject>
                    </g>

                    {/* Categories and Ribs */}
                    {renderRibs()}

                </g>
            </svg>
            
            {/* View Controls Overlay */}
            <div className="absolute bottom-4 left-4 bg-white/90 px-3 py-1 rounded text-[10px] text-slate-400 pointer-events-none select-none">
                Scroll to Zoom • Drag to Pan
            </div>
        </div>

        {/* Properties/Outcome Sidebar (Remains on the Right) */}
        {(selection || showOutcomePanel) && (
            <div className="w-80 border-l border-slate-200 bg-white flex flex-col z-20 shadow-lg animate-in slide-in-from-right-5">
                {selection ? (
                    <>
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                            <Edit3 size={14}/> 
                            {selection.type === 'problem' ? 'Problem Statement' : 
                            selection.type === 'category' ? 'Category Details' : 'Root Cause Details'}
                        </span>
                        <button onClick={() => setSelection(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                    
                    <div className="p-5 flex-1 overflow-y-auto">
                        {selection.type === 'problem' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-1">Effect / Problem</label>
                                    <textarea 
                                        className="w-full p-3 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-32" 
                                        value={editValue}
                                        onChange={(e) => {
                                            setEditValue(e.target.value);
                                            updateProblemStatement(e.target.value);
                                        }}
                                    />
                                </div>
                                <div className="text-xs text-slate-400">
                                    This is the head of the fish. It represents the effect you are analyzing.
                                </div>
                            </div>
                        )}

                        {selection.type === 'category' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-1">Category Name</label>
                                    <input 
                                        className="w-full p-2 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={editValue}
                                        onChange={(e) => {
                                            setEditValue(e.target.value);
                                            updateCategoryName(selection.id, e.target.value);
                                        }}
                                    />
                                </div>
                                
                                <div className="pt-4 border-t border-slate-100">
                                    <label className="text-xs font-medium text-slate-500 block mb-2">Actions</label>
                                    <div className="space-y-2">
                                        <button 
                                            onClick={() => addCause(selection.id)}
                                            className="w-full py-2 bg-indigo-50 text-indigo-600 text-xs font-medium rounded-lg hover:bg-indigo-100 flex items-center justify-center gap-2 transition-colors"
                                        >
                                            <Plus size={14} /> Add Manual Cause
                                        </button>
                                        
                                        <button 
                                            onClick={() => handleSuggestCauses(selection.id)}
                                            disabled={isSuggesting}
                                            className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-medium rounded-lg hover:from-emerald-600 hover:to-teal-600 flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-70"
                                        >
                                            {isSuggesting ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />} 
                                            Suggest AI Causes
                                        </button>
                                    </div>
                                </div>

                                <div className="pt-4 mt-auto">
                                    <button 
                                        onClick={() => deleteCategory(selection.id)}
                                        className="w-full py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={14} /> Delete Category
                                    </button>
                                </div>
                            </div>
                        )}

                        {selection.type === 'cause' && (
                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-1">Cause Description</label>
                                    <textarea 
                                        className="w-full p-3 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none h-24" 
                                        value={editValue}
                                        onChange={(e) => {
                                            setEditValue(e.target.value);
                                            updateCauseText(selection.categoryId, selection.index, e.target.value);
                                        }}
                                    />
                                </div>

                                <button 
                                    onClick={() => setAsRootCause(editValue)}
                                    className={`w-full py-2 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${data.rootCause === editValue ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    <Target size={14} /> 
                                    {data.rootCause === editValue ? 'Is Root Cause' : 'Mark as Root Cause'}
                                </button>

                                <div className="pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={() => deleteCause(selection.categoryId, selection.index)}
                                        className="w-full py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 flex items-center justify-center gap-2 transition-colors"
                                    >
                                        <Trash2 size={14} /> Delete Cause
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                    </>
                ) : (
                    <>
                    {/* Outcome Panel */}
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                            <CheckCircle2 size={14} className="text-emerald-600"/> Analysis Outcome
                        </span>
                        <button onClick={() => setShowOutcomePanel(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                    <div className="p-5 flex-1 overflow-y-auto space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Primary Root Cause</label>
                                <button onClick={handleGenerateConclusion} disabled={isConcluding || data.categories.length === 0} className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1">
                                    {isConcluding ? <Loader2 size={10} className="animate-spin"/> : <Sparkles size={10}/>} Auto-Conclude
                                </button>
                            </div>
                            <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                                <textarea 
                                    className="w-full bg-transparent text-sm text-red-900 placeholder-red-300 outline-none resize-none h-20"
                                    placeholder="Select a cause on the diagram or type the final root cause here..."
                                    value={data.rootCause || ""}
                                    onChange={(e) => onUpdate({...data, rootCause: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Corrective Action Plan</label>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                                <textarea 
                                    className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none resize-none h-40"
                                    placeholder="- Describe steps to fix..."
                                    value={data.actionPlan || ""}
                                    onChange={(e) => onUpdate({...data, actionPlan: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500">
                            <p>Tip: Click on any bone in the diagram to edit details or mark it as the root cause.</p>
                        </div>
                    </div>
                    </>
                )}
            </div>
        )}
      </div>

      {/* AI Generator Modal */}
      {showAIModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
                <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
                    <div className="bg-slate-50 p-8 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-4 text-indigo-700">
                            <div className="p-3 bg-white rounded-2xl shadow-sm"><Sparkles size={24} /></div>
                            <div>
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Analyze Root Causes</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Heuristic RCA Synthesis</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-8">
                        <p className="text-sm text-slate-500 mb-6 font-medium leading-relaxed">
                            Define the observed effect or problem. ProcessM8 will brainstorm structural causes across standard categories.
                        </p>
                        <textarea 
                            value={problemInput}
                            onChange={e => setProblemInput(e.target.value)}
                            className="w-full h-40 p-5 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-[2rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400"
                            placeholder="e.g. High cycle time variance in shipping department during peak seasons..."
                            autoFocus
                        />
                    </div>
                    <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                        <button onClick={() => setShowAIModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button 
                            onClick={handleFullGenerate} 
                            disabled={!problemInput.trim() || isGenerating}
                            className="px-8 py-2.5 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            Generate RCA
                        </button>
                    </div>
                </div>
            </div>
        )}

      {isGenerating && !showAIModal && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <p className="text-indigo-900 font-medium">Analyzing Root Causes...</p>
                </div>
            </div>
        )}
    </div>
  );
};

export default FishboneEditor;