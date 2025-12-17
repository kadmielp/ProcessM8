

import { NodeType, ProcessMap, ProjectData, FishboneDiagram, VSMData, MetricData, DMNTable, CMMNModel, FormSchema, SIPOCData } from './types';

export const INITIAL_PROCESS_MAP: ProcessMap = {
  nodes: [
    { id: 'n1', type: NodeType.START, label: 'Start', x: 50, y: 300, metrics: { cycleTime: 0, waitingTime: 0 } },
  ],
  edges: []
};

export const INITIAL_METRICS: MetricData[] = [];

export const INITIAL_FISHBONE: FishboneDiagram = {
  problemStatement: "",
  categories: [
    { id: 'c1', name: 'People', causes: [] },
    { id: 'c2', name: 'Process', causes: [] },
    { id: 'c3', name: 'Equipment', causes: [] },
    { id: 'c4', name: 'Materials', causes: [] },
    { id: 'c5', name: 'Environment', causes: [] },
    { id: 'c6', name: 'Management', causes: [] },
  ],
  rootCause: "",
  actionPlan: ""
};

export const INITIAL_VSM: VSMData = {
  steps: [],
  connectors: [],
  totalLeadTime: 0,
  totalProcessTime: 0,
  efficiency: 0,
  customerDemand: 100, // Default units/day
  availableTime: 27000 // Default 7.5 hrs in seconds
};

export const INITIAL_SIPOC: SIPOCData = {
  suppliers: [],
  inputs: [],
  process: [],
  outputs: [],
  customers: []
};

// Valid DMN 1.3 XML Template with one Decision Table
export const INITIAL_DMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" id="Definitions_1" name="DRD" namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="Decision 1">
    <decisionTable id="DecisionTable_1">
      <input id="Input_1">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text>Input</text>
        </inputExpression>
      </input>
      <output id="Output_1" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram>
      <dmndi:DMNShape dmnElementRef="Decision_1">
        <dc:Bounds height="80" width="180" x="160" y="100" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

export const INITIAL_DMN: DMNTable = {
  id: 'dmn1',
  name: 'Decision Logic',
  xml: INITIAL_DMN_XML,
  columns: [],
  rules: []
};

export const INITIAL_CMMN: CMMNModel = {
  nodes: [],
  edges: []
};

export const INITIAL_FORM: FormSchema = {
    id: 'form1',
    title: 'New User Task Form',
    fields: []
};

export const getInitialProjectData = (): ProjectData => ({
  processMap: JSON.parse(JSON.stringify(INITIAL_PROCESS_MAP)), // Deep copy
  metrics: [],
  chatHistory: [{ role: 'model', text: "Hello! I'm your Process Analyst. I can help you analyze your process maps or suggest improvements once you've created them."}],
  insights: [],
  fishbone: JSON.parse(JSON.stringify(INITIAL_FISHBONE)),
  vsm: JSON.parse(JSON.stringify(INITIAL_VSM)),
  sipoc: JSON.parse(JSON.stringify(INITIAL_SIPOC)),
  dmn: JSON.parse(JSON.stringify(INITIAL_DMN)),
  cmmn: JSON.parse(JSON.stringify(INITIAL_CMMN)),
  form: JSON.parse(JSON.stringify(INITIAL_FORM))
});

export const MODEL_NAME = 'gemini-2.5-flash';
export const THINKING_MODEL_NAME = 'gemini-2.5-flash-thinking';
