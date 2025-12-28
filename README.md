# ProcessM8: Next-Gen Process Intelligence

**ProcessM8** is a high-fidelity, data-driven software platform for visualizing, analyzing, and optimizing enterprise workflows. It transforms static business process diagrams into dynamic **Digital Twins** that provide actionable, real-time insights through AI-driven simulation and analysis.

---

## 🌟 Vision
ProcessM8 bridges the gap between process documentation and operational execution. By connecting strategic methodologies (Lean Six Sigma) with modern modeling standards (BPMN, DMN, CMMN), the platform identifies bottlenecks, forecasts ROI for process changes, and mines actual behavior from system logs.

---

## 🛠️ Core Modules

### 1. Process Mapping & Visualization (The Foundation)
A comprehensive toolset for collaborative process design and scoping.
*   **BPMN 2.0 Modeler**: Industry-standard visual editor for Events, Tasks, and Gateways.
*   **Value Stream Mapping (VSM)**: Dedicated Lean mode to classify steps into Value-Added vs. Waste.
*   **SIPOC Designer**: High-level scoping tool for identifying Suppliers, Inputs, Outputs, and Customers.
*   **Declarative Case Flow (CMMN)**: Modeling for adaptive, non-linear business cases.

### 2. Analysis & Optimization (The Intelligence Engine)
The analytical core that transforms maps into dynamic execution models.
*   **AI Digital Twin Simulation**: A "What-If" engine powered by Google Gemini (Flash & Pro versions) to forecast cycle time and cost impacts.
*   **Automated Bottleneck Detection**: Visual heat-mapping of efficiency leaks and queue risks.
*   **Integrated RCA (Fishbone)**: AI-assisted Root Cause Analysis using Ishikawa methodology and "5 Whys" synthesis.
*   **Process Mining**: Auto-generation of "As-Is" process maps directly from system event logs (CSV/Jira/Salesforce).

### 3. Platform & Collaboration (The Engine Room)
Enterprise-grade infrastructure for team-wide process intelligence.
*   **Command Hub Dashboard**: Real-time KPI tracking (Takt Time, Flow Efficiency, Operating Cost).
*   **Logic (DMN) Editor**: Centralized decision table management to decouple business logic from flow.
*   **Task UI Builder**: Drag-and-drop form designer for generating user-task interfaces.
*   **Persistence & Backup**: Robust local workspace management with secure export/import capabilities.

---

## 📈 The ProcessM8 Workflow

1.  **Scope (SIPOC)**: Define the high-level boundaries of your process.
2.  **Strategize (VSM)**: Map the value stream and identify non-value-added time.
3.  **Design (BPMN)**: Build the detailed workflow and assign operational metrics.
4.  **Simulate**: Use the AI Engine to run "What-If" scenarios on proposed changes.
5.  **Diagnose (RCA)**: Use Fishbone diagrams to address any remaining performance gaps.

---

## 💻 Technical Stack

*   **Engine**: React 19 + TypeScript (ES6+ Modules)
*   **Bundler**: Vite
*   **Styling**: Tailwind CSS (Enterprise Design System)
*   **AI**: Google Gemini API (Flash/Pro Models)
*   **Modeling**: BPMN-js, DMN-js, custom SVG Canvas for VSM and Fishbone.
*   **Analytics**: Recharts (High-performance data visualization)

---

## 🚀 Development & Setup

### API Key Requirement
The platform requires a valid Google Gemini API key. 

1. Create a file named `.env.local` in the root directory.
2. Add your key with the `VITE_` prefix:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

This key is used for:
*   Generative Process Mapping
*   Deep Simulation Calculations
*   RCA Root Cause Synthesis

### Installation
You can now install and run the app using standard `npm` commands:

```bash
# 1. Install dependencies
npm install

# 2. Start the development server
npm run dev
```

### Build for Production
To generate a production-ready bundle in the `dist/` folder:
```bash
npm run build
```

---

## ⚖️ Legal
*   **Provision**: This application is provided **"as is"** without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose, and non-infringement.
*   **Disclaimer**: AI-generated simulations are projections based on provided metrics and should be validated by subject matter experts.

---
© 2025 ProcessM8. Continuous Improvement. Automated.