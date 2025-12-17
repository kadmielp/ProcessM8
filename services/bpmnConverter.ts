
import { ProcessMap, NodeType, ProcessNode, ProcessEdge } from '../types';

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
 */
export const extractProcessMapFromModeler = (modeler: any): ProcessMap => {
    try {
        const elementRegistry = modeler.get('elementRegistry');
        const nodes: ProcessNode[] = [];
        const edges: ProcessEdge[] = [];

        elementRegistry.forEach((element: any) => {
            if (element.type === 'bpmn:Process') return;
            if (element.type === 'label') return;

            // Extract Nodes
            if (element.type === 'bpmn:Task' || element.type === 'bpmn:UserTask' || element.type === 'bpmn:ServiceTask') {
                nodes.push({
                    id: element.businessObject.id,
                    type: NodeType.TASK,
                    label: element.businessObject.name || 'Task',
                    x: element.x,
                    y: element.y,
                    metrics: { cycleTime: 0, waitingTime: 0 } // Reset metrics as we can't store them in standard BPMN XML easily without extensions
                });
            } else if (element.type === 'bpmn:StartEvent') {
                nodes.push({
                    id: element.businessObject.id,
                    type: NodeType.START,
                    label: element.businessObject.name || 'Start',
                    x: element.x,
                    y: element.y
                });
            } else if (element.type === 'bpmn:EndEvent') {
                nodes.push({
                    id: element.businessObject.id,
                    type: NodeType.END,
                    label: element.businessObject.name || 'End',
                    x: element.x,
                    y: element.y
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
