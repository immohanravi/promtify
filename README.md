# Promptify 🚀

Promptify is a sleek, premium, high-fidelity prompt engineering dashboard built to optimize and generate structured, token-light prompts. It is designed to act as a "drafting assistant" to optimize raw thoughts, logs, and requirements before pasting them into heavier online LLM models.

Promptify supports local models (via **Ollama**) as well as cloud-hosted APIs (**Google Gemini**, **OpenAI**, **Anthropic Claude**, **OpenRouter**, and **DeepSeek**).

---

## ✨ Features

1. **Dual Workspace Modes**:
   - ⚡ **Prompt Optimizer**: Paste raw, unstructured notes, event logs, or code, select a template preset, and get a compacted, high-density prompt.
   - 🛠️ **Prompt Generator**: A guided, step-by-step form to build custom prompts from scratch by defining the Core Task, Persona, Context, Target Audience, Tone, Deliverable Format, Constraints, and Few-Shot Examples.

2. **6 Model Providers & Real-Time Streaming**:
   - **Ollama**: Local models running on your machine (e.g. Qwen, Gemma, Llama).
   - **Google Gemini**: Access to Gemini 2.5 Flash and Pro.
   - **OpenAI**: Access to GPT-4o-mini, GPT-4o, and o3-mini.
   - **Anthropic Claude**: Access to Claude 3.5 Sonnet and Claude 3.5 Haiku.
   - **OpenRouter**: Access to Llama 3.3, Gemini, Claude, and DeepSeek.
   - **DeepSeek**: Access to DeepSeek V3 and DeepSeek R1 (Reasoner).
   - Token-by-token streaming is fully supported across all 6 providers.

3. **Desktop Native (Tauri) & Mobile Responsive**:
   - Built-in support to run as a native desktop application on macOS, Windows, and Linux via **Tauri**.
   - Fully responsive CSS layout: automatically collapses to a stacked column layout on mobile screens (`<768px`).

4. **Productivity Tools**:
   - **Visual Diff engine**: Side-by-side view showing removed words (in red strikethrough) and additions (in green), helping you track exact token compression.
   - **Auto-Copy Output**: Instantly copies optimized prompts to your clipboard as they stream in.
   - **Local Storage Sync**: Automatically persists history logs, custom rules, and API settings in your local browser storage.
   - **Auto-Draft Meta-Preset**: Propose a task, and let Promptify auto-write a custom system prompt template.

---

## 🛠️ Getting Started

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 2. Run the Web App
Start the Vite development server:
```bash
npm run dev
```
Open your browser to `http://localhost:5173`.

### 3. Run as a Desktop App (Tauri)
To launch the native desktop application in development mode:
```bash
npm run desktop:dev
```

To compile a standalone desktop installer (`.app` on macOS, `.exe` on Windows):
```bash
npm run desktop:build
```

---

## 🔌 Connecting to Local Ollama Models

Web browsers restrict requests to local servers due to CORS blocks. To allow Promptify to query local Ollama models directly from the browser:

- **macOS & Linux**:
  Launch Ollama with the origins header set:
  ```bash
  OLLAMA_ORIGINS="*" ollama serve
  ```
- **Windows (PowerShell)**:
  ```powershell
  $env:OLLAMA_ORIGINS="*"
  ollama serve
  ```

---

## 📂 Project Structure

```
├── public/                 # Static vector SVG assets and favicon
├── src/
│   ├── services/
│   │   └── api.js          # API clients for all 6 providers (Ollama, Gemini, OpenAI, Claude, etc.)
│   ├── App.jsx             # Main dashboard layout, states, diffs, and history logs
│   ├── index.css           # Glassmorphism dark styles & mobile media queries
│   └── main.jsx
├── src-tauri/              # Tauri native desktop application configs
├── package.json
└── vite.config.js
```

## 📄 License
This project is licensed under the [MIT License](LICENSE).
