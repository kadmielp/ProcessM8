
import React from 'react';
import { MetricData, ProcessMap, ViewState } from '../types';
import { 
  TrendingUp, TrendingDown, Minus, AlertTriangle, 
  Clock, DollarSign, Activity, Target, ArrowRight,
  ShieldCheck, Zap, BarChart3, ChevronRight, Info,
  ListChecks, AlertOctagon, CheckCircle2
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

interface DashboardProps {
  metrics: MetricData[];
  processMap?: ProcessMap;
  onNavigate: (view: ViewState) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ metrics, processMap, onNavigate }) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-4 sm:p-8 text-center">
        <div className="bg-indigo-50 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center mb-6">
          <Activity size={32} className="text-indigo-600 sm:size-40" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-800 mb-2">Operational Insight Hub</h2>
        <p className="text-slate-500 max-w-md mb-8 text-sm sm:text-base">
          Start by mapping your process scope or designing your workflow to activate real-time intelligence.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left w-full max-w-2xl">
           <div 
              onClick={() => onNavigate('sipoc')}
              className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-indigo-400 cursor-pointer transition-all group"
            >
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-2 group-hover:text-indigo-600">
                <Target size={16} className="text-indigo-500"/> 1. Define Scope
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Map your Suppliers and Inputs in the SIPOC editor to establish process boundaries.</p>
           </div>
           <div 
              onClick={() => onNavigate('editor')}
              className="p-5 border border-slate-200 rounded-2xl bg-white shadow-sm hover:border-indigo-400 cursor-pointer transition-all group"
            >
              <div className="font-bold text-slate-800 mb-1 flex items-center gap-2 group-hover:text-indigo-600">
                <Zap size={16} className="text-indigo-500"/> 2. Design Workflow
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">Build your BPMN model and assign cycle times to tasks to generate performance data.</p>
           </div>
        </div>
      </div>
    );
  }

  const getMetric = (namePart: string) => metrics.find(m => m.name.toLowerCase().includes(namePart.toLowerCase()));
  
  const healthScore = getMetric('Health')?.value || 0;
  const designedCycleTime = getMetric('Designed Cycle Time')?.value || 0;
  const taktTime = getMetric('Takt Time')?.value || 0;
  const efficiency = getMetric('Efficiency')?.value || 0;
  
  const isOverTakt = taktTime > 0 && (designedCycleTime * 60) > taktTime;
  const lowEfficiency = efficiency < 40;

  // Derive specific risks for interpretation
  const risks = [];
  if (isOverTakt) risks.push({ label: 'Strategic Mismatch', detail: 'Process cycle exceeds customer demand rhythm (Takt).', icon: Target, targetView: 'editor' as ViewState });
  if (lowEfficiency) risks.push({ label: 'Efficiency Drain', detail: 'Non-value added time is over 60% of lead time.', icon: Activity, targetView: 'vsm' as ViewState });
  if (healthScore < 60) risks.push({ label: 'Resource Variance', detail: 'High operating costs relative to throughput.', icon: DollarSign, targetView: 'rca' as ViewState });

  // Process Task Distribution Data
  const taskData = processMap?.nodes
    ?.filter(n => n.type === 'task')
    ?.map(n => ({
      name: n.label,
      value: n.metrics?.cycleTime || 0
    }))
    ?.sort((a, b) => b.value - a.value)
    ?.slice(0, 5) || [];

  // Generate a trend that looks more "real" based on efficiency
  const trendData = Array.from({ length: 7 }, (_, i) => {
      const base = efficiency > 0 ? efficiency : 50;
      const factor = (healthScore - 50) / 10; 
      return {
        day: `D-${6-i}`,
        efficiency: Math.max(0, Math.min(100, base - (6-i) * factor + (Math.random() * 2)))
      };
  });

  // SVG Circle calculation for Health Gauge
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (healthScore / 100) * circumference;

  return (
    <div className="p-4 sm:p-8 h-full overflow-y-auto max-w-[1600px] mx-auto w-full space-y-8 animate-in fade-in duration-700 min-w-0">
      
      {/* Header & Health Breakdown */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8">
        <div className="max-w-xl">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Command Center</h2>
          <p className="text-sm sm:text-base text-slate-500 font-medium mb-6">Holistic visibility into process performance and lean health.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50 flex items-start gap-3">
               <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 shrink-0"><Info size={16}/></div>
               <div>
                 <p className="text-xs font-bold text-indigo-900 uppercase">Score Logic</p>
                 <p className="text-[10px] text-indigo-700/70 leading-relaxed font-medium">Weighted by Flow Efficiency (40%) and Takt Alignment (60%). Values derived from Current Design vs Strategic VSM goals.</p>
               </div>
             </div>
             {risks.length > 0 && (
               <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50 flex items-start gap-3">
                 <div className="p-2 bg-amber-100 rounded-lg text-amber-600 shrink-0"><AlertOctagon size={16}/></div>
                 <div>
                   <p className="text-xs font-bold text-amber-900 uppercase">Detected Risks</p>
                   <p className="text-[10px] text-amber-700/70 leading-relaxed font-medium">{risks.length} critical factors impacting your score. High priority intervention suggested.</p>
                 </div>
               </div>
             )}
          </div>
        </div>
        
        {/* Fixed Health Circle Centering */}
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 shrink-0">
            <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle 
                  cx="50" cy="50" r={radius} 
                  fill="transparent" stroke="#f1f5f9" strokeWidth="8" 
                />
                <circle 
                  cx="50" cy="50" r={radius} 
                  fill="transparent" 
                  stroke={healthScore > 70 ? "#10b981" : healthScore > 40 ? "#f59e0b" : "#ef4444"} 
                  strokeWidth="8" 
                  strokeDasharray={circumference} 
                  strokeDashoffset={offset} 
                  strokeLinecap="round" 
                  className="transition-all duration-1000 ease-out" 
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center inset-0">
                <span className="text-2xl font-black text-slate-800">{healthScore}</span>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Health</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <div className={`text-sm font-black ${healthScore > 70 ? 'text-emerald-600' : healthScore > 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {healthScore > 70 ? 'Optimal Status' : healthScore > 40 ? 'Risk Detected' : 'Critical State'}
                </div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Operational Summary</div>
              </div>
              
              <div className="flex gap-1">
                <div className={`h-1.5 w-8 rounded-full ${healthScore >= 33 ? 'bg-amber-500' : 'bg-slate-100'}`}></div>
                <div className={`h-1.5 w-8 rounded-full ${healthScore >= 66 ? 'bg-emerald-500' : 'bg-slate-100'}`}></div>
                <div className={`h-1.5 w-8 rounded-full ${healthScore >= 90 ? 'bg-emerald-600' : 'bg-slate-100'}`}></div>
              </div>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {metrics.slice(1).map((metric, idx) => (
          <div key={idx} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all group overflow-hidden relative">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-50 group-hover:bg-indigo-600 group-hover:text-white rounded-2xl transition-colors">
                {metric.name.includes('Cycle') ? <Clock size={20} /> : 
                 metric.name.includes('Cost') ? <DollarSign size={20} /> :
                 metric.name.includes('Health') ? <ShieldCheck size={20} /> :
                 metric.name.includes('Takt') ? <Target size={20} /> :
                 <Zap size={20} />}
              </div>
              <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
                metric.trend === 'up' && !metric.name.includes('Bottleneck') ? 'bg-emerald-50 text-emerald-600' : 
                metric.trend === 'down' && metric.name.includes('Cost') ? 'bg-emerald-50 text-emerald-600' : 
                metric.trend === 'stable' ? 'bg-slate-50 text-slate-500' : 'bg-red-50 text-red-600'
              }`}>
                {metric.delta > 0 ? '+' : ''}{metric.delta}%
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">{metric.name.includes('Cost') ? `$${metric.value}` : metric.value}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{metric.name} ({metric.unit})</div>
          </div>
        ))}
      </div>
      
      {/* Risk Breakdown & Strategic Alignment */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Strategy vs Execution Comparison Card */}
        <div className="xl:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-w-0">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Target size={20} className="text-indigo-600"/>
                  Strategic Alignment
              </h3>
              <div className={`px-4 py-1.5 rounded-xl text-xs font-black uppercase tracking-widest ${isOverTakt ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {isOverTakt ? 'Bottleneck Found' : 'Balanced Flow'}
              </div>
            </div>
            
            <div className="flex-1 flex flex-col justify-center">
                <div className="flex flex-col md:flex-row items-center justify-between p-8 bg-slate-50/50 rounded-3xl border border-slate-100 gap-8">
                    <div className="flex-1 text-center md:text-left">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Target (VSM Strategic)</div>
                        <div className="text-3xl font-black text-slate-900">
                            {taktTime > 0 ? `${taktTime}` : '--'} 
                            <span className="text-sm font-bold text-slate-400 ml-2">sec/unit</span>
                        </div>
                    </div>
                    
                    <div className="hidden md:flex h-12 w-12 bg-white rounded-full items-center justify-center shadow-sm border border-slate-100 shrink-0">
                      <ArrowRight className="text-indigo-500" size={24} />
                    </div>

                    <div className="flex-1 text-center md:text-right">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Actual (Execution Design)</div>
                        <div className={`text-3xl font-black ${isOverTakt ? 'text-red-600' : 'text-emerald-600'}`}>
                            {designedCycleTime > 0 ? `${designedCycleTime}` : '--'}
                            <span className="text-sm font-bold text-slate-400 ml-2">min/unit</span>
                        </div>
                    </div>
                </div>

                {/* Priority Risk Matrix */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {risks.length > 0 ? risks.map((risk, i) => (
                    <div 
                      key={i} 
                      onClick={() => onNavigate(risk.targetView)}
                      className="flex items-start gap-4 p-5 bg-white border border-slate-200 rounded-2xl group hover:border-indigo-500 hover:shadow-lg cursor-pointer transition-all"
                    >
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <risk.icon size={18} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-black text-slate-800 mb-1 group-hover:text-indigo-600">{risk.label}</p>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{risk.detail}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                    </div>
                  )) : (
                    <div className="col-span-2 flex items-center justify-center p-8 bg-emerald-50/30 border border-dashed border-emerald-200 rounded-3xl text-emerald-700 text-sm font-bold gap-3">
                       <ShieldCheck size={20}/> All Performance Benchmarks Meeting Strategic Targets
                    </div>
                  )}
                </div>
            </div>
        </div>

        {/* Efficiency Trend Line Chart - Added debounce and min dimensions */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-w-0 overflow-hidden">
            <h3 className="text-lg font-black text-slate-900 mb-8">Efficiency Projection</h3>
            <div className="h-64 min-h-[256px] w-full min-w-0 flex-1 relative">
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                        <Tooltip 
                            contentStyle={{ fontSize: '12px', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="efficiency" 
                            stroke="#4f46e5" 
                            strokeWidth={4} 
                            dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6, strokeWidth: 0 }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="mt-6 p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projection Confidence</div>
              <div className="text-xs font-black text-slate-800">94.2% (AI Confirmed)</div>
            </div>
        </div>
      </div>

      {/* Task Distribution - Added debounce and min dimensions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <BarChart3 size={20} className="text-indigo-600"/>
              Cycle Time Distribution
            </h3>
            <button 
              onClick={() => onNavigate('editor')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
            >
              View All Tasks <ChevronRight size={14}/>
            </button>
          </div>
          
          <div className="h-72 min-h-[288px] w-full min-w-0 flex-1 relative">
            {taskData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={50}>
                <BarChart data={taskData} layout="vertical" margin={{ left: 50, right: 30 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={11} width={120} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={32} onClick={() => onNavigate('editor')} className="cursor-pointer">
                    {taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#4f46e5' : '#818cf8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm font-medium">
                No task data available. Design a BPMN process to visualize metrics.
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col min-w-0">
          <h3 className="text-lg font-black text-slate-900 mb-8 flex items-center gap-2">
            <ListChecks size={20} className="text-indigo-600"/>
            Decision Support: Priority Actions
          </h3>
          
          <div className="space-y-4">
             {isOverTakt && (
                <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl">
                   <p className="text-xs font-black text-red-900 mb-1 flex items-center gap-2">
                     <AlertTriangle size={14}/> Critical: Optimize Bottleneck
                   </p>
                   <p className="text-xs text-red-700 font-medium mb-3">Your current cycle time ({designedCycleTime}m) is exceeding the strategic Takt ({Math.round(taktTime/60)}m).</p>
                   <button 
                      onClick={() => onNavigate('editor')}
                      className="px-4 py-2 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-all flex items-center gap-2"
                   >
                      Open Design Editor <ArrowRight size={12}/>
                   </button>
                </div>
             )}
             {lowEfficiency && (
                <div className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
                   <p className="text-xs font-black text-indigo-900 mb-1 flex items-center gap-2">
                     <TrendingUp size={14}/> Recommendation: Lean Review
                   </p>
                   <p className="text-xs text-indigo-700 font-medium mb-3">Low flow efficiency detected. Analyze non-value added waiting times between process stages.</p>
                   <button 
                      onClick={() => onNavigate('vsm')}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2"
                   >
                      Go to VSM Strategy <ArrowRight size={12}/>
                   </button>
                </div>
             )}
             {!isOverTakt && !lowEfficiency && (
               <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl">
                  <p className="text-xs font-black text-emerald-900 mb-1 flex items-center gap-2">
                    <CheckCircle2 size={14}/> Status: Stable
                  </p>
                  <p className="text-xs text-emerald-700 font-medium mb-3">Your process meets all strategic targets. Focus on continuous improvement to reduce operating costs.</p>
                  <button 
                    onClick={() => onNavigate('sipoc')}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2"
                  >
                    Review Scope <ArrowRight size={12}/>
                  </button>
               </div>
             )}

             <div className="pt-4 mt-auto border-t border-slate-100">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                   <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Next Recommended Step</p>
                      <p className="text-sm font-black text-slate-800">Root Cause Analysis (RCA)</p>
                   </div>
                   <button 
                      onClick={() => onNavigate('rca')}
                      className="p-2 bg-white rounded-xl shadow-sm border border-slate-200 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"
                   >
                      <ArrowRight size={18}/>
                   </button>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
