

import { ProcessMap, NodeType, ProcessNode, ProcessEdge, VSMData, SIPOCData } from '../types';

/**
 * Converts internal JSON ProcessMap to valid BPMN 2.0 XML string.
 */
export const jsonToBpmnXml = (data: ProcessMap): string => {
  const processId = 'Process_' + crypto.randomUUID().replace(/-/g, '').substring(0, 7);
  
  // Header
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="${processId}" isExecutable="false">`;

  // Nodes (Flow Elements)
  data.nodes.forEach(node => {
    const sanitizedLabel = node.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    if (node.type === NodeType.START) {
      xml += `\n    <bpmn:startEvent id="${node.id}" name="${sanitizedLabel}" />`;
    } else if (node.type === NodeType.END) {
      xml += `\n    <bpmn:endEvent id="${node.id}" name="${sanitizedLabel}" />`;
    } else if (node.type === NodeType.GATEWAY) {
      xml += `\n    <bpmn:exclusiveGateway id="${node.id}" name="${sanitizedLabel}" />`;
    } else {
      xml += `\n    <bpmn:task id="${node.id}" name="${sanitizedLabel}" />`;
    }
  });

  // Edges (Sequence Flows)
  data.edges.forEach(edge => {
     // Validate that source and target nodes exist to prevent BPMN import errors
     const sourceExists = data.nodes.some(n => n.id === edge.source);
     const targetExists = data.nodes.some(n => n.id === edge.target);

     if (sourceExists && targetExists) {
        const nameAttr = edge.label ? ` name="${edge.label.replace(/"/g, '&quot;')}"` : '';
        xml += `\n    <bpmn:sequenceFlow id="${edge.id}" sourceRef="${edge.source}" targetRef="${edge.target}"${nameAttr} />`;
     }
  });

  xml += `\n  </bpmn:process>`;
  
  // DI (Diagram Interchange) - Visualization
  xml += `\n  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="${processId}">`;

  // Helper to get dimensions
  const getNodeDim = (type: NodeType) => {
      if (type === NodeType.START || type === NodeType.END) return { w: 36, h: 36 };
      if (type === NodeType.GATEWAY) return { w: 50, h: 50 };
      return { w: 100, h: 80 };
  };

  // Node Shapes
  data.nodes.forEach(node => {
    const { w, h } = getNodeDim(node.type);
    
    xml += `\n      <bpmndi:BPMNShape id="${node.id}_di" bpmnElement="${node.id}">
        <dc:Bounds x="${node.x}" y="${node.y}" width="${w}" height="${h}" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>`;
  });

  // Edge Shapes (Improved Anchor Points)
  data.edges.forEach(edge => {
      const source = data.nodes.find(n => n.id === edge.source);
      const target = data.nodes.find(n => n.id === edge.target);
      
      if (source && target) {
        const sDim = getNodeDim(source.type);
        const tDim = getNodeDim(target.type);

        // Calculate Anchor Points (Right-to-Left Flow)
        // Source Exit: Right Middle
        const sx = source.x + sDim.w;
        const sy = source.y + (sDim.h / 2);

        // Target Entry: Left Middle
        const tx = target.x;
        const ty = target.y + (tDim.h / 2);

        xml += `\n      <bpmndi:BPMNEdge id="${edge.id}_di" bpmnElement="${edge.id}">
        <di:waypoint x="${sx}" y="${sy}" />`;

        // Add a Manhattan corner if Y differs significantly
        if (Math.abs(sy - ty) > 10) {
             const midX = sx + (tx - sx) / 2;
             xml += `\n        <di:waypoint x="${midX}" y="${sy}" />`;
             xml += `\n        <di:waypoint x="${midX}" y="${ty}" />`;
        }

        xml += `\n        <di:waypoint x="${tx}" y="${ty}" />
        ${edge.label ? '<bpmndi:BPMNLabel />' : ''}
      </bpmndi:BPMNEdge>`;
      }
  });

  xml += `\n    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  return xml;
};

/**
 * Parses BPMN-JS element registry back to our simple JSON format.
 * This is "lossy" (we lose some visual details) but keeps the core logic for simulation.
 * 
 * @param modeler The BPMN-JS modeler instance
 * @param existingNodes Optional array of existing nodes to preserve metadata (metrics)
 */
export const extractProcessMapFromModeler = (modeler: any, existingNodes: ProcessNode[] = []): ProcessMap => {
    try {
        const elementRegistry = modeler.get('elementRegistry');
        const nodes: ProcessNode[] = [];
        const edges: ProcessEdge[] = [];

        elementRegistry.forEach((element: any) => {
            if (element.type === 'bpmn:Process') return;
            if (element.type === 'label') return;

            // Helper to find existing metrics for a node ID
            const getMetrics = (id: string) => {
                const existing = existingNodes.find(n => n.id === id);
                return existing?.metrics || { cycleTime: 0, waitingTime: 0, cost: 0, errorRate: 0, changeoverTime: 0, uptime: 100 };
            };

            // Extract Nodes
            if (element.type === 'bpmn:Task' || element.type === 'bpmn:UserTask' || element.type === 'bpmn:ServiceTask') {
                nodes.push({
                    id: element.businessObject.id,
                    type: NodeType.TASK,
                    label: element.businessObject.name || 'Task',
                    x: element.x,
                    y: element.y,
                    metrics: getMetrics(element.businessObject.id)
                });
            } else if (element.type === 'bpmn:StartEvent') {
                nodes.push({
                    id: element.businessObject.id,
                    type: NodeType.START,
                    label: element.businessObject.name || 'Start',
                    x: element.x,
                    y: element.y,
                    metrics: getMetrics(element.businessObject.id)
                });
            } else if (element.type === 'bpmn:EndEvent') {
                nodes.push({
                    id: element.businessObject.id,
                    type: NodeType.END,
                    label: element.businessObject.name || 'End',
                    x: element.x,
                    y: element.y,
                    metrics: getMetrics(element.businessObject.id)
                });
            } else if (element.type === 'bpmn:ExclusiveGateway' || element.type === 'bpmn:InclusiveGateway') {
                nodes.push({
                    id: element.businessObject.id,
                    type: NodeType.GATEWAY,
                    label: element.businessObject.name || 'Gateway',
                    x: element.x,
                    y: element.y
                });
            }
            
            // Extract Edges
            else if (element.type === 'bpmn:SequenceFlow') {
                const sourceRef = element.businessObject.sourceRef;
                const targetRef = element.businessObject.targetRef;

                // Ensure both source and target are defined before accessing IDs
                if (sourceRef && targetRef) {
                    edges.push({
                        id: element.businessObject.id,
                        source: sourceRef.id,
                        target: targetRef.id,
                        label: element.businessObject.name
                    });
                }
            }
        });

        return { nodes, edges };
    } catch (e) {
        console.error("Error extracting data from modeler", e);
        return { nodes: [], edges: [] };
    }
};

/**
 * INTELLIGENT BRIDGE: Converts Strategy (VSM) to Design (BPMN).
 * This eliminates redundancy by using VSM as the scaffold for BPMN.
 */
export const convertVsmToBpmn = (vsm: VSMData): ProcessMap => {
    const nodes: ProcessNode[] = [];
    const edges: ProcessEdge[] = [];
    
    let xOffset = 150;
    const yFixed = 250;
    
    // 1. Create Start Event (Triggered by Supplier or Customer Request)
    const startId = 'StartEvent_1';
    nodes.push({
        id: startId,
        type: NodeType.START,
        label: 'Process Start',
        x: xOffset,
        y: yFixed,
        metrics: { cycleTime: 0, waitingTime: 0, cost: 0, changeoverTime: 0, uptime: 100 }
    });
    xOffset += 150;

    // 2. Filter only 'process' steps from VSM (ignore suppliers/inventory for BPMN flow)
    // Sort by X position in VSM to maintain order
    const processSteps = vsm.steps
        .filter(s => s.role === 'process')
        .sort((a, b) => a.x - b.x);

    let previousNodeId = startId;

    processSteps.forEach(step => {
        const nodeId = `Task_${step.id}`;
        
        // Transfer Metrics:
        // VSM 'cycleTime' is in Seconds. BPMN in this app uses Minutes.
        // Sync Cycle Time, Changeover, and Uptime strictly from VSM data.
        const cycleTimeMin = step.data?.cycleTime ? Number((step.data.cycleTime / 60).toFixed(2)) : 0;
        const changeoverTime = step.data?.changeoverTime ?? 0;
        const uptime = step.data?.uptime ?? 100;

        nodes.push({
            id: nodeId,
            type: NodeType.TASK,
            label: step.name,
            x: xOffset,
            y: yFixed,
            metrics: {
                cycleTime: cycleTimeMin,
                waitingTime: 0,
                cost: 0,
                changeoverTime: changeoverTime,
                uptime: uptime
            }
        });

        // Link previous to current
        edges.push({
            id: `Flow_${previousNodeId}_${nodeId}`,
            source: previousNodeId,
            target: nodeId
        });

        previousNodeId = nodeId;
        xOffset += 180;
    });

    // 3. Create End Event
    const endId = 'EndEvent_1';
    nodes.push({
        id: endId,
        type: NodeType.END,
        label: 'Process End',
        x: xOffset,
        y: yFixed,
        metrics: { cycleTime: 0, waitingTime: 0, cost: 0, changeoverTime: 0, uptime: 100 }
    });

    edges.push({
        id: `Flow_${previousNodeId}_${endId}`,
        source: previousNodeId,
        target: endId
    });

    return { nodes, edges };
};

/**
 * INTELLIGENT BRIDGE: Converts Scope (SIPOC) to Strategy (VSM).
 * Creates a skeleton VSM with Suppliers, Customers, and Process steps.
 */
export const convertSipocToVsm = (sipoc: SIPOCData): VSMData => {
    const steps: any[] = [];
    const connectors: any[] = [];

    let x = 100;
    const topY = 100;
    const processY = 400;

    // 1. Supplier
    const supplierName = sipoc.suppliers[0] || 'Supplier';
    const supplierId = crypto.randomUUID();
    steps.push({
        id: supplierId,
        name: supplierName,
        role: 'supplier',
        x: x,
        y: topY,
        data: { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 }
    });

    // 2. Production Control (Standard VSM component)
    const pcId = crypto.randomUUID();
    steps.push({
        id: pcId,
        name: 'Production Control',
        role: 'production-control',
        x: 450, // Center-ish
        y: topY,
        data: { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 }
    });

    // 3. Process Steps
    x = 100;
    let prevProcessId: string | null = null;
    
    // If no process steps, provide dummy
    const processList = sipoc.process.length > 0 ? sipoc.process : ['Process Step 1'];

    processList.forEach((pName, idx) => {
        const pId = crypto.randomUUID();
        steps.push({
            id: pId,
            name: pName,
            role: 'process',
            x: x,
            y: processY,
            data: { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 }
        });

        // Connector from previous
        if (prevProcessId) {
            connectors.push({
                id: crypto.randomUUID(),
                source: prevProcessId,
                target: pId,
                type: 'push'
            });
        }

        prevProcessId = pId;
        x += 200;
    });

    // 4. Customer
    const customerName = sipoc.customers[0] || 'Customer';
    const customerId = crypto.randomUUID();
    // Position customer to the right of the last process or sufficiently far right
    const customerX = Math.max(x, 800);
    steps.push({
        id: customerId,
        name: customerName,
        role: 'customer',
        x: customerX,
        y: topY,
        data: { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 }
    });

    // Connect last process to customer (Shipment)
    if (prevProcessId) {
        connectors.push({
             id: crypto.randomUUID(),
             source: prevProcessId,
             target: customerId,
             type: 'transport' // or push, VSM typically uses transport arrow for shipment
        });
    }

    return {
        steps,
        connectors,
        totalLeadTime: 0,
        totalProcessTime: 0,
        efficiency: 0,
        customerDemand: 100,
        availableTime: 27000
    };
};

/**
 * INTELLIGENT BRIDGE: Converts Scope (SIPOC) to Design (BPMN).
 * Creates a sequential flow from inputs to outputs via process steps.
 */
export const convertSipocToBpmn = (sipoc: SIPOCData): ProcessMap => {
    const nodes: ProcessNode[] = [];
    const edges: ProcessEdge[] = [];
    
    let x = 150;
    const y = 250;

    // Start
    const startId = 'StartEvent_SIPOC';
    nodes.push({
        id: startId,
        type: NodeType.START,
        label: sipoc.inputs.length > 0 ? `Input: ${sipoc.inputs[0]}` : 'Start',
        x: x,
        y: y,
        metrics: { cycleTime: 0, waitingTime: 0 }
    });
    x += 180;

    let prevId = startId;
    
    const processList = sipoc.process.length > 0 ? sipoc.process : ['New Task'];

    processList.forEach(pName => {
        const tId = `Task_${crypto.randomUUID().substring(0,5)}`;
        nodes.push({
            id: tId,
            type: NodeType.TASK,
            label: pName,
            x: x,
            y: y,
            metrics: { cycleTime: 0, waitingTime: 0 }
        });
        
        edges.push({
            id: `Flow_${prevId}_${tId}`,
            source: prevId,
            target: tId,
            label: ''
        });

        prevId = tId;
        x += 180;
    });

    // End
    const endId = 'EndEvent_SIPOC';
    nodes.push({
        id: endId,
        type: NodeType.END,
        label: sipoc.outputs.length > 0 ? `Output: ${sipoc.outputs[0]}` : 'End',
        x: x,
        y: y,
        metrics: { cycleTime: 0, waitingTime: 0 }
    });

    edges.push({
        id: `Flow_${prevId}_${endId}`,
        source: prevId,
        target: endId,
        label: ''
    });

    return { nodes, edges };
};
