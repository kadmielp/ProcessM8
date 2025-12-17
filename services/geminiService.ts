
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessMap, NodeType, OptimizationInsight, FishboneDiagram, VSMData, SimulationResult, DMNTable, CMMNModel, FormSchema, SIPOCData, VSMAnalysisResult } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to safely parse JSON from Gemini response which might contain markdown blocks
const parseGeminiJson = (text: string | undefined) => {
  if (!text) return null;
  try {
    // 1. Remove Markdown code blocks
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    // 2. Extract JSON object/array if there is extra text around it
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    
    let start = -1;
    let end = -1;
    
    // Check if it starts with { or [
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        start = firstBrace;
        end = cleanText.lastIndexOf('}');
    } else if (firstBracket !== -1) {
        start = firstBracket;
        end = cleanText.lastIndexOf(']');
    }

    if (start !== -1 && end !== -1) {
        cleanText = cleanText.substring(start, end + 1);
    }

    // 3. Attempt Parse
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", e);
    console.debug("Raw Text:", text);
    return null;
  }
};

// Helper to fix DMN Namespace issues (Upgrade 1.1/1.2 to 1.3)
export const fixDmnNamespace = (xml: string): string => {
  if (!xml) return xml;
  let newXml = xml;
  // Replace 1.2 MODEL with 1.3
  newXml = newXml.replace(/http:\/\/www\.omg\.org\/spec\/DMN\/20180521\/MODEL\//g, "https://www.omg.org/spec/DMN/20191111/MODEL/");
  // Replace 1.1 MODEL with 1.3
  newXml = newXml.replace(/http:\/\/www\.omg\.org\/spec\/DMN\/20151101\/dmn\.xsd/g, "https://www.omg.org/spec/DMN/20191111/MODEL/");
  
  // Replace 1.2 DMNDI with 1.3
  newXml = newXml.replace(/http:\/\/www\.omg\.org\/spec\/DMN\/20180521\/DMNDI\//g, "https://www.omg.org/spec/DMN/20191111/DMNDI/");
  
  return newXml;
};

export const generateProcessMapFromDescription = async (description: string): Promise<ProcessMap | null> => {
  try {
    const prompt = `
      Create a business process map (BPMN style) for the following process description: "${description}".
      
      Requirements:
      1. Define a logical flow with a Start Event, Tasks, Gateways (if needed), and an End Event.
      2. Layout Instructions:
         - Start node at x=150, y=250.
         - Arrange subsequent nodes horizontally (increasing x by ~180px).
         - Center the main flow on y=250.
         - For parallel or alternative paths (gateways), use y offsets (e.g., branch up to y=100, down to y=400).
         - Ensure 'end' node is at the far right.
      
      Return a valid JSON object with 'nodes' and 'edges' matching the schema.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['start', 'task', 'gateway', 'end'] },
                  label: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  metrics: {
                    type: Type.OBJECT,
                    properties: {
                      cycleTime: { type: Type.NUMBER },
                      waitingTime: { type: Type.NUMBER }
                    },
                    nullable: true
                  }
                },
                required: ['id', 'type', 'label', 'x', 'y']
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  label: { type: Type.STRING, nullable: true }
                },
                required: ['id', 'source', 'target']
              }
            }
          },
          required: ['nodes', 'edges']
        }
      }
    });

    const json = parseGeminiJson(response.text);
    
    // Validate structure
    if (!json || !Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
        console.error("Invalid structure received from Gemini");
        return null;
    }

    return json as ProcessMap;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const analyzeProcessBottlenecks = async (processMap: ProcessMap): Promise<OptimizationInsight[]> => {
  try {
    const prompt = `
      Analyze the following business process map for bottlenecks and inefficiencies.
      Process Data: ${JSON.stringify(processMap)}
      
      Identify 3 key areas for improvement.
      Return a JSON array of objects with:
      - title: string
      - description: string (brief explanation of the bottleneck)
      - impact: 'High' | 'Medium' | 'Low'
      - category: 'Speed' | 'Cost' | 'Quality'
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              description: { type: Type.STRING },
              impact: { type: Type.STRING },
              category: { type: Type.STRING },
            },
            required: ['title', 'description', 'impact', 'category']
          }
        }
      }
    });

    const result = parseGeminiJson(response.text);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return [];
  }
};

