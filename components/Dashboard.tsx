import React from 'react';
import { MetricData } from '../types';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Clock, DollarSign, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface DashboardProps {
  metrics: MetricData[];
}

const Dashboard: React.FC<DashboardProps> = ({ metrics }) => {
  if (!metrics || metrics.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-indigo-50 w-24 h-24 rounded-full flex items-center justify-center mb-6">
          <Activity size={40} className="text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">No Performance Data Yet</h2>
        <p className="text-slate-500 max-w-md mb-8">
          Your dashboard is empty. Create a Value Stream Map or a Business Process Map and run an analysis to generate performance metrics.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left w-full max-w-2xl">
           <div className="p-4 border border-slate-200 rounded-xl bg-white">
              <div className="font-semibold text-slate-800 mb-1">1. Strategy (VSM)</div>
              <p className="text-sm text-slate-500">Map your high-level value stream to calculate Lead Time and Efficiency.</p>
           </div>
           <div className="p-4 border border-slate-200 rounded-xl bg-white">
              <div className="font-semibold text-slate-800 mb-1">2. Design (BPMN)</div>
              <p className="text-sm text-slate-500">Detail the process flow and run the Simulation Engine to detect bottlenecks.</p>
           </div>
        </div>
      </div>
    );
  }

  // Mock historical data generation for visualization (since we don't store history yet)
  const generateTrendData = () => {
      return Array.from({ length: 7 }, (_, i) => ({
          day: `Day ${i + 1}`,
          cycleTime: Math.max(10, (metrics.find(m => m.name.includes('Cycle'))?.value || 50) + (Math.random() * 20 - 10)),
          efficiency: Math.min(100, (metrics.find(m => m.name.includes('Efficiency'))?.value || 60) + (Math.random() * 10 - 5)),
      }));
  };

  const trendData = generateTrendData();

  const bottleneckData = [
      { name: 'Order Entry', value: 45 },
      { name: 'Inventory Check', value: 12 },
      { name: 'Validation', value: 85 }, // Simulated bottleneck
      { name: 'Packing', value: 30 },
      { name: 'Shipping', value: 25 },
  ];

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">Operational Performance</h2>
        <p className="text-slate-500">Real-time analysis of process efficiency and bottlenecks.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, idx) => (
          <div key={idx} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                {metric.name.includes('Cycle') ? <Clock size={20} /> : 
                 metric.name.includes('Cost') ? <DollarSign size={20} /> :
                 metric.name.includes('Bottleneck') ? <AlertTriangle size={20} /> :
                 <Activity size={20} />}
              </div>
              <div className={`flex items-center text-sm font-medium ${
                metric.trend === 'up' && metric.name !== 'Bottlenecks' && metric.name !== 'Avg Cycle Time' ? 'text-green-600' : 
                metric.trend === 'down' && (metric.name === 'Avg Cycle Time' || metric.name === 'Bottlenecks') ? 'text-green-600' : 
                metric.trend === 'stable' ? 'text-slate-500' : 'text-red-600'
              }`}>
                {metric.trend === 'up' ? <TrendingUp size={16} className="mr-1"/> : 
                 metric.trend === 'down' ? <TrendingDown size={16} className="mr-1"/> : <Minus size={16} className="mr-1"/>}
                {metric.delta}%
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-800 mb-1">{metric.value}</div>
            <div className="text-sm text-slate-500">{metric.name} ({metric.unit})</div>
          </div>
        ))}
      </div>
      
      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Cycle Time Trend */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Cycle Time Trends (7 Days)</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line 
                            type="monotone" 
                            dataKey="cycleTime" 
                            stroke="#4f46e5" 
                            strokeWidth={3} 
                            dot={{ r: 4, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                            activeDot={{ r: 6 }} 
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Bottleneck Analysis */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Task Duration Analysis</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bottleneckData} layout="vertical">
                         <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                         <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} hide/>
                         <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} width={100} />
                         <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                         <Bar dataKey="value" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;