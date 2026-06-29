/**
 * API client services for Promptify.
 * Handles communication with local Ollama instances and cloud LLMs (Gemini, OpenAI).
 */

/**
 * Checks the connection to Ollama and retrieves the list of installed models.
 * @param {string} ollamaUrl Base URL for the local Ollama instance
 * @returns {Promise<string[]>} List of model names
 */
export async function fetchOllamaModels(ollamaUrl = 'http://localhost:11434') {
  const url = `${ollamaUrl.replace(/\/$/, '')}/api/tags`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error(`HTTP status error: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.models) {
      return data.models.map(m => m.name);
    }
    return [];
  } catch (error) {
    console.error('Failed to fetch Ollama models:', error);
    throw new Error(
      `Could not connect to Ollama. Make sure it is running on ${ollamaUrl} and CORS is enabled. Run:\n` +
      `OLLAMA_ORIGINS="*" ollama serve\n` +
      `to allow access from browser applications.`
    );
  }
}

/**
 * Optimizes prompt using local Ollama model.
 * @param {string} ollamaUrl Base Ollama URL
 * @param {string} model Model name
 * @param {string} systemPrompt Prompt engineering rules
 * @param {string} userText Raw prompt text to optimize
 * @returns {Promise<string>} Optimized prompt
 */
export async function optimizeWithOllama(ollamaUrl, model, systemPrompt, userText) {
  const url = `${ollamaUrl.replace(/\/$/, '')}/api/chat`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        stream: false,
        think:false,
        options: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama Chat API returned status: ${response.status}`);
    }

    const data = await response.json();
    console.log(data)
    return data.message?.content || '';
  } catch (error) {
    console.error('Ollama generation failed:', error);
    throw new Error(`Ollama generation failed: ${error.message}`);
  }
}

/**
 * Optimizes prompt using Google Gemini API.
 * @param {string} apiKey Google AI Studio API Key
 * @param {string} model Gemini model name (e.g. gemini-2.5-flash)
 * @param {string} systemPrompt System guidelines
 * @param {string} userText Raw input
 * @returns {Promise<string>} Optimized prompt
 */
export async function optimizeWithGemini(apiKey, model = 'gemini-2.5-flash', systemPrompt, userText) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: userText }]
          }
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }]
        },
        generationConfig: {
          temperature: 0.2
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const output = candidate?.content?.parts?.[0]?.text;
    if (!output) {
      throw new Error('Gemini API returned an empty response.');
    }
    return output;
  } catch (error) {
    console.error('Gemini generation failed:', error);
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

/**
 * Optimizes prompt using OpenAI API.
 * @param {string} apiKey OpenAI API Key
 * @param {string} model OpenAI model name (e.g. gpt-4o-mini)
 * @param {string} systemPrompt System guidelines
 * @param {string} userText Raw input
 * @returns {Promise<string>} Optimized prompt
 */
export async function optimizeWithOpenAI(apiKey, model = 'gpt-4o-mini', systemPrompt, userText) {
  const url = 'https://api.openai.com/v1/chat/completions';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content;
    if (!output) {
      throw new Error('OpenAI API returned an empty response.');
    }
    return output;
  } catch (error) {
    console.error('OpenAI generation failed:', error);
    throw new Error(`OpenAI API Error: ${error.message}`);
  }
}

/**
 * Optimizes prompt using streaming local Ollama model.
 * @param {string} ollamaUrl Base Ollama URL
 * @param {string} model Model name
 * @param {string} systemPrompt System guidelines
 * @param {string} userText Raw text
 * @param {function} onChunk Callback triggered on each token chunk
 */