export const simulateProcessChange = async (processMap: ProcessMap, insight: OptimizationInsight): Promise<SimulationResult | null> => {
  try {
    const prompt = `
      Perform a 'What-If' simulation on the provided process map.
      Current Process: ${JSON.stringify(processMap)}
      Proposed Improvement: ${insight.title} - ${insight.description}
      
      Estimate the quantitative impact of this change.
      Return a JSON object with:
      - insightTitle: The title of the insight being simulated.
      - summary: A brief narrative of the expected outcome.
      - improvements: An array of objects { metric: string, before: number, after: number, unit: string }.
      
      Metrics to consider: Cycle Time, Total Cost, Efficiency, Error Rate.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insightTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            improvements: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  metric: { type: Type.STRING },
                  before: { type: Type.NUMBER },
                  after: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                },
                required: ['metric', 'before', 'after', 'unit']
              }
            }
          },
          required: ['insightTitle', 'summary', 'improvements']
        }
      }
    });

    return parseGeminiJson(response.text) as SimulationResult;
  } catch (error) {
    console.error("Simulation Error:", error);
    return null;
  }
}

export const generateFishboneAnalysis = async (problem: string, context?: string): Promise<FishboneDiagram | null> => {
  try {
    const prompt = `
      Create a Fishbone (Ishikawa) diagram analysis for the following problem: "${problem}".
      ${context ? `Context about the process: "${context}"` : ''}
      
      Use the standard 6Ms categories (Method, Machine, Man/People, Material, Measurement, Environment) or adapt if relevant.
      Return a JSON object with:
      - problemStatement: string
      - categories: array of objects { id, name, causes (array of strings) }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            problemStatement: { type: Type.STRING },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  causes: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['id', 'name', 'causes']
              }
            }
          },
          required: ['problemStatement', 'categories']
        }
      }
    });

    return parseGeminiJson(response.text) as FishboneDiagram;
  } catch (error) {
    console.error("Fishbone Gen Error:", error);
    return null;
  }
};

export const generateCausesForCategory = async (problem: string, category: string, currentCauses: string[]): Promise<string[]> => {
    try {
        const prompt = `
          We are performing a Root Cause Analysis for the problem: "${problem}".
          The current category is: "${category}".
          Existing causes listed are: ${JSON.stringify(currentCauses)}.
          
          Brainstorm 3 to 5 additional specific potential causes for this category. 
          Keep them concise (under 10 words).
          Return a JSON object with a 'causes' array of strings.
        `;
    
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    causes: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                },
                required: ['causes']
            }
          }
        });
    
        const res = parseGeminiJson(response.text);
        return res && Array.isArray(res.causes) ? res.causes : [];
      } catch (error) {
        console.error("Fishbone Cause Gen Error:", error);
        return [];
      }
};

export const generateRcaConclusion = async (data: FishboneDiagram): Promise<{ rootCause: string, actionPlan: string } | null> => {
  try {
    const prompt = `
      Review the provided Fishbone Diagram analysis.
      Problem: "${data.problemStatement}"
      Categories & Causes: ${JSON.stringify(data.categories)}
      
      1. Identify the most likely "Root Cause" from the provided causes.
      2. Suggest a concise "Action Plan" (bullet points) to resolve it.
      
      Return a JSON object with 'rootCause' (string) and 'actionPlan' (string).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            rootCause: { type: Type.STRING },
            actionPlan: { type: Type.STRING }
          },
          required: ['rootCause', 'actionPlan']
        }
      }
    });

    return parseGeminiJson(response.text);
  } catch (error) {
    console.error("RCA Conclusion Gen Error:", error);
    return null;
  }
};

export const generateVSMData = async (description: string): Promise<VSMData | null> => {
  try {
    const prompt = `
      Create a Value Stream Map (VSM) dataset for: "${description}".
      
      Requirements:
      1. Create a logical flow: Supplier -> Process Steps -> Customer.
      2. Connectors: 'push' (material), 'electronic' (info), 'manual' (info).
      
      CRITICAL ROLE RULES:
      - Role 'supplier' MUST be used for the external Supplier (e.g., Vendor, Steel Co). ONE PER MAP.
      - Role 'customer' MUST be used for the external Customer. ONE PER MAP.
      - Role 'production-control' MUST be used for the Planning/MRP step. ONE PER MAP.
      - Role 'process' is ONLY for value-added manufacturing/service steps (e.g. Stamping, Welding, Verification).
      - Role 'inventory' is for storage between steps.
      
      Output Schema Rules:
      - 'steps' array containing nodes.
      - 'connectors' array containing edges.
      - 'totalLeadTime' (number).
      - 'totalProcessTime' (number).
      - 'efficiency' (number 0-100).
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    steps: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                name: { type: Type.STRING },
                                role: { type: Type.STRING, enum: ['supplier', 'customer', 'process', 'inventory', 'production-control', 'transport', 'kaizen'] },
                                x: { type: Type.NUMBER },
                                y: { type: Type.NUMBER },
                                data: {
                                    type: Type.OBJECT,
                                    properties: {
                                        cycleTime: { type: Type.NUMBER },
                                        changeoverTime: { type: Type.NUMBER },
                                        uptime: { type: Type.NUMBER },
                                        inventoryCount: { type: Type.NUMBER },
                                        leadTime: { type: Type.NUMBER }
                                    },
                                }
                            },
                            required: ['id', 'name', 'role', 'x', 'y']
                        }
                    },
                    connectors: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                source: { type: Type.STRING },
                                target: { type: Type.STRING },
                                type: { type: Type.STRING }
                            },
                            required: ['id', 'source', 'target', 'type']
                        }
                    },
                    totalLeadTime: { type: Type.NUMBER },
                    totalProcessTime: { type: Type.NUMBER },
                    efficiency: { type: Type.NUMBER }
                },
                required: ['steps', 'connectors', 'totalLeadTime', 'totalProcessTime', 'efficiency']
            }
        }
    });

    const result = parseGeminiJson(response.text) as VSMData;
    // Ensure new fields exist with defaults if AI missed them
    if (result) {
        result.customerDemand = 100;
        result.availableTime = 27000;

        // SANITIZATION FIX: Ensure steps have data object
        if (result.steps) {
            result.steps = result.steps.map(step => ({
                ...step,
                data: step.data || {
                    cycleTime: 0,
                    changeoverTime: 0,
                    uptime: 100,
                    inventoryCount: 0,
                    leadTime: 0
                }
            }));
        }
    }
    return result;
  } catch (error) {
      console.error("VSM Gen Error:", error);
      return null;
  }
};

