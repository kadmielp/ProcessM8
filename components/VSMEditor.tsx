import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VSMData, VSMStep, VSMConnector, VSMRole, SIPOCData } from '../types';
import { analyzeVSM } from '../services/geminiService';
import { convertSipocToVsm } from '../services/bpmnConverter';
import { 
    Wand2, Loader2, Factory, Trash2, Plus, 
    MousePointer2, Settings, Sparkles, X, 
    Truck, Box, Zap, MoveRight, CornerDownRight, ArrowRight,
    TrendingUp, AlertTriangle, Lightbulb, Maximize, Minimize,
    ZoomIn, ZoomOut, RotateCcw, AlignLeft, Import
} from 'lucide-react';

interface VSMEditorProps {
  data: VSMData;
  onUpdate: (data: VSMData) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
  sipocData?: SIPOCData;
}

const VSMEditor: React.FC<VSMEditorProps> = ({ data, onUpdate, isGenerating, onGenerate, sipocData }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  
  // Canvas View State (Zoom/Pan)
  const [viewState, setViewState] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Track panning movement to distinguish click vs drag
  const hasPanningMoved = useRef(false);

  // Node Dragging State
  const [draggedStepId, setDraggedStepId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [showAIModal, setShowAIModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Connection Mode State
  const [connectMode, setConnectMode] = useState<VSMConnector['type'] | null>(null);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const GRID_SIZE = 10;
  
  // Constants for Visuals
  const LADDER_Y = 600;

  // --- Calculations ---
  useEffect(() => {
    if(!isGenerating) {
        // Defensive check for s.data
        const totalPT = data.steps.filter(s => s.role === 'process').reduce((acc, s) => acc + (s.data?.cycleTime || 0), 0);
        const totalLT = data.steps.reduce((acc, s) => acc + (s.data?.leadTime || 0), 0); 
        
        if(totalPT !== data.totalProcessTime || totalLT !== data.totalLeadTime) {
            onUpdate({ ...data, totalProcessTime: totalPT, totalLeadTime: totalLT });
        }
    }
  }, [data.steps]);

  // Derived Metrics
  const taktTime = (data.availableTime && data.customerDemand) 
    ? Math.round(data.availableTime / data.customerDemand) 
    : 0;

  // --- Helpers ---
  const toLocalCoordinates = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return {
        x: (clientX - rect.left - viewState.x) / viewState.scale,
        y: (clientY - rect.top - viewState.y) / viewState.scale
    };
  };

  const wrapText = (text: string, maxChars: number) => {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let currentLine = words[0] || '';
    
    for (let i = 1; i < words.length; i++) {
         if (currentLine.length + 1 + words[i].length <= maxChars) {
             currentLine += ' ' + words[i];
         } else {
             lines.push(currentLine);
             currentLine = words[i];
         }
    }
    lines.push(currentLine);
    return lines;
  };

  const getSnapRect = (step: VSMStep) => {
    const { x, y, role } = step;
    let w = 60, h = 60;
    
    switch (role) {
        case 'process': w = 120; h = 60; break;
        case 'supplier':
        case 'customer': w = 90; h = 45; break;
        case 'production-control': w = 120; h = 40; break;
        case 'inventory': w = 30; h = 30; break; 
        case 'kaizen': w = 50; h = 50; break;
        case 'transport': w = 40; h = 40; break; 
    }
    return { x, y, w, h };
  };

  const getConnectorPoints = (source: VSMStep, target: VSMStep) => {
    const sRect = getSnapRect(source);
    const tRect = getSnapRect(target);
    const dx = tRect.x - sRect.x;
    const dy = tRect.y - sRect.y;
    
    let sx, sy, tx, ty;
    if (Math.abs(dx) > Math.abs(dy)) {
        sx = dx > 0 ? sRect.x + sRect.w/2 : sRect.x - sRect.w/2;
        sy = sRect.y;
    } else {
        sx = sRect.x;
        sy = dy > 0 ? sRect.y + sRect.h/2 : sRect.y - sRect.h/2;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
        tx = dx > 0 ? tRect.x - tRect.w/2 : tRect.x + tRect.w/2;
        ty = tRect.y;
    } else {
        tx = tRect.x;
        ty = dy > 0 ? tRect.y - tRect.h/2 : tRect.y + tRect.h/2;
    }
    return { x1: sx, y1: sy, x2: tx, y2: ty };
  };

  const toggleFullScreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
        containerRef.current.requestFullscreen().catch(err => console.error(err));
    } else {
        document.exitFullscreen();
    }
  };

  useEffect(() => {
      const handleFS = () => setIsFullscreen(!!document.fullscreenElement);
      document.addEventListener('fullscreenchange', handleFS);
      return () => document.removeEventListener('fullscreenchange', handleFS);
  }, []);

  const handleZoom = (delta: number) => {
      setViewState(prev => ({
          ...prev,
          scale: Math.max(0.2, Math.min(3, prev.scale + delta))
      }));
  };

  const handleWheel = useCallback((e: React.WheelEvent) => {
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      handleZoom(delta);
  }, []);

  const handleFitView = () => {
      if (data.steps.length === 0) {
          setViewState({ x: 0, y: 0, scale: 1 });
          return;
      }
      const padding = 50;
      const minX = Math.min(...data.steps.map(s => s.x));
      const maxX = Math.max(...data.steps.map(s => s.x));
      const minY = Math.min(...data.steps.map(s => s.y));
      const maxY = Math.max(...data.steps.map(s => s.y), LADDER_Y + 100); 
      const width = maxX - minX + 200; 
      const height = maxY - minY + 200;
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      const scaleX = clientWidth / (width + padding * 2);
      const scaleY = clientHeight / (height + padding * 2);
      const scale = Math.min(scaleX, scaleY, 1); 
      setViewState({
          x: (clientWidth - width * scale) / 2 - minX * scale + 50,
          y: (clientHeight - height * scale) / 2 - minY * scale + 50,
          scale
      });
  };

  const handleTidyDiagram = () => {
    const suppliers = data.steps.filter(s => s.role === 'supplier');
    const customers = data.steps.filter(s => s.role === 'customer');
    const control = data.steps.filter(s => s.role === 'production-control');
    const flowSteps = data.steps.filter(s => s.role === 'process' || s.role === 'inventory').sort((a, b) => a.x - b.x); 
    const others = data.steps.filter(s => !['supplier', 'customer', 'production-control', 'process', 'inventory'].includes(s.role));
    const START_X = 150;
    const SPACING_X = 220;
    const TOP_Y = 100;
    const FLOW_Y = 400;
    let updates: VSMStep[] = [];
    let maxX = 0;
    suppliers.forEach((s, i) => updates.push({ ...s, x: START_X + (i * 150), y: TOP_Y }));
    flowSteps.forEach((s, i) => { const x = START_X + (i * SPACING_X); updates.push({ ...s, x: x, y: FLOW_Y }); maxX = x; });
    const custX = Math.max(maxX + 200, 800);
    customers.forEach((s, i) => updates.push({ ...s, x: custX + (i * 150), y: TOP_Y }));
    if (control.length) {
        const centerX = (START_X + custX) / 2;
        control.forEach((s, i) => updates.push({ ...s, x: centerX + (i * 150) - ((control.length-1)*75), y: TOP_Y }));
    }
    others.forEach((s, i) => updates.push({ ...s, x: START_X + (i * 150), y: FLOW_Y + 180 }));
    onUpdate({ ...data, steps: updates });
    setTimeout(handleFitView, 100);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
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
    } else if (draggedStepId) {
        e.preventDefault();
        const local = toLocalCoordinates(e.clientX, e.clientY);
        const snappedX = Math.round((local.x - dragOffset.x) / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round((local.y - dragOffset.y) / GRID_SIZE) * GRID_SIZE;
        onUpdate({ ...data, steps: data.steps.map(s => s.id === draggedStepId ? { ...s, x: snappedX, y: snappedY } : s) });
    }
  }, [isPanning, draggedStepId, lastMousePos, dragOffset, viewState, data]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setDraggedStepId(null);
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.key === 'Delete' || e.key === 'Backspace')) {
             const activeTag = document.activeElement?.tagName.toLowerCase();
             if (activeTag !== 'input' && activeTag !== 'textarea') handleDeleteSelection();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStepId, selectedConnectorId, data]);

  const handleNodeMouseDown = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation(); 
    if (connectMode) {
        if (!connectionSource) setConnectionSource(stepId);
        else {
            if (connectionSource !== stepId) {
                onUpdate({ ...data, connectors: [...(data.connectors || []), { id: crypto.randomUUID(), source: connectionSource, target: stepId, type: connectMode }] });
            }
            setConnectionSource(null);
            setConnectMode(null);
        }
        return;
    }
    setSelectedStepId(stepId);
    setSelectedConnectorId(null);
    setDraggedStepId(stepId);
    const local = toLocalCoordinates(e.clientX, e.clientY);
    const step = data.steps.find(s => s.id === stepId);
    if (step) setDragOffset({ x: local.x - step.x, y: local.y - step.y });
  };

  const handleConnectorClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedConnectorId(id);
      setSelectedStepId(null);
  };

  const handleToolbarTypeClick = (type: VSMConnector['type']) => {
      if (selectedConnectorId) onUpdate({ ...data, connectors: data.connectors.map(c => c.id === selectedConnectorId ? { ...c, type } : c) });
      else setConnectMode(connectMode === type ? null : type);
  };

  const handleAddStep = (role: VSMRole) => {
      const centerX = (-viewState.x + (containerRef.current?.clientWidth || 800) / 2) / viewState.scale;
      const centerY = (-viewState.y + (containerRef.current?.clientHeight || 600) / 2) / viewState.scale;
      const newStep: VSMStep = {
          id: crypto.randomUUID(),
          name: role === 'process' ? 'Process' : role === 'kaizen' ? 'Kaizen' : role.charAt(0).toUpperCase() + role.slice(1).replace('-', ' '),
          role: role,
          x: Math.round(centerX / GRID_SIZE) * GRID_SIZE,
          y: Math.round(centerY / GRID_SIZE) * GRID_SIZE,
          data: { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 }
      };
      onUpdate({ ...data, steps: [...data.steps, newStep] });
      setSelectedStepId(newStep.id);
      setSelectedConnectorId(null);
  };

  const handleDeleteSelection = () => {
      if (selectedStepId) {
          onUpdate({ ...data, steps: data.steps.filter(s => s.id !== selectedStepId), connectors: (data.connectors || []).filter(c => c.source !== selectedStepId && c.target !== selectedStepId) });
          setSelectedStepId(null);
      } else if (selectedConnectorId) {
          onUpdate({ ...data, connectors: (data.connectors || []).filter(c => c.id !== selectedConnectorId) });
          setSelectedConnectorId(null);
      }
  };

  const handleUpdateData = (field: string, value: string | number) => {
      if (selectedStepId) {
          onUpdate({ ...data, steps: data.steps.map(s => {
              if (s.id === selectedStepId) {
                  if (field === 'name') return { ...s, name: String(value) };
                  return { ...s, data: { ...(s.data || { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 }), [field]: Number(value) } };
              }
              return s;
          }) });
      }
  };

  const handleGenerate = () => { if (prompt.trim()) { onGenerate(prompt); setShowAIModal(false); } };
  const handleRunAnalysis = async () => { setIsAnalyzing(true); setShowAnalysis(true); const result = await analyzeVSM(data); if (result) onUpdate({ ...data, analysis: result }); setIsAnalyzing(false); };
  const handleImportScope = () => { if (sipocData) setShowImportModal(true); };
  const executeImportScope = () => { if (sipocData) { onUpdate(convertSipocToVsm(sipocData)); setShowImportModal(false); setTimeout(handleFitView, 100); } };

  const renderShape = (step: VSMStep) => {
    const isSelected = selectedStepId === step.id;
    const isSource = connectionSource === step.id;
    const isBottleneck = data.analysis?.bottleneckId === step.id;
    const strokeColor = isSource ? '#ec4899' : isBottleneck ? '#ef4444' : isSelected ? '#4f46e5' : '#0f172a';
    const strokeWidth = isSelected || isSource || isBottleneck ? 3 : 2;
    switch (step.role) {
        case 'supplier':
        case 'customer':
            return (
                <g className="cursor-pointer">
                    <path d="M0,15 L15,0 L30,15 L45,0 L60,15 L75,0 L90,15 L90,45 L0,45 Z" fill="#f1f5f9" stroke={strokeColor} strokeWidth={strokeWidth} transform="translate(-45, -22.5)"/>
                    <text y="-35" textAnchor="middle" className="text-xs font-bold fill-slate-500 uppercase tracking-wider select-none">{step.name}</text>
                </g>
            );
        case 'production-control':
            return (
                <g className="cursor-pointer">
                    <path d="M-60,-20 L0,-40 L60,-20 L60,20 L-60,20 Z" fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <text y="5" textAnchor="middle" className="text-xs font-bold fill-slate-700 select-none">{step.name}</text>
                </g>
            );
        case 'inventory':
            return (
                <g className="cursor-pointer">
                   <polygon points="0,-15 15,15 -15,15" fill="#fef3c7" stroke={isSelected ? '#d97706' : '#b45309'} strokeWidth={strokeWidth} />
                   <text y="30" textAnchor="middle" className="text-[10px] font-bold fill-slate-600 select-none">{step.data?.inventoryCount || 0}</text>
                </g>
            );
        case 'transport':
            return (
                <g className="cursor-pointer">
                     <rect x="-25" y="-25" width="50" height="50" fill="transparent" />
                     <g transform="translate(-16, -16)"><Truck size={32} className="text-slate-700" strokeWidth={1.5} /></g>
                </g>
            );
        case 'kaizen':
            return (
                <g className="cursor-pointer">
                    <polygon points="0,-30 10,-10 30,-10 15,5 25,25 0,10 -25,25 -15,5 -30,-10 -10,-10" fill="#fde047" stroke={strokeColor} strokeWidth={strokeWidth} transform="scale(1.5)"/>
                    <text y="5" textAnchor="middle" className="text-[10px] font-bold fill-slate-900 select-none">KAIZEN</text>
                </g>
            );
        case 'process':
        default:
            const textLines = wrapText(step.name, 15);
            const textStartY = -5 - ((textLines.length - 1) * 14) / 2;
            return (
                <g className="cursor-pointer">
                    <rect x="-60" y="-30" width="120" height="60" fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
                    {textLines.map((line, i) => <text key={i} y={textStartY + (i * 14)} textAnchor="middle" className="text-sm font-bold fill-slate-900 select-none">{line}</text>)}
                    <g transform="translate(-60, 30)">
                        <rect width="120" height="65" fill="#f8fafc" stroke={strokeColor} strokeWidth={1} />
                        <text x="5" y="14" className="text-[10px] font-bold fill-slate-500 select-none">C/T</text>
                        <text x="115" y="14" textAnchor="end" className="text-[10px] font-mono fill-slate-800 select-none">{step.data?.cycleTime || 0} s</text>
                        <text x="5" y="34" className="text-[10px] font-bold fill-slate-500 select-none">C/O</text>
                        <text x="115" y="34" textAnchor="end" className="text-[10px] font-mono fill-slate-800 select-none">{step.data?.changeoverTime || 0} m</text>
                        <text x="5" y="54" className="text-[10px] font-bold fill-slate-500 select-none">Uptime</text>
                        <text x="115" y="54" textAnchor="end" className="text-[10px] font-mono fill-slate-800 select-none">{step.data?.uptime || 0} %</text>
                    </g>
                </g>
            );
    }
  };

  const renderConnector = (conn: VSMConnector) => {
      const source = data.steps.find(s => s.id === conn.source);
      const target = data.steps.find(s => s.id === conn.target);
      if (!source || !target) return null;
      const { x1, y1, x2, y2 } = getConnectorPoints(source, target);
      const midX = x1 + (x2 - x1) / 2;
      const midY = y1 + (y2 - y1) / 2;
      let pathD = '', markerEnd = '', stroke = '#64748b', strokeWidth = 1.5;
      switch(conn.type) {
          case 'electronic':
              const dx = x2 - x1, dy = y2 - y1, len = Math.sqrt(dx*dx + dy*dy);
              if (len < 1) pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
              else {
                  const ux = dx/len, uy = dy/len, px = -uy, py = ux;
                  const p1x = midX - 12 * ux, p1y = midY - 12 * uy, p2x = midX - 4 * ux - 8 * px, p2y = midY - 4 * uy - 8 * py, p3x = midX + 4 * ux + 8 * px, p3y = midY + 4 * uy + 8 * py, p4x = midX + 12 * ux, p4y = midY + 12 * uy;
                  pathD = `M ${x1} ${y1} L ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} L ${x2} ${y2}`;
              }
              markerEnd = 'url(#arrow-electronic)'; stroke = '#3b82f6'; strokeWidth = 3;
              break;
          case 'manual': pathD = `M ${x1} ${y1} L ${x2} ${y2}`; strokeWidth = 3; markerEnd = 'url(#arrow-manual)'; break;
          case 'push': pathD = `M ${x1} ${y1} L ${x2} ${y2}`; stroke = 'url(#push-stripes)'; strokeWidth = 6; markerEnd = 'url(#arrow-push)'; break;
          case 'pull': pathD = `M ${x1} ${y1} Q ${midX} ${y1 + 50} ${x2} ${y2}`; strokeWidth = 3; markerEnd = 'url(#arrow-pull)'; break;
      }
      const isSelected = conn.id === selectedConnectorId;
      return (
          <g key={conn.id} onClick={(e) => handleConnectorClick(e, conn.id)} className="hover:opacity-70 cursor-pointer group">
              {isSelected && <path d={pathD} fill="none" stroke="#a5b4fc" strokeWidth={strokeWidth + 4} strokeLinecap="round"/>}
              <path d={pathD} fill="none" stroke={isSelected ? '#4f46e5' : stroke} strokeWidth={strokeWidth} markerEnd={markerEnd} />
              <path d={pathD} fill="none" stroke="transparent" strokeWidth={15} />
          </g>
      );
  };

  const renderLeadTimeLadder = () => {
      const ladderSteps = data.steps.filter(s => s.role === 'inventory' || s.role === 'process').sort((a,b) => a.x - b.x);
      if (ladderSteps.length === 0) return null;
      return (
          <g>
            {ladderSteps.map((step, i) => {
                const isProcess = step.role === 'process', topY = LADDER_Y - 25, bottomY = LADDER_Y + 25, currentY = isProcess ? topY : bottomY, prevStep = ladderSteps[i-1], nextStep = ladderSteps[i+1], startX = prevStep ? (prevStep.x + step.x) / 2 : step.x - 60, endX = nextStep ? (step.x + nextStep.x) / 2 : step.x + 60;
                return (
                    <g key={`ladder-${step.id}`}>
                        <line x1={step.x} y1={currentY} x2={step.x} y2={step.y + (isProcess ? 95 : 20)} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4"/>
                        {i > 0 && <line x1={startX} y1={prevStep.role === 'process' ? topY : bottomY} x2={startX} y2={currentY} stroke="#334155" strokeWidth="1.5" />}
                        <line x1={startX} y1={currentY} x2={endX} y2={currentY} stroke="#334155" strokeWidth="1.5" />
                        <text x={step.x} y={isProcess ? topY - 10 : bottomY + 20} textAnchor="middle" className="text-xs fill-slate-700 font-bold select-none">{isProcess ? `${step.data?.cycleTime || 0}s` : `${(step.data?.leadTime || 0)}d`}</text>
                    </g>
                )
            })}
             <g transform={`translate(${ladderSteps[ladderSteps.length-1]?.x + 150 || 800}, ${LADDER_Y - 50})`}>
                 <rect width="140" height="100" fill="white" stroke="#334155" strokeWidth="1" rx="4"/>
                 <text x="70" y="20" textAnchor="middle" className="text-xs font-bold fill-emerald-600 uppercase select-none">Process Time</text>
                 <text x="70" y="40" textAnchor="middle" className="text-xl font-bold fill-emerald-600 select-none">{data.totalProcessTime} s</text>
                 <line x1="10" y1="50" x2="130" y2="50" stroke="#e2e8f0"/>
                 <text x="70" y="70" textAnchor="middle" className="text-xs font-bold fill-slate-500 uppercase select-none">Wait Time</text>
                 <text x="70" y="90" textAnchor="middle" className="text-xl font-bold fill-indigo-600 select-none">{data.totalLeadTime} d</text>
             </g>
          </g>
      )
  };

  const selectedStep = data.steps.find(s => s.id === selectedStepId);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
        <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50 z-10 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-4 flex-nowrap shrink-0">
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1 flex-nowrap">
                    <button title="Supplier" onClick={() => handleAddStep('supplier')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Factory size={16}/></button>
                    <button title="Production Control" onClick={() => handleAddStep('production-control')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Box size={16}/></button>
                    <button title="Process" onClick={() => handleAddStep('process')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Plus size={16}/></button>
                    <button title="Inventory" onClick={() => handleAddStep('inventory')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><MousePointer2 size={16} className="rotate-45"/></button>
                    <button title="Transport" onClick={() => handleAddStep('transport')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Truck size={16}/></button>
                    <button title="Kaizen Burst" onClick={() => handleAddStep('kaizen')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Sparkles size={16} className="text-yellow-600"/></button>
                </div>
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1 flex-nowrap">
                     <button title="Push Arrow" onClick={() => handleToolbarTypeClick('push')} className={`p-2 rounded ${connectMode === 'push' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'push') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><ArrowRight size={16} strokeWidth={3}/></button>
                     <button title="Pull Arrow" onClick={() => handleToolbarTypeClick('pull')} className={`p-2 rounded ${connectMode === 'pull' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'pull') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><CornerDownRight size={16}/></button>
                     <button title="Electronic Info" onClick={() => handleToolbarTypeClick('electronic')} className={`p-2 rounded ${connectMode === 'electronic' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'electronic') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><Zap size={16}/></button>
                     <button title="Manual Info" onClick={() => handleToolbarTypeClick('manual')} className={`p-2 rounded ${connectMode === 'manual' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'manual') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><MoveRight size={16}/></button>
                </div>
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1 flex-nowrap">
                     <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-slate-100 rounded" title="Zoom In"><ZoomIn size={16}/></button>
                     <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-slate-100 rounded" title="Zoom Out"><ZoomOut size={16}/></button>
                     <button onClick={handleFitView} className="p-2 hover:bg-slate-100 rounded" title="Reset View"><RotateCcw size={16}/></button>
                     <button onClick={handleTidyDiagram} className="p-2 hover:bg-slate-100 rounded" title="Auto Layout"><AlignLeft size={16}/></button>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-nowrap shrink-0 ml-4">
                 {sipocData && sipocData.process.length > 0 && (
                     <button onClick={handleImportScope} className="flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap"><Import size={14} /> Import</button>
                 )}
                 <button onClick={handleRunAnalysis} disabled={isAnalyzing} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap">{isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} Analyze</button>
                 <button onClick={() => setShowAIModal(true)} disabled={isGenerating} className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm text-xs font-medium whitespace-nowrap">{isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} AI</button>
            </div>
        </div>

        <div className="flex-1 overflow-hidden relative cursor-default" onMouseDown={handleCanvasMouseDown} onWheel={handleWheel}>
            <svg ref={svgRef} width="100%" height="100%" className="w-full h-full block">
                <defs>
                    <marker id="arrow-push" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto"><polygon points="0 0, 4 2, 0 4" fill="#0f172a" /></marker>
                    <marker id="arrow-electronic" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto"><polygon points="0 0, 4 2, 0 4" fill="#3b82f6" /></marker>
                    <marker id="arrow-manual" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto"><polygon points="0 0, 4 2, 0 4" fill="#64748b" /></marker>
                    <marker id="arrow-pull" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto"><polygon points="0 0, 4 2, 0 4" fill="#0f172a" /></marker>
                    <pattern id="vsm-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="1" fill="#cbd5e1" fillOpacity="0.5"/></pattern>
                    <pattern id="push-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="10" fill="#0f172a" /><rect width="5" height="10" transform="translate(5,0)" fill="white" /></pattern>
                </defs>
                <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
                    <rect x={-5000} y={-5000} width={10000} height={10000} fill="url(#vsm-grid)" onClick={() => { if (!hasPanningMoved.current) { setSelectedStepId(null); setSelectedConnectorId(null); } }}/>
                    {data.connectors?.map(conn => renderConnector(conn))}
                    {renderLeadTimeLadder()}
                    {data.steps.map(step => (
                        <g key={step.id} transform={`translate(${step.x}, ${step.y})`} onMouseDown={(e) => handleNodeMouseDown(e, step.id)}>{renderShape(step)}</g>
                    ))}
                </g>
            </svg>
            
            {(selectedStep || selectedConnectorId) && (
                <div onClick={(e) => e.stopPropagation()} className="absolute right-4 top-4 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 flex flex-col max-h-[80%] overflow-hidden animate-in slide-in-from-right duration-200">
                    <div className="p-3 border-b bg-slate-50 flex justify-between items-center"><span className="font-semibold text-xs text-slate-700">Properties</span><button onClick={() => { setSelectedStepId(null); setSelectedConnectorId(null); }} className="text-slate-400 hover:text-slate-600"><X size={14}/></button></div>
                    <div className="p-4 space-y-4 overflow-y-auto">
                        {selectedStep && (
                            <>
                                <div><label className="text-xs font-medium text-slate-500 block mb-1">Name</label><input className="w-full p-2 text-sm border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none" value={selectedStep.name} onChange={(e) => handleUpdateData('name', e.target.value)} /></div>
                                {selectedStep.role === 'process' && (
                                    <>
                                        <div><label className="text-xs text-slate-500 block mb-1">C/T (sec)</label><input type="number" className="w-full p-2 text-sm border rounded-md" value={selectedStep.data?.cycleTime || 0} onChange={(e) => handleUpdateData('cycleTime', e.target.value)} /></div>
                                        <div><label className="text-xs text-slate-500 block mb-1">Uptime (%)</label><input type="number" className="w-full p-2 text-sm border rounded-md" value={selectedStep.data?.uptime || 0} onChange={(e) => handleUpdateData('uptime', e.target.value)} /></div>
                                    </>
                                )}
                            </>
                        )}
                        <button onClick={handleDeleteSelection} className="w-full py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"><Trash2 size={14}/> Delete</button>
                    </div>
                </div>
            )}
        </div>
        
        {showAIModal && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95">
                <div className="bg-slate-50 p-6 border-b flex justify-between items-center text-indigo-700 font-black text-sm uppercase tracking-tight">
                    <div className="flex items-center gap-3">
                        <Sparkles size={20}/>
                        <h3>Generate VSM</h3>
                    </div>
                    <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-8">
                    <textarea 
                        value={prompt} 
                        onChange={e => setPrompt(e.target.value)} 
                        className="w-full h-40 p-4 text-sm bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl mb-2 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none resize-none transition-all placeholder:text-slate-400" 
                        placeholder="Describe the value stream flow: 'Manufacturer to distribution center with 3 processing steps and inventory buffers...'"
                        autoFocus
                    />
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">AI will synthesize suppliers, customers, and lean metrics.</p>
                </div>
                <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
                    <button onClick={() => setShowAIModal(false)} className="px-6 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()} className="px-8 py-2.5 text-sm font-black bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Generate</button>
                </div>
            </div>
        </div>}
    </div>
  );
};

export default VSMEditor;