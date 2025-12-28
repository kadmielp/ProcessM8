
import React, { useState } from 'react';
import { ProcessMap, OptimizationInsight, SimulationResult } from '../types';
import { analyzeProcessBottlenecks, simulateProcessChange } from '../services/geminiService';
import { 
  PlayCircle, CheckCircle2, RefreshCw, BarChart2, 
  Calculator, Info, X, ChevronLeft, ArrowRight,
  Zap, BrainCircuit, TrendingDown, DollarSign, Sparkles,
  TrendingUp, Scale
} from 'lucide-react';

interface SimulationPanelProps {
  processMap: ProcessMap;
  insights: OptimizationInsight[];
  onUpdateInsights: (insights: OptimizationInsight[]) => void;
  onApplySimulation?: (result: SimulationResult) => void;
  onClose?: () => void;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ processMap, insights, onUpdateInsights, onApplySimulation, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const totalPT = processMap.nodes.reduce((acc, n) => acc + (n.metrics?.cycleTime || 0), 0);
  const totalCost = processMap.nodes.reduce((acc, n) => acc + (n.metrics?.cost || 0) + (n.metrics?.resourceCost || 0), 0);

  const runAnalysis = async () => {
    setIsLoading(true);
    const results = await analyzeProcessBottlenecks(processMap);
    onUpdateInsights(results);
    setIsLoading(false);
  };

  const runSimulation = async (insight: OptimizationInsight) => {
    setIsSimulating(true);
    const result = await simulateProcessChange(processMap, insight);
    setSimulationResult(result);
    setIsSimulating(false);
  };

  const calculateVariance = (before: number, after: number) => {
    if (before === 0) return 0;
    return ((after - before) / before) * 100;
  };

  return (
    <div className="flex flex-col h-full bg-white w-full max-h-screen overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-200">
                <BrainCircuit size={18} />
            </div>
            <div>
                <h2 className="text-sm font-black text-slate-800 tracking-tight uppercase">Deep Simulation</h2>
                <p className="text-[10px] text-slate-400 font-bold">AI DIGITAL TWIN ENGINE</p>
            </div>
        </div>
        {onClose && (
            <button 
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 transition-colors"
            >
                <X size={20} />
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto bg-slate-50/30">
        <div className="p-4 sm:p-6">
            {!simulationResult && (
                <div className="mb-6 grid grid-cols-2 gap-3">
                    <div className="p-4 bg-white border rounded-2xl shadow-sm border-slate-200">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <Zap size={10} className="text-indigo-500"/> Baseline PT
                        </div>
                        <div className="text-xl font-black text-slate-800">{totalPT}m</div>
                    </div>
                    <div className="p-4 bg-white border rounded-2xl shadow-sm border-slate-200">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                            <DollarSign size={10} className="text-emerald-500"/> Baseline Cost
                        </div>
                        <div className="text-xl font-black text-slate-800">${totalCost}</div>
                    </div>
                </div>
            )}

            {!insights.length && !isLoading && !simulationResult && (
            <div className="text-center py-12 px-4 bg-white border border-dashed border-slate-200 rounded-3xl">
                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Scale className="text-indigo-600 w-8 h-8" />
                </div>
                <h3 className="text-slate-800 font-bold mb-2">Simulate Future States</h3>
                <p className="text-xs text-slate-500 mb-8 max-w-[220px] mx-auto leading-relaxed">
                    Identify bottlenecks and run 'What-If' projections to forecast ROI and efficiency gains.
                </p>
                <button 
                    onClick={runAnalysis} 
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                    <PlayCircle size={18} />
                    Discover Optimizations
                </button>
            </div>
            )}

            {isLoading && (
                <div className="space-y-4 animate-pulse">
                    <div className="h-10 w-32 bg-slate-200 rounded-lg mb-4"></div>
                    {[1, 2, 3].map(i => <div key={i} className="h-40 bg-white border border-slate-200 rounded-3xl"></div>)}
                </div>
            )}

            {!simulationResult && insights.map((insight, idx) => (
            <div key={idx} className="mb-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all group relative overflow-hidden">
                <div className="flex justify-between items-start mb-4">
                    <div className={`text-[10px] font-black uppercase inline-block px-2.5 py-1 rounded-lg ${
                        insight.impact === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                    }`}>
                        {insight.impact} Impact
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{insight.category}</div>
                </div>
                <h4 className="font-black text-slate-800 text-sm leading-tight mb-2">{insight.title}</h4>
                <p className="text-xs text-slate-500 mb-6 leading-relaxed font-medium">{insight.description}</p>
                <button 
                    onClick={() => runSimulation(insight)} 
                    disabled={isSimulating} 
                    className="w-full py-3 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all disabled:opacity-50"
                >
                {isSimulating ? <RefreshCw size={14} className="animate-spin" /> : <PlayCircle size={14} />} 
                Launch Scenario
                </button>
            </div>
            ))}

            {simulationResult && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <button 
                        onClick={() => setSimulationResult(null)} 
                        className="mb-6 py-2 px-3 bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-50 flex items-center gap-2 transition-colors shadow-sm"
                    >
                        <ChevronLeft size={14} /> Back to Insights
                    </button>

                    <div className="bg-white border border-slate-200 p-8 rounded-[40px] mb-6 shadow-xl shadow-slate-200/50">
                        <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest mb-4">
                            <Sparkles size={16} /> Projected Outcome
                        </div>
                        <p className="text-base text-slate-800 leading-relaxed font-bold mb-8">
                            "{simulationResult.summary}"
                        </p>

                        <div className="space-y-6">
                            {simulationResult.improvements.map((imp, i) => {
                                const variance = calculateVariance(imp.before, imp.after);
                                const isPositive = imp.metric.toLowerCase().includes('cost') || imp.metric.toLowerCase().includes('time') 
                                    ? variance < 0 // Reducing cost/time is positive
                                    : variance > 0; // Increasing throughput/efficiency is positive

                                return (
                                    <div key={i} className="flex flex-col gap-3 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{imp.metric}</span>
                                            <div className={`text-[10px] font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${
                                                isPositive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'
                                            }`}>
                                                {isPositive ? <TrendingDown size={10}/> : <TrendingUp size={10}/>}
                                                {Math.abs(Math.round(variance))}% Change
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-slate-300 uppercase">Before</span>
                                                <div className="text-lg font-black text-slate-400">{imp.before}</div>
                                            </div>
                                            <ArrowRight size={18} className="text-slate-300" />
                                            <div className="flex flex-col">
                                                <span className="text-[8px] font-black text-indigo-400 uppercase">Projected</span>
                                                <div className="text-3xl font-black text-slate-900">{imp.after} <span className="text-xs font-medium text-slate-400">{imp.unit}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="p-6 bg-indigo-50/50 border border-indigo-100 rounded-[32px] mb-8">
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-indigo-100">
                                <BrainCircuit size={18} className="text-indigo-600" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-1">AI Reasoning Engine</p>
                                <p className="text-[11px] text-indigo-700 font-medium leading-relaxed">
                                    Our model suggests this optimization leverages task parallelization. By applying this, we will propagate the new cycle times directly to your BPMN model nodes.
                                </p>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => onApplySimulation?.(simulationResult)} 
                        className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-100 hover:shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 mb-4"
                    >
                        <CheckCircle2 size={20} /> Apply Optimization to Design
                    </button>
                    
                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        This will update global metrics and node metadata.
                    </p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SimulationPanel;