export const analyzeVSM = async (data: VSMData): Promise<VSMAnalysisResult | null> => {
    try {
        const prompt = `
            Act as a Lean Six Sigma Master Black Belt. Analyze the provided Value Stream Map data.
            
            Inputs:
            - Customer Demand: ${data.customerDemand || 100} units/day
            - Available Time: ${data.availableTime || 27000} seconds/day
            - Process Steps: ${JSON.stringify(data.steps.filter(s => s.role === 'process'))}
            - Inventory: ${JSON.stringify(data.steps.filter(s => s.role === 'inventory'))}
            
            Tasks:
            1. Calculate Takt Time (Available Time / Customer Demand).
            2. Identify the Bottleneck Step (Cycle Time > Takt Time or highest Cycle Time).
            3. Calculate Flow Efficiency (Total Process Time / Total Lead Time). Assume Lead Time in days should be converted to seconds (1 day = available time) for efficiency calc, or provide efficiency as a generic 0-100 score based on ratio.
            4. Provide 3 specific recommendations (Kaizen bursts) to improve flow or reduce waste.
            
            Return JSON:
            {
                "taktTime": number,
                "efficiency": number (percentage 0-100),
                "bottleneckId": string (id of the process step),
                "recommendations": [
                    { "title": string, "description": string, "type": "kaizen" | "issue" }
                ]
            }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        taktTime: { type: Type.NUMBER },
                        efficiency: { type: Type.NUMBER },
                        bottleneckId: { type: Type.STRING, nullable: true },
                        recommendations: {
                            type: Type.ARRAY,
                            items: {
                                type: Type.OBJECT,
                                properties: {
                                    title: { type: Type.STRING },
                                    description: { type: Type.STRING },
                                    type: { type: Type.STRING, enum: ['kaizen', 'issue'] }
                                },
                                required: ['title', 'description', 'type']
                            }
                        }
                    },
                    required: ['taktTime', 'efficiency', 'recommendations']
                }
            }
        });
        
        return parseGeminiJson(response.text) as VSMAnalysisResult;

    } catch (error) {
        console.error("VSM Analysis Error:", error);
        return null;
    }
};

export const generateSIPOCData = async (description: string): Promise<SIPOCData | null> => {
  try {
    const prompt = `
      Create a SIPOC (Suppliers, Inputs, Process, Outputs, Customers) diagram for: "${description}".
      
      Return a JSON object with arrays of strings for each category:
      - suppliers
      - inputs
      - process (List 5-7 high-level steps)
      - outputs
      - customers
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suppliers: { type: Type.ARRAY, items: { type: Type.STRING } },
            inputs: { type: Type.ARRAY, items: { type: Type.STRING } },
            process: { type: Type.ARRAY, items: { type: Type.STRING } },
            outputs: { type: Type.ARRAY, items: { type: Type.STRING } },
            customers: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ['suppliers', 'inputs', 'process', 'outputs', 'customers']
        }
      }
    });

    return parseGeminiJson(response.text) as SIPOCData;
  } catch (error) {
    console.error("SIPOC Gen Error:", error);
    return null;
  }
};

