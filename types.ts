

export enum NodeType {
    START = 'start',
    TASK = 'task',
    GATEWAY = 'gateway',
    END = 'end',
  }
  
  export interface ProcessNode {
    id: string;
    type: NodeType;
    label: string;
    x: number;
    y: number;
    metrics?: {
      cycleTime?: number; // in minutes
      cost?: number; // in USD
      errorRate?: number; // percentage
      waitingTime?: number; // in minutes
    };
  }
  
  export interface ProcessEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
  }
  
  export interface ProcessMap {
    nodes: ProcessNode[];
    edges: ProcessEdge[];
    xml?: string; // Stores raw BPMN 2.0 XML for perfect visual persistence
  }
  
  export interface MetricData {
    name: string;
    value: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    delta: number;
  }
  
  export interface OptimizationInsight {
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
    category: 'Speed' | 'Cost' | 'Quality';
  }

  export interface SimulationResult {
    insightTitle: string;
    summary: string;
    improvements: {
      metric: string;
      before: number;
      after: number;
      unit: string;
    }[];
  }
  
  export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }

  export interface ChatMessage {
    role: 'user' | 'model';
    text: string;
  }

  export interface FishboneCategory {
    id: string;
    name: string;
    causes: string[];
  }

  export interface FishboneDiagram {
    problemStatement: string;
    categories: FishboneCategory[];
    rootCause?: string; // The identified main cause
    actionPlan?: string; // Next steps
  }

  // VSM Specific Types
  export type VSMRole = 'supplier' | 'customer' | 'process' | 'inventory' | 'production-control' | 'transport' | 'kaizen';

  export interface VSMStep {
    id: string;
    name: string;
    role: VSMRole;
    x: number;
    y: number;
    data: {
      cycleTime: number; // CT (sec) - Value Added
      changeoverTime: number; // CO (min)
      uptime: number; // %
      inventoryCount?: number; // Qty
      leadTime?: number; // NVA time (days or mins converted)
      shifts?: number;
      availableTime?: number;
    };
  }

  export interface VSMConnector {
    id: string;
    source: string;
    target: string;
    type: 'electronic' | 'manual' | 'push' | 'pull';
  }

  export interface VSMAnalysisResult {
    taktTime: number;
    efficiency: number; // PCE %
    bottleneckId: string | null;
    recommendations: {
        title: string;
        description: string;
        type: 'kaizen' | 'issue';
    }[];
  }

  export interface VSMData {
    steps: VSMStep[];
    connectors: VSMConnector[];
    totalLeadTime: number;
    totalProcessTime: number;
    efficiency: number;
    customerDemand?: number; // Units per day
    availableTime?: number; // Seconds per day (shift duration)
    analysis?: VSMAnalysisResult;
  }

  // SIPOC Types
  export interface SIPOCData {
    suppliers: string[];
    inputs: string[];
    process: string[]; // High level steps (5-7 max)
    outputs: string[];
    customers: string[];
  }

  // DMN Types
  export interface DMNColumn {
    id: string;
    label: string;
    type: 'input' | 'output';
    dataType: 'string' | 'number' | 'boolean';
  }

  export interface DMNRule {
    id: string;
    values: Record<string, string>; // Key is columnId, value is the cell content
  }

  export interface DMNTable {
    id: string;
    name: string;
    xml?: string; // Raw DMN 1.3 XML
    columns?: DMNColumn[]; // Legacy/Fallback
    rules?: DMNRule[]; // Legacy/Fallback
  }

  // CMMN Types
  export enum CMMNNodeType {
    STAGE = 'stage',
    TASK = 'task',
    MILESTONE = 'milestone',
    EVENT_LISTENER = 'event'
  }

  export interface CMMNNode {
    id: string;
    type: CMMNNodeType;
    label: string;
    x: number;
    y: number;
    width?: number;
    height?: number;
  }

  export interface CMMNEdge {
    id: string;
    source: string;
    target: string;
    type: 'association' | 'dependency';
  }

  export interface CMMNModel {
    nodes: CMMNNode[];
    edges: CMMNEdge[];
  }

  // Form Types
  export interface FormField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' | 'email';
    required: boolean;
    placeholder?: string;
    options?: string[]; // For select type
  }

  export interface FormSchema {
    id: string;
    title: string;
    fields: FormField[];
  }

  export interface ProjectData {
    processMap: ProcessMap;
    metrics: MetricData[];
    chatHistory: ChatMessage[];
    insights: OptimizationInsight[];
    simulationResults?: SimulationResult | null;
    fishbone: FishboneDiagram;
    vsm: VSMData;
    sipoc: SIPOCData;
    dmn: DMNTable;
    cmmn: CMMNModel;
    form: FormSchema;
  }
  
  export type ViewState = 'dashboard' | 'sipoc' | 'vsm' | 'editor' | 'dmn' | 'cmmn' | 'form' | 'rca';
