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

// Valid DMN 1.3 XML Template with proper DI and a sample decision table
export const INITIAL_DMN_XML = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/" id="Definitions_Decision_Logic" name="Decision Logic" namespace="http://camunda.org/schema/1.0/dmn">
  <decision id="Decision_1" name="Decision 1">
    <decisionTable id="DecisionTable_1">
      <input id="Input_1" label="Input Variable">
        <inputExpression id="InputExpression_1" typeRef="string">
          <text>input</text>
        </inputExpression>
      </input>
      <output id="Output_1" label="Output Result" name="output" typeRef="string" />
      <rule id="DecisionRule_1">
        <inputEntry id="UnaryTests_1">
          <text>"Value"</text>
        </inputEntry>
        <outputEntry id="LiteralExpression_1">
          <text>"Result"</text>
        </outputEntry>
      </rule>
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_1">
      <dmndi:DMNShape id="DMNShape_Decision_1" dmnElementRef="Decision_1">
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
  chatHistory: [{ role: 'model', text: "Hello! I'm your Process Analyst. I can help you analyze your process maps or suggest improvements once you've created them." }],
  insights: [],
  fishbone: JSON.parse(JSON.stringify(INITIAL_FISHBONE)),
  vsm: JSON.parse(JSON.stringify(INITIAL_VSM)),
  sipoc: JSON.parse(JSON.stringify(INITIAL_SIPOC)),
  dmn: JSON.parse(JSON.stringify(INITIAL_DMN)),
  cmmn: JSON.parse(JSON.stringify(INITIAL_CMMN)),
  form: JSON.parse(JSON.stringify(INITIAL_FORM))
});

export const MODEL_NAME = 'gemini-1.5-flash';
export const THINKING_MODEL_NAME = 'gemini-2.0-flash-exp';