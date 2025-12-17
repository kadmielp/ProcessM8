
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VSMData, VSMStep, VSMConnector, VSMRole } from '../types';
import { analyzeVSM } from '../services/geminiService';
import { 
    Wand2, Loader2, Factory, Trash2, Plus, 
    MousePointer2, Settings, Sparkles, X, 
    Truck, Box, Zap, MoveRight, CornerDownRight, ArrowRight,
    TrendingUp, AlertTriangle, Lightbulb, Maximize, Minimize,
    ZoomIn, ZoomOut, RotateCcw, AlignLeft
} from 'lucide-react';

interface VSMEditorProps {
  data: VSMData;
  onUpdate: (data: VSMData) => void;
  isGenerating: boolean;
  onGenerate: (desc: string) => void;
}

const VSMEditor: React.FC<VSMEditorProps> = ({ data, onUpdate, isGenerating, onGenerate }) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const getSnapRect = (step: VSMStep) => {
    const { x, y, role } = step;
    let w = 60, h = 60;
    
    switch (role) {
        case 'process': w = 120; h = 60; break;
        case 'supplier':
        case 'customer': w = 90; h = 45; break;
        case 'production-control': w = 120; h = 40; break;
        case 'inventory': w = 30; h = 30; break; // Tight box for closer arrows
        case 'kaizen': w = 50; h = 50; break;
        case 'transport': w = 40; h = 40; break; 
    }
    return { x, y, w, h };
  };

  const getConnectorPoints = (source: VSMStep, target: VSMStep) => {
    const sRect = getSnapRect(source);
    const tRect = getSnapRect(target);
    
    // Determine relative position
    const dx = tRect.x - sRect.x;
    const dy = tRect.y - sRect.y;
    
    // Check dominance for 4-point snap
    // If horizontal distance is significantly larger than combined half-widths, use side connection
    // otherwise use top/bottom
    
    let sx, sy, tx, ty;

    // Source Point Calculation
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal dominance
        sx = dx > 0 ? sRect.x + sRect.w/2 : sRect.x - sRect.w/2;
        sy = sRect.y;
    } else {
        // Vertical dominance
        sx = sRect.x;
        sy = dy > 0 ? sRect.y + sRect.h/2 : sRect.y - sRect.h/2;
    }

    // Target Point Calculation
    if (Math.abs(dx) > Math.abs(dy)) {
        // Horizontal dominance
        tx = dx > 0 ? tRect.x - tRect.w/2 : tRect.x + tRect.w/2;
        ty = tRect.y;
    } else {
        // Vertical dominance
        tx = tRect.x;
        ty = dy > 0 ? tRect.y - tRect.h/2 : tRect.y + tRect.h/2;
    }

    return { x1: sx, y1: sy, x2: tx, y2: ty };
  };

  // --- View Controls ---
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
      // Zoom on wheel
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
    // Separate by roles
    const suppliers = data.steps.filter(s => s.role === 'supplier');
    const customers = data.steps.filter(s => s.role === 'customer');
    const control = data.steps.filter(s => s.role === 'production-control');
    const flowSteps = data.steps.filter(s => s.role === 'process' || s.role === 'inventory')
        .sort((a, b) => a.x - b.x); 
    const others = data.steps.filter(s => !['supplier', 'customer', 'production-control', 'process', 'inventory'].includes(s.role));

    // Layout Constants
    const START_X = 150;
    const SPACING_X = 220;
    const TOP_Y = 100;
    const FLOW_Y = 400;

    let updates: VSMStep[] = [];
    let maxX = 0;

    // 1. Suppliers
    suppliers.forEach((s, i) => {
        updates.push({ ...s, x: START_X + (i * 150), y: TOP_Y });
    });

    // 2. Flow Steps
    flowSteps.forEach((s, i) => {
        const x = START_X + (i * SPACING_X);
        updates.push({ ...s, x: x, y: FLOW_Y });
        maxX = x;
    });

    // 3. Customers
    const custX = Math.max(maxX + 200, 800);
    customers.forEach((s, i) => {
        updates.push({ ...s, x: custX + (i * 150), y: TOP_Y });
    });

    // 4. Production Control
    if (control.length) {
        const centerX = (START_X + custX) / 2;
        control.forEach((s, i) => {
            updates.push({ ...s, x: centerX + (i * 150) - ((control.length-1)*75), y: TOP_Y });
        });
    }

    // 5. Others
    others.forEach((s, i) => {
        updates.push({ ...s, x: START_X + (i * 150), y: FLOW_Y + 180 });
    });

    onUpdate({ ...data, steps: updates });
    setTimeout(handleFitView, 100);
  };

  // --- Interaction Logic ---
  
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
        
        const rawX = local.x - dragOffset.x;
        const rawY = local.y - dragOffset.y;

        const snappedX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
        const snappedY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

        const updatedSteps = data.steps.map(s => 
            s.id === draggedStepId ? { ...s, x: snappedX, y: snappedY } : s
        );
        onUpdate({ ...data, steps: updatedSteps });
    }
  }, [isPanning, draggedStepId, lastMousePos, dragOffset, viewState, data, onUpdate]);

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

  // Keyboard Delete
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if ((e.key === 'Delete' || e.key === 'Backspace')) {
             const activeTag = document.activeElement?.tagName.toLowerCase();
             if (activeTag !== 'input' && activeTag !== 'textarea') {
                 handleDeleteSelection();
             }
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedStepId, selectedConnectorId, data]);

  // Node Interactions
  const handleNodeMouseDown = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation(); 
    
    // Connection Mode
    if (connectMode) {
        if (!connectionSource) {
            setConnectionSource(stepId);
        } else {
            if (connectionSource !== stepId) {
                const newConn: VSMConnector = {
                    id: crypto.randomUUID(),
                    source: connectionSource,
                    target: stepId,
                    type: connectMode
                };
                onUpdate({ ...data, connectors: [...(data.connectors || []), newConn] });
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
    if (step) {
        setDragOffset({
            x: local.x - step.x,
            y: local.y - step.y
        });
    }
  };

  const handleConnectorClick = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedConnectorId(id);
      setSelectedStepId(null);
  };

  // --- Actions ---

  const handleToolbarTypeClick = (type: VSMConnector['type']) => {
      if (selectedConnectorId) {
          // If a connector is selected, update its type
          onUpdate({
              ...data,
              connectors: data.connectors.map(c => c.id === selectedConnectorId ? { ...c, type } : c)
          });
      } else {
          // Toggle connect mode
          setConnectMode(connectMode === type ? null : type);
      }
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
          data: {
              cycleTime: 0,
              changeoverTime: 0,
              uptime: 100,
              inventoryCount: 0,
              leadTime: 0
          }
      };
      onUpdate({ ...data, steps: [...data.steps, newStep] });
      setSelectedStepId(newStep.id);
      setSelectedConnectorId(null);
  };

  const handleDeleteSelection = () => {
      if (selectedStepId) {
          onUpdate({ 
              ...data, 
              steps: data.steps.filter(s => s.id !== selectedStepId),
              connectors: (data.connectors || []).filter(c => c.source !== selectedStepId && c.target !== selectedStepId)
          });
          setSelectedStepId(null);
      } else if (selectedConnectorId) {
          onUpdate({
              ...data,
              connectors: (data.connectors || []).filter(c => c.id !== selectedConnectorId)
          });
          setSelectedConnectorId(null);
      }
  };

  const handleUpdateData = (field: string, value: string | number) => {
      if (selectedStepId) {
          const updatedSteps = data.steps.map(s => {
              if (s.id === selectedStepId) {
                  if (field === 'name') return { ...s, name: String(value) };
                  const currentData = s.data || { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 };
                  return { ...s, data: { ...currentData, [field]: Number(value) } };
              }
              return s;
          });
          onUpdate({ ...data, steps: updatedSteps });
      }
  };

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt);
    setShowAIModal(false);
  };

  const handleRunAnalysis = async () => {
      setIsAnalyzing(true);
      setShowAnalysis(true);
      const result = await analyzeVSM(data);
      if (result) {
          onUpdate({ ...data, analysis: result });
      }
      setIsAnalyzing(false);
  };

  // --- Rendering Helpers ---

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
                    <path 
                        d="M0,15 L15,0 L30,15 L45,0 L60,15 L75,0 L90,15 L90,45 L0,45 Z" 
                        fill="#f1f5f9" 
                        stroke={strokeColor} 
                        strokeWidth={strokeWidth} 
                        transform="translate(-45, -22.5)"
                    />
                    <path d="M10,45 L10,25 M20,45 L20,35 M80,45 L80,25" stroke={strokeColor} strokeWidth="1" opacity="0.2" transform="translate(-45, -22.5)"/>
                    <text y="-35" textAnchor="middle" className="text-xs font-bold fill-slate-500 uppercase tracking-wider select-none">{step.name}</text>
                </g>
            );
        case 'production-control':
            return (
                <g className="cursor-pointer">
                    <path d="M-60,-20 L0,-40 L60,-20 L60,20 L-60,20 Z" fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <text y="5" textAnchor="middle" className="text-xs font-bold fill-slate-700 select-none">{step.name}</text>
                    <text y="35" textAnchor="middle" className="text-[10px] fill-slate-400 font-mono select-none">MRP/ERP</text>
                </g>
            );
        case 'inventory':
            return (
                <g className="cursor-pointer">
                   {/* Centered triangle for tight snap points */}
                   <polygon points="0,-15 15,15 -15,15" fill="#fef3c7" stroke={isSelected ? '#d97706' : '#b45309'} strokeWidth={strokeWidth} />
                   <text y="5" textAnchor="middle" className="text-[10px] font-bold fill-amber-900 select-none">I</text>
                   <text y="30" textAnchor="middle" className="text-[10px] font-bold fill-slate-600 select-none">{step.data?.inventoryCount || 0}</text>
                   <text y="42" textAnchor="middle" className="text-[10px] fill-slate-400 select-none">({step.data?.leadTime || 0}d)</text>
                </g>
            );
        case 'transport':
            return (
                <g className="cursor-pointer">
                     <rect x="-25" y="-25" width="50" height="50" fill="transparent" /> {/* Hit Area */}
                     <g transform="translate(-16, -16)">
                        <Truck size={32} className="text-slate-700" strokeWidth={1.5} />
                     </g>
                     <text y="25" textAnchor="middle" className="text-[10px] font-medium fill-slate-600 select-none">{step.name}</text>
                </g>
            );
        case 'kaizen':
            return (
                <g className="cursor-pointer">
                    <polygon 
                        points="0,-30 10,-10 30,-10 15,5 25,25 0,10 -25,25 -15,5 -30,-10 -10,-10" 
                        fill="#fde047" 
                        stroke={strokeColor} 
                        strokeWidth={strokeWidth}
                        transform="scale(1.5)"
                    />
                    <text y="5" textAnchor="middle" className="text-[10px] font-bold fill-slate-900 select-none">KAIZEN</text>
                    <text y="20" textAnchor="middle" className="text-[8px] font-medium fill-slate-700 select-none">{step.name}</text>
                </g>
            );
        case 'process':
        default:
            return (
                <g className="cursor-pointer">
                    <rect x="-60" y="-30" width="120" height="60" fill="white" stroke={strokeColor} strokeWidth={strokeWidth} />
                    <text y="-5" textAnchor="middle" className="text-sm font-bold fill-slate-900 select-none">{step.name}</text>
                    {isBottleneck && (
                         <text y="-40" textAnchor="middle" className="text-xs font-bold fill-red-500 animate-pulse select-none">BOTTLENECK</text>
                    )}
                    
                    <g transform="translate(-60, 30)">
                        <rect width="120" height="65" fill="#f8fafc" stroke={strokeColor} strokeWidth={1} />
                        <line x1="0" y1="20" x2="120" y2="20" stroke={strokeColor} strokeWidth={0.5} />
                        <line x1="0" y1="40" x2="120" y2="40" stroke={strokeColor} strokeWidth={0.5} />
                        
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

      let pathD = '';
      let markerEnd = '';
      let strokeDasharray = '';
      let stroke = '#64748b';
      let strokeWidth = 1.5; 

      // Logic for pathing based on type
      switch(conn.type) {
          case 'electronic': {
              // Electronic signal: Straight line with a lightning bolt zigzag in the middle.
              
              // Calculate vector properties for rotation
              const dx = x2 - x1;
              const dy = y2 - y1;
              const len = Math.sqrt(dx*dx + dy*dy);
              
              if (len < 1) {
                  pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
              } else {
                  // Unit vectors
                  const ux = dx / len; // Along the line
                  const uy = dy / len;
                  
                  const px = -uy;      // Perpendicular to line
                  const py = ux;
                  
                  // Zigzag parameters (offsets from MidPoint)
                  // P1: -12 along line
                  const p1x = midX - 12 * ux;
                  const p1y = midY - 12 * uy;
                  
                  // P2: -4 along line, -8 perpendicular
                  const p2x = midX - 4 * ux - 8 * px;
                  const p2y = midY - 4 * uy - 8 * py;
                  
                  // P3: +4 along line, +8 perpendicular
                  const p3x = midX + 4 * ux + 8 * px;
                  const p3y = midY + 4 * uy + 8 * py;
                  
                  // P4: +12 along line
                  const p4x = midX + 12 * ux;
                  const p4y = midY + 12 * uy;
                  
                  pathD = `M ${x1} ${y1} L ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} L ${p4x} ${p4y} L ${x2} ${y2}`;
              }

              markerEnd = 'url(#arrow-electronic)';
              stroke = '#3b82f6';
              strokeWidth = 3;
              break;
          }
          case 'manual':
              pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
              stroke = '#64748b';
              strokeWidth = 3;
              markerEnd = 'url(#arrow-manual)';
              break;
          case 'push':
              // Push arrow with stripes
              pathD = `M ${x1} ${y1} L ${x2} ${y2}`;
              stroke = 'url(#push-stripes)';
              strokeWidth = 6; 
              markerEnd = 'url(#arrow-push)';
              break;
          case 'pull':
              // Curved pull
              pathD = `M ${x1} ${y1} Q ${midX} ${y1 + 50} ${x2} ${y2}`;
              stroke = '#0f172a';
              strokeWidth = 3;
              markerEnd = 'url(#arrow-pull)';
              break;
      }

      const isSelected = conn.id === selectedConnectorId;
      const displayStroke = isSelected ? '#4f46e5' : stroke;
      const displayWidth = isSelected && conn.type !== 'push' ? 3 : strokeWidth;

      return (
          <g key={conn.id} onClick={(e) => handleConnectorClick(e, conn.id)} className="hover:opacity-70 cursor-pointer group">
              {/* Selection Halo */}
              {isSelected && <path d={pathD} fill="none" stroke="#a5b4fc" strokeWidth={displayWidth + 4} strokeLinecap="round"/>}
              
              <path d={pathD} fill="none" stroke={displayStroke} strokeWidth={displayWidth} strokeDasharray={strokeDasharray} markerEnd={markerEnd} />
              
              {/* Hit Area */}
              <path d={pathD} fill="none" stroke="transparent" strokeWidth={15} />
          </g>
      );
  };

  const renderLeadTimeLadder = () => {
      const ladderSteps = data.steps
        .filter(s => s.role === 'inventory' || s.role === 'process')
        .sort((a,b) => a.x - b.x);
      
      if (ladderSteps.length === 0) return null;

      return (
          <g>
            {ladderSteps.map((step, i) => {
                const isProcess = step.role === 'process';
                const stepHeight = 25;
                const topY = LADDER_Y - stepHeight;
                const bottomY = LADDER_Y + stepHeight;
                const currentY = isProcess ? topY : bottomY;

                const prevStep = ladderSteps[i-1];
                const nextStep = ladderSteps[i+1];

                const startX = prevStep ? (prevStep.x + step.x) / 2 : step.x - 60;
                const endX = nextStep ? (step.x + nextStep.x) / 2 : step.x + 60;

                const prevIsProcess = prevStep?.role === 'process';
                const prevY = prevIsProcess ? topY : bottomY;

                const textY = isProcess ? topY - 10 : bottomY + 20;
                const val = isProcess ? `${step.data?.cycleTime || 0}s` : `${(step.data?.leadTime || 0)}d`;

                return (
                    <g key={`ladder-${step.id}`}>
                        <line 
                            x1={step.x} y1={currentY} 
                            x2={step.x} y2={step.y + (isProcess ? 95 : 20)} 
                            stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4,4"
                        />
                        
                        {i > 0 && (
                             <line x1={startX} y1={prevY} x2={startX} y2={currentY} stroke="#334155" strokeWidth="1.5" />
                        )}
                        
                        <line x1={startX} y1={currentY} x2={endX} y2={currentY} stroke="#334155" strokeWidth="1.5" />
                        
                        <text x={step.x} y={textY} textAnchor="middle" className="text-xs fill-slate-700 font-bold select-none">
                            {val}
                        </text>
                    </g>
                )
            })}
             <text x={ladderSteps[0].x - 40} y={LADDER_Y - 30} className="text-xs font-bold fill-slate-400 select-none">VA</text>
             <text x={ladderSteps[0].x - 40} y={LADDER_Y + 30} className="text-xs font-bold fill-slate-400 select-none">NVA</text>
             
             <g transform={`translate(${ladderSteps[ladderSteps.length-1]?.x + 150 || 800}, ${LADDER_Y - 50})`}>
                 <rect width="140" height="100" fill="white" stroke="#334155" strokeWidth="1" rx="4"/>
                 {/* Swapped order: Process Time first (top), Wait Time second (bottom) */}
                 <text x="70" y="20" textAnchor="middle" className="text-xs font-bold fill-emerald-600 uppercase tracking-wider select-none">Process Time</text>
                 <text x="70" y="40" textAnchor="middle" className="text-xl font-bold fill-emerald-600 select-none">{data.totalProcessTime} s</text>
                 <line x1="10" y1="50" x2="130" y2="50" stroke="#e2e8f0"/>
                 <text x="70" y="70" textAnchor="middle" className="text-xs font-bold fill-slate-500 uppercase tracking-wider select-none">Wait Time</text>
                 <text x="70" y="90" textAnchor="middle" className="text-xl font-bold fill-indigo-600 select-none">{data.totalLeadTime} d</text>
             </g>
          </g>
      )
  };

  const selectedStep = data.steps.find(s => s.id === selectedStepId);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative transition-all">
        {/* Top Toolbar */}
        <div className="h-16 border-b border-slate-200 px-4 flex items-center justify-between bg-slate-50 z-10">
            <div className="flex items-center gap-4">
                 {/* Palette */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1">
                    <button title="Supplier/Customer" onClick={() => handleAddStep('supplier')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Factory size={16}/></button>
                    <button title="Production Control" onClick={() => handleAddStep('production-control')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Box size={16}/></button>
                    <button title="Process" onClick={() => handleAddStep('process')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Plus size={16}/></button>
                    <button title="Inventory" onClick={() => handleAddStep('inventory')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><MousePointer2 size={16} className="rotate-45"/></button>
                    <button title="Transport" onClick={() => handleAddStep('transport')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Truck size={16}/></button>
                    <button title="Kaizen Burst" onClick={() => handleAddStep('kaizen')} className="p-2 hover:bg-slate-100 text-slate-700 rounded"><Sparkles size={16} className="text-yellow-600"/></button>
                </div>
                
                {/* Connections */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1">
                     <button title="Push Arrow" onClick={() => handleToolbarTypeClick('push')} className={`p-2 rounded ${connectMode === 'push' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'push') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><ArrowRight size={16} strokeWidth={3}/></button>
                     <button title="Pull Arrow" onClick={() => handleToolbarTypeClick('pull')} className={`p-2 rounded ${connectMode === 'pull' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'pull') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><CornerDownRight size={16}/></button>
                     <button title="Electronic Info" onClick={() => handleToolbarTypeClick('electronic')} className={`p-2 rounded ${connectMode === 'electronic' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'electronic') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><Zap size={16}/></button>
                     <button title="Manual Info" onClick={() => handleToolbarTypeClick('manual')} className={`p-2 rounded ${connectMode === 'manual' || (selectedConnectorId && data.connectors.find(c=>c.id===selectedConnectorId)?.type === 'manual') ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-100 text-slate-700'}`}><MoveRight size={16}/></button>
                </div>

                <div className="h-8 w-px bg-slate-300"></div>

                {/* Zoom & View Controls */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-1 shadow-sm gap-1">
                     <button onClick={() => handleZoom(0.1)} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Zoom In"><ZoomIn size={16}/></button>
                     <button onClick={() => handleZoom(-0.1)} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Zoom Out"><ZoomOut size={16}/></button>
                     <button onClick={handleFitView} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Reset View"><RotateCcw size={16}/></button>
                     <button onClick={handleTidyDiagram} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Auto Layout (Tidy)"><AlignLeft size={16}/></button>
                     <button onClick={toggleFullScreen} className="p-2 hover:bg-slate-100 text-slate-700 rounded" title="Toggle Fullscreen">
                         {isFullscreen ? <Minimize size={16}/> : <Maximize size={16}/>}
                     </button>
                </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
                 {connectMode && (
                     <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded animate-pulse">
                         Link Source...
                     </span>
                 )}
                 {data.analysis && (
                     <button 
                         onClick={() => setShowAnalysis(true)}
                         className="flex items-center gap-2 px-3 py-1.5 bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 rounded-lg shadow-sm text-xs font-medium transition-all"
                     >
                         <Lightbulb size={14} />
                         Insights
                     </button>
                 )}
                 <button 
                     onClick={handleRunAnalysis}
                     disabled={isAnalyzing}
                     className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg shadow-sm text-xs font-medium transition-all"
                 >
                     {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
                     {data.analysis ? 'Re-Analyze' : 'Analyze Flow'}
                 </button>
                 <button 
                     onClick={() => setShowAIModal(true)}
                     disabled={isGenerating}
                     className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg shadow-sm text-xs font-medium transition-all"
                 >
                     {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                     Generate
                 </button>
            </div>
        </div>

        <div className="flex flex-1 overflow-hidden relative">
            {/* Properties Panel (Overlay) */}
            {(selectedStep || selectedConnectorId) && (
                <div 
                    onClick={(e) => e.stopPropagation()} 
                    className="absolute right-4 top-4 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-30 animate-in slide-in-from-right-10 duration-200 flex flex-col max-h-[80%]"
                >
                    <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <span className="font-semibold text-xs text-slate-700 flex items-center gap-2">
                            <Settings size={14}/> {selectedStep ? 'Node Properties' : 'Arrow Properties'}
                        </span>
                        <button onClick={() => { setSelectedStepId(null); setSelectedConnectorId(null); }} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                    <div className="p-4 space-y-4 overflow-y-auto">
                        {selectedStep && (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-slate-500 block mb-1">Name</label>
                                    <input 
                                        className="w-full p-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400" 
                                        value={selectedStep.name} 
                                        onChange={(e) => handleUpdateData('name', e.target.value)} 
                                    />
                                </div>
                                
                                <div className="pt-2 border-t border-slate-100">
                                    <h4 className="text-xs font-bold text-slate-800 mb-3 uppercase tracking-wider">Metrics</h4>
                                    {selectedStep.role === 'process' && (
                                        <>
                                            <div className="mb-3">
                                                <label className="text-xs text-slate-500 block mb-1">Cycle Time (sec)</label>
                                                <input type="number" step="any" className="w-full p-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400" value={selectedStep.data?.cycleTime || 0} onChange={(e) => handleUpdateData('cycleTime', e.target.value)} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="text-xs text-slate-500 block mb-1">Changeover (min)</label>
                                                <input type="number" step="any" className="w-full p-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400" value={selectedStep.data?.changeoverTime || 0} onChange={(e) => handleUpdateData('changeoverTime', e.target.value)} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="text-xs text-slate-500 block mb-1">Uptime (%)</label>
                                                <input type="number" step="any" className="w-full p-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400" value={selectedStep.data?.uptime || 0} onChange={(e) => handleUpdateData('uptime', e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                    {selectedStep.role === 'inventory' && (
                                        <>
                                            <div className="mb-3">
                                                <label className="text-xs text-slate-500 block mb-1">Inventory Qty</label>
                                                <input type="number" step="any" className="w-full p-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400" value={selectedStep.data?.inventoryCount || 0} onChange={(e) => handleUpdateData('inventoryCount', e.target.value)} />
                                            </div>
                                            <div className="mb-3">
                                                <label className="text-xs text-slate-500 block mb-1">Lead Time (days)</label>
                                                <input type="number" step="any" className="w-full p-2 text-sm bg-white text-slate-900 border border-slate-200 rounded-md focus:ring-2 focus:ring-indigo-500 outline-none placeholder-slate-400" value={selectedStep.data?.leadTime || 0} onChange={(e) => handleUpdateData('leadTime', e.target.value)} />
                                            </div>
                                        </>
                                    )}
                                    {(selectedStep.role !== 'process' && selectedStep.role !== 'inventory') && (
                                        <div className="text-xs text-slate-400 italic">No specific metrics.</div>
                                    )}
                                </div>
                            </>
                        )}
                        {selectedConnectorId && (
                            <div className="text-sm text-slate-500">
                                Use the toolbar to change the arrow type or press Delete to remove it.
                            </div>
                        )}

                        <button 
                            onClick={handleDeleteSelection}
                            className="w-full mt-4 py-2 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 flex items-center justify-center gap-2"
                        >
                            <Trash2 size={14}/> {selectedStep ? 'Delete Node' : 'Delete Arrow'}
                        </button>
                    </div>
                </div>
            )}

            {/* Canvas Area */}
            <div 
                className="flex-1 bg-slate-50/50 overflow-hidden relative cursor-default"
                onMouseDown={handleCanvasMouseDown}
                onWheel={handleWheel}
            >
                {/* SVG Container */}
                <svg 
                    ref={svgRef}
                    width="100%" 
                    height="100%"
                    className="w-full h-full block"
                >
                    <defs>
                        {/* Smaller, sharper markers */}
                        <marker id="arrow-push" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
                            <polygon points="0 0, 4 2, 0 4" fill="#0f172a" />
                        </marker>
                        <marker id="arrow-electronic" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
                            <polygon points="0 0, 4 2, 0 4" fill="#3b82f6" />
                        </marker>
                        <marker id="arrow-manual" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
                            <polygon points="0 0, 4 2, 0 4" fill="#64748b" />
                        </marker>
                        <marker id="arrow-pull" markerWidth="4" markerHeight="4" refX="4" refY="2" orient="auto">
                            <polygon points="0 0, 4 2, 0 4" fill="#0f172a" />
                        </marker>
                        
                        <pattern id="vsm-grid" width={GRID_SIZE} height={GRID_SIZE} patternUnits="userSpaceOnUse">
                            <circle cx="1" cy="1" r="1" fill="#cbd5e1" fillOpacity="0.5"/>
                        </pattern>

                        {/* Striped Pattern for Push Arrows */}
                        <pattern id="push-stripes" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                            <rect width="5" height="10" transform="translate(0,0)" fill="#0f172a" />
                            <rect width="5" height="10" transform="translate(5,0)" fill="white" />
                        </pattern>
                    </defs>

                    <g transform={`translate(${viewState.x}, ${viewState.y}) scale(${viewState.scale})`}>
                        {/* Infinite Grid Simulation */}
                        <rect 
                            x={-5000} y={-5000} width={10000} height={10000} 
                            fill="url(#vsm-grid)" 
                            onClick={() => {
                                if (!hasPanningMoved.current) {
                                    setSelectedStepId(null);
                                    setSelectedConnectorId(null);
                                }
                            }}
                        />

                        {/* Content */}
                        {data.connectors?.map(conn => renderConnector(conn))}
                        {renderLeadTimeLadder()}
                        {data.steps.map(step => (
                            <g 
                                key={step.id} 
                                transform={`translate(${step.x}, ${step.y})`}
                                onMouseDown={(e) => handleNodeMouseDown(e, step.id)}
                            >
                                {renderShape(step)}
                            </g>
                        ))}
                    </g>
                </svg>
                
                {/* Instruction Overlay if empty */}
                {data.steps.length === 0 && (
                     <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                         <div className="text-slate-400 text-sm">
                             Drag to Pan • Wheel to Zoom • Click Toolbar to Add Nodes
                         </div>
                     </div>
                )}
            </div>

            {/* Lean Analysis Panel */}
            {showAnalysis && (
                <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-4 top-4 bottom-4 w-80 bg-white border border-slate-200 flex flex-col shadow-xl z-30 animate-in slide-in-from-left-10 duration-200 rounded-xl"
                >
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <span className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-600"/> Lean Analysis
                        </span>
                        <button onClick={() => setShowAnalysis(false)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Summary Card */}
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                             <h4 className="text-xs font-bold text-emerald-800 uppercase mb-2">Flow Efficiency</h4>
                             <div className="text-3xl font-bold text-emerald-700">{data.analysis?.efficiency || 0}%</div>
                             <p className="text-xs text-emerald-600 mt-1">Value Added / Total Lead Time</p>
                        </div>

                        {/* Bottleneck Alert */}
                        {data.analysis?.bottleneckId && (
                             <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                                 <div className="flex items-center gap-2 text-red-700 font-bold text-sm mb-2">
                                     <AlertTriangle size={16}/> Bottleneck Detected
                                 </div>
                                 <p className="text-xs text-red-600">
                                     Process step <strong>{data.steps.find(s => s.id === data.analysis?.bottleneckId)?.name}</strong> exceeds Takt Time ({taktTime}s).
                                 </p>
                             </div>
                        )}

                        {/* Recommendations */}
                        <div>
                             <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                                 <Lightbulb size={12}/> Kaizen Opportunities
                             </h4>
                             <div className="space-y-3">
                                 {data.analysis?.recommendations.map((rec, i) => (
                                     <div key={i} className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm">
                                         <div className="text-xs font-bold text-slate-800 mb-1">{rec.title}</div>
                                         <div className="text-xs text-slate-500 leading-relaxed">{rec.description}</div>
                                         <div className="mt-2 text-[10px] font-bold uppercase text-indigo-500 tracking-wider">{rec.type}</div>
                                     </div>
                                 ))}
                                 {!data.analysis && !isAnalyzing && (
                                     <div className="text-xs text-slate-400 italic text-center py-4">
                                         Click "Analyze Flow" to generate AI insights.
                                     </div>
                                 )}
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* AI Generator Modal */}
        {showAIModal && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-white/20 ring-1 ring-black/5 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                            <Sparkles size={16} />
                            <h3>Generate Value Stream Map</h3>
                        </div>
                        <button onClick={() => setShowAIModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-sm text-slate-500 mb-3">
                            Describe your end-to-end flow. The AI will create a complete map with suppliers, processes, inventory, and information flow.
                        </p>
                        <textarea 
                            value={prompt}
                            onChange={e => setPrompt(e.target.value)}
                            className="w-full h-32 p-3 text-slate-700 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-sm leading-relaxed shadow-sm"
                            placeholder="e.g. Steel sheets arrive monthly. Stamping (5s CT), Welding (30s CT), Painting (2min CT). Ship daily to Customer. Production Control schedules weekly."
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

        {/* Global Loader Overlay */}
        {(isGenerating || isAnalyzing) && !showAIModal && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                    <p className="text-indigo-900 font-medium">
                        {isAnalyzing ? 'Analyzing Value Stream...' : 'Mapping Value Stream...'}
                    </p>
                </div>
            </div>
        )}
    </div>
  );
};

export default VSMEditor;
