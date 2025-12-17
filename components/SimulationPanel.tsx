import React, { useState } from 'react';
import { ProcessMap, OptimizationInsight, SimulationResult } from '../types';
import { analyzeProcessBottlenecks, simulateProcessChange } from '../services/geminiService';
import { PlayCircle, AlertOctagon, ArrowRight, Lightbulb, CheckCircle2, RefreshCw, BarChart2 } from 'lucide-react';

interface SimulationPanelProps {
  processMap: ProcessMap;
  insights: OptimizationInsight[];
  onUpdateInsights: (insights: OptimizationInsight[]) => void;
}

const SimulationPanel: React.FC<SimulationPanelProps> = ({ processMap, insights, onUpdateInsights }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResult | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    setSimulationResult(null);
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

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 w-96 shadow-xl">
      <div className="p-6 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
          <Lightbulb className="text-amber-500" />
          Intelligent Analysis
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Detect bottlenecks and simulate process improvements.
        </p>
      </div>

      <div className="p-6 flex-1 overflow-y-auto">
        {!insights.length && !isLoading && (
          <div className="text-center py-12">
            <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <PlayCircle className="text-indigo-600 w-8 h-8" />
            </div>
            <h3 className="text-slate-800 font-medium mb-2">Ready to Optimize?</h3>
            <p className="text-slate-500 text-sm mb-6">
              Run the AI engine to analyze your current process map for inefficiencies.
            </p>
            <button 
              onClick={runAnalysis}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-sm shadow-indigo-200"
            >
              Analyze Process
            </button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-slate-100 rounded-xl"></div>
            <div className="h-24 bg-slate-100 rounded-xl"></div>
            <div className="h-24 bg-slate-100 rounded-xl"></div>
          </div>
        )}

        {/* Insights List */}
        {!simulationResult && insights.map((insight, idx) => (
          <div key={idx} className="mb-4 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-2">
              <span className={`px-2 py-1 text-xs font-bold rounded uppercase tracking-wide ${
                insight.impact === 'High' ? 'bg-red-100 text-red-700' :
                insight.impact === 'Medium' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {insight.impact} Impact
              </span>
              <span className="text-xs text-slate-400 font-medium">{insight.category}</span>
            </div>
            <h4 className="font-semibold text-slate-800 mb-1">{insight.title}</h4>
            <p className="text-sm text-slate-600 leading-relaxed mb-3">
              {insight.description}
            </p>
            <button 
              onClick={() => runSimulation(insight)}
              disabled={isSimulating}
              className="w-full py-2 bg-indigo-50 text-indigo-700 font-medium text-sm rounded-lg hover:bg-indigo-100 flex items-center justify-center transition-colors"
            >
              {isSimulating ? (
                 <RefreshCw size={14} className="animate-spin mr-2" /> 
              ) : (
                 <BarChart2 size={14} className="mr-2" />
              )}
              {isSimulating ? 'Simulating...' : 'Simulate This Fix'}
            </button>
          </div>
        ))}

        {/* Simulation Result View */}
        {simulationResult && (
            <div className="animate-in fade-in slide-in-from-right-4">
                <div className="mb-4">
                     <button 
                        onClick={() => setSimulationResult(null)}
                        className="text-xs text-slate-500 hover:text-indigo-600 flex items-center mb-2"
                     >
                         <ArrowRight className="rotate-180 mr-1" size={12}/> Back to Insights
                     </button>
                     <h3 className="font-bold text-slate-800">Simulation Results</h3>
                     <p className="text-xs text-slate-500">Predicted impact of applying: "{simulationResult.insightTitle}"</p>
                </div>
                
                <div className="bg-green-50 border border-green-100 p-3 rounded-lg text-sm text-green-800 mb-4">
                    {simulationResult.summary}
                </div>

                <div className="space-y-3">
                    {simulationResult.improvements.map((imp, i) => {
                         const delta = ((imp.after - imp.before) / imp.before) * 100;
                         const isGood = imp.metric.toLowerCase().includes('efficiency') ? delta > 0 : delta < 0;
                         
                         return (
                            <div key={i} className="bg-white border border-slate-200 p-3 rounded-lg">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-700">{imp.metric}</span>
                                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isGood ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {delta > 0 ? '+' : ''}{delta.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="flex items-center text-xs text-slate-500 gap-2">
                                    <div className="flex-1">
                                        <div className="mb-1">Before</div>
                                        <div className="font-mono text-slate-700">{imp.before} {imp.unit}</div>
                                    </div>
                                    <ArrowRight size={14} className="text-slate-300"/>
                                    <div className="flex-1 text-right">
                                        <div className="mb-1">After</div>
                                        <div className="font-mono font-bold text-indigo-600">{imp.after} {imp.unit}</div>
                                    </div>
                                </div>
                            </div>
                         )
                    })}
                </div>
                
                <button className="mt-6 w-full py-2.5 bg-indigo-600 text-white rounded-lg font-medium shadow-md hover:bg-indigo-700 transition-colors">
                    Apply Improvements
                </button>
            </div>
        )}

      </div>

      {insights.length > 0 && !simulationResult && (
          <div className="p-4 border-t border-slate-200 bg-slate-50">
             <button onClick={runAnalysis} className="w-full py-2 bg-white border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors">
                Re-run Analysis
             </button>
          </div>
      )}
    </div>
  );
};

export default SimulationPanel;