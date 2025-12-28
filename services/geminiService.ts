
import { GoogleGenAI, Type } from "@google/genai";
import { ProcessMap, NodeType, OptimizationInsight, FishboneDiagram, VSMData, SimulationResult, DMNTable, CMMNModel, FormSchema, SIPOCData, VSMAnalysisResult } from '../types';
import { MODEL_NAME, THINKING_MODEL_NAME } from '../constants';

const FLASH_MODEL = MODEL_NAME;
const PRO_MODEL = THINKING_MODEL_NAME;

const parseGeminiJson = (text: string | undefined) => {
  if (!text) return null;
  try {
    let cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const firstBrace = cleanText.indexOf('{');
    const firstBracket = cleanText.indexOf('[');
    let start = -1;
    let end = -1;
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
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse Gemini JSON:", e);
    return null;
  }
};

export const fixDmnNamespace = (xml: string): string => {
  if (!xml) return xml;
  let newXml = xml;
  // Upgrade DMN 1.1 / 1.2 to 1.3
  newXml = newXml.replace(/http:\/\/www\.omg\.org\/spec\/DMN\/20180521\/MODEL\//g, "https://www.omg.org/spec/DMN/20191111/MODEL/");
  newXml = newXml.replace(/http:\/\/www\.omg\.org\/spec\/DMN\/20151101\/dmn\.xsd/g, "https://www.omg.org/spec/DMN/20191111/MODEL/");
  newXml = newXml.replace(/http:\/\/www\.omg\.org\/spec\/DMN\/20180521\/DMNDI\//g, "https://www.omg.org/spec/DMN/20191111/DMNDI/");
  newXml = newXml.replace(/http:\/\/www\.omg\.org\/spec\/DMN/g, "https://www.omg.org/spec/DMN");
  return newXml;
};

export const generateProcessMapFromDescription = async (description: string): Promise<ProcessMap | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Create a BPMN-style business process map for: "${description}". Arrange nodes horizontally starting x=150, y=250. Return valid JSON.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
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
                      waitingTime: { type: Type.NUMBER },
                      cost: { type: Type.NUMBER }
                    }
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
    return parseGeminiJson(response.text) as ProcessMap;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return null;
  }
};

export const mineProcessFromLogs = async (logs: string): Promise<ProcessMap | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Act as a Process Mining expert. Convert these event logs into a BPMN process map. Logs: ${logs}`;
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return parseGeminiJson(response.text) as ProcessMap;
  } catch (error) {
    console.error("Mining Error:", error);
    return null;
  }
};

export const analyzeProcessBottlenecks = async (processMap: ProcessMap): Promise<OptimizationInsight[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Analyze this process map for bottlenecks and efficiency leaks: ${JSON.stringify(processMap)}. Identify critical path issues. Return 3 insights as JSON array.`;
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 2000 }
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Perform 'What-If' simulation. Process: ${JSON.stringify(processMap)}. Proposed Optimization: ${insight.title} (${insight.description}). Calculate impact on cycle time and cost. Return JSON SimulationResult.`;
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 4000 }
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Create Fishbone Root Cause Analysis (Ishikawa) for: "${problem}". Context: "${context || ''}". Use categories: People, Process, Equipment, Materials, Environment, Management. Return JSON.`;
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return parseGeminiJson(response.text) as FishboneDiagram;
  } catch (error) {
    return null;
  }
};

export const generateCausesForCategory = async (problem: string, category: string, currentCauses: string[]): Promise<string[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Brainstorm 3-5 distinct causes for problem: "${problem}" specifically in the category: "${category}". Existing causes to avoid duplicates: ${JSON.stringify(currentCauses)}. Return JSON causes array.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const res = parseGeminiJson(response.text);
    return res && Array.isArray(res.causes) ? res.causes : [];
  } catch (error) {
    return [];
  }
};

export const generateRcaConclusion = async (data: FishboneDiagram): Promise<{ rootCause: string, actionPlan: string } | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Based on the following Fishbone RCA data, identify the most likely root cause and provide a high-level corrective action plan. Data: ${JSON.stringify(data)}. Return JSON with 'rootCause' and 'actionPlan' keys.`;
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return parseGeminiJson(response.text);
  } catch (error) {
    return null;
  }
};

export const generateVSMData = async (description: string): Promise<VSMData | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Create a Value Stream Map (VSM) dataset for: "${description}". Role types: supplier, customer, process, inventory, production-control. Ensure lead times and process times are realistic. Return JSON.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const result = parseGeminiJson(response.text) as VSMData;
    if (result) {
      result.customerDemand = result.customerDemand || 100;
      result.availableTime = result.availableTime || 27000;
      if (result.steps) {
        result.steps = result.steps.map(step => ({
          ...step,
          data: step.data || { cycleTime: 0, changeoverTime: 0, uptime: 100, inventoryCount: 0, leadTime: 0 }
        }));
      }
    }
    return result;
  } catch (error) {
    return null;
  }
};

export const analyzeVSM = async (data: VSMData): Promise<VSMAnalysisResult | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Act as a Lean Six Sigma Black Belt. Analyze this Value Stream Map (VSM) for waste (Muda), overburden (Muri), and inconsistency (Mura). Data: ${JSON.stringify(data)}. Identify the bottleneck step ID. Return JSON analysis.`;
    const response = await ai.models.generateContent({
      model: PRO_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return parseGeminiJson(response.text) as VSMAnalysisResult;
  } catch (error) {
    return null;
  }
};

export const generateSIPOCData = async (description: string): Promise<SIPOCData | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Generate a SIPOC diagram for the process: "${description}". Return valid JSON with keys: suppliers, inputs, process (list of steps), outputs, customers.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return parseGeminiJson(response.text) as SIPOCData;
  } catch (error) {
    return null;
  }
};

export const generateDMNRules = async (description: string): Promise<DMNTable | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Generate a DMN 1.3 XML decision table for: "${description}". You must strictly return ONLY the XML string. No markdown, no code blocks.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: { responseMimeType: "text/plain" }
    });
    let xml = (response.text || "").replace(/```xml/g, '').replace(/```/g, '').trim();
    return { id: crypto.randomUUID(), name: 'Decision Table', xml: fixDmnNamespace(xml), columns: [], rules: [] } as DMNTable;
  } catch (error) {
    return null;
  }
};

export const generateCMMNModel = async (description: string): Promise<CMMNModel | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Create a declarative Case Management Model (CMMN) for: "${description}". Identify stages, tasks, and milestones. Return JSON model.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return parseGeminiJson(response.text) as CMMNModel;
  } catch (error) {
    return null;
  }
};

export const generateFormSchema = async (description: string): Promise<FormSchema | null> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const prompt = `Design a user task form schema for: "${description}". Include appropriate field types (text, date, select, etc.). Return valid JSON.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            fields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  label: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['text', 'number', 'date', 'select', 'checkbox', 'textarea', 'email'] },
                  required: { type: Type.BOOLEAN },
                  placeholder: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } }
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
    const chat = ai.chats.create({
      model: FLASH_MODEL,
      history: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
      config: {
        systemInstruction: "You are ProcessM8, an expert business process consultant. You provide high-level process intelligence, explain Lean concepts, and guide users through BPMN, VSM, and SIPOC methodologies. Be concise, professional, and data-driven."
      }
    });
    const result = await chat.sendMessage({ message: newMessage });
    return result.text;
  } catch (error: any) {
    if (error?.message?.includes("Requested entity was not found")) {
      return "Session error: Your API key might have changed. Please try refreshing or re-selecting your workspace.";
    }
    return "I encountered a processing error. Please try rephrasing your request.";
  }
}