export const generateDMNRules = async (description: string): Promise<DMNTable | null> => {
  try {
    const prompt = `
      Generate a valid DMN 1.3 XML file for a decision table based on this logic: "${description}".
      
      Requirements:
      - Use exact DMN 1.3 namespaces in the definitions tag:
        xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/"
        xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/"
        xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/"
        xmlns:di="http://www.omg.org/spec/DMN/20180521/DI/"
      - Create a complete XML document starting with <definitions>.
      - Include a <decision> element containing a <decisionTable>.
      - Define input and output clauses appropriate for the description.
      - Add 2-3 sample rules in the table.
      - Ensure XML namespaces are correct.
      - Return ONLY the XML string, no markdown formatting.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
         // We want raw text (XML), not JSON
         responseMimeType: "text/plain"
      }
    });
    
    // Clean up potential markdown code blocks
    let xml = response.text || "";
    xml = xml.replace(/```xml/g, '').replace(/```/g, '').trim();

    // Fix namespace issues if AI generated 1.2 or 1.1 namespaces
    xml = fixDmnNamespace(xml);

    return {
      id: crypto.randomUUID(),
      name: 'Generated Decision',
      xml: xml,
      columns: [],
      rules: []
    } as DMNTable;
  } catch (error) {
    console.error("DMN Gen Error:", error);
    return null;
  }
};

export const generateCMMNModel = async (description: string): Promise<CMMNModel | null> => {
  try {
    const prompt = `
      Create a CMMN (Case Management Model and Notation) diagram for: "${description}".
      
      Cases are for unstructured, unpredictable processes.
      Include:
      - Stages (rectangular containers for phases)
      - Milestones (goals achieved, pill shape)
      - Tasks (activities)
      - Event Listeners (circles)
      
      Return JSON with 'nodes' and 'edges'. 
      Nodes have type: 'stage' | 'task' | 'milestone' | 'event'.
      Edges have type: 'dependency'.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nodes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  type: { type: Type.STRING },
                  label: { type: Type.STRING },
                  x: { type: Type.NUMBER },
                  y: { type: Type.NUMBER },
                  width: { type: Type.NUMBER },
                  height: { type: Type.NUMBER }
                },
                required: ['id', 'type', 'label', 'x', 'y']
              }
            },
            edges: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  source: { type: Type.STRING },
                  target: { type: Type.STRING },
                  type: { type: Type.STRING }
                },
                required: ['id', 'source', 'target']
              }
            }
          },
          required: ['nodes', 'edges']
        }
      }
    });

    return parseGeminiJson(response.text) as CMMNModel;
  } catch (error) {
    console.error("CMMN Gen Error:", error);
    return null;
  }
};

export const generateFormSchema = async (description: string): Promise<FormSchema | null> => {
  try {
    const prompt = `
      Create a data entry form for the User Task: "${description}".
      
      Return a JSON object with:
      - title: string (Form Title)
      - fields: Array of { id, label, type ('text', 'number', 'date', 'select', 'checkbox', 'textarea', 'email'), required (boolean), options (array of strings, for select type), placeholder (string) }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING },
                  required: { type: Type.BOOLEAN },
                  placeholder: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ['id', 'label', 'type', 'required']
              }
            }
          },
          required: ['title', 'fields']
        }
      }
    });

    return parseGeminiJson(response.text) as FormSchema;
  } catch (error) {
    console.error("Form Gen Error:", error);
    return null;
  }
};

export const chatWithProcessAnalyst = async (history: { role: 'user' | 'model', text: string }[], newMessage: string) => {
    try {
        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            })),
            config: {
                systemInstruction: "You are ProcessM8, an expert business process consultant. You help users analyze process maps, identify root causes using 5 Whys, and suggest Six Sigma improvements. Keep answers concise and actionable."
            }
        });

        const result = await chat.sendMessage({ message: newMessage });
        return result.text;
    } catch (error) {
        console.error("Chat Error:", error);
        return "Sorry, I'm having trouble connecting to the analysis engine right now.";
    }
}