export async function optimizeWithOllamaStream(ollamaUrl, model, systemPrompt, userText, onChunk) {
  const url = `${ollamaUrl.replace(/\/$/, '')}/api/chat`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      stream: true,
      think:false,
      options: {
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    throw new Error(`Ollama Chat API returned status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Save partial line back to buffer
      

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const content = json.message?.content || '';
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          console.warn('Failed to parse Ollama stream chunk:', e);
        }
      }
    }

    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        const content = json.message?.content || '';
        if (content) onChunk(content);
      } catch (e) {}
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Optimizes prompt using streaming Google Gemini API.
 */
export async function optimizeWithGeminiStream(apiKey, model = 'gemini-2.5-flash', systemPrompt, userText, onChunk) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: userText }]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      generationConfig: {
        temperature: 0.2
      }
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      console.log(done,value)
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      
      let bracketDepth = 0;
      let startIdx = -1;

      for (let i = 0; i < buffer.length; i++) {
        if (buffer[i] === '{') {
          if (bracketDepth === 0) startIdx = i;
          bracketDepth++;
        } else if (buffer[i] === '}') {
          bracketDepth--;
          if (bracketDepth === 0 && startIdx !== -1) {
            const jsonStr = buffer.slice(startIdx, i + 1);
            try {
              const json = JSON.parse(jsonStr);
              const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
              if (text) onChunk(text);
            } catch (e) {
              console.warn('Failed to parse Gemini stream chunk:', e);
            }
            buffer = buffer.slice(i + 1);
            i = -1; // Reset search from start of remaining buffer
            startIdx = -1;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Optimizes prompt using streaming OpenAI API.
 */
export async function optimizeWithOpenAIStream(apiKey, model = 'gpt-4o-mini', systemPrompt, userText, onChunk) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      temperature: 0.2,
      stream: true
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine.startsWith('data: ')) continue;

        const dataStr = cleanLine.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const json = JSON.parse(dataStr);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          console.warn('Failed to parse OpenAI SSE stream chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// Claude integration
export async function optimizeWithClaude(apiKey, model = 'claude-3-5-sonnet-latest', systemPrompt, userText) {
  const url = 'https://api.anthropic.com/v1/messages';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 4000,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userText }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;
    if (!content) {
      throw new Error('Claude API returned an empty response.');
    }
    return content;
  } catch (error) {
    console.error('Claude generation failed:', error);
    throw new Error(`Claude API Error: ${error.message}`);
  }
}

export async function optimizeWithClaudeStream(apiKey, model = 'claude-3-5-sonnet-latest', systemPrompt, userText, onChunk) {
  const url = 'https://api.anthropic.com/v1/messages';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true'
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userText }
      ],
      stream: true
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine.startsWith('data: ')) continue;

        const dataStr = cleanLine.slice(6);
        try {
          const json = JSON.parse(dataStr);
          if (json.type === 'content_block_delta') {
            const content = json.delta?.text || '';
            if (content) {
              onChunk(content);
            }
          }
        } catch (e) {
          // Ignore partial or non-json events
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// OpenRouter integration
export async function optimizeWithOpenRouter(apiKey, model = 'google/gemini-2.5-flash', systemPrompt, userText) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://github.com/google/promptify',
        'X-Title': 'Promptify'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenRouter API returned empty content.');
    return content;
  } catch (error) {
    console.error('OpenRouter generation failed:', error);
    throw new Error(`OpenRouter API Error: ${error.message}`);
  }
}

export async function optimizeWithOpenRouterStream(apiKey, model = 'google/gemini-2.5-flash', systemPrompt, userText, onChunk) {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://github.com/google/promptify',
      'X-Title': 'Promptify'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      temperature: 0.2,
      stream: true
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine.startsWith('data: ')) continue;

        const dataStr = cleanLine.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const json = JSON.parse(dataStr);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          console.warn('Failed to parse OpenRouter stream chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// DeepSeek integration
export async function optimizeWithDeepSeek(apiKey, model = 'deepseek-chat', systemPrompt, userText) {
  const url = 'https://api.deepseek.com/chat/completions';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userText }
        ],
        temperature: 0.2
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('DeepSeek API returned empty content.');
    return content;
  } catch (error) {
    console.error('DeepSeek generation failed:', error);
    throw new Error(`DeepSeek API Error: ${error.message}`);
  }
}

export async function optimizeWithDeepSeekStream(apiKey, model = 'deepseek-chat', systemPrompt, userText, onChunk) {
  const url = 'https://api.deepseek.com/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      temperature: 0.2,
      stream: true
    })
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || `HTTP ${response.status}`;
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const cleanLine = line.trim();
        if (!cleanLine.startsWith('data: ')) continue;

        const dataStr = cleanLine.slice(6);
        if (dataStr === '[DONE]') continue;

        try {
          const json = JSON.parse(dataStr);
          const content = json.choices?.[0]?.delta?.content || '';
          if (content) {
            onChunk(content);
          }
        } catch (e) {
          console.warn('Failed to parse DeepSeek stream chunk:', e);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
