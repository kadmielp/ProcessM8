
# ProcessM8

**ProcessM8** is a data-driven platform designed to visualize, analyze, and optimize business processes. By integrating standard modeling notations (BPMN, DMN, CMMN) with the power of Generative AI (Google Gemini), ProcessM8 moves beyond static diagramming to provide actionable, real-time insights, automated diagram generation, and root cause analysis.

## 🚀 Key Features

### 🧠 AI-Powered Intelligence
*   **Text-to-Model Generation**: Instantly generate complex BPMN flows, Value Stream Maps, SIPOC diagrams, and Decision Tables from simple natural language descriptions.
*   **Automated Analysis**: Detect bottlenecks, calculate flow efficiency, and suggest Kaizen improvements automatically.
*   **Chat Assistant**: Built-in "Process Analyst" chatbot context-aware of your current project data.

### 🛠️ Comprehensive Modeling Suite
1.  **Design (BPMN 2.0)**: Full-featured editor for standard business process modeling using `bpmn-js`.
2.  **Strategy (VSM)**: Dedicated Value Stream Mapping tool to visualize material and information flow, calculate Takt time, and identify waste.
3.  **Scope (SIPOC)**: High-level scoping tool for Suppliers, Inputs, Process, Outputs, and Customers.
4.  **Logic (DMN)**: Decision Model and Notation editor for defining complex business rules and logic tables.
5.  **Case (CMMN)**: Modeling for unstructured, human-centric case management work.
6.  **Analysis (RCA)**: Interactive Fishbone (Ishikawa) diagramming tool for Root Cause Analysis.
7.  **Forms**: Rapidly prototype user task forms based on process requirements.

### 📊 Analytics & Simulation
*   **Operational Dashboard**: Real-time tracking of KPIs like Cycle Time, Lead Time, and Efficiency.
*   **Simulation Engine**: Run "What-If" scenarios to predict the impact of process changes before implementation.
*   **Insight Engine**: Prioritized list of optimization opportunities categorized by impact (Speed, Cost, Quality).

## 💻 Tech Stack

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **Visualization**: 
    *   `bpmn-js` (BPMN 2.0 rendering)
    *   `dmn-js` (DMN rendering)
    *   `recharts` (Data visualization)
*   **AI Integration**: Google GenAI SDK (`@google/genai`) accessing Gemini 2.5 Flash models.
*   **Icons**: Lucide React

## ⚙️ Setup & Installation

### Prerequisites
*   Node.js (v18 or higher recommended)
*   A Google Cloud Project with the **Gemini API** enabled.
*   An API Key for Google GenAI.

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/processm8.git
    cd processm8
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Configure Environment**
    Create a `.env` file in the root directory and add your Google Gemini API key:
    ```env
    API_KEY=your_google_gemini_api_key_here
    ```

4.  **Run the application**
    ```bash
    npm start
    ```
    The application should launch in your default browser at `http://localhost:3000` (or similar, depending on your bundler).

## 📖 Usage Guide

### Creating a Project
1.  Launch the app and click **"Create New Project"**.
2.  Enter a name (e.g., "Order Fulfillment Transformation") and a brief description.

### Generating a Diagram with AI
1.  Navigate to a module (e.g., **Design (BPMN)**).
2.  Click the **"AI Assistant"** button in the toolbar.
3.  Type a description of your process (e.g., *"A user submits an expense report. A manager reviews it. If approved, Finance pays it. If rejected, the user is notified."*).
4.  Click **Generate**. The AI will construct the standard diagram automatically.

### Running a Simulation
1.  In the BPMN view, click the **Settings** (Simulation) icon in the top right.
2.  The **Intelligent Analysis** panel will open.
3.  Click **Analyze Process** to have AI identify bottlenecks.
4.  Select an insight and click **"Simulate This Fix"** to see projected quantitative improvements (e.g., -15% Cycle Time).

## 📁 Project Structure

```
src/
├── components/         # UI Components and Editors
│   ├── ProcessEditor.tsx   # BPMN Logic
│   ├── VSMEditor.tsx       # Value Stream Logic
│   ├── FishboneEditor.tsx  # RCA Logic
│   ├── Dashboard.tsx       # Analytics View
│   └── ...
├── services/           # Backend & API Services
│   ├── geminiService.ts    # AI Generation & Analysis Logic
│   └── bpmnConverter.ts    # JSON <-> XML Transformation
├── types.ts            # TypeScript Definitions
├── constants.ts        # Initial States & Config
└── App.tsx             # Main Routing & Layout
```

## 📄 License

This project is licensed under the MIT License.
