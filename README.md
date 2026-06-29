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

## 🔌 Connecting to Local Ollama Models (CORS & PNA Setup)

Web browsers block requests from public websites (like a Vercel deployment) to local addresses (`localhost`) due to CORS and Private Network Access security policies. 

To allow Promptify to query your local Ollama models, you need to enable the `OLLAMA_ORIGINS` variable. Here is how to configure it **permanently** so you don't have to run it from a terminal every time:

### 1. macOS (Mac GUI App)
If you run Ollama as a native macOS Menu Bar application:
1. Open your terminal and append the environment declaration to your profile:
   ```bash
   echo 'launchctl setenv OLLAMA_ORIGINS "*"' >> ~/.zprofile
   ```
2. Apply the setting for the current session:
   ```bash
   launchctl setenv OLLAMA_ORIGINS "*"
   ```
3. **Restart the Ollama App**: Quit Ollama from the macOS Menu Bar and re-open it.

---

### 2. Windows (Tray App)
If you run Ollama as a Windows background task:
1. **Quit Ollama**: Close the Ollama application by right-clicking the taskbar tray icon.
2. **Set Environment Variable**:
   - Open the Windows Start Menu, search for **"Environment Variables"**, and select **Edit environment variables for your account**.
   - Under **User variables**, click **New...**.
   - Set **Variable name** to `OLLAMA_ORIGINS` and **Variable value** to `*`.
   - Click **OK** to save.
3. **Launch Ollama**: Open Ollama again from the Start Menu.

---

### 3. Linux (Systemd Service)
If you installed Ollama as a service:
1. Open the systemd override config editor:
   ```bash
   sudo systemctl edit ollama.service
   ```
2. Add the environment rule in the file:
   ```ini
   [Service]
   Environment="OLLAMA_ORIGINS=*"
   ```
3. Save the file and reload systemd to apply:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl restart ollama
   ```

---

### 💡 Best Alternative: Use the Tauri Desktop App
If you do not want to configure CORS on your system, simply use our native **Desktop Application** (via `npm run desktop:dev` or building the binary). Because native desktop apps run outside of the web browser's security sandbox, they are **fully exempt from CORS and Private Network Access blocks** and will connect to your local Ollama server out of the box!

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
