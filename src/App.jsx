import { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  Copy, 
  Check, 
  Settings, 
  History, 
  RefreshCw, 
  FileText, 
  Sliders, 
  Cpu, 
  Database, 
  AlertCircle, 
  Trash2, 
  Info,
  ExternalLink,
  ChevronRight,
  ClipboardCheck
} from 'lucide-react';
import { 
  fetchOllamaModels, 
  optimizeWithOllama,
  optimizeWithGemini,
  optimizeWithOpenAI,
  optimizeWithOllamaStream, 
  optimizeWithGeminiStream, 
  optimizeWithOpenAIStream,
  optimizeWithClaude,
  optimizeWithClaudeStream,
  optimizeWithOpenRouter,
  optimizeWithOpenRouterStream,
  optimizeWithDeepSeek,
  optimizeWithDeepSeekStream
} from './services/api';
import './App.css';

// Built-in Prompt Optimization Templates
const SYSTEM_TEMPLATES = {
  compact: {
    name: 'Token Compactor',
    description: 'Compresses verbose text into a dense, token-light prompt. Retains essential data and constraints.',
    prompt: `You are a prompt optimization engine. 
The user will give you a messy, verbose description of an event, task, or raw log data.
Your job is to rewrite it into a highly dense, structured instruction set that the user can copy-paste into another AI.

Rules:
1. Strip all conversational filler, preambles, and greetings.
2. Group related information logically.
3. Use XML-like tags (e.g., <context>, <rules>) or clear section dividers (e.g., '---') to isolate inputs, instructions, and examples.
4. Keep all specific numbers, IDs, commands, code blocks, and context intact.
5. Output ONLY the final optimized text to be copied. No introductions, no explanations.
6. Decrease token size as low as possible while maintaining critical rules.`
  },
  structure: {
    name: 'Structured Framework',
    description: 'Builds a professional role-context-task framework for highest output quality.',
    prompt: `You are a master prompt engineering expert. 
Your task is to convert the user's unstructured request into a highly structured prompt using a standard prompt framework.

Format the output prompt precisely using clear section headers:
### Role
[Assign a precise expert persona]

### Context
[Identify the background details and environment]

### Task
[State the exact instructions clearly using active verbs]

### Constraints
[Detail a numbered list of strict negative rules and boundaries]

### Deliverables & Format
[Define the expected output structure]

Separate each section with a line divider ('---'). Output ONLY the structured prompt itself, without greetings, preambles, or conversational transitions.`
  },
  cot: {
    name: 'Chain-of-Thought',
    description: 'Injects step-by-step reasoning steps to optimize complex logical problems.',
    prompt: `You are an LLM reasoning prompt optimizer. 
Your goal is to optimize the user's raw prompt to force the target AI model to use structured, step-by-step reasoning (Chain-of-Thought).

The optimized prompt must:
1. Use clear section headers to separate instructions from background data.
2. Explicitly instruct the model to write out its reasoning steps first under a "### Reasoning" header before delivering its final answer (e.g., using "Let's think step by step:").
3. Encourage the model to verify assumptions at each step.
4. Output ONLY the final prompt without preambles or notes.`
  },
  code: {
    name: 'Code Architect',
    description: 'Optimizes prompt specifically for code generation, code review, or refactoring.',
    prompt: `You are a prompt engineering expert specializing in software engineering.
Your task is to take the user's raw programming request and optimize it for a code assistant LLM.

Construct the optimized prompt using XML tags to segregate code parameters:
- Use <objective> to define the core programming goal.
- Use <stack> to list language, frameworks, and versions.
- Use <inputs> and <outputs> for data specifications.
- Use <constraints> for performance, style (e.g., DRY, SOLID), and edge cases.
- Use <validation> for sample assertions or unit test steps.

Output ONLY the final optimized prompt. Avoid any filler or external meta-commentary.`
  },
  json: {
    name: 'Structured JSON',
    description: 'Ensures the final LLM response is returned in a clean, parseable JSON schema.',
    prompt: `You are a prompt engineer. Rewrite the user's request to force the target LLM to return a strictly formatted, valid JSON object response.

The optimized prompt must:
1. Use a <json_schema> tag to define the exact JSON keys and types.
2. Instruct the LLM to output ONLY the raw JSON string starting with '{' and ending with '}'.
3. Include negative constraints in a <constraints> block to prevent conversational preambles or post-explanations.
4. Mandate proper escaping and JSON compliance.

Output ONLY the final optimized instruction set to copy-paste.`
  },
  custom: {
    name: 'Custom Preset',
    description: 'Define your own personal system prompt guidelines for optimization.',
    prompt: `You are a prompt optimizer. Adjust the raw user text according to custom rules.`
  }
};

