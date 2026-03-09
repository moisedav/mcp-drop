import APIKeyManager from './APIKeyManager.js';

const SYSTEM_PROMPT_APPEND = 'Be concise. When tools return large data (XML, JSON, HTML), extract only what is needed for the user\'s request. Never repeat large data blocks back to the user. If you need specific details, call the tool again with more specific parameters. When the user asks you to modify code, content, or design, inspect only the minimum necessary context and then act. Do not narrate your internal search process to the user. If you already have enough context to make the change, make it directly. For edit requests, prefer one focused inspection and then perform the edit immediately.';
const DEFAULT_SYSTEM_PROMPT = `You are a helpful AI assistant with access to external tools via MCP (Model Context Protocol). Use the available tools when needed to help the user accomplish their tasks. Be concise and efficient.\n\n${SYSTEM_PROMPT_APPEND}`;
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com';
const ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;
const MAX_TOOL_RESULT_HINT_CHARS = 3000;
const MAX_TOOL_RESULT_TRUNCATE_CHARS = 20000;
const MAX_TOOL_ITERATIONS = 8;
const MAX_HISTORY_MESSAGES = 24;
const MAX_HISTORY_TOKENS = 24000;
const MAX_TOOL_RESULT_MESSAGE_AGE = 8;
const RATE_LIMIT_RETRY_SECONDS = 15;
const MAX_IDENTICAL_TOOL_CALLS = 2;

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stableStringify(value) {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(',')}]`;
  }
  if (typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function serializeToolResult(result) {
  if (typeof result === 'string') return result;

  try {
    return JSON.stringify(result, null, 2);
  } catch {
    return JSON.stringify({ error: 'Tool result could not be serialized' });
  }
}

function optimizeToolResultContent(result) {
  if (result.length > MAX_TOOL_RESULT_TRUNCATE_CHARS) {
    const omittedChars = result.length - MAX_TOOL_RESULT_TRUNCATE_CHARS;
    return `${result.slice(0, MAX_TOOL_RESULT_TRUNCATE_CHARS)}\n\n[truncated ${omittedChars} chars - ask for specific details]`;
  }

  if (result.length > MAX_TOOL_RESULT_HINT_CHARS) {
    return `${result}\n\n[large result: ${result.length} chars - ask for specific details if needed]`;
  }

  return result;
}

function safeJson(response) {
  return response.json().catch(() => null);
}

function createFriendlyError(message, status) {
  const err = new Error(message);
  if (status) err.status = status;
  return err;
}

async function extractResponseError(response) {
  const err = await safeJson(response);
  const status = response.status;

  if (status === 429) {
    return createFriendlyError('Too much data was sent at once. Try a more specific question.', status);
  }
  if (status === 401) {
    return createFriendlyError('Your API key seems invalid. Check Settings to update it.', status);
  }
  if (status >= 500) {
    return createFriendlyError('Anthropic servers are having issues. Try again in a moment.', status);
  }

  return createFriendlyError(err?.error?.message || `HTTP ${status}`, status);
}

function buildHeaders({ key, useProxy }) {
  if (useProxy) {
    return {
      'Content-Type': 'application/json'
    };
  }

  return {
    'Content-Type': 'application/json',
    'x-api-key': key,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true'
  };
}

function normalizeBaseUrl(baseUrl) {
  if (typeof baseUrl !== 'string' || !baseUrl.trim()) {
    return ANTHROPIC_BASE_URL;
  }

  return baseUrl.trim().replace(/\/+$/, '');
}

function buildApiUrl(baseUrl) {
  return `${normalizeBaseUrl(baseUrl)}/v1/messages`;
}

function buildOptimizedSystemPrompt(systemPrompt = DEFAULT_SYSTEM_PROMPT) {
  const normalizedPrompt = typeof systemPrompt === 'string' && systemPrompt.trim()
    ? systemPrompt.trim()
    : DEFAULT_SYSTEM_PROMPT;

  if (normalizedPrompt.includes(SYSTEM_PROMPT_APPEND)) {
    return normalizedPrompt;
  }

  return `${normalizedPrompt}\n\n${SYSTEM_PROMPT_APPEND}`;
}

function buildPayload({ messages, tools, systemPrompt, stream = false }) {
  return {
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildOptimizedSystemPrompt(systemPrompt),
    messages,
    stream,
    ...(tools.length > 0 && { tools })
  };
}

function createEmptyStreamResponse() {
  return {
    stop_reason: null,
    content: []
  };
}

function cloneContentBlock(block) {
  if (!block || typeof block !== 'object') return block;

  const clonedBlock = { ...block };
  delete clonedBlock._inputJsonBuffer;
  return clonedBlock;
}

function finalizeToolUseBlock(block) {
  if (!block || block.type !== 'tool_use') return cloneContentBlock(block);

  const finalized = cloneContentBlock(block);
  const inputJsonBuffer = typeof block._inputJsonBuffer === 'string' ? block._inputJsonBuffer : '';

  if (inputJsonBuffer) {
    try {
      finalized.input = JSON.parse(inputJsonBuffer);
    } catch {
      finalized.input = { raw: inputJsonBuffer };
    }
  } else if (!finalized.input || typeof finalized.input !== 'object') {
    finalized.input = {};
  }

  return finalized;
}

function finalizeContentBlocks(content = []) {
  return content
    .filter(Boolean)
    .map((block) => finalizeToolUseBlock(block));
}

function extractTextFromContent(content = []) {
  return content
    .filter((block) => block?.type === 'text')
    .map((block) => block.text || '')
    .join('');
}

function normalizeToolApprovalDecision(decision) {
  if (decision === false) {
    return { allowed: false, alwaysAllow: false };
  }

  if (decision === true || decision === undefined || decision === null) {
    return { allowed: true, alwaysAllow: false };
  }

  if (typeof decision === 'object') {
    return {
      allowed: decision.allowed !== false,
      alwaysAllow: Boolean(decision.alwaysAllow)
    };
  }

  return { allowed: true, alwaysAllow: false };
}

function estimateTokensFromText(value) {
  return Math.ceil(String(value || '').length / 4);
}

function normalizeContentToText(content, { includeToolResults = true } = {}) {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content.map((block) => {
    if (!block || typeof block !== 'object') return '';
    if (block.type === 'text') return block.text || '';
    if (block.type === 'tool_use') return `Tool call: ${block.name || 'unknown tool'}`;
    if (block.type === 'tool_result') {
      if (!includeToolResults) return 'Earlier tool result omitted to save tokens.';
      return typeof block.content === 'string' ? block.content : stableStringify(block.content);
    }
    return '';
  }).filter(Boolean).join('\n');
}

function cloneMessageForApi(message) {
  if (!message || typeof message !== 'object') return null;

  if (typeof message.content === 'string') {
    return { role: message.role, content: message.content };
  }

  if (!Array.isArray(message.content)) {
    return { role: message.role, content: '' };
  }

  const content = message.content
    .map((block) => {
      if (!block || typeof block !== 'object') return null;
      return { ...block };
    })
    .filter(Boolean);

  if (content.length === 0) return null;

  return { role: message.role, content };
}

function assistantMessageHasToolUse(message) {
  return Array.isArray(message?.content) && message.content.some((block) => block?.type === 'tool_use');
}

function userMessageHasToolResults(message) {
  return Array.isArray(message?.content) && message.content.some((block) => block?.type === 'tool_result');
}

function getToolUseIds(message) {
  if (!Array.isArray(message?.content)) return new Set();
  return new Set(
    message.content
      .filter((block) => block?.type === 'tool_use' && block.id)
      .map((block) => String(block.id))
  );
}

function validateToolResultPairs(messages = []) {
  const sanitizedMessages = [];

  for (const message of messages) {
    const clonedMessage = cloneMessageForApi(message);
    if (!clonedMessage) continue;

    if (clonedMessage.role !== 'user' || !Array.isArray(clonedMessage.content)) {
      sanitizedMessages.push(clonedMessage);
      continue;
    }

    const hasToolResults = clonedMessage.content.some((block) => block?.type === 'tool_result');
    if (!hasToolResults) {
      sanitizedMessages.push(clonedMessage);
      continue;
    }

    const previousMessage = sanitizedMessages[sanitizedMessages.length - 1];
    const validToolUseIds = getToolUseIds(previousMessage);
    const filteredContent = clonedMessage.content.filter((block) => {
      if (block?.type !== 'tool_result') return true;
      return validToolUseIds.has(String(block.tool_use_id || ''));
    });

    if (filteredContent.length !== clonedMessage.content.length) {
      console.warn('[mcp-drop] Removed orphaned tool_result blocks before sending to Anthropic.');
    }

    if (filteredContent.length === 0) {
      continue;
    }

    sanitizedMessages.push({
      ...clonedMessage,
      content: filteredContent
    });
  }

  return sanitizedMessages;
}

function buildConversationRounds(messages = []) {
  const rounds = [];

  for (let index = 0; index < messages.length;) {
    const current = messages[index];
    if (!current) {
      index += 1;
      continue;
    }

    const next = messages[index + 1];
    const afterNext = messages[index + 2];

    if (
      current.role === 'user' &&
      next?.role === 'assistant' &&
      assistantMessageHasToolUse(next) &&
      afterNext?.role === 'user' &&
      userMessageHasToolResults(afterNext)
    ) {
      rounds.push({
        messages: [current, next, afterNext],
        startIndex: index,
        endIndex: index + 2,
        hasToolResults: true
      });
      index += 3;
      continue;
    }

    if (
      current.role === 'assistant' &&
      assistantMessageHasToolUse(current) &&
      next?.role === 'user' &&
      userMessageHasToolResults(next)
    ) {
      rounds.push({
        messages: [current, next],
        startIndex: index,
        endIndex: index + 1,
        hasToolResults: true
      });
      index += 2;
      continue;
    }

    if (
      current.role === 'user' &&
      next?.role === 'assistant'
    ) {
      rounds.push({
        messages: [current, next],
        startIndex: index,
        endIndex: index + 1,
        hasToolResults: false
      });
      index += 2;
      continue;
    }

    rounds.push({
      messages: [current],
      startIndex: index,
      endIndex: index,
      hasToolResults: userMessageHasToolResults(current)
    });
    index += 1;
  }

  return rounds;
}

function flattenRounds(rounds = []) {
  return rounds.flatMap((round) => round.messages);
}

function buildContextMessage(messages) {
  const lines = [];

  for (const message of messages) {
    const label = message.role === 'assistant' ? 'Assistant' : 'User';
    const text = normalizeContentToText(message.content, { includeToolResults: false })
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) continue;
    lines.push(`${label}: ${text.slice(0, 180)}`);
    if (lines.length >= 6) break;
  }

  const summaryText = lines.length > 0
    ? lines.join('\n')
    : 'Earlier context was compressed to save tokens.';

  return {
    role: 'assistant',
    content: `Context from earlier conversation:\n${summaryText}`
  };
}

function estimateMessageTokens(message) {
  if (!message) return 0;
  return estimateTokensFromText(normalizeContentToText(message.content));
}

function estimateConversationTokens({ messages = [], systemPrompt = DEFAULT_SYSTEM_PROMPT }) {
  const messageTokens = messages.reduce((total, message) => total + estimateMessageTokens(message), 0);
  return estimateTokensFromText(buildOptimizedSystemPrompt(systemPrompt)) + messageTokens;
}

function optimizeMessagesForApi(messages = [], systemPrompt = DEFAULT_SYSTEM_PROMPT) {
  const normalizedMessages = validateToolResultPairs(Array.isArray(messages) ? messages : []);
  const rounds = buildConversationRounds(normalizedMessages);
  const toolResultCutoff = Math.max(0, normalizedMessages.length - MAX_TOOL_RESULT_MESSAGE_AGE);

  const olderRounds = [];
  const keptRounds = [];

  for (const round of rounds) {
    if (round.hasToolResults && round.endIndex < toolResultCutoff) {
      olderRounds.push(round);
    } else {
      keptRounds.push(round);
    }
  }

  let optimizedMessages = flattenRounds(keptRounds);
  let estimatedTokens = estimateConversationTokens({ messages: optimizedMessages, systemPrompt });

  while (
    keptRounds.length > 0 &&
    (optimizedMessages.length > MAX_HISTORY_MESSAGES || estimatedTokens > MAX_HISTORY_TOKENS)
  ) {
    olderRounds.push(keptRounds.shift());
    optimizedMessages = flattenRounds(keptRounds);
    estimatedTokens = estimateConversationTokens({ messages: optimizedMessages, systemPrompt });
  }

  if (olderRounds.length > 0) {
    optimizedMessages = [
      buildContextMessage(flattenRounds(olderRounds)),
      ...flattenRounds(keptRounds)
    ];
    estimatedTokens = estimateConversationTokens({ messages: optimizedMessages, systemPrompt });
  }

  while (optimizedMessages.length > MAX_HISTORY_MESSAGES && keptRounds.length > 0) {
    olderRounds.push(keptRounds.shift());
    optimizedMessages = [
      buildContextMessage(flattenRounds(olderRounds)),
      ...flattenRounds(keptRounds)
    ];
    estimatedTokens = estimateConversationTokens({ messages: optimizedMessages, systemPrompt });
  }

  while (estimatedTokens > MAX_HISTORY_TOKENS && keptRounds.length > 0) {
    olderRounds.push(keptRounds.shift());
    optimizedMessages = [
      buildContextMessage(flattenRounds(olderRounds)),
      ...flattenRounds(keptRounds)
    ];
    estimatedTokens = estimateConversationTokens({ messages: optimizedMessages, systemPrompt });
  }

  return {
    messages: optimizedMessages,
    estimatedTokens
  };
}

async function waitForRateLimitRetry(onRetryCountdown) {
  for (let seconds = RATE_LIMIT_RETRY_SECONDS; seconds >= 1; seconds -= 1) {
    if (onRetryCountdown) {
      try {
        onRetryCountdown(seconds);
      } catch {}
    }
    await delay(1000);
  }

  if (onRetryCountdown) {
    try {
      onRetryCountdown(0);
    } catch {}
  }
}

async function requestAnthropic(payload, { onRetryCountdown, baseUrl } = {}) {
  const endpoint = buildApiUrl(baseUrl);
  const useProxy = normalizeBaseUrl(baseUrl) !== ANTHROPIC_BASE_URL;
  const key = useProxy ? null : APIKeyManager.get({ includeStorage: true });

  if (!useProxy && !key) {
    throw createFriendlyError('Your API key seems invalid. Check Settings to update it.', 401);
  }

  let shouldRetry = true;

  while (true) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: buildHeaders({ key, useProxy }),
        body: JSON.stringify(payload)
      });

      if (response.status === 429 && shouldRetry) {
        shouldRetry = false;
        await waitForRateLimitRetry(onRetryCountdown);
        continue;
      }

      if (!response.ok) {
        throw await extractResponseError(response);
      }

      return response;
    } catch (err) {
      if (err?.status === 429 && shouldRetry) {
        shouldRetry = false;
        await waitForRateLimitRetry(onRetryCountdown);
        continue;
      }

      if (err?.status) {
        throw err;
      }

      throw createFriendlyError('Connection failed. Check your internet connection.');
    }
  }
}

async function consumeSseStream(response, onEvent) {
  if (!response.body) {
    throw createFriendlyError('Connection failed. Check your internet connection.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let eventName = '';
  let dataLines = [];

  const dispatch = async () => {
    if (!eventName && dataLines.length === 0) return;
    const event = {
      event: eventName || 'message',
      data: dataLines.join('\n')
    };
    eventName = '';
    dataLines = [];
    await onEvent(event);
  };

  const processLine = async (line) => {
    if (line === '') {
      await dispatch();
      return;
    }

    if (line.startsWith(':')) return;

    const separator = line.indexOf(':');
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? '' : line.slice(separator + 1);

    if (value.startsWith(' ')) {
      value = value.slice(1);
    }

    if (field === 'event') eventName = value;
    if (field === 'data') dataLines.push(value);
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';

      for (const line of lines) {
        await processLine(line);
      }

      if (done) {
        if (buffer) {
          await processLine(buffer);
        }
        await dispatch();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

const AnthropicClient = {
  async send({ messages, tools = [], systemPrompt = DEFAULT_SYSTEM_PROMPT, onRetryCountdown, baseUrl } = {}) {
    try {
      const optimizedConversation = optimizeMessagesForApi(messages, systemPrompt);
      const response = await requestAnthropic(
        buildPayload({
          messages: optimizedConversation.messages,
          tools,
          systemPrompt,
          stream: false
        }),
        { onRetryCountdown, baseUrl }
      );

      return (await safeJson(response)) || {};
    } catch (err) {
      throw createFriendlyError(err?.message || 'Anthropic request failed', err?.status);
    }
  },

  async stream({
    messages,
    tools = [],
    systemPrompt = DEFAULT_SYSTEM_PROMPT,
    onTextDelta,
    onRetryCountdown,
    baseUrl
  } = {}) {
    try {
      const optimizedConversation = optimizeMessagesForApi(messages, systemPrompt);
      const response = await requestAnthropic(
        buildPayload({
          messages: optimizedConversation.messages,
          tools,
          systemPrompt,
          stream: true
        }),
        { onRetryCountdown, baseUrl }
      );

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('application/json')) {
        const data = (await safeJson(response)) || {};
        const text = extractTextFromContent(data.content);
        if (text && onTextDelta) {
          try {
            onTextDelta(text);
          } catch {}
        }
        return data;
      }

      if (!contentType.includes('text/event-stream')) {
        throw createFriendlyError(`Expected text/event-stream, got ${contentType || 'unknown content type'}`);
      }

      const streamResponse = createEmptyStreamResponse();

      await consumeSseStream(response, async (event) => {
        await this._handleStreamEvent(streamResponse, event, onTextDelta);
      });

      return {
        stop_reason: streamResponse.stop_reason,
        content: finalizeContentBlocks(streamResponse.content)
      };
    } catch (err) {
      throw createFriendlyError(err?.message || 'Anthropic streaming request failed', err?.status);
    }
  },

  async sendWithTools({
    messages,
    tools = [],
    systemPrompt,
    onTextDelta,
    onToolCall,
    onToolApproval,
    onRetryCountdown,
    baseUrl
  }) {
    try {
      const allTools = tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        input_schema: tool.input_schema
      }));

      let currentMessages = [...messages];
      let iterationCount = 0;
      let assistantText = '';
      const toolResultCache = new Map();
      const repeatedToolCalls = new Map();

      while (iterationCount < MAX_TOOL_ITERATIONS) {
        iterationCount += 1;
        let roundAssistantText = '';
        const roundDeltas = [];

        const optimizedConversation = optimizeMessagesForApi(currentMessages, systemPrompt);
        const response = await this.stream({
          messages: optimizedConversation.messages,
          tools: allTools,
          systemPrompt,
          onRetryCountdown,
          baseUrl,
          onTextDelta: (delta) => {
            if (!delta) return;
            roundAssistantText += delta;
            roundDeltas.push(delta);
          }
        });

        if (response.stop_reason !== 'tool_use') {
          assistantText += roundAssistantText;

          if (onTextDelta && roundDeltas.length > 0) {
            let emittedText = assistantText.slice(0, assistantText.length - roundAssistantText.length);
            for (const delta of roundDeltas) {
              emittedText += delta;
              try {
                onTextDelta({ delta, text: emittedText });
              } catch {}
            }
          }

          return assistantText || extractTextFromContent(response.content);
        }

        const assistantMsg = { role: 'assistant', content: response.content };
        const toolUseBlocks = (response.content || []).filter((block) => block.type === 'tool_use');
        const toolResults = [];

        for (const block of toolUseBlocks) {
          const toolCallKey = `${block.name}:${stableStringify(block.input || {})}`;
          const repeatCount = (repeatedToolCalls.get(toolCallKey) || 0) + 1;
          repeatedToolCalls.set(toolCallKey, repeatCount);

          if (repeatCount > MAX_IDENTICAL_TOOL_CALLS) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `This exact tool call was already used multiple times. Use the context you already gathered and make the requested change directly. If more data is needed, call a more specific tool with narrower parameters.`,
              is_error: true
            });
            continue;
          }

          const tool = tools.find((candidate) => candidate.name === block.name);
          const approval = await this._requestToolApproval(block, tool, onToolApproval);

          if (!approval.allowed) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: block.id,
              content: `Tool "${block.name}" was denied by the user.`,
              is_error: true
            });
            continue;
          }

          if (onToolCall) {
            try {
              onToolCall(block.name);
            } catch {}
          }

          let result = { error: `Tool "${block.name}" not found` };
          let isError = !tool;

          if (tool) {
            try {
              result = await tool.execute(block.input || {});
              isError = false;
            } catch (err) {
              result = { error: err?.message || `Tool "${block.name}" failed` };
              isError = true;
            }
          }

          const serializedResult = serializeToolResult(result);
          const cacheKey = `${block.name}:${stableStringify(block.input || {})}`;
          const cachedResult = toolResultCache.get(cacheKey);

          let optimizedResultContent;
          if (
            cachedResult &&
            cachedResult.raw === serializedResult &&
            cachedResult.optimizedContent
          ) {
            optimizedResultContent = cachedResult.optimizedContent;
          } else {
            optimizedResultContent = optimizeToolResultContent(serializedResult);
            if (serializedResult.length > MAX_TOOL_RESULT_HINT_CHARS || serializedResult.length > MAX_TOOL_RESULT_TRUNCATE_CHARS) {
              toolResultCache.set(cacheKey, {
                raw: serializedResult,
                optimizedContent: optimizedResultContent
              });
            }
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: optimizedResultContent,
            ...(isError ? { is_error: true } : {})
          });
        }

        currentMessages = [
          ...currentMessages,
          assistantMsg,
          { role: 'user', content: toolResults }
        ];
      }

      throw createFriendlyError(`Tool loop exceeded ${MAX_TOOL_ITERATIONS} rounds`);
    } catch (err) {
      throw createFriendlyError(err?.message || 'Anthropic tool execution failed', err?.status);
    }
  },

  estimateConversationTokens({ messages = [], systemPrompt = DEFAULT_SYSTEM_PROMPT } = {}) {
    return estimateConversationTokens({ messages, systemPrompt });
  },

  async _requestToolApproval(block, tool, onToolApproval) {
    if (!onToolApproval) {
      return { allowed: true, alwaysAllow: false };
    }

    const decision = await onToolApproval({
      name: block.name,
      description: tool?.description || '',
      input: block.input || {},
      inputSchema: tool?.input_schema || {}
    });

    return normalizeToolApprovalDecision(decision);
  },

  async _handleStreamEvent(response, event, onTextDelta) {
    if (event.event === 'ping') return;

    let payload = null;
    if (event.data) {
      try {
        payload = JSON.parse(event.data);
      } catch {
        payload = null;
      }
    }

    if (event.event === 'error') {
      throw createFriendlyError(payload?.error?.message || payload?.message || 'Anthropic streaming error');
    }

    if (!payload || typeof payload !== 'object') return;

    if (event.event === 'message_start') {
      response.stop_reason = payload.message?.stop_reason || response.stop_reason;
      return;
    }

    if (event.event === 'content_block_start') {
      const block = cloneContentBlock(payload.content_block || {});

      if (block.type === 'text') {
        block.text = typeof block.text === 'string' ? block.text : '';
        if (block.text && onTextDelta) {
          try {
            onTextDelta(block.text);
          } catch {}
        }
      }

      if (block.type === 'tool_use') {
        block.input = block.input && typeof block.input === 'object' ? block.input : {};
        block._inputJsonBuffer = '';
      }

      response.content[payload.index] = block;
      return;
    }

    if (event.event === 'content_block_delta') {
      const block = response.content[payload.index] || { type: 'text', text: '' };
      const delta = payload.delta || {};

      if (delta.type === 'text_delta') {
        block.type = 'text';
        block.text = `${block.text || ''}${delta.text || ''}`;
        if (delta.text && onTextDelta) {
          try {
            onTextDelta(delta.text);
          } catch {}
        }
      }

      if (delta.type === 'input_json_delta') {
        block.type = 'tool_use';
        block._inputJsonBuffer = `${block._inputJsonBuffer || ''}${delta.partial_json || ''}`;
      }

      response.content[payload.index] = block;
      return;
    }

    if (event.event === 'content_block_stop') {
      response.content[payload.index] = finalizeToolUseBlock(response.content[payload.index]);
      return;
    }

    if (event.event === 'message_delta') {
      response.stop_reason = payload.delta?.stop_reason || response.stop_reason;
      return;
    }

    if (event.event === 'message_stop') {
      response.content = finalizeContentBlocks(response.content);
    }
  }
};

export default AnthropicClient;