function App() {
  // Input/Output states
  const [inputText, setInputText] = useState('');
  const [optimizedText, setOptimizedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState('output'); // 'output' | 'diff'
  
  // Connection states
  const [provider, setProvider] = useState(() => localStorage.getItem('promptify_provider') || 'ollama');
  const [ollamaUrl, setOllamaUrl] = useState(() => localStorage.getItem('promptify_ollama_url') || 'http://localhost:11434');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('promptify_selected_model') || '');
  const [ollamaModels, setOllamaModels] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'checking' | 'online' | 'offline'
  
  // API Keys
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('promptify_gemini_key') || '');
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('promptify_openai_key') || '');
  const [claudeApiKey, setClaudeApiKey] = useState(() => localStorage.getItem('promptify_claude_key') || '');
  const [openrouterApiKey, setOpenrouterApiKey] = useState(() => localStorage.getItem('promptify_openrouter_key') || '');
  const [deepseekApiKey, setDeepseekApiKey] = useState(() => localStorage.getItem('promptify_deepseek_key') || '');
  const [geminiModel, setGeminiModel] = useState(() => localStorage.getItem('promptify_gemini_model') || 'gemini-2.5-flash');
  const [openaiModel, setOpenaiModel] = useState(() => localStorage.getItem('promptify_openai_model') || 'gpt-4o-mini');
  const [claudeModel, setClaudeModel] = useState(() => localStorage.getItem('promptify_claude_model') || 'claude-3-5-sonnet-latest');
  const [openrouterModel, setOpenrouterModel] = useState(() => localStorage.getItem('promptify_openrouter_model') || 'google/gemini-2.5-flash');
  const [deepseekModel, setDeepseekModel] = useState(() => localStorage.getItem('promptify_deepseek_model') || 'deepseek-chat');
  
  // Settings & Templates
  const [activeTemplate, setActiveTemplate] = useState('compact');
  const [customPrompt, setCustomPrompt] = useState(() => {
    return localStorage.getItem('promptify_custom_prompt') || SYSTEM_TEMPLATES.custom.prompt;
  });
  const [autoCopy, setAutoCopy] = useState(() => {
    return localStorage.getItem('promptify_auto_copy') === 'true';
  });

  // Mode Selection State
  const [activeMode, setActiveMode] = useState(() => localStorage.getItem('promptify_active_mode') || 'optimizer');
  
  // Prompt Generator states
  const [genTask, setGenTask] = useState(() => localStorage.getItem('promptify_gen_task') || '');
  const [genPersona, setGenPersona] = useState(() => localStorage.getItem('promptify_gen_persona') || '');
  const [genContext, setGenContext] = useState(() => localStorage.getItem('promptify_gen_context') || '');
  const [genAudience, setGenAudience] = useState(() => localStorage.getItem('promptify_gen_audience') || '');
  const [genFormat, setGenFormat] = useState(() => localStorage.getItem('promptify_gen_format') || '');
  const [genTone, setGenTone] = useState(() => localStorage.getItem('promptify_gen_tone') || '');
  const [genConstraints, setGenConstraints] = useState(() => localStorage.getItem('promptify_gen_constraints') || '');
  const [genExamples, setGenExamples] = useState(() => localStorage.getItem('promptify_gen_examples') || '');
  const [generatedText, setGeneratedText] = useState(() => localStorage.getItem('promptify_generated_text') || '');

  // History & Toast Notifications
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('promptify_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [toast, setToast] = useState({ show: false, message: '' });

  // Refs for tracking system prompt editing
  const [showSettings, setShowSettings] = useState(false);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('promptify_provider', provider);
  }, [provider]);

  useEffect(() => {
    localStorage.setItem('promptify_ollama_url', ollamaUrl);
    if (provider === 'ollama') {
      checkOllamaConnection();
    }
  }, [ollamaUrl]);

  useEffect(() => {
    localStorage.setItem('promptify_selected_model', selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem('promptify_gemini_key', geminiApiKey);
  }, [geminiApiKey]);

  useEffect(() => {
    localStorage.setItem('promptify_openai_key', openaiApiKey);
  }, [openaiApiKey]);

  useEffect(() => {
    localStorage.setItem('promptify_claude_key', claudeApiKey);
  }, [claudeApiKey]);

  useEffect(() => {
    localStorage.setItem('promptify_openrouter_key', openrouterApiKey);
  }, [openrouterApiKey]);

  useEffect(() => {
    localStorage.setItem('promptify_deepseek_key', deepseekApiKey);
  }, [deepseekApiKey]);

  useEffect(() => {
    localStorage.setItem('promptify_gemini_model', geminiModel);
  }, [geminiModel]);

  useEffect(() => {
    localStorage.setItem('promptify_openai_model', openaiModel);
  }, [openaiModel]);

  useEffect(() => {
    localStorage.setItem('promptify_claude_model', claudeModel);
  }, [claudeModel]);

  useEffect(() => {
    localStorage.setItem('promptify_openrouter_model', openrouterModel);
  }, [openrouterModel]);

  useEffect(() => {
    localStorage.setItem('promptify_deepseek_model', deepseekModel);
  }, [deepseekModel]);

  useEffect(() => {
    localStorage.setItem('promptify_custom_prompt', customPrompt);
  }, [customPrompt]);

  useEffect(() => {
    localStorage.setItem('promptify_auto_copy', autoCopy);
  }, [autoCopy]);

  useEffect(() => {
    localStorage.setItem('promptify_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('promptify_active_mode', activeMode);
  }, [activeMode]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_task', genTask);
  }, [genTask]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_persona', genPersona);
  }, [genPersona]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_context', genContext);
  }, [genContext]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_audience', genAudience);
  }, [genAudience]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_format', genFormat);
  }, [genFormat]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_tone', genTone);
  }, [genTone]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_constraints', genConstraints);
  }, [genConstraints]);

  useEffect(() => {
    localStorage.setItem('promptify_gen_examples', genExamples);
  }, [genExamples]);

  useEffect(() => {
    localStorage.setItem('promptify_generated_text', generatedText);
  }, [generatedText]);

  // Initial connection check on load
  useEffect(() => {
    if (provider === 'ollama') {
      checkOllamaConnection();
    } else {
      setConnectionStatus('online'); // Cloud providers are assumed online
    }
  }, [provider]);

  // Toast auto-hide
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast({ show: false, message: '' });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Check connection to local Ollama
  const checkOllamaConnection = async () => {
    setConnectionStatus('checking');
    try {
      const models = await fetchOllamaModels(ollamaUrl);
      setOllamaModels(models);
      setConnectionStatus('online');
      
      // Select first model if none selected or if selected is not in the list
      if (models.length > 0) {
        if (!selectedModel || !models.includes(selectedModel)) {
          setSelectedModel(models[0]);
        }
      } else {
        setSelectedModel('');
      }
    } catch (err) {
      setConnectionStatus('offline');
      setOllamaModels([]);
      console.warn(err.message);
    }
  };

  // Get active system prompt
  const getSystemPrompt = () => {
    if (activeTemplate === 'custom') {
      return customPrompt;
    }
    return SYSTEM_TEMPLATES[activeTemplate].prompt;
  };

  // Run Optimization
  const handleOptimize = async () => {
    if (!inputText.trim()) {
      showToast('Please enter some text to optimize!');
      return;
    }

    setIsLoading(true);
    setOptimizedText('');

    const sysPrompt = getSystemPrompt();
    let accumulatedResult = '';

    const handleChunk = (chunk) => {
      accumulatedResult += chunk;
      setOptimizedText(accumulatedResult);
    };

    try {
      if (provider === 'ollama') {
        if (!selectedModel) {
          throw new Error('No local Ollama model selected. Please make sure Ollama is running and has downloaded models.');
        }
        await optimizeWithOllamaStream(ollamaUrl, selectedModel, sysPrompt, inputText, handleChunk);
      } else if (provider === 'gemini') {
        if (!geminiApiKey) {
          throw new Error('Gemini API key is required. Please set it in the sidebar settings.');
        }
        await optimizeWithGeminiStream(geminiApiKey, geminiModel, sysPrompt, inputText, handleChunk);
      } else if (provider === 'openai') {
        if (!openaiApiKey) {
          throw new Error('OpenAI API key is required. Please set it in the sidebar settings.');
        }
        await optimizeWithOpenAIStream(openaiApiKey, openaiModel, sysPrompt, inputText, handleChunk);
      } else if (provider === 'claude') {
        if (!claudeApiKey) {
          throw new Error('Claude API key is required. Please set it in the sidebar settings.');
        }
        await optimizeWithClaudeStream(claudeApiKey, claudeModel, sysPrompt, inputText, handleChunk);
      } else if (provider === 'openrouter') {
        if (!openrouterApiKey) {
          throw new Error('OpenRouter API key is required. Please set it in the sidebar settings.');
        }
        await optimizeWithOpenRouterStream(openrouterApiKey, openrouterModel, sysPrompt, inputText, handleChunk);
      } else if (provider === 'deepseek') {
        if (!deepseekApiKey) {
          throw new Error('DeepSeek API key is required. Please set it in the sidebar settings.');
        }
        await optimizeWithDeepSeekStream(deepseekApiKey, deepseekModel, sysPrompt, inputText, handleChunk);
      }

      // Auto copy if enabled
      if (autoCopy && accumulatedResult) {
        navigator.clipboard.writeText(accumulatedResult);
        showToast('Optimized and Copied to Clipboard!');
      } else {
        showToast('Prompt optimized successfully!');
      }

      // Add to history log (keep max 20 entries)
      const newHistoryItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        original: inputText,
        optimized: accumulatedResult,
        provider: provider,
        model: provider === 'ollama' ? selectedModel : 
               provider === 'gemini' ? geminiModel : 
               provider === 'openai' ? openaiModel :
               provider === 'claude' ? claudeModel :
               provider === 'openrouter' ? openrouterModel :
               deepseekModel,
        template: SYSTEM_TEMPLATES[activeTemplate].name
      };

      setHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);

    } catch (err) {
      console.error(err);
      setOptimizedText(prev => prev ? prev + `\n\nError: ${err.message}` : `Error: ${err.message}`);
      showToast('Optimization failed. Check logs.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate customized system prompt rules based on the user input text
  const handleGenerateCustomSystemPrompt = async () => {
    if (!inputText.trim()) {
      showToast('Please enter some text in the raw input box first!');
      return;
    }

    setIsLoading(true);
    showToast('Drafting tailored optimizer rules...');

    const metaPrompt = `You are a prompt engineering advisor. The user wants to write prompts related to this topic/task description:
"${inputText}"

Write a tailored System Prompt (optimization instruction set) that can be used to optimize raw inputs of this exact type.

Rules:
1. Start with "You are a prompt optimizer specializing in..."
2. Outline 3-5 concise rules for formatting and content compression.
3. Instruct it to output ONLY the final prompt.
4. Do not include any explanations, headings, warnings, or markdown code blocks around your response. Return ONLY the raw system prompt text.`;

    try {
      let result = '';

      if (provider === 'ollama') {
        if (!selectedModel) throw new Error('No local Ollama model selected.');
        result = await optimizeWithOllama(ollamaUrl, selectedModel, "You are a prompt architect.", metaPrompt);
      } else if (provider === 'gemini') {
        if (!geminiApiKey) throw new Error('Gemini API key is required.');
        result = await optimizeWithGemini(geminiApiKey, geminiModel, "You are a prompt architect.", metaPrompt);
      } else if (provider === 'openai') {
        if (!openaiApiKey) throw new Error('OpenAI API key is required.');
        result = await optimizeWithOpenAI(openaiApiKey, openaiModel, "You are a prompt architect.", metaPrompt);
      } else if (provider === 'claude') {
        if (!claudeApiKey) throw new Error('Claude API key is required.');
        result = await optimizeWithClaude(claudeApiKey, claudeModel, "You are a prompt architect.", metaPrompt);
      } else if (provider === 'openrouter') {
        if (!openrouterApiKey) throw new Error('OpenRouter API key is required.');
        result = await optimizeWithOpenRouter(openrouterApiKey, openrouterModel, "You are a prompt architect.", metaPrompt);
      } else if (provider === 'deepseek') {
        if (!deepseekApiKey) throw new Error('DeepSeek API key is required.');
        result = await optimizeWithDeepSeek(deepseekApiKey, deepseekModel, "You are a prompt architect.", metaPrompt);
      }

      setCustomPrompt(result);
      setActiveTemplate('custom');
      setShowSettings(true);
      showToast('Custom optimizer rules drafted!');
    } catch (err) {
      console.error(err);
      showToast(`Failed to generate preset: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate Prompt from guided builder inputs
  const handleGeneratePrompt = async () => {
    if (!genTask.trim()) {
      showToast('Task objective is required!');
      return;
    }

    setIsLoading(true);
    setGeneratedText('');

    const systemPrompt = `You are an expert prompt engineer. Your task is to generate a highly detailed, professional prompt based on the specifications provided by the user.

Ensure the generated prompt:
1. Follows the PromptingGuide.ai guidelines: clearly separates Instructions, Context, Persona, Audience, Constraints, and Examples.
2. Uses clear, visual delimiters (such as markdown '---' dividers or XML-like tags like <context> or <instructions>) to help the target LLM identify boundaries.
3. Specifies a clear expert persona/role for the target LLM.
4. If Few-Shot examples are provided, structures them clearly under an "Examples" heading.
5. Formats the final prompt as a clean, markdown-documented template ready to be copied and pasted.

Return ONLY the generated copy-pasteable prompt itself. Do not include any meta-explanations, preambles, introductory filler, or code block fences (\`\`\`markdown) around your output.`;

    const userContent = `Create a structured prompt from the following specifications:
- **Core Task/Goal**: ${genTask}
- **Role/Persona**: ${genPersona || 'Default AI Assistant'}
- **Factual Context & Background**: ${genContext || 'None specified'}
- **Target Audience**: ${genAudience || 'General Audience'}
- **Expected Format / Deliverables**: ${genFormat || 'Best suited structure'}
- **Tone/Style**: ${genTone || 'Professional and direct'}
- **Strict Constraints / Negative Rules**: ${genConstraints || 'None specified'}
- **Few-Shot Examples**: ${genExamples || 'None provided'}`;

    let accumulatedResult = '';
    const handleChunk = (chunk) => {
      accumulatedResult += chunk;
      setGeneratedText(accumulatedResult);
    };

    try {
      if (provider === 'ollama') {
        if (!selectedModel) throw new Error('No local Ollama model selected.');
        await optimizeWithOllamaStream(ollamaUrl, selectedModel, systemPrompt, userContent, handleChunk);
      } else if (provider === 'gemini') {
        if (!geminiApiKey) throw new Error('Gemini API key is required.');
        await optimizeWithGeminiStream(geminiApiKey, geminiModel, systemPrompt, userContent, handleChunk);
      } else if (provider === 'openai') {
        if (!openaiApiKey) throw new Error('OpenAI API key is required.');
        await optimizeWithOpenAIStream(openaiApiKey, openaiModel, systemPrompt, userContent, handleChunk);
      } else if (provider === 'claude') {
        if (!claudeApiKey) throw new Error('Claude API key is required.');
        await optimizeWithClaudeStream(claudeApiKey, claudeModel, systemPrompt, userContent, handleChunk);
      } else if (provider === 'openrouter') {
        if (!openrouterApiKey) throw new Error('OpenRouter API key is required.');
        await optimizeWithOpenRouterStream(openrouterApiKey, openrouterModel, systemPrompt, userContent, handleChunk);
      } else if (provider === 'deepseek') {
        if (!deepseekApiKey) throw new Error('DeepSeek API key is required.');
        await optimizeWithDeepSeekStream(deepseekApiKey, deepseekModel, systemPrompt, userContent, handleChunk);
      }

      if (autoCopy && accumulatedResult) {
        navigator.clipboard.writeText(accumulatedResult);
        showToast('Generated Prompt Copied!');
      } else {
        showToast('Structured prompt generated!');
      }

      // Add to history log
      const newHistoryItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString(),
        original: `Prompt Task: "${genTask.slice(0, 40)}..."`,
        optimized: accumulatedResult,
        provider: provider,
        model: provider === 'ollama' ? selectedModel : 
               provider === 'gemini' ? geminiModel : 
               provider === 'openai' ? openaiModel :
               provider === 'claude' ? claudeModel :
               provider === 'openrouter' ? openrouterModel :
               deepseekModel,
        template: 'Prompt Generator'
      };
      setHistory(prev => [newHistoryItem, ...prev.slice(0, 19)]);

    } catch (err) {
      console.error(err);
      setGeneratedText(prev => prev ? prev + `\n\nError: ${err.message}` : `Error: ${err.message}`);
      showToast('Generation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to Clipboard Utility
  const handleCopyToClipboard = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('Copied to Clipboard!');
  };

  const showToast = (message) => {
    setToast({ show: true, message });
  };

  // Clear history
  const clearHistory = () => {
    setHistory([]);
    showToast('History cleared');
  };

  // Metrics calculation
  const getMetrics = (text) => {
    if (!text) return { characters: 0, words: 0, tokens: 0 };
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    // Simple LLM token estimate: 1 token = ~4 characters
    const tokenEst = Math.ceil(charCount / 4);
    return { characters: charCount, words: wordCount, tokens: tokenEst };
  };

  const inputMetrics = getMetrics(inputText);
  const outputMetrics = getMetrics(optimizedText);
  const tokenChange = inputMetrics.tokens > 0 && outputMetrics.tokens > 0 
    ? Math.round(((outputMetrics.tokens - inputMetrics.tokens) / inputMetrics.tokens) * 100)
    : 0;

  // Visual Diff engine
  const getDiffMarkup = () => {
    if (!inputText) return [];
    if (!optimizedText) return [{ type: 'removed', text: inputText }];

    // Word level token comparison
    const origWords = inputText.split(/(\s+)/);
    const optWords = optimizedText.split(/(\s+)/);

    const diffs = [];
    let i = 0, j = 0;

    while (i < origWords.length || j < optWords.length) {
      if (i < origWords.length && j < optWords.length && origWords[i] === optWords[j]) {
        diffs.push({ type: 'normal', text: origWords[i] });
        i++;
        j++;
      } else {
        let foundMatch = false;
        // Simple lookahead search
        for (let lookAhead = 1; lookAhead < 8; lookAhead++) {
          if (i + lookAhead < origWords.length && origWords[i + lookAhead] === optWords[j]) {
            for (let k = 0; k < lookAhead; k++) {
              diffs.push({ type: 'removed', text: origWords[i + k] });
            }
            i += lookAhead;
            foundMatch = true;
            break;
          }
          if (j + lookAhead < optWords.length && origWords[i] === optWords[j + lookAhead]) {
            for (let k = 0; k < lookAhead; k++) {
              diffs.push({ type: 'added', text: optWords[j + k] });
            }
            j += lookAhead;
            foundMatch = true;
            break;
          }
        }

        if (!foundMatch) {
          if (i < origWords.length) {
            diffs.push({ type: 'removed', text: origWords[i] });
            i++;
          }
          if (j < optWords.length) {
            diffs.push({ type: 'added', text: optWords[j] });
            j++;
          }
        }
      }
    }

    return diffs;
  };

  return (
    <div className="app-wrapper">
      {/* Sidebar Panel */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Sparkles className="logo-icon" size={24} />
          <span className="logo-text">Promptify</span>
          <span className="logo-tag">{provider.toUpperCase()}</span>
        </div>

        <div className="sidebar-content">
          {/* Provider Select Section */}
          <div className="sidebar-section">
            <h3 className="section-title">Model Provider</h3>
            <div className="provider-tabs">
              <button 
                className={`provider-tab ${provider === 'ollama' ? 'active' : ''}`}
                onClick={() => setProvider('ollama')}
              >
                Ollama
              </button>
              <button 
                className={`provider-tab ${provider === 'gemini' ? 'active' : ''}`}
                onClick={() => setProvider('gemini')}
              >
                Gemini
              </button>
              <button 
                className={`provider-tab ${provider === 'openai' ? 'active' : ''}`}
                onClick={() => setProvider('openai')}
              >
                OpenAI
              </button>
              <button 
                className={`provider-tab ${provider === 'claude' ? 'active' : ''}`}
                onClick={() => setProvider('claude')}
              >
                Claude
              </button>
              <button 
                className={`provider-tab ${provider === 'openrouter' ? 'active' : ''}`}
                onClick={() => setProvider('openrouter')}
              >
                OpenRouter
              </button>
              <button 
                className={`provider-tab ${provider === 'deepseek' ? 'active' : ''}`}
                onClick={() => setProvider('deepseek')}
              >
                DeepSeek
              </button>
            </div>
          </div>

          {/* Connection Health & Config */}
          <div className="sidebar-section">
            <h3 className="section-title">Engine Settings</h3>
            
            {provider === 'ollama' && (
              <>
                <div className="form-group">
                  <label htmlFor="ollamaUrl">Ollama Server URL</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="text" 
                      id="ollamaUrl"
                      className="input-control" 
                      style={{ flex: 1 }}
                      value={ollamaUrl} 
                      onChange={(e) => setOllamaUrl(e.target.value)}
                    />
                    <button 
                      className="btn-icon-only" 
                      title="Test connection"
                      onClick={checkOllamaConnection}
                    >
                      <RefreshCw size={14} className={connectionStatus === 'checking' ? 'spinner' : ''} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="ollamaModel">Local Model</label>
                  <select 
                    id="ollamaModel"
                    className="select-control"
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    disabled={ollamaModels.length === 0}
                  >
                    {ollamaModels.length === 0 ? (
                      <option value="">No models found</option>
                    ) : (
                      ollamaModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))
                    )}
                  </select>
                </div>

                <div className="status-indicator">
                  <span className={`status-dot ${connectionStatus}`}></span>
                  <span>
                    {connectionStatus === 'online' && `Connected: ${ollamaModels.length} models`}
                    {connectionStatus === 'checking' && 'Pinging local server...'}
                    {connectionStatus === 'offline' && 'Offline / CORS issue'}
                  </span>
                </div>
              </>
            )}

            {provider === 'gemini' && (
              <>
                <div className="form-group">
                  <label htmlFor="geminiKey">Gemini API Key</label>
                  <input 
                    type="password" 
                    id="geminiKey"
                    placeholder="AIzaSy..."
                    className="input-control" 
                    value={geminiApiKey} 
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="geminiModel">Model</label>
                  <select 
                    id="geminiModel"
                    className="select-control"
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                  >
                    <option value="gemini-2.5-flash">gemini-2.5-flash (Fast)</option>
                    <option value="gemini-2.5-pro">gemini-2.5-pro (Accurate)</option>
                  </select>
                </div>
              </>
            )}

            {provider === 'openai' && (
              <>
                <div className="form-group">
                  <label htmlFor="openaiKey">OpenAI API Key</label>
                  <input 
                    type="password" 
                    id="openaiKey"
                    placeholder="sk-proj-..."
                    className="input-control" 
                    value={openaiApiKey} 
                    onChange={(e) => setOpenaiApiKey(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="openaiModel">Model</label>
                  <select 
                    id="openaiModel"
                    className="select-control"
                    value={openaiModel}
                    onChange={(e) => setOpenaiModel(e.target.value)}
                  >
                    <option value="gpt-4o-mini">gpt-4o-mini (Recommeded)</option>
                    <option value="gpt-4o">gpt-4o (Smartest)</option>
                    <option value="o3-mini">o3-mini (Reasoning)</option>
                  </select>
                </div>
              </>
            )}

            {provider === 'claude' && (
              <>
                <div className="form-group">
                  <label htmlFor="claudeKey">Claude API Key</label>
                  <input 
                    type="password" 
                    id="claudeKey"
                    placeholder="sk-ant-..."
                    className="input-control" 
                    value={claudeApiKey} 
                    onChange={(e) => setClaudeApiKey(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="claudeModel">Model</label>
                  <select 
                    id="claudeModel"
                    className="select-control"
                    value={claudeModel}
                    onChange={(e) => setClaudeModel(e.target.value)}
                  >
                    <option value="claude-3-5-sonnet-latest">Claude 3.5 Sonnet</option>
                    <option value="claude-3-5-haiku-latest">Claude 3.5 Haiku</option>
                  </select>
                </div>
              </>
            )}

            {provider === 'openrouter' && (
              <>
                <div className="form-group">
                  <label htmlFor="openrouterKey">OpenRouter API Key</label>
                  <input 
                    type="password" 
                    id="openrouterKey"
                    placeholder="sk-or-..."
                    className="input-control" 
                    value={openrouterApiKey} 
                    onChange={(e) => setOpenrouterApiKey(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="openrouterModel">Model Path</label>
                  <select 
                    id="openrouterModel"
                    className="select-control"
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                  >
                    <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
                    <option value="meta-llama/llama-3.3-70b-instruct">Llama 3.3 70B</option>
                    <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                    <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  </select>
                </div>
              </>
            )}

            {provider === 'deepseek' && (
              <>
                <div className="form-group">
                  <label htmlFor="deepseekKey">DeepSeek API Key</label>
                  <input 
                    type="password" 
                    id="deepseekKey"
                    placeholder="sk-..."
                    className="input-control" 
                    value={deepseekApiKey} 
                    onChange={(e) => setDeepseekApiKey(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="deepseekModel">Model</label>
                  <select 
                    id="deepseekModel"
                    className="select-control"
                    value={deepseekModel}
                    onChange={(e) => setDeepseekModel(e.target.value)}
                  >
                    <option value="deepseek-chat">DeepSeek V3 (Chat)</option>
                    <option value="deepseek-reasoner">DeepSeek R1 (Reasoner)</option>
                  </select>
                </div>
              </>
            )}
          </div>

          {/* History Panel */}
          <div className="sidebar-section" style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <History size={12} /> Optimization History
              </h3>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.7rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px' }}
                >
                  <Trash2 size={10} /> Clear
                </button>
              )}
            </div>
            
            <div className="history-list" style={{ flex: 1 }}>
              {history.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textAlign: 'center', padding: '1rem' }}>
                  No previous runs
                </div>
              ) : (
                history.map((item) => (
                  <button 
                    key={item.id} 
                    className="history-item"
                    onClick={() => {
                      setInputText(item.original);
                      setOptimizedText(item.optimized);
                      showToast('Restored prompt from history!');
                    }}
                  >
                    <div className="history-item-header">
                      <span className="history-item-title">{item.template}</span>
                      <span className="history-item-meta">{item.timestamp}</span>
                    </div>
                    <div className="history-item-snippet">{item.original}</div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Connection Help Alert */}
          {connectionStatus === 'offline' && provider === 'ollama' && (
            <div style={{ 
              fontSize: '0.72rem', 
              backgroundColor: 'rgba(239, 68, 68, 0.08)', 
              border: '1px solid rgba(239, 68, 68, 0.25)', 
              padding: '0.75rem', 
              borderRadius: 'var(--radius-sm)', 
              color: '#f87171', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.5rem',
              lineHeight: '1.4'
            }}>
              <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#ef4444' }}>
                <AlertCircle size={14} /> Connection Help Required
              </div>
              <div>
                If you are using the web version, modern browsers block connections to local servers (localhost) due to <strong>Mixed Content</strong> or <strong>Private Network Access</strong> policies.
              </div>
              <div style={{ borderTop: '1px solid rgba(239, 68, 68, 0.15)', paddingTop: '0.4rem', marginTop: '0.2rem' }}>
                <strong>How to Resolve:</strong>
                <ol style={{ paddingLeft: '1.25rem', marginTop: '0.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <li>
                    Accept any browser permission popup asking to <em>"access other apps and services on this device"</em>.
                  </li>
                  <li>
                    Run Ollama with origins enabled in your terminal:
                    <code style={{ display: 'block', fontSize: '0.62rem', backgroundColor: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: '4px', marginTop: '3px', wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      OLLAMA_ORIGINS="*" ollama serve
                    </code>
                  </li>
                  <li>
                    <strong>Best Solution:</strong> Run our native desktop version (using <code>npm run desktop:dev</code>), which is fully exempt from browser sandbox and CORS restrictions!
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* Token Budget Info Banner */}
          <div className="sidebar-section" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
            <div className="instruction-banner">
              <Info className="banner-icon" size={16} />
              <div>
                <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>Token Budget Tip</strong>
                For short inputs, the engine expands the request with prompt framing to improve LLM response quality. For large event logs or drafts, it will compact it to save tokens.
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="workspace">
        <header className="workspace-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Sliders size={20} style={{ color: 'var(--accent-cyan)' }} />
            <h2 className="workspace-title">Prompt Optimization Workspace</h2>
          </div>
          
          <div className="workspace-actions">
            {/* Auto-copy toggle */}
            <div className="switch-container" onClick={() => setAutoCopy(prev => !prev)}>
              <span className="switch-label">Auto-Copy Output</span>
              <div className={`switch-track ${autoCopy ? 'active' : ''}`}>
                <div className="switch-thumb"></div>
              </div>
            </div>

            {/* Custom/System prompts toggle */}
            <button 
              className={`btn btn-secondary ${showSettings ? 'btn-success' : ''}`}
              onClick={() => setShowSettings(prev => !prev)}
            >
              <Settings size={14} /> 
              {showSettings ? 'Hide Prompt Config' : 'Edit System Prompts'}
            </button>
          </div>
        </header>

        {/* Mode Navigation Tabs */}
        <div className="mode-tabs">
          <button 
            className={`mode-tab ${activeMode === 'optimizer' ? 'active' : ''}`}
            onClick={() => setActiveMode('optimizer')}
          >
            Prompt Optimizer
          </button>
          <button 
            className={`mode-tab ${activeMode === 'generator' ? 'active' : ''}`}
            onClick={() => setActiveMode('generator')}
          >
            Prompt Generator
          </button>
        </div>

        {/* Workspace body grid */}
        {activeMode === 'optimizer' ? (
          <div className="workspace-grid">
            {/* Input Panel */}
            <section className="panel-card" aria-label="Unoptimized Prompt Input">
            <div className="panel-header">
              <div className="panel-title-wrapper">
                <FileText size={16} style={{ color: 'var(--accent-amber)' }} />
                <h3 className="panel-title">1. Raw Unstructured Text</h3>
              </div>
              <span className="panel-subtitle">Draft your instructions or logs here</span>
            </div>

            <div className="panel-content">
              <textarea 
                className="prompt-textarea"
                placeholder="Paste your raw, messy description here... e.g.
'I need to write a python script that connects to our server and downloads files. 
It has to run every day at 3am. 
Make sure it checks if the files were already downloaded so it doesn't download twice. 
The server uses sftp, port 22. The user is root, password is test123.
Oh and write logs to a file so we can debug if it breaks.'"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />
            </div>

            {/* Middle Controls (Templates selection) */}
            <div style={{ padding: '0 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                Optimization Presets
              </div>
              <div className="template-chips">
                {Object.entries(SYSTEM_TEMPLATES).map(([key, template]) => (
                  <button 
                    key={key}
                    className={`template-chip ${activeTemplate === key ? 'active' : ''}`}
                    onClick={() => {
                      setActiveTemplate(key);
                      showToast(`Switched to ${template.name}`);
                    }}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* System Prompt Customizer Panel (Conditional) */}
            {showSettings && (
              <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                  <label htmlFor="systemPrompt" style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--accent-cyan)' }}>
                    Active Optimizer Prompt ({SYSTEM_TEMPLATES[activeTemplate].name})
                  </label>
                  {activeTemplate === 'custom' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Editable</span>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '2px 8px', fontSize: '0.65rem', height: '22px', minHeight: 'unset', borderRadius: '4px' }}
                        onClick={handleGenerateCustomSystemPrompt}
                        disabled={isLoading || !inputText.trim()}
                        title="Generate custom optimizer prompt rules based on your input text"
                      >
                        <Sparkles size={10} /> Auto-Draft Rules
                      </button>
                    </div>
                  )}
                </div>
                <textarea 
                  id="systemPrompt"
                  className="input-control"
                  style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', height: '110px', resize: 'none', lineHeight: '1.4' }}
                  value={activeTemplate === 'custom' ? customPrompt : SYSTEM_TEMPLATES[activeTemplate].prompt}
                  onChange={(e) => {
                    if (activeTemplate === 'custom') {
                      setCustomPrompt(e.target.value);
                    }
                  }}
                  disabled={activeTemplate !== 'custom'}
                  placeholder="Enter custom prompt instructions for the optimization engine..."
                />
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <Info size={10} />
                  <span>Only the "Custom Preset" template allows editing of instructions.</span>
                </div>
              </div>
            )}

            <div className="panel-footer">
              <div className="metrics-row">
                <span className="metric-item">Chars: <span className="metric-value">{inputMetrics.characters}</span></span>
                <span className="metric-item">Words: <span className="metric-value">{inputMetrics.words}</span></span>
                <span className="metric-item">Est. Tokens: <span className="metric-value">{inputMetrics.tokens}</span></span>
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleOptimize}
                disabled={isLoading || !inputText.trim()}
              >
                <Sparkles size={14} /> Optimize Prompt
              </button>
            </div>
          </section>

          {/* Output Panel */}
          <section className="panel-card" aria-label="Optimized Prompt Output">
            <div className="panel-header">
              <div className="panel-title-wrapper">
                <Cpu size={16} style={{ color: 'var(--accent-cyan)' }} />
                <h3 className="panel-title">2. Optimized Text (Ready to Copy)</h3>
              </div>
              
              {/* Output Tab switcher */}
              <div className="provider-tabs" style={{ padding: '1px' }}>
                <button 
                  className={`provider-tab ${viewMode === 'output' ? 'active' : ''}`}
                  onClick={() => setViewMode('output')}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                >
                  Raw Clean
                </button>
                <button 
                  className={`provider-tab ${viewMode === 'diff' ? 'active' : ''}`}
                  onClick={() => setViewMode('diff')}
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                  disabled={!optimizedText || optimizedText.startsWith('Error:')}
                >
                  Diff Changes
                </button>
              </div>
            </div>

            <div className="panel-content">
              {/* Loading spinner */}
              {isLoading && !optimizedText && (
                <div className="loading-overlay">
                  <div className="spinner"></div>
                  <div className="loading-text">Optimizing Prompt...</div>
                </div>
              )}

              {/* Text Output vs Diff Mode */}
              {viewMode === 'output' ? (
                <textarea 
                  className="prompt-textarea output"
                  readOnly
                  placeholder="Optimized token-light prompt will appear here..."
                  value={optimizedText}
                />
              ) : (
                <div className="diff-view">
                  {getDiffMarkup().map((chunk, idx) => {
                    if (chunk.type === 'removed') {
                      return <span key={idx} className="diff-removed">{chunk.text}</span>;
                    } else if (chunk.type === 'added') {
                      return <span key={idx} className="diff-added">{chunk.text}</span>;
                    }
                    return <span key={idx}>{chunk.text}</span>;
                  })}
                </div>
              )}
            </div>

            <div className="panel-footer">
              <div className="metrics-row">
                <span className="metric-item">Est. Tokens: <span className="metric-value">{outputMetrics.tokens}</span></span>
                {tokenChange < 0 && (
                  <span className="metric-reduction">
                    {tokenChange}% token reduction
                  </span>
                )}
                {tokenChange > 0 && (
                  <span className="metric-expansion">
                    +{tokenChange}% prompt expansion
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button 
                  className="btn btn-secondary"
                  disabled={!optimizedText || isLoading}
                  onClick={() => handleCopyToClipboard(optimizedText)}
                >
                  {autoCopy ? <ClipboardCheck size={14} /> : <Copy size={14} />} 
                  Copy Prompt
                </button>
              </div>
            </div>
          </section>
        </div>
        ) : (
          <div className="workspace-grid">
            {/* Generator Inputs Panel */}
            <section className="panel-card" aria-label="Prompt Generator Inputs">
              <div className="panel-header">
                <div className="panel-title-wrapper">
                  <Sliders size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <h3 className="panel-title">Prompt Specifications</h3>
                </div>
                <span className="panel-subtitle">Define prompt building blocks</span>
              </div>

              <div className="panel-content" style={{ overflowY: 'auto', padding: '1.25rem', display: 'flex', flexWrap: 'nowrap', flexDirection: 'column', gap: '1rem' }}>
                <div className="form-group">
                  <label htmlFor="genTask" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Task / Objective <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <textarea 
                    id="genTask"
                    className="input-control" 
                    style={{ height: '70px', resize: 'none' }}
                    placeholder="What should the AI do? (e.g. Write a friendly follow-up email to a lead)"
                    value={genTask}
                    onChange={(e) => setGenTask(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="genPersona">Expert Persona / Role</label>
                  <input 
                    type="text"
                    id="genPersona"
                    className="input-control" 
                    placeholder="e.g. Sales Director, Senior Copywriter"
                    value={genPersona}
                    onChange={(e) => setGenPersona(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="genContext">Context / Background</label>
                    <textarea 
                      id="genContext"
                      className="input-control" 
                      style={{ height: '65px', resize: 'none' }}
                      placeholder="Factual context or rules (e.g. error logs, business data)"
                      value={genContext}
                      onChange={(e) => setGenContext(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="genAudience">Target Audience</label>
                    <textarea 
                      id="genAudience"
                      className="input-control" 
                      style={{ height: '65px', resize: 'none' }}
                      placeholder="Who is this for? (e.g. non-tech clients, C-level executives)"
                      value={genAudience}
                      onChange={(e) => setGenAudience(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label htmlFor="genTone">Tone / Style</label>
                    <input 
                      type="text"
                      id="genTone"
                      className="input-control" 
                      placeholder="e.g. Conversational, Professional"
                      value={genTone}
                      onChange={(e) => setGenTone(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="genFormat">Deliverable Format</label>
                    <input 
                      type="text"
                      id="genFormat"
                      className="input-control" 
                      placeholder="e.g. 3 paragraphs, Markdown bullet list"
                      value={genFormat}
                      onChange={(e) => setGenFormat(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="genConstraints">Negative Constraints / Rules</label>
                  <textarea 
                    id="genConstraints"
                    className="input-control" 
                    style={{ height: '55px', resize: 'none' }}
                    placeholder="e.g. Do not sound pushy, don't use greetings, keep under 150 words"
                    value={genConstraints}
                    onChange={(e) => setGenConstraints(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="genExamples">Few-Shot Examples (Input to Output exemplars)</label>
                  <textarea 
                    id="genExamples"
                    className="input-control" 
                    style={{ height: '55px', resize: 'none' }}
                    placeholder="Provide 1-2 examples of target input and output to guide the AI..."
                    value={genExamples}
                    onChange={(e) => setGenExamples(e.target.value)}
                  />
                </div>
              </div>

              <div className="panel-footer">
                <div className="metrics-row">
                  <span className="metric-item">Inputs Chars: <span className="metric-value">{getMetrics(genTask + genPersona + genContext + genAudience + genFormat + genTone + genConstraints + genExamples).characters}</span></span>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={handleGeneratePrompt}
                  disabled={isLoading || !genTask.trim()}
                >
                  <Sparkles size={14} /> Generate Prompt
                </button>
              </div>
            </section>

            {/* Generator Output Panel */}
            <section className="panel-card" aria-label="Generated Prompt Result">
              <div className="panel-header">
                <div className="panel-title-wrapper">
                  <Cpu size={16} style={{ color: 'var(--accent-cyan)' }} />
                  <h3 className="panel-title">Generated Prompt</h3>
                </div>
                <span className="panel-subtitle">Copy-pasteable structured prompt</span>
              </div>

              <div className="panel-content">
                {isLoading && !generatedText && (
                  <div className="loading-overlay">
                    <div className="spinner"></div>
                    <div className="loading-text">Generating Prompt...</div>
                  </div>
                )}
                <textarea 
                  className="prompt-textarea output"
                  readOnly
                  placeholder="The generated prompt will stream here..."
                  value={generatedText}
                />
              </div>

              <div className="panel-footer">
                <div className="metrics-row">
                  <span className="metric-item">Est. Tokens: <span className="metric-value">{getMetrics(generatedText).tokens}</span></span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-secondary"
                    disabled={!generatedText || isLoading}
                    onClick={() => handleCopyToClipboard(generatedText)}
                  >
                    {autoCopy ? <ClipboardCheck size={14} /> : <Copy size={14} />} 
                    Copy Prompt
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Floating Notification Toast */}
      {toast.show && (
        <div className="toast" role="alert">
          <Check size={16} className="toast-icon" />
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

export default App;
