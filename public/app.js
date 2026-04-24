const DEFAULT_BASE_URL = "https://api.deepseek.com";

const DEFAULT_REQUEST_CONFIG = {
  systemPrompt: "",
  model: "deepseek-v4-flash",
  thinkingType: "enabled",
  reasoningEffort: "high",
  stream: true,
  includeUsage: true,
  responseFormatType: "text",
  maxTokens: "",
  temperature: "",
  topP: "",
  presencePenalty: "",
  frequencyPenalty: "",
  stop: "",
  logprobs: false,
  topLogprobs: "",
  toolsJson: "",
  toolChoiceMode: "auto",
  toolChoiceName: "",
  toolChoiceCustomJson: "",
  extraBodyJson: "",
};

const MARKDOWN_PARSER = window.marked;
const HTML_SANITIZER = window.DOMPurify;
const MATH_RENDERER = window.renderMathInElement;
const MATH_TYPESETTER = window.katex;
const COMPOSER_EDITOR = window.Vditor;
const COMPOSER_PLACEHOLDER =
  "\u8f93\u5165\u95ee\u9898\uff0c\u652f\u6301 Markdown / KaTeX\uff0cEnter \u53d1\u9001\uff0cShift + Enter \u6362\u884c";
const MARKDOWN_FORMATTING_GUARD = "\ue000";
const MARKDOWN_FORMATTING_MARKERS = "(\\*\\*|~~|\\*)";
const MARKDOWN_FORMATTING_OPEN_PATTERN = new RegExp(
  `([^\\s])${MARKDOWN_FORMATTING_MARKERS}(?=[\\u201c\\u2018"'\\u300c\\u300e\\u300a\\u3008\\uff08\\uff3b\\uff5b\\u3010\\u3014\\u3016\\u3018\\u301a\\(\\[\\{])`,
  "gu",
);
const MARKDOWN_FORMATTING_CLOSE_PATTERN = new RegExp(
  `([\\u201d\\u2019"'\\u300d\\u300f\\u300b\\u3009\\uff09\\uff3d\\uff5d\\u3011\\u3015\\u3017\\u3019\\u301b\\)\\]\\}\\u3002\\uff0e\\.\\uff0c,\\u3001\\uff1b;\\uff1a:\\uff01!\\uff1f?\\u2026])${MARKDOWN_FORMATTING_MARKERS}(?=\\S)`,
  "gu",
);
const MATH_RENDER_OPTIONS = {
  delimiters: [
    { left: "$$", right: "$$", display: true },
    { left: "\\[", right: "\\]", display: true },
    { left: "$", right: "$", display: false },
    { left: "\\(", right: "\\)", display: false },
  ],
  ignoredTags: ["script", "noscript", "style", "textarea", "pre", "code", "option"],
  output: "html",
  strict: "ignore",
  throwOnError: false,
};

if (MARKDOWN_PARSER?.setOptions) {
  MARKDOWN_PARSER.setOptions({
    breaks: true,
    gfm: true,
  });
}

const runtime = {
  controllers: new Map(),
  pendingConversationIds: new Set(),
  modelCatalog: [],
  modelStatus: "点击“同步模型”从当前 Base URL 获取官方模型列表。",
  saveTimer: null,
  renderQueued: false,
  customSelects: new Map(),
  replaySource: null,
  streamStates: new Map(),
  streamDomQueue: new Set(),
  streamDomFrame: null,
  thinkingTimerId: null,
  compactViewport: isCompactViewport(),
  sidebarCollapsed: false,
  sidebarOpen: false,
  inspectorOpen: false,
  composerEditor: null,
  composerEditorReady: false,
  composerSyncing: false,
  composerSyncFrame: null,
  settingsTest: {
    state: "idle",
    text: "未测试。",
    details: "测试请求不会写入当前对话历史。",
  },
  notice: {
    type: "info",
    text: "",
  },
};

const refs = {
  apiKeyInput: document.getElementById("apiKeyInput"),
  baseUrlInput: document.getElementById("baseUrlInput"),
  clearConversationBtn: document.getElementById("clearConversationBtn"),
  composerForm: document.getElementById("composerForm"),
  composerInput: document.getElementById("composerInput"),
  conversationCount: document.getElementById("conversationCount"),
  conversationList: document.getElementById("conversationList"),
  conversationMeta: document.getElementById("conversationMeta"),
  conversationTitleInput: document.getElementById("conversationTitleInput"),
  deleteConversationBtn: document.getElementById("deleteConversationBtn"),
  duplicateConversationBtn: document.getElementById("duplicateConversationBtn"),
  customModelField: document.getElementById("customModelField"),
  customModelInput: document.getElementById("customModelInput"),
  extraBodyInput: document.getElementById("extraBodyInput"),
  frequencyPenaltyInput: document.getElementById("frequencyPenaltyInput"),
  includeUsageToggle: document.getElementById("includeUsageToggle"),
  inspectorBackdrop: document.getElementById("inspectorBackdrop"),
  inspectorCloseBtn: document.getElementById("inspectorCloseBtn"),
  inspectorDrawer: document.getElementById("inspectorDrawer"),
  inspectorToggleBtn: document.getElementById("inspectorToggleBtn"),
  logprobsToggle: document.getElementById("logprobsToggle"),
  maxTokensInput: document.getElementById("maxTokensInput"),
  messagesPanel: document.getElementById("messagesPanel"),
  modelPresetSelect: document.getElementById("modelPresetSelect"),
  newConversationBtn: document.getElementById("newConversationBtn"),
  noticeBanner: document.getElementById("noticeBanner"),
  presencePenaltyInput: document.getElementById("presencePenaltyInput"),
  reasoningEffortSelect: document.getElementById("reasoningEffortSelect"),
  rememberApiKeyInput: document.getElementById("rememberApiKeyInput"),
  requestPreview: document.getElementById("requestPreview"),
  responseFormatSelect: document.getElementById("responseFormatSelect"),
  settingsTestBtn: document.getElementById("settingsTestBtn"),
  settingsTestDetails: document.getElementById("settingsTestDetails"),
  settingsTestStatus: document.getElementById("settingsTestStatus"),
  sendBtn: document.getElementById("sendBtn"),
  sidebarApiKeyStatus: document.getElementById("sidebarApiKeyStatus"),
  sidebarBaseUrlSummary: document.getElementById("sidebarBaseUrlSummary"),
  sidebarCloseBtn: document.getElementById("sidebarCloseBtn"),
  sidebarDockToggleBtn: document.getElementById("sidebarDockToggleBtn"),
  sidebarModelSummary: document.getElementById("sidebarModelSummary"),
  sidebarScrim: document.getElementById("sidebarScrim"),
  sidebarToggleBtn: document.getElementById("sidebarToggleBtn"),
  stopBtn: document.getElementById("stopBtn"),
  stopInput: document.getElementById("stopInput"),
  streamToggle: document.getElementById("streamToggle"),
  systemPromptInput: document.getElementById("systemPromptInput"),
  temperatureInput: document.getElementById("temperatureInput"),
  thinkingTypeSelect: document.getElementById("thinkingTypeSelect"),
  toolChoiceCustomInput: document.getElementById("toolChoiceCustomInput"),
  toolChoiceModeSelect: document.getElementById("toolChoiceModeSelect"),
  toolChoiceNameInput: document.getElementById("toolChoiceNameInput"),
  toolsJsonInput: document.getElementById("toolsJsonInput"),
  topLogprobsInput: document.getElementById("topLogprobsInput"),
  topPInput: document.getElementById("topPInput"),
};

let state = createDefaultState();

function createId() {
  return crypto.randomUUID();
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value, fallback = "") {
  if (typeof value === "string") {
    return value;
  }

  if (value === null || value === undefined) {
    return fallback;
  }

  return String(value);
}

function escapeHtml(value) {
  return asString(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderDisplayMathBlock(source) {
  if (!MATH_TYPESETTER?.renderToString) {
    return null;
  }

  const math = asString(source).trim();
  if (!math) {
    return null;
  }

  try {
    return `<div class="math-block">${MATH_TYPESETTER.renderToString(math, {
      displayMode: true,
      output: "html",
      strict: "ignore",
      throwOnError: false,
    })}</div>`;
  } catch (error) {
    console.warn("Display math rendering failed.", error);
    return null;
  }
}

function replaceDisplayMathBlocks(source) {
  const text = asString(source);
  if (!MATH_TYPESETTER?.renderToString) {
    return text;
  }

  const lines = text.split("\n");
  const output = [];
  let inFence = false;
  let fenceMarker = "";

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);

    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (!inFence) {
        inFence = true;
        fenceMarker = marker;
      } else if (marker === fenceMarker) {
        inFence = false;
        fenceMarker = "";
      }
      output.push(line);
      continue;
    }

    if (inFence) {
      output.push(line);
      continue;
    }

    const inlineDollarMatch = line.match(/^\s*\$\$\s*(.*?)\s*\$\$\s*$/);
    const inlineBracketMatch = line.match(/^\s*\\\[\s*(.*?)\s*\\\]\s*$/);
    const inlineMatch = inlineDollarMatch || inlineBracketMatch;

    if (inlineMatch?.[1]) {
      const rendered = renderDisplayMathBlock(inlineMatch[1]);
      if (rendered) {
        output.push(rendered);
        continue;
      }
    }

    if (/^\s*(\$\$|\\\[)\s*$/.test(line)) {
      const closePattern = line.includes("$$") ? /^\s*\$\$\s*$/ : /^\s*\\\]\s*$/;
      const mathLines = [];
      let cursor = index + 1;

      while (cursor < lines.length && !closePattern.test(lines[cursor])) {
        mathLines.push(lines[cursor]);
        cursor += 1;
      }

      if (cursor < lines.length) {
        const rendered = renderDisplayMathBlock(mathLines.join("\n"));
        if (rendered) {
          output.push(rendered);
          index = cursor;
          continue;
        }
      }
    }

    output.push(line);
  }

  return output.join("\n");
}

function normalizeMarkdownFormatting(source) {
  return asString(source)
    .replace(MARKDOWN_FORMATTING_OPEN_PATTERN, `$1$2${MARKDOWN_FORMATTING_GUARD}`)
    .replace(MARKDOWN_FORMATTING_CLOSE_PATTERN, `$1${MARKDOWN_FORMATTING_GUARD}$2`);
}

function renderMarkdownHtml(source) {
  if (!MARKDOWN_PARSER?.parse || !HTML_SANITIZER?.sanitize) {
    return null;
  }

  const parsed = MARKDOWN_PARSER.parse(
    normalizeMarkdownFormatting(replaceDisplayMathBlocks(source)),
  ).replaceAll(MARKDOWN_FORMATTING_GUARD, "");

  return HTML_SANITIZER.sanitize(parsed, {
    USE_PROFILES: {
      html: true,
    },
  });
}

function finalizeRenderedMarkdown(container) {
  if (!container) {
    return;
  }

  for (const link of container.querySelectorAll("a")) {
    link.target = "_blank";
    link.rel = "noreferrer noopener";
  }

  if (typeof MATH_RENDERER === "function") {
    try {
      MATH_RENDERER(container, MATH_RENDER_OPTIONS);
    } catch (error) {
      console.warn("Math rendering failed.", error);
    }
  }
}

function createMarkdownContent(content) {
  const body = document.createElement("div");
  body.className = "block-content markdown-body";

  const source = asString(content).replace(/\r\n?/g, "\n");
  const renderedHtml = renderMarkdownHtml(source);

  if (renderedHtml === null) {
    body.classList.add("plain-text-render");
    body.textContent = source;
    return body;
  }

  body.innerHTML = renderedHtml;
  finalizeRenderedMarkdown(body);
  return body;
}

function getComposerTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "classic";
}

function getComposerCodeTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "obsidian" : "github";
}

function getComposerValue() {
  if (runtime.composerEditorReady && runtime.composerEditor?.getValue) {
    return runtime.composerEditor.getValue();
  }

  if ("value" in refs.composerInput) {
    return refs.composerInput.value;
  }

  return getActiveConversation().draft;
}

function setComposerValue(value, clearStack = false) {
  const nextValue = asString(value);

  if (runtime.composerEditorReady && runtime.composerEditor?.setValue) {
    if (runtime.composerEditor.getValue() === nextValue) {
      return;
    }

    runtime.composerSyncing = true;
    try {
      runtime.composerEditor.setValue(nextValue, clearStack);
    } finally {
      runtime.composerSyncing = false;
    }
    return;
  }

  if ("value" in refs.composerInput && refs.composerInput.value !== nextValue) {
    refs.composerInput.value = nextValue;
  }
}

function focusComposer() {
  if (runtime.composerEditorReady && runtime.composerEditor?.focus) {
    runtime.composerEditor.focus();
    return;
  }

  refs.composerInput.focus?.();
}

function handleComposerInput(value) {
  if (runtime.composerSyncing) {
    return;
  }

  const conversation = getActiveConversation();
  conversation.draft = asString(value);
  conversation.updatedAt = new Date().toISOString();
  renderRequestPreview();
  schedulePersist();
}

function syncComposerFromEditor() {
  if (!runtime.composerEditorReady || !runtime.composerEditor?.getValue) {
    return;
  }

  handleComposerInput(runtime.composerEditor.getValue());
}

function scheduleComposerSyncFromEditor() {
  if (runtime.composerSyncFrame !== null) {
    return;
  }

  runtime.composerSyncFrame = requestAnimationFrame(() => {
    runtime.composerSyncFrame = null;
    syncComposerFromEditor();
  });
}

function handleComposerKeydown(event) {
  if (event.isComposing || event.key !== "Enter" || event.shiftKey) {
    return;
  }

  event.preventDefault();
  void sendCurrentDraft();
}

function bindComposerEditorDomEvents() {
  const editorElement = refs.composerInput.querySelector(".vditor-ir pre.vditor-reset");

  if (!editorElement) {
    return;
  }

  editorElement.addEventListener("input", scheduleComposerSyncFromEditor);
  editorElement.addEventListener("keyup", scheduleComposerSyncFromEditor);
  editorElement.addEventListener("paste", scheduleComposerSyncFromEditor);
  editorElement.addEventListener("drop", scheduleComposerSyncFromEditor);
}

function initFallbackComposer() {
  const textarea = document.createElement("textarea");
  textarea.id = "composerInput";
  textarea.className = "composer-input composer-fallback";
  textarea.rows = 3;
  textarea.placeholder = COMPOSER_PLACEHOLDER;
  textarea.value = getActiveConversation().draft;
  refs.composerInput.replaceWith(textarea);
  refs.composerInput = textarea;
  textarea.addEventListener("input", () => handleComposerInput(textarea.value));
  textarea.addEventListener("keydown", handleComposerKeydown);
}

function initComposerEditor() {
  if (typeof COMPOSER_EDITOR !== "function") {
    initFallbackComposer();
    return;
  }

  try {
    runtime.composerEditor = new COMPOSER_EDITOR(refs.composerInput, {
      cdn: "/vendor/vditor",
      mode: "ir",
      value: getActiveConversation().draft,
      height: "auto",
      minHeight: 112,
      placeholder: COMPOSER_PLACEHOLDER,
      lang: "zh_CN",
      theme: getComposerTheme(),
      toolbar: [],
      toolbarConfig: {
        hide: true,
        pin: false,
      },
      cache: {
        enable: false,
      },
      counter: {
        enable: false,
      },
      resize: {
        enable: false,
      },
      preview: {
        mode: "editor",
        markdown: {
          codeBlockPreview: true,
          mathBlockPreview: true,
          sanitize: true,
        },
        math: {
          engine: "KaTeX",
          inlineDigit: false,
        },
        hljs: {
          enable: true,
          lineNumber: false,
          style: getComposerCodeTheme(),
        },
      },
      input: handleComposerInput,
      keydown: handleComposerKeydown,
      after() {
        runtime.composerEditorReady = true;
        bindComposerEditorDomEvents();
        renderComposer();
      },
    });
  } catch (error) {
    console.warn("Vditor initialization failed.", error);
    initFallbackComposer();
  }
}

function syncComposerTheme() {
  if (!runtime.composerEditorReady || !runtime.composerEditor?.setTheme) {
    return;
  }

  runtime.composerEditor.setTheme(getComposerTheme(), undefined, getComposerCodeTheme());
}

function normalizeNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const nextValue = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(nextValue) ? nextValue : null;
}

function normalizeUsage(value) {
  if (!isObject(value)) {
    return null;
  }

  const details = isObject(value.completionTokensDetails)
    ? value.completionTokensDetails
    : isObject(value.completion_tokens_details)
      ? value.completion_tokens_details
      : {};

  return {
    completionTokens: normalizeNumber(value.completionTokens ?? value.completion_tokens),
    promptTokens: normalizeNumber(value.promptTokens ?? value.prompt_tokens),
    promptCacheHitTokens: normalizeNumber(
      value.promptCacheHitTokens ?? value.prompt_cache_hit_tokens,
    ),
    promptCacheMissTokens: normalizeNumber(
      value.promptCacheMissTokens ?? value.prompt_cache_miss_tokens,
    ),
    totalTokens: normalizeNumber(value.totalTokens ?? value.total_tokens),
    completionTokensDetails: {
      reasoningTokens: normalizeNumber(details.reasoningTokens ?? details.reasoning_tokens),
    },
  };
}

function normalizeRequestConfig(value) {
  const input = isObject(value) ? value : {};

  return {
    systemPrompt: asString(input.systemPrompt),
    model: asString(input.model, DEFAULT_REQUEST_CONFIG.model),
    thinkingType: asString(input.thinkingType, DEFAULT_REQUEST_CONFIG.thinkingType),
    reasoningEffort: asString(input.reasoningEffort, DEFAULT_REQUEST_CONFIG.reasoningEffort),
    stream: Boolean(input.stream ?? DEFAULT_REQUEST_CONFIG.stream),
    includeUsage: Boolean(input.includeUsage ?? DEFAULT_REQUEST_CONFIG.includeUsage),
    responseFormatType: asString(
      input.responseFormatType,
      DEFAULT_REQUEST_CONFIG.responseFormatType,
    ),
    maxTokens: asString(input.maxTokens),
    temperature: asString(input.temperature),
    topP: asString(input.topP),
    presencePenalty: asString(input.presencePenalty),
    frequencyPenalty: asString(input.frequencyPenalty),
    stop: asString(input.stop),
    logprobs: Boolean(input.logprobs),
    topLogprobs: asString(input.topLogprobs),
    toolsJson: asString(input.toolsJson),
    toolChoiceMode: asString(input.toolChoiceMode, DEFAULT_REQUEST_CONFIG.toolChoiceMode),
    toolChoiceName: asString(input.toolChoiceName),
    toolChoiceCustomJson: asString(input.toolChoiceCustomJson),
    extraBodyJson: asString(input.extraBodyJson),
  };
}

function normalizeMessage(value) {
  if (!isObject(value)) {
    return null;
  }

  const role = asString(value.role).trim();
  if (!role) {
    return null;
  }

  return {
    id: asString(value.id, createId()),
    role,
    content: asString(value.content),
    reasoningContent: asString(value.reasoningContent ?? value.reasoning_content),
    toolCalls: Array.isArray(value.toolCalls ?? value.tool_calls)
      ? value.toolCalls ?? value.tool_calls
      : [],
    logprobs: isObject(value.logprobs) ? value.logprobs : null,
    usage: normalizeUsage(value.usage),
    model: value.model ? asString(value.model) : null,
    finishReason: value.finishReason ?? value.finish_reason ?? null,
    createdAt: asString(value.createdAt, new Date().toISOString()),
    thinkingDurationMs: normalizeNumber(
      value.thinkingDurationMs ?? value.thinking_duration_ms,
    ),
    totalDurationMs: normalizeNumber(value.totalDurationMs ?? value.total_duration_ms),
    error: value.error ? asString(value.error) : null,
    reasoningCollapsed: Boolean(value.reasoningCollapsed),
    includeInContext: value.includeInContext !== false,
    toolCallId: value.toolCallId ?? value.tool_call_id ?? null,
  };
}

function createDefaultConversation(title = "新对话") {
  const now = new Date().toISOString();

  return {
    id: createId(),
    title,
    createdAt: now,
    updatedAt: now,
    draft: "",
    requestConfig: { ...DEFAULT_REQUEST_CONFIG },
    messages: [],
  };
}

function createDefaultState() {
  const conversation = createDefaultConversation();

  return {
    version: 1,
    activeConversationId: conversation.id,
    updatedAt: new Date().toISOString(),
    preferences: {
      apiKey: "",
      rememberApiKey: false,
      baseUrl: DEFAULT_BASE_URL,
    },
    conversations: [conversation],
  };
}

function normalizeConversation(value, index) {
  const defaults = createDefaultConversation(`新对话 ${index + 1}`);
  const input = isObject(value) ? value : {};

  return {
    id: asString(input.id, defaults.id),
    title: asString(input.title, defaults.title),
    createdAt: asString(input.createdAt, defaults.createdAt),
    updatedAt: asString(input.updatedAt, defaults.updatedAt),
    draft: asString(input.draft),
    requestConfig: normalizeRequestConfig(input.requestConfig),
    messages: Array.isArray(input.messages)
      ? input.messages.map(normalizeMessage).filter(Boolean)
      : [],
  };
}

function normalizeState(value) {
  const input = isObject(value) ? value : {};
  const defaults = createDefaultState();
  const conversations = Array.isArray(input.conversations) && input.conversations.length > 0
    ? input.conversations.map(normalizeConversation)
    : defaults.conversations;

  const nextState = {
    version: 1,
    updatedAt: asString(input.updatedAt, new Date().toISOString()),
    activeConversationId: asString(input.activeConversationId, conversations[0].id),
    preferences: {
      apiKey: asString(input.preferences?.apiKey),
      rememberApiKey: Boolean(input.preferences?.rememberApiKey),
      baseUrl: asString(input.preferences?.baseUrl, DEFAULT_BASE_URL),
    },
    conversations,
  };

  if (!nextState.conversations.some((conversation) => conversation.id === nextState.activeConversationId)) {
    nextState.activeConversationId = nextState.conversations[0].id;
  }

  if (!nextState.preferences.rememberApiKey) {
    nextState.preferences.apiKey = "";
  }

  return nextState;
}

function getActiveConversation() {
  return state.conversations.find((conversation) => conversation.id === state.activeConversationId);
}

function hasActiveConversationRequest(conversationId) {
  return runtime.pendingConversationIds.has(conversationId) || runtime.controllers.has(conversationId);
}

function beginConversationRequest(conversationId) {
  if (hasActiveConversationRequest(conversationId)) {
    return false;
  }

  runtime.pendingConversationIds.add(conversationId);
  return true;
}

function finishConversationRequest(conversationId) {
  runtime.pendingConversationIds.delete(conversationId);
}

function isCompactViewport() {
  return window.matchMedia("(max-width: 1080px)").matches;
}

function syncLayoutState() {
  const compact = isCompactViewport();
  const desktopSidebarExpanded = !runtime.sidebarCollapsed;

  document.body.classList.toggle("sidebar-open", runtime.sidebarOpen && compact);
  document.body.classList.toggle("sidebar-collapsed", !compact && runtime.sidebarCollapsed);
  document.body.classList.toggle("inspector-open", runtime.inspectorOpen);
  refs.sidebarScrim.hidden = !(runtime.sidebarOpen && compact);
  refs.inspectorBackdrop.hidden = !runtime.inspectorOpen;
  refs.inspectorDrawer.inert = !runtime.inspectorOpen;
  refs.inspectorDrawer.setAttribute("aria-hidden", String(!runtime.inspectorOpen));
  refs.inspectorToggleBtn.textContent = runtime.inspectorOpen ? "收起参数" : "参数";
  refs.inspectorToggleBtn.setAttribute("aria-expanded", String(runtime.inspectorOpen));
  refs.sidebarToggleBtn.setAttribute("aria-expanded", String(compact ? runtime.sidebarOpen : desktopSidebarExpanded));
  refs.sidebarDockToggleBtn.setAttribute("aria-expanded", String(desktopSidebarExpanded));
  refs.sidebarDockToggleBtn.setAttribute(
    "aria-label",
    desktopSidebarExpanded ? "收起会话列表" : "展开会话列表",
  );
  refs.sidebarDockToggleBtn.textContent = desktopSidebarExpanded ? "‹" : "›";
}

function setSidebarOpen(nextValue) {
  runtime.sidebarOpen = Boolean(nextValue);
  syncLayoutState();
}

function setSidebarCollapsed(nextValue) {
  runtime.sidebarCollapsed = Boolean(nextValue);
  syncLayoutState();
}

function setInspectorOpen(nextValue) {
  runtime.inspectorOpen = Boolean(nextValue);
  syncLayoutState();
}

function getModelPreset(model) {
  if (model === "deepseek-v4-flash") {
    return "deepseek-v4-flash";
  }

  if (model === "deepseek-v4-pro") {
    return "deepseek-v4-pro";
  }

  return "custom";
}

function getModelDisplayLabel(model) {
  if (model === "deepseek-v4-flash") {
    return "DeepSeek V4 Flash";
  }

  if (model === "deepseek-v4-pro") {
    return "DeepSeek V4 Pro";
  }

  return model || "自定义模型";
}

function setSettingsTestState(stateName, text, details) {
  runtime.settingsTest = {
    state: stateName,
    text,
    details,
  };

  renderSettingsTest();
}

function resetSettingsTestState() {
  setSettingsTestState("idle", "未测试。", "测试请求不会写入当前对话历史。");
}

function setNotice(text, type = "info") {
  runtime.notice = { text, type };
  renderNotice();
}

function clearNotice() {
  runtime.notice = { text: "", type: "info" };
  renderNotice();
}

function formatDateTime(value) {
  if (!value) {
    return "未知时间";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDuration(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  if (value < 1000) {
    return `${Math.round(value)} ms`;
  }

  return `${(value / 1000).toFixed(2)} s`;
}

function formatTokenCount(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatTokenUsage(value) {
  const suffix = value === 0 || value === 1 ? "Token" : "Tokens";
  return `${formatTokenCount(value)} ${suffix}`;
}

function createBadge(text, extraClass = "") {
  const badge = document.createElement("span");
  badge.className = `badge ${extraClass}`.trim();
  badge.textContent = text;
  return badge;
}

function estimateTextTokenCount(value) {
  const text = asString(value).trim();
  if (!text) {
    return 0;
  }

  const cjkMatches = text.match(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) ?? [];
  const cjkCount = cjkMatches.length;
  const nonCjk = text.replace(/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g, " ");
  const pieces = nonCjk.match(/[A-Za-z0-9_]+|[^\sA-Za-z0-9_]/g) ?? [];
  const otherCount = pieces.reduce((total, piece) => total + Math.max(1, Math.ceil(piece.length / 4)), 0);

  return cjkCount + otherCount;
}

function getLatestPromptTokenCount(conversation) {
  for (const message of [...conversation.messages].reverse()) {
    const promptTokens = message.usage?.promptTokens;
    if (typeof promptTokens === "number" && !Number.isNaN(promptTokens)) {
      return promptTokens;
    }
  }

  return null;
}

function getLatestTotalTokenCount(conversation) {
  for (const message of [...conversation.messages].reverse()) {
    const totalTokens = message.usage?.totalTokens;
    if (typeof totalTokens === "number" && !Number.isNaN(totalTokens)) {
      return totalTokens;
    }
  }

  return null;
}

function estimateContextTokenCount(conversation) {
  let total = 0;

  if (conversation.requestConfig.systemPrompt.trim()) {
    total += estimateTextTokenCount(conversation.requestConfig.systemPrompt) + 4;
  }

  for (const message of conversation.messages) {
    const item = sanitizeMessageForContext(message);
    if (!item) {
      continue;
    }

    total += 4 + estimateTextTokenCount(item.content);
    if (item.tool_calls) {
      total += estimateTextTokenCount(JSON.stringify(item.tool_calls));
    }
    if (item.tool_call_id) {
      total += estimateTextTokenCount(item.tool_call_id);
    }
  }

  return total;
}

function getConversationContextTokenCount(conversation) {
  return getLatestPromptTokenCount(conversation) ?? estimateContextTokenCount(conversation);
}

function getConversationTokenCount(conversation) {
  return (
    getLatestTotalTokenCount(conversation) ??
    getLatestPromptTokenCount(conversation) ??
    estimateContextTokenCount(conversation)
  );
}

function getSelectDisplayText(select) {
  return select.selectedOptions[0]?.textContent?.trim() || select.value || "请选择";
}

function getSelectLabelText(select) {
  return select.closest(".field")?.querySelector(":scope > span")?.textContent?.trim() || "选择";
}

function syncCustomSelect(select) {
  const control = runtime.customSelects.get(select);
  if (!control) {
    return;
  }

  control.value.textContent = getSelectDisplayText(select);
  control.trigger.dataset.value = select.value;
  control.trigger.setAttribute("aria-disabled", String(select.disabled));

  for (const option of control.menu.querySelectorAll(".custom-select-option")) {
    const selected = option.dataset.value === select.value;
    option.classList.toggle("selected", selected);
    option.setAttribute("aria-selected", String(selected));
  }
}

function refreshCustomSelects() {
  for (const select of runtime.customSelects.keys()) {
    syncCustomSelect(select);
  }
}

function closeCustomSelect(select) {
  const control = runtime.customSelects.get(select);
  if (!control) {
    return;
  }

  control.root.classList.remove("open");
  control.menu.hidden = true;
  control.trigger.setAttribute("aria-expanded", "false");
}

function closeAllCustomSelects(exceptSelect = null) {
  for (const select of runtime.customSelects.keys()) {
    if (select !== exceptSelect) {
      closeCustomSelect(select);
    }
  }
}

function getCustomSelectOptions(control) {
  return [...control.menu.querySelectorAll(".custom-select-option")];
}

function focusCustomSelectOption(control, option) {
  (option ?? getCustomSelectOptions(control)[0])?.focus();
}

function openCustomSelect(select, focusSelected = false) {
  const control = runtime.customSelects.get(select);
  if (!control || select.disabled) {
    return;
  }

  closeAllCustomSelects(select);
  control.root.classList.add("open");
  control.menu.hidden = false;
  control.trigger.setAttribute("aria-expanded", "true");

  if (focusSelected) {
    focusCustomSelectOption(control, control.menu.querySelector(".custom-select-option.selected"));
  }
}

function chooseCustomSelectOption(select, value) {
  const control = runtime.customSelects.get(select);
  if (!control || select.disabled) {
    return;
  }

  if (select.value !== value) {
    select.value = value;
    syncCustomSelect(select);
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  closeCustomSelect(select);
  control.trigger.focus();
}

function moveCustomSelectFocus(control, direction) {
  const options = getCustomSelectOptions(control);
  if (!options.length) {
    return;
  }

  const activeIndex = options.indexOf(document.activeElement);
  const nextIndex = activeIndex === -1 ? 0 : (activeIndex + direction + options.length) % options.length;
  options[nextIndex].focus();
}

function createCustomSelectOption(select, option, index, listboxId) {
  const item = document.createElement("div");
  item.className = "custom-select-option";
  item.id = `${listboxId}-option-${index}`;
  item.dataset.value = option.value;
  item.dataset.index = String(index);
  item.role = "option";
  item.tabIndex = -1;
  item.textContent = option.textContent.trim();

  item.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    chooseCustomSelectOption(select, option.value);
  });

  item.addEventListener("keydown", (event) => {
    const control = runtime.customSelects.get(select);
    if (!control) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveCustomSelectFocus(control, 1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveCustomSelectFocus(control, -1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusCustomSelectOption(control, getCustomSelectOptions(control)[0]);
    } else if (event.key === "End") {
      event.preventDefault();
      const options = getCustomSelectOptions(control);
      focusCustomSelectOption(control, options[options.length - 1]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseCustomSelectOption(select, option.value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeCustomSelect(select);
      control.trigger.focus();
    } else if (event.key === "Tab") {
      closeCustomSelect(select);
    }
  });

  return item;
}

function enhanceSelectControl(select) {
  if (!select || runtime.customSelects.has(select)) {
    return;
  }

  const root = document.createElement("div");
  root.className = "custom-select";

  const trigger = document.createElement("div");
  trigger.className = "custom-select-trigger";
  trigger.role = "button";
  trigger.tabIndex = 0;
  trigger.setAttribute("aria-haspopup", "listbox");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-label", getSelectLabelText(select));

  const value = document.createElement("span");
  value.className = "custom-select-value";

  const chevron = document.createElement("span");
  chevron.className = "custom-select-chevron";
  chevron.setAttribute("aria-hidden", "true");

  const listboxId = `custom-select-${select.id || createId()}`;
  const menu = document.createElement("div");
  menu.className = "custom-select-menu";
  menu.id = listboxId;
  menu.role = "listbox";
  menu.hidden = true;
  trigger.setAttribute("aria-controls", listboxId);

  [...select.options].forEach((option, index) => {
    menu.append(createCustomSelectOption(select, option, index, listboxId));
  });

  trigger.append(value, chevron);
  root.append(trigger, menu);

  select.classList.add("native-select-hidden");
  select.tabIndex = -1;
  select.setAttribute("aria-hidden", "true");
  select.insertAdjacentElement("afterend", root);

  runtime.customSelects.set(select, { root, trigger, value, menu });
  syncCustomSelect(select);

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (root.classList.contains("open")) {
      closeCustomSelect(select);
    } else {
      openCustomSelect(select);
    }
  });

  trigger.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      openCustomSelect(select, true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      openCustomSelect(select, true);
      const options = getCustomSelectOptions(runtime.customSelects.get(select));
      focusCustomSelectOption(runtime.customSelects.get(select), options[options.length - 1]);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (root.classList.contains("open")) {
        closeCustomSelect(select);
      } else {
        openCustomSelect(select, true);
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closeCustomSelect(select);
    }
  });
}

function enhanceSelectControls() {
  document.querySelectorAll("select").forEach(enhanceSelectControl);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".custom-select")) {
      closeAllCustomSelects();
    }
  });
}

function deriveConversationPreview(conversation) {
  const lastMessage = [...conversation.messages]
    .reverse()
    .find((message) => message.content || message.reasoningContent || message.error);

  if (!lastMessage) {
    return "尚无消息。";
  }

  return lastMessage.error ?? lastMessage.content ?? lastMessage.reasoningContent ?? "空消息";
}

function countContextMessages(conversation) {
  let count = conversation.requestConfig.systemPrompt.trim() ? 1 : 0;

  for (const message of conversation.messages) {
    if (message.includeInContext === false) {
      continue;
    }

    if (message.role === "user" || message.role === "assistant" || message.role === "tool") {
      count += 1;
    }
  }

  return count;
}

function getPendingAssistantMessageId(conversation) {
  const message = [...conversation.messages]
    .reverse()
    .find((item) => item.role === "assistant" && item.includeInContext === false && !item.error);

  return message?.id ?? null;
}

function renderNotice() {
  const { text, type } = runtime.notice;

  if (!text) {
    refs.noticeBanner.hidden = true;
    refs.noticeBanner.className = "notice-banner";
    refs.noticeBanner.textContent = "";
    return;
  }

  refs.noticeBanner.hidden = false;
  refs.noticeBanner.className = `notice-banner ${type}`;
  refs.noticeBanner.textContent = text;
}

function getConversationGroupLabel(updatedAt) {
  const value = new Date(updatedAt);

  if (Number.isNaN(value.getTime())) {
    return "更早";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const valueDay = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const dayDiff = Math.floor((today - valueDay) / 86_400_000);

  if (dayDiff <= 0) {
    return "今天";
  }

  if (dayDiff === 1) {
    return "昨天";
  }

  if (dayDiff < 7) {
    return "过去 7 天";
  }

  if (dayDiff < 30) {
    return "过去 30 天";
  }

  return "更早";
}

function renderConversationList() {
  refs.conversationList.innerHTML = "";
  refs.conversationCount.textContent = String(state.conversations.length);

  let currentGroupLabel = "";

  for (const conversation of state.conversations) {
    const groupLabel = getConversationGroupLabel(conversation.updatedAt);

    if (groupLabel !== currentGroupLabel) {
      const group = document.createElement("div");
      group.className = "conversation-group-label";
      group.textContent = groupLabel;
      refs.conversationList.append(group);
      currentGroupLabel = groupLabel;
    }

    const item = document.createElement("div");
    item.className = `conversation-item${conversation.id === state.activeConversationId ? " active" : ""}`;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "conversation-select-btn";
    button.dataset.action = "select-conversation";
    button.dataset.conversationId = conversation.id;

    const layout = document.createElement("div");
    layout.className = "conversation-main";

    const titleRow = document.createElement("div");
    titleRow.className = "conversation-title-row";

    const title = document.createElement("div");
    title.className = "conversation-title";
    title.textContent = conversation.title;

    const time = document.createElement("span");
    time.className = "conversation-time";
    time.textContent = formatDateTime(conversation.updatedAt);

    titleRow.append(title, time);

    const preview = document.createElement("div");
    preview.className = "conversation-preview";
    preview.textContent = deriveConversationPreview(conversation);

    const metaRow = document.createElement("div");
    metaRow.className = "conversation-meta-row";
    metaRow.append(
      createBadge(getModelDisplayLabel(conversation.requestConfig.model)),
      createBadge(conversation.requestConfig.stream ? "流式" : "普通"),
      createBadge(`${conversation.messages.length} 条`),
    );

    layout.append(titleRow, preview, metaRow);
    button.append(layout);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "conversation-delete-btn";
    deleteButton.dataset.action = "delete-conversation";
    deleteButton.dataset.conversationId = conversation.id;
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `删除对话：${conversation.title}`);

    const isBusy = hasActiveConversationRequest(conversation.id);
    deleteButton.disabled = state.conversations.length === 1 || isBusy;
    deleteButton.title =
      state.conversations.length === 1
        ? "至少保留一个对话"
        : isBusy
          ? "对话请求中，暂不能删除"
          : "删除对话";

    item.append(button, deleteButton);
    refs.conversationList.append(item);
  }
}

function renderConversationHeader() {
  const conversation = getActiveConversation();
  const isStreaming = runtime.controllers.has(conversation.id);
  const isBusy = hasActiveConversationRequest(conversation.id);
  const parts = [];

  refs.conversationTitleInput.value = conversation.title;

  if (isStreaming) {
    parts.push("生成中");
  } else if (isBusy) {
    parts.push("请求中");
  }

  parts.push(getModelDisplayLabel(conversation.requestConfig.model));
  parts.push(formatTokenUsage(getConversationTokenCount(conversation)));
  parts.push(conversation.requestConfig.stream ? "流式" : "非流式");
  parts.push(`更新于 ${formatDateTime(conversation.updatedAt)}`);

  if (["deepseek-chat", "deepseek-reasoner"].includes(conversation.requestConfig.model.trim())) {
    parts.push("legacy alias 将于 2026-07-24 废弃");
  }

  refs.conversationMeta.textContent = parts.join(" · ");
  refs.deleteConversationBtn.disabled = state.conversations.length === 1 || isBusy;
  refs.clearConversationBtn.disabled = isBusy;
  refs.duplicateConversationBtn.disabled = isBusy;
  refs.stopBtn.hidden = !isStreaming;
  refs.sendBtn.hidden = isStreaming;
  refs.sendBtn.disabled = isBusy;
  refs.sendBtn.textContent = isStreaming ? "生成中" : isBusy ? "请求中" : "发送";
  refs.sendBtn.setAttribute("aria-label", isBusy ? "请求中" : "发送");
  refs.sendBtn.title = isBusy ? "请求中" : "发送";
  refs.stopBtn.setAttribute("aria-label", "停止生成");
  refs.stopBtn.title = "停止生成";
}

function getStreamState(message) {
  return message?.id ? runtime.streamStates.get(message.id) ?? null : null;
}

function getThinkingDurationMs(message) {
  const streamState = getStreamState(message);

  if (streamState) {
    if (streamState.firstContentAt !== null) {
      return streamState.firstContentAt - streamState.startedAt;
    }
    return performance.now() - streamState.startedAt;
  }

  return message.thinkingDurationMs;
}

function createThinkingChip(message) {
  const duration = getThinkingDurationMs(message);
  if (duration === null || duration === undefined) {
    return null;
  }

  const streamState = getStreamState(message);
  const label = streamState && streamState.firstContentAt === null ? "思考中" : "思考";
  return createBadge(`${label} ${formatDuration(duration)}`, "thinking-timer");
}

function buildMetaChips(message) {
  const chips = [];

  if (message.model) {
    chips.push(createBadge(message.model));
  }

  const thinkingChip = createThinkingChip(message);
  if (thinkingChip) {
    chips.push(thinkingChip);
  }

  if (message.totalDurationMs !== null && message.totalDurationMs !== undefined) {
    chips.push(createBadge(`总耗时 ${formatDuration(message.totalDurationMs)}`));
  }

  if (message.usage?.promptTokens !== null && message.usage?.promptTokens !== undefined) {
    chips.push(createBadge(`输入 ${formatTokenCount(message.usage.promptTokens)}`));
  }

  if (message.usage?.completionTokens !== null && message.usage?.completionTokens !== undefined) {
    chips.push(createBadge(`输出 ${formatTokenCount(message.usage.completionTokens)}`));
  }

  const reasoningTokens = message.usage?.completionTokensDetails?.reasoningTokens;
  if (reasoningTokens !== null && reasoningTokens !== undefined) {
    chips.push(createBadge(`推理 ${formatTokenCount(reasoningTokens)}`));
  }

  if (message.usage?.totalTokens !== null && message.usage?.totalTokens !== undefined) {
    chips.push(createBadge(`总计 ${formatTokenCount(message.usage.totalTokens)}`));
  }

  if (message.finishReason && message.finishReason !== "stop") {
    chips.push(createBadge(`finish_reason=${message.finishReason}`));
  }

  if (message.includeInContext === false) {
    chips.push(createBadge("未纳入后续上下文"));
  }

  return chips;
}

function createBlockLabel(label) {
  const heading = document.createElement("div");
  heading.className = "block-label";
  heading.textContent = label;
  return heading;
}

function createThinkingToggle(message, label, collapsed) {
  const toggle = document.createElement("button");
  toggle.className = "block-label thinking-toggle";
  toggle.type = "button";
  toggle.dataset.action = "toggle-thinking";
  toggle.dataset.messageId = message.id;
  toggle.setAttribute("aria-expanded", String(!collapsed));
  toggle.setAttribute("aria-label", collapsed ? "展开思考过程" : "折叠思考过程");

  const icon = document.createElement("span");
  icon.className = "thinking-toggle-icon";
  icon.setAttribute("aria-hidden", "true");

  const text = document.createElement("span");
  text.className = "block-label-text";
  text.textContent = label;

  toggle.append(icon, text);
  return toggle;
}

function syncThinkingBlockCollapsed(block, message) {
  if (!block || !message) {
    return;
  }

  const collapsed = Boolean(message.reasoningCollapsed);
  block.classList.toggle("is-collapsed", collapsed);

  const body = block.querySelector(".block-content");
  if (body) {
    body.hidden = collapsed;
  }

  const toggle = block.querySelector(".thinking-toggle");
  if (toggle) {
    toggle.setAttribute("aria-expanded", String(!collapsed));
    toggle.setAttribute("aria-label", collapsed ? "展开思考过程" : "折叠思考过程");
  }
}

function appendMessageBlock(container, label, content, extraClass = "", message = null) {
  if (!content) {
    return;
  }

  const isThinking = extraClass.includes("thinking");
  const collapsed = isThinking && Boolean(message?.reasoningCollapsed);
  const block = document.createElement("section");
  block.className = `message-block ${extraClass}`.trim();
  block.dataset.rawContent = content;
  if (isThinking) {
    block.dataset.blockKind = "thinking";
  } else if (extraClass.includes("answer")) {
    block.dataset.blockKind = "answer";
  }

  if (collapsed) {
    block.classList.add("is-collapsed");
  }

  const heading = isThinking && message
    ? createThinkingToggle(message, label, collapsed)
    : createBlockLabel(label);

  const body = createMarkdownContent(content);
  body.hidden = collapsed;

  block.append(heading, body);
  container.append(block);
}

function updateMessageBlockContent(block, content) {
  const value = asString(content);
  if (!block || block.dataset.rawContent === value) {
    return;
  }

  block.dataset.rawContent = value;
  const nextBody = createMarkdownContent(value);
  nextBody.hidden = block.classList.contains("is-collapsed");
  block.querySelector(".block-content")?.replaceWith(nextBody);
}

function updateMessageBlockLabel(block, label) {
  const labelNode = block?.querySelector(".block-label-text") ?? block?.querySelector(".block-label");
  if (labelNode) {
    labelNode.textContent = label;
  }
}

function ensureMessageBlock(container, label, content, extraClass, message = null) {
  const kind = extraClass.includes("thinking") ? "thinking" : "answer";
  let block = container.querySelector(`[data-block-kind="${kind}"]`);

  if (!content) {
    block?.remove();
    return null;
  }

  if (!block) {
    appendMessageBlock(container, label, content, extraClass, message);
    block = container.querySelector(`[data-block-kind="${kind}"]`);
    syncThinkingBlockCollapsed(block, message);
    return block;
  }

  updateMessageBlockLabel(block, label);
  syncThinkingBlockCollapsed(block, message);
  updateMessageBlockContent(block, content);
  return block;
}

function getMessageById(messageId) {
  for (const conversation of state.conversations) {
    const message = conversation.messages.find((item) => item.id === messageId);
    if (message) {
      return { conversation, message };
    }
  }

  return null;
}

function updateThinkingChip(messageId) {
  const resolved = getMessageById(messageId);
  if (!resolved) {
    return;
  }

  const article = refs.messagesPanel.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  const meta = article?.querySelector(".message-meta");
  const chip = meta?.querySelector(".thinking-timer");
  if (!chip) {
    return;
  }

  const nextChip = createThinkingChip(resolved.message);
  if (nextChip) {
    chip.textContent = nextChip.textContent;
  }
}

function updateThinkingTimers() {
  for (const messageId of runtime.streamStates.keys()) {
    updateThinkingChip(messageId);
  }
}

function startThinkingTimer() {
  if (runtime.thinkingTimerId !== null) {
    return;
  }

  runtime.thinkingTimerId = window.setInterval(updateThinkingTimers, 250);
}

function stopThinkingTimerIfIdle() {
  if (runtime.streamStates.size > 0 || runtime.thinkingTimerId === null) {
    return;
  }

  window.clearInterval(runtime.thinkingTimerId);
  runtime.thinkingTimerId = null;
}

function updateStreamingMessageDom(messageId) {
  const resolved = getMessageById(messageId);
  if (!resolved || resolved.conversation.id !== state.activeConversationId) {
    return;
  }

  const { conversation, message } = resolved;
  const article = refs.messagesPanel.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  if (!article) {
    return;
  }

  const meta = article.querySelector(".message-meta");
  const thinkingChip = meta?.querySelector(".thinking-timer");
  if (thinkingChip) {
    const nextChip = createThinkingChip(message);
    if (nextChip) {
      thinkingChip.textContent = nextChip.textContent;
    }
  }

  const blocks = article.querySelector(".message-blocks");
  if (blocks) {
    ensureMessageBlock(blocks, "思考过程", message.reasoningContent, "thinking", message);
    ensureMessageBlock(
      blocks,
      message.error ? "已接收内容" : "回答",
      message.content ||
        (runtime.controllers.has(conversation.id) && message.id === getPendingAssistantMessageId(conversation)
          ? "正在等待返回内容..."
          : ""),
      "answer",
      message,
    );
  }

  refs.messagesPanel.scrollTop = refs.messagesPanel.scrollHeight;
}

function queueStreamingMessageUpdate(messageId) {
  runtime.streamDomQueue.add(messageId);
  if (runtime.streamDomFrame !== null) {
    return;
  }

  runtime.streamDomFrame = requestAnimationFrame(() => {
    const queuedIds = [...runtime.streamDomQueue];
    runtime.streamDomQueue.clear();
    runtime.streamDomFrame = null;
    for (const queuedId of queuedIds) {
      updateStreamingMessageDom(queuedId);
    }
  });
}

function getMessageCopyText(message) {
  if (message.role === "user") {
    return message.content;
  }

  return message.content || message.error || message.reasoningContent || "";
}

async function copyTextToClipboard(text) {
  const value = asString(text);
  if (!value.trim()) {
    setNotice("没有可复制的内容。", "error");
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.append(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    setNotice("内容已复制。", "info");
  } catch (error) {
    setNotice(`复制失败：${error.message}`, "error");
  }
}

function getMessageIndex(conversation, messageId) {
  return conversation.messages.findIndex((message) => message.id === messageId);
}

function getReplayUserIndex(conversation, messageId) {
  const index = getMessageIndex(conversation, messageId);
  if (index === -1) {
    return -1;
  }

  if (conversation.messages[index].role === "user") {
    return index;
  }

  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    if (conversation.messages[cursor].role === "user") {
      return cursor;
    }
  }

  return -1;
}

function getReplayInputForMessage(conversation, messageId) {
  const userIndex = getReplayUserIndex(conversation, messageId);
  return userIndex === -1 ? "" : conversation.messages[userIndex].content;
}

function setReplayDraft(messageId) {
  const conversation = getActiveConversation();
  const input = getReplayInputForMessage(conversation, messageId);

  if (!input) {
    setNotice("找不到可重新发送的输入。", "error");
    return;
  }

  runtime.replaySource = {
    conversationId: conversation.id,
    messageId,
  };
  conversation.draft = input;
  setComposerValue(input, true);
  renderRequestPreview();
  focusComposer();
  setNotice("已载入原输入。编辑后发送会保留该消息之前的上下文，并替换后续分支。", "info");
  schedulePersist();
}

function createMessageAction(label, action, messageId, extraClass = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `message-action ${extraClass}`.trim();
  button.dataset.action = action;
  button.dataset.messageId = messageId;
  button.textContent = label;
  return button;
}

function createRetryOption(title, description, action, messageId) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "retry-option";
  button.dataset.action = action;
  button.dataset.messageId = messageId;

  const titleNode = document.createElement("span");
  titleNode.className = "retry-option-title";
  titleNode.textContent = title;

  const descriptionNode = document.createElement("span");
  descriptionNode.className = "retry-option-description";
  descriptionNode.textContent = description;

  button.append(titleNode, descriptionNode);
  return button;
}

function createRetryMenu(message) {
  const conversation = getActiveConversation();
  const wrapper = document.createElement("div");
  wrapper.className = "retry-action-menu";

  const trigger = createMessageAction("重试", "toggle-retry-menu", message.id);
  trigger.classList.add("retry-trigger");
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");

  const menu = document.createElement("div");
  menu.className = "retry-popover";
  menu.setAttribute("role", "menu");
  menu.hidden = true;
  menu.append(
    createRetryOption("当前模型", getModelDisplayLabel(conversation.requestConfig.model), "retry-current", message.id),
    createRetryOption("DeepSeek V4 Flash", "切换模型后重试", "retry-flash", message.id),
    createRetryOption("DeepSeek V4 Pro", "切换模型后重试", "retry-pro", message.id),
  );

  wrapper.append(trigger, menu);
  return wrapper;
}

function appendRetryActions(actions, message) {
  if (message.role !== "assistant") {
    return;
  }

  actions.append(createRetryMenu(message));
}

function renderMessageActions(message) {
  const actions = document.createElement("div");
  actions.className = "message-actions";
  actions.append(createMessageAction("复制", "copy-message", message.id));

  if (message.role === "user") {
    actions.append(createMessageAction("编辑", "edit-replay", message.id));
    return actions;
  }

  appendRetryActions(actions, message);

  const conversation = getActiveConversation();
  if (
    message.role === "assistant" &&
    runtime.controllers.has(conversation.id) &&
    message.id === getPendingAssistantMessageId(conversation)
  ) {
    actions.append(createMessageAction("停止生成", "stop-generation", message.id, "danger"));
  }

  return actions;
}

function renderMessages() {
  const conversation = getActiveConversation();
  refs.messagesPanel.innerHTML = "";

  if (conversation.messages.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const copy = document.createElement("div");
    copy.className = "empty-copy";

    const mark = document.createElement("div");
    mark.className = "empty-mark";
    mark.setAttribute("aria-hidden", "true");

    const title = document.createElement("h2");
    title.textContent = "今天想聊点什么？";

    const description = document.createElement("p");
    description.textContent = "可在参数面板调整模型与参数，准备好 API Key 后直接开始对话。";

    const hints = document.createElement("div");
    hints.className = "empty-hints";
    hints.append(
      createBadge(getModelDisplayLabel(getActiveConversation().requestConfig.model)),
      createBadge(getActiveConversation().requestConfig.stream ? "流式输出" : "非流式"),
      createBadge(state.preferences.apiKey.trim() ? "API Key 已填写" : "请先填写 API Key"),
    );

    copy.append(mark, title, description, hints);
    empty.append(copy);
    refs.messagesPanel.append(empty);
    return;
  }

  for (const message of conversation.messages) {
    const isUser = message.role === "user";
    const isError = Boolean(message.error);
    const article = document.createElement("article");
    article.className = [
      "message",
      isUser ? "message-user" : "message-assistant",
      isError ? "message-error" : "",
    ]
      .filter(Boolean)
      .join(" ");
    article.dataset.messageId = message.id;

    const inner = document.createElement("div");
    inner.className = "message-inner";

    if (!isUser) {
      const avatar = document.createElement("div");
      avatar.className = `message-avatar${isError ? " is-error" : " logo-avatar"}`;
      avatar.textContent = isError ? "!" : "";
      inner.append(avatar);
    }

    const body = document.createElement("div");
    body.className = "message-body";

    const header = document.createElement("header");
    header.className = "message-header";

    const role = document.createElement("div");
    role.className = "message-role";
    role.textContent = isUser ? "你" : isError ? "请求异常" : "DeepSeek";

    const time = document.createElement("div");
    time.className = "message-time";
    time.textContent = formatDateTime(message.createdAt);

    header.append(role, time);
    body.append(header);

    const chips = buildMetaChips(message);
    if (chips.length > 0) {
      const meta = document.createElement("div");
      meta.className = "message-meta";
      for (const chip of chips) {
        meta.append(chip);
      }
      body.append(meta);
    }

    const blocks = document.createElement("div");
    blocks.className = "message-blocks";

    if (message.error) {
      appendMessageBlock(blocks, "错误", message.error, "answer");
    }

    if (isUser) {
      appendMessageBlock(blocks, "提问", message.content, "answer");
    } else {
      appendMessageBlock(blocks, "思考过程", message.reasoningContent, "thinking", message);
      appendMessageBlock(
        blocks,
        message.error ? "已接收内容" : "回答",
        message.content ||
          (runtime.controllers.has(conversation.id) && message.id === getPendingAssistantMessageId(conversation)
            ? "正在等待返回内容..."
            : ""),
        "answer",
      );
    }

    body.append(blocks);

    if (message.toolCalls?.length || message.logprobs) {
      const footer = document.createElement("div");
      footer.className = "message-footer";

      if (message.toolCalls?.length) {
        const toolDump = document.createElement("pre");
        toolDump.className = "data-dump";
        toolDump.textContent = `tool_calls\n${JSON.stringify(message.toolCalls, null, 2)}`;
        footer.append(toolDump);
      }

      if (message.logprobs) {
        const logDump = document.createElement("pre");
        logDump.className = "data-dump";
        logDump.textContent = `logprobs\n${JSON.stringify(message.logprobs, null, 2)}`;
        footer.append(logDump);
      }

      body.append(footer);
    }

    body.append(renderMessageActions(message));
    inner.append(body);
    article.append(inner);
    refs.messagesPanel.append(article);
  }

  refs.messagesPanel.scrollTop = refs.messagesPanel.scrollHeight;
}

function renderSettingsTest() {
  refs.settingsTestStatus.textContent = runtime.settingsTest.text;
  refs.settingsTestDetails.textContent = runtime.settingsTest.details;
  refs.settingsTestStatus.dataset.state = runtime.settingsTest.state;
  refs.settingsTestBtn.disabled = runtime.settingsTest.state === "running";
  refs.settingsTestBtn.textContent =
    runtime.settingsTest.state === "running" ? "测试中..." : "测试当前设置";
}

function renderPreferences() {
  refs.apiKeyInput.value = state.preferences.apiKey;
  refs.baseUrlInput.value = state.preferences.baseUrl;
  refs.rememberApiKeyInput.checked = state.preferences.rememberApiKey;

  refs.sidebarApiKeyStatus.textContent = state.preferences.apiKey.trim()
    ? "API Key 已填写"
    : "未填写 API Key";
  refs.sidebarModelSummary.textContent = getModelDisplayLabel(getActiveConversation().requestConfig.model);
  refs.sidebarBaseUrlSummary.textContent = state.preferences.baseUrl || DEFAULT_BASE_URL;
}

function renderInspector() {
  const conversation = getActiveConversation();
  const config = conversation.requestConfig;
  const modelPreset = getModelPreset(config.model);

  refs.systemPromptInput.value = config.systemPrompt;
  refs.modelPresetSelect.value = modelPreset;
  refs.customModelInput.value = modelPreset === "custom" ? config.model : "";
  refs.customModelInput.disabled = modelPreset !== "custom";
  refs.customModelField.hidden = modelPreset !== "custom";
  refs.thinkingTypeSelect.value = config.thinkingType;
  refs.reasoningEffortSelect.value = config.reasoningEffort;
  refs.streamToggle.checked = config.stream;
  refs.includeUsageToggle.checked = config.includeUsage;
  refs.includeUsageToggle.disabled = !config.stream;
  refs.responseFormatSelect.value = config.responseFormatType;
  refs.maxTokensInput.value = config.maxTokens;
  refs.temperatureInput.value = config.temperature;
  refs.topPInput.value = config.topP;
  refs.presencePenaltyInput.value = config.presencePenalty;
  refs.frequencyPenaltyInput.value = config.frequencyPenalty;
  refs.stopInput.value = config.stop;
  refs.logprobsToggle.checked = config.logprobs;
  refs.topLogprobsInput.value = config.topLogprobs;
  refs.topLogprobsInput.disabled = !config.logprobs;
  refs.toolsJsonInput.value = config.toolsJson;
  refs.toolChoiceModeSelect.value = config.toolChoiceMode;
  refs.toolChoiceNameInput.value = config.toolChoiceName;
  refs.toolChoiceNameInput.disabled = config.toolChoiceMode !== "named";
  refs.toolChoiceCustomInput.value = config.toolChoiceCustomJson;
  refs.toolChoiceCustomInput.disabled = config.toolChoiceMode !== "custom";
  refs.extraBodyInput.value = config.extraBodyJson;
  refreshCustomSelects();
  renderRequestPreview();
}

function renderRequestPreview() {
  const conversation = getActiveConversation();

  try {
    const draft = getComposerValue().trim();
    const previewDraft = draft
      ? { role: "user", content: draft }
      : null;
    const body = buildRequestBody(conversation, previewDraft);
    refs.requestPreview.textContent = JSON.stringify(body, null, 2);
  } catch (error) {
    refs.requestPreview.textContent =
      error.message === "至少需要一条消息。"
        ? "输入一条消息后，这里会显示最终请求体。"
        : `参数预览失败：${error.message}`;
  }
}

function renderComposer() {
  const draft = getActiveConversation().draft;
  setComposerValue(draft);
}

function render() {
  syncLayoutState();
  renderConversationList();
  renderConversationHeader();
  renderNotice();
  renderMessages();
  renderSettingsTest();
  renderPreferences();
  renderInspector();
  renderComposer();
}

function scheduleRender() {
  if (runtime.renderQueued) {
    return;
  }

  runtime.renderQueued = true;
  requestAnimationFrame(() => {
    runtime.renderQueued = false;
    render();
  });
}

function getPersistableState() {
  const snapshot = structuredClone(state);
  snapshot.updatedAt = new Date().toISOString();

  if (!snapshot.preferences.rememberApiKey) {
    snapshot.preferences.apiKey = "";
  }

  return snapshot;
}

async function persistState() {
  try {
    await fetch("/api/state", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(getPersistableState()),
    });
  } catch (error) {
    setNotice(`本地持久化失败：${error.message}`, "error");
  }
}

function schedulePersist() {
  window.clearTimeout(runtime.saveTimer);
  runtime.saveTimer = window.setTimeout(() => {
    void persistState();
  }, 400);
}

async function hydrateState() {
  try {
    const response = await fetch("/api/state");
    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    state = normalizeState(payload.state);
  } catch (error) {
    state = createDefaultState();
    setNotice(`读取本地状态失败，已回退到默认状态：${error.message}`, "error");
  }
}

function updateConversationConfig(field, value) {
  const conversation = getActiveConversation();
  conversation.requestConfig[field] = value;
  conversation.updatedAt = new Date().toISOString();
  resetSettingsTestState();

  refs.includeUsageToggle.disabled = !conversation.requestConfig.stream;
  refs.topLogprobsInput.disabled = !conversation.requestConfig.logprobs;
  refs.toolChoiceNameInput.disabled = conversation.requestConfig.toolChoiceMode !== "named";
  refs.toolChoiceCustomInput.disabled = conversation.requestConfig.toolChoiceMode !== "custom";

  renderConversationHeader();
  renderConversationList();
  renderPreferences();
  renderRequestPreview();
  schedulePersist();
}

function createUserMessage(content) {
  return {
    id: createId(),
    role: "user",
    content,
    reasoningContent: "",
    toolCalls: [],
    logprobs: null,
    usage: null,
    model: null,
    finishReason: null,
    createdAt: new Date().toISOString(),
    thinkingDurationMs: null,
    totalDurationMs: null,
    error: null,
    reasoningCollapsed: false,
    includeInContext: true,
    toolCallId: null,
  };
}

function createAssistantMessage() {
  return {
    id: createId(),
    role: "assistant",
    content: "",
    reasoningContent: "",
    toolCalls: [],
    logprobs: null,
    usage: null,
    model: null,
    finishReason: null,
    createdAt: new Date().toISOString(),
    thinkingDurationMs: null,
    totalDurationMs: null,
    error: null,
    reasoningCollapsed: false,
    includeInContext: false,
    toolCallId: null,
  };
}

function parseJsonField(text, label) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} 不是合法 JSON。`);
  }
}

function parseNumericField(value, label, parser = Number.parseFloat) {
  if (!value.trim()) {
    return undefined;
  }

  const number = parser(value);
  if (!Number.isFinite(number)) {
    throw new Error(`${label} 不是合法数值。`);
  }

  return number;
}

function parseStopField(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith("[")) {
    const parsed = parseJsonField(trimmed, "Stop");
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string")) {
      throw new Error("Stop JSON 必须是字符串数组。");
    }
    return parsed;
  }

  const items = trimmed.split("\n").map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) {
    return undefined;
  }

  return items.length === 1 ? items[0] : items;
}

function deepMerge(baseValue, patchValue) {
  if (Array.isArray(baseValue) && Array.isArray(patchValue)) {
    return patchValue;
  }

  if (isObject(baseValue) && isObject(patchValue)) {
    const merged = { ...baseValue };
    for (const [key, value] of Object.entries(patchValue)) {
      merged[key] = key in merged ? deepMerge(merged[key], value) : value;
    }
    return merged;
  }

  return patchValue;
}

function sanitizeMessageForContext(message) {
  if (message.includeInContext === false) {
    return null;
  }

  if (message.role === "user") {
    return { role: "user", content: message.content };
  }

  if (message.role === "assistant") {
    const payload = { role: "assistant", content: message.content };
    if (message.toolCalls?.length) {
      payload.tool_calls = message.toolCalls;
    }
    return payload;
  }

  if (message.role === "tool") {
    return {
      role: "tool",
      content: message.content,
      tool_call_id: message.toolCallId,
    };
  }

  return null;
}

function hasUnresolvedToolCalls(conversation) {
  const assistantWithToolCalls = [...conversation.messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.toolCalls?.length && message.includeInContext);

  if (!assistantWithToolCalls) {
    return false;
  }

  const index = conversation.messages.findIndex((message) => message.id === assistantWithToolCalls.id);
  if (index === -1) {
    return false;
  }

  return !conversation.messages.slice(index + 1).some((message) => message.role === "tool");
}

function buildRequestBody(conversation, pendingUserMessage = null) {
  if (hasUnresolvedToolCalls(conversation)) {
    throw new Error("当前会话存在未处理的 tool_calls，本地界面只展示调用结果，不自动执行工具。");
  }

  const config = conversation.requestConfig;
  const selectedPreset = getModelPreset(config.model);

  if (selectedPreset === "custom" && !config.model.trim()) {
    throw new Error("请输入自定义模型 ID。");
  }

  const messages = [];

  if (config.systemPrompt.trim()) {
    messages.push({
      role: "system",
      content: config.systemPrompt.trim(),
    });
  }

  for (const message of conversation.messages) {
    const item = sanitizeMessageForContext(message);
    if (item) {
      messages.push(item);
    }
  }

  if (pendingUserMessage) {
    messages.push(pendingUserMessage);
  }

  if (messages.length === 0) {
    throw new Error("至少需要一条消息。");
  }

  const body = {
    model: config.model.trim() || DEFAULT_REQUEST_CONFIG.model,
    messages,
    stream: config.stream,
    response_format: {
      type: config.responseFormatType || "text",
    },
  };

  if (config.thinkingType) {
    body.thinking = {
      type: config.thinkingType,
    };
  }

  if (config.reasoningEffort) {
    body.reasoning_effort = config.reasoningEffort;
  }

  const maxTokens = parseNumericField(config.maxTokens, "Max Tokens", Number.parseInt);
  if (maxTokens !== undefined) {
    body.max_tokens = maxTokens;
  }

  const temperature = parseNumericField(config.temperature, "Temperature");
  if (temperature !== undefined) {
    body.temperature = temperature;
  }

  const topP = parseNumericField(config.topP, "Top P");
  if (topP !== undefined) {
    body.top_p = topP;
  }

  const presencePenalty = parseNumericField(config.presencePenalty, "Presence Penalty");
  if (presencePenalty !== undefined) {
    body.presence_penalty = presencePenalty;
  }

  const frequencyPenalty = parseNumericField(config.frequencyPenalty, "Frequency Penalty");
  if (frequencyPenalty !== undefined) {
    body.frequency_penalty = frequencyPenalty;
  }

  const stop = parseStopField(config.stop);
  if (stop !== undefined) {
    body.stop = stop;
  }

  if (config.stream && config.includeUsage) {
    body.stream_options = {
      include_usage: true,
    };
  }

  if (config.logprobs || config.topLogprobs.trim()) {
    body.logprobs = true;
  }

  const topLogprobs = parseNumericField(config.topLogprobs, "Top Logprobs", Number.parseInt);
  if (topLogprobs !== undefined) {
    body.top_logprobs = topLogprobs;
  }

  if (config.toolsJson.trim()) {
    const tools = parseJsonField(config.toolsJson, "Tools JSON");
    if (!Array.isArray(tools)) {
      throw new Error("Tools JSON 必须是数组。");
    }
    body.tools = tools;
  }

  if (config.toolChoiceMode === "named") {
    if (!config.toolChoiceName.trim()) {
      throw new Error("选择 named function 时必须填写函数名。");
    }

    body.tool_choice = {
      type: "function",
      function: {
        name: config.toolChoiceName.trim(),
      },
    };
  } else if (config.toolChoiceMode === "custom") {
    body.tool_choice = parseJsonField(config.toolChoiceCustomJson, "Tool Choice Custom JSON");
  } else if (config.toolChoiceMode !== "auto") {
    body.tool_choice = config.toolChoiceMode;
  }

  if (config.extraBodyJson.trim()) {
    const extra = parseJsonField(config.extraBodyJson, "额外请求字段 JSON");
    if (!isObject(extra)) {
      throw new Error("额外请求字段 JSON 必须是对象。");
    }
    return deepMerge(body, extra);
  }

  return body;
}

async function parseErrorResponse(response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text);
    return parsed?.error?.message ?? parsed?.message ?? text;
  } catch {
    return text;
  }
}

function promoteConversation(conversationId) {
  const index = state.conversations.findIndex((conversation) => conversation.id === conversationId);
  if (index <= 0) {
    return;
  }

  const [conversation] = state.conversations.splice(index, 1);
  state.conversations.unshift(conversation);
}

function autoRenameConversation(conversation, draft) {
  const trimmed = draft.trim();
  if (!trimmed) {
    return;
  }

  const isDefaultTitle = /^新对话(?: \d+)?$/.test(conversation.title);
  if (!isDefaultTitle || conversation.messages.length > 2) {
    return;
  }

  conversation.title = trimmed.slice(0, 32);
}

function mergeToolCallChunks(target, incoming) {
  if (!Array.isArray(incoming) || incoming.length === 0) {
    return target;
  }

  const next = Array.isArray(target) ? [...target] : [];

  for (const chunk of incoming) {
    const index = typeof chunk.index === "number" ? chunk.index : next.length;
    const current = next[index] ?? {
      id: "",
      type: "function",
      function: {
        name: "",
        arguments: "",
      },
    };

    if (chunk.id) {
      current.id = chunk.id;
    }

    if (chunk.type) {
      current.type = chunk.type;
    }

    if (chunk.function?.name) {
      current.function.name = current.function.name || chunk.function.name;
    }

    if (chunk.function?.arguments) {
      current.function.arguments = `${current.function.arguments}${chunk.function.arguments}`;
    }

    next[index] = current;
  }

  return next;
}

async function runStreamingRequest(conversation, assistantMessage, requestBody) {
  const controller = new AbortController();
  const startedAt = performance.now();
  assistantMessage.model = requestBody.model;
  runtime.streamStates.set(assistantMessage.id, {
    startedAt,
    firstContentAt: null,
  });
  runtime.controllers.set(conversation.id, controller);
  startThinkingTimer();
  scheduleRender();

  let firstContentAt = null;
  let finalUsage = null;
  let finalModel = requestBody.model;
  let finalFinishReason = null;
  let rawBuffer = "";

  try {
    const response = await fetch("/api/chat/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: state.preferences.apiKey,
        baseUrl: state.preferences.baseUrl,
        conversationId: conversation.id,
        requestBody,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    if (!response.body) {
      throw new Error("流式响应体为空。");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      rawBuffer += decoder.decode(value, { stream: true });

      while (true) {
        const boundaryIndex = rawBuffer.indexOf("\n\n");
        if (boundaryIndex === -1) {
          break;
        }

        const eventBlock = rawBuffer.slice(0, boundaryIndex);
        rawBuffer = rawBuffer.slice(boundaryIndex + 2);

        const dataLines = eventBlock
          .replace(/\r/g, "")
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart());

        if (dataLines.length === 0) {
          continue;
        }

        const payloadText = dataLines.join("\n");
        if (payloadText === "[DONE]") {
          continue;
        }

        const payload = JSON.parse(payloadText);
        finalModel = payload.model ?? finalModel;

        if (payload.usage) {
          finalUsage = normalizeUsage(payload.usage);
        }

        const choice = payload.choices?.[0];
        if (!choice) {
          continue;
        }

        finalFinishReason = choice.finish_reason ?? finalFinishReason;
        const delta = choice.delta ?? {};

        if (typeof delta.reasoning_content === "string" && delta.reasoning_content.length > 0) {
          assistantMessage.reasoningContent += delta.reasoning_content;
        }

        if (typeof delta.content === "string" && delta.content.length > 0) {
          if (firstContentAt === null) {
            firstContentAt = performance.now();
            assistantMessage.thinkingDurationMs = firstContentAt - startedAt;
            const streamState = runtime.streamStates.get(assistantMessage.id);
            if (streamState) {
              streamState.firstContentAt = firstContentAt;
            }
          }
          assistantMessage.content += delta.content;
        }

        if (delta.tool_calls) {
          assistantMessage.toolCalls = mergeToolCallChunks(assistantMessage.toolCalls, delta.tool_calls);
        }

        if (choice.logprobs) {
          assistantMessage.logprobs = choice.logprobs;
        }

        queueStreamingMessageUpdate(assistantMessage.id);
        schedulePersist();
      }
    }

    const finishedAt = performance.now();
    assistantMessage.model = finalModel;
    assistantMessage.finishReason = finalFinishReason;
    assistantMessage.usage = finalUsage;
    assistantMessage.totalDurationMs = finishedAt - startedAt;
    assistantMessage.thinkingDurationMs =
      firstContentAt !== null ? firstContentAt - startedAt : finishedAt - startedAt;
    assistantMessage.includeInContext = !assistantMessage.error;

    if (assistantMessage.toolCalls?.length) {
      setNotice(
        "本地界面已展示 tool_calls，但不会自动执行工具。若要继续该轮推理，需要自行补充工具执行结果。",
        "info",
      );
    }
  } catch (error) {
    if (error.name === "AbortError") {
      assistantMessage.error = "已手动停止本次生成。该条结果不会进入后续上下文。";
    } else {
      assistantMessage.error = error.message;
    }

    const streamState = runtime.streamStates.get(assistantMessage.id);
    if (assistantMessage.thinkingDurationMs === null || assistantMessage.thinkingDurationMs === undefined) {
      assistantMessage.thinkingDurationMs =
        streamState?.firstContentAt !== null && streamState?.firstContentAt !== undefined
          ? streamState.firstContentAt - streamState.startedAt
          : performance.now() - startedAt;
    }
    assistantMessage.includeInContext = false;
    assistantMessage.finishReason = assistantMessage.finishReason ?? "cancelled";
    assistantMessage.totalDurationMs = performance.now() - startedAt;
  } finally {
    runtime.controllers.delete(conversation.id);
    runtime.streamStates.delete(assistantMessage.id);
    stopThinkingTimerIfIdle();
    conversation.updatedAt = new Date().toISOString();
    scheduleRender();
    schedulePersist();
  }
}

async function runNonStreamingRequest(conversation, assistantMessage, requestBody) {
  const controller = new AbortController();
  const startedAt = performance.now();
  assistantMessage.model = requestBody.model;
  runtime.streamStates.set(assistantMessage.id, {
    startedAt,
    firstContentAt: null,
  });
  runtime.controllers.set(conversation.id, controller);
  startThinkingTimer();
  scheduleRender();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: state.preferences.apiKey,
        baseUrl: state.preferences.baseUrl,
        conversationId: conversation.id,
        requestBody,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    const choice = payload.choices?.[0];
    const message = choice?.message ?? {};

    assistantMessage.content = message.content ?? "";
    assistantMessage.reasoningContent = message.reasoning_content ?? "";
    assistantMessage.toolCalls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
    assistantMessage.logprobs = choice?.logprobs ?? null;
    assistantMessage.model = payload.model ?? requestBody.model;
    assistantMessage.finishReason = choice?.finish_reason ?? null;
    assistantMessage.usage = normalizeUsage(payload.usage);
    const finishedAt = performance.now();
    assistantMessage.totalDurationMs = finishedAt - startedAt;
    assistantMessage.thinkingDurationMs = assistantMessage.totalDurationMs;
    assistantMessage.includeInContext = true;

    if (assistantMessage.toolCalls.length) {
      setNotice(
        "本地界面已展示 tool_calls，但不会自动执行工具。若要继续该轮推理，需要自行补充工具执行结果。",
        "info",
      );
    }
  } catch (error) {
    if (error.name === "AbortError") {
      assistantMessage.error = "已手动停止本次生成。该条结果不会进入后续上下文。";
    } else {
      assistantMessage.error = error.message;
    }

    assistantMessage.includeInContext = false;
    assistantMessage.finishReason = assistantMessage.finishReason ?? "cancelled";
    assistantMessage.totalDurationMs = performance.now() - startedAt;
    assistantMessage.thinkingDurationMs = assistantMessage.totalDurationMs;
  } finally {
    runtime.controllers.delete(conversation.id);
    runtime.streamStates.delete(assistantMessage.id);
    stopThinkingTimerIfIdle();
    conversation.updatedAt = new Date().toISOString();
    scheduleRender();
    schedulePersist();
  }
}

function ensureReadyToSend(conversation, draft) {
  if (!state.preferences.apiKey.trim()) {
    setNotice("请先填写 API Key。", "error");
    setInspectorOpen(true);
    return false;
  }

  if (!draft) {
    setNotice("请输入要发送的内容。", "error");
    return false;
  }

  if (hasActiveConversationRequest(conversation.id)) {
    setNotice("当前会话正在生成，请先停止或等待完成。", "error");
    return false;
  }

  return true;
}

function getDraftReplayIndex(conversation) {
  if (runtime.replaySource?.conversationId !== conversation.id) {
    runtime.replaySource = null;
    return conversation.messages.length;
  }

  const replayIndex = getReplayUserIndex(conversation, runtime.replaySource.messageId);
  if (replayIndex === -1) {
    runtime.replaySource = null;
    return conversation.messages.length;
  }

  return replayIndex;
}

async function sendPromptFromIndex(conversation, prompt, replayIndex, modelOverride = null) {
  const draft = prompt.trim();
  if (!ensureReadyToSend(conversation, draft)) {
    return;
  }

  if (!beginConversationRequest(conversation.id)) {
    setNotice("当前会话正在生成，请先停止或等待完成。", "error");
    return;
  }

  try {
    const safeReplayIndex = Math.max(0, Math.min(replayIndex, conversation.messages.length));
    const requestConfig = {
      ...conversation.requestConfig,
      ...(modelOverride ? { model: modelOverride } : {}),
    };
    const contextMessages = conversation.messages.slice(0, safeReplayIndex);

    let requestBody;
    try {
      requestBody = buildRequestBody(
        {
          requestConfig,
          messages: contextMessages,
        },
        {
          role: "user",
          content: draft,
        },
      );
    } catch (error) {
      setNotice(error.message, "error");
      setInspectorOpen(true);
      renderRequestPreview();
      return;
    }

    const userMessage = createUserMessage(draft);
    const assistantMessage = createAssistantMessage();

    if (modelOverride) {
      conversation.requestConfig.model = modelOverride;
    }

    if (safeReplayIndex === conversation.messages.length) {
      autoRenameConversation(conversation, draft);
    }

    conversation.messages.splice(safeReplayIndex);
    conversation.draft = "";
    conversation.messages.push(userMessage, assistantMessage);
    conversation.updatedAt = new Date().toISOString();
    promoteConversation(conversation.id);
    state.activeConversationId = conversation.id;
    runtime.replaySource = null;

    scheduleRender();
    schedulePersist();

    if (requestConfig.stream) {
      await runStreamingRequest(conversation, assistantMessage, requestBody);
    } else {
      await runNonStreamingRequest(conversation, assistantMessage, requestBody);
    }
  } finally {
    finishConversationRequest(conversation.id);
    scheduleRender();
  }
}

async function sendCurrentDraft() {
  clearNotice();

  const conversation = getActiveConversation();
  const draft = getComposerValue().trim();
  const replayIndex = getDraftReplayIndex(conversation);
  await sendPromptFromIndex(conversation, draft, replayIndex);
}

async function retryMessageFromContext(messageId, modelOverride = null) {
  clearNotice();

  const conversation = getActiveConversation();
  const replayIndex = getReplayUserIndex(conversation, messageId);
  if (replayIndex === -1) {
    setNotice("找不到可重试的输入。", "error");
    return;
  }

  const prompt = conversation.messages[replayIndex].content;
  await sendPromptFromIndex(conversation, prompt, replayIndex, modelOverride);
}

async function testCurrentSettings() {
  clearNotice();

  if (!state.preferences.apiKey.trim()) {
    setNotice("请先填写 API Key。", "error");
    setInspectorOpen(true);
    return;
  }

  if (runtime.settingsTest.state === "running") {
    return;
  }

  const conversation = getActiveConversation();
  if (hasActiveConversationRequest(conversation.id)) {
    setSettingsTestState(
      "error",
      "当前会话已有请求正在进行。",
      "请等待当前生成完成或停止后再测试设置，避免产生额外模型调用。",
    );
    return;
  }

  let requestBody;

  try {
    requestBody = buildRequestBody(
      {
        requestConfig: conversation.requestConfig,
        messages: [],
      },
      {
        role: "user",
        content: "请只回复：OK",
      },
    );
  } catch (error) {
    setSettingsTestState("error", "测试前检查未通过。", error.message);
    setInspectorOpen(true);
    renderRequestPreview();
    return;
  }

  requestBody.stream = false;
  delete requestBody.stream_options;
  if (!requestBody.max_tokens || requestBody.max_tokens > 32) {
    requestBody.max_tokens = 32;
  }

  setSettingsTestState("running", "正在测试当前设置...", "会发送一条很短的验证请求，不会写入当前对话历史。");

  if (!beginConversationRequest(conversation.id)) {
    setSettingsTestState(
      "error",
      "当前会话已有请求正在进行。",
      "请等待当前生成完成或停止后再测试设置，避免产生额外模型调用。",
    );
    return;
  }
  scheduleRender();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: state.preferences.apiKey,
        baseUrl: state.preferences.baseUrl,
        conversationId: conversation.id,
        requestBody,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    const choice = payload.choices?.[0];
    const message = choice?.message ?? {};
    const content = (message.content ?? "").trim();
    const usage = normalizeUsage(payload.usage);
    const detailParts = [
      `模型：${getModelDisplayLabel(payload.model ?? requestBody.model)}`,
      `finish_reason：${choice?.finish_reason ?? "unknown"}`,
    ];

    if (usage?.promptTokens !== null && usage?.promptTokens !== undefined) {
      detailParts.push(`输入 Token：${formatTokenCount(usage.promptTokens)}`);
    }

    if (usage?.completionTokens !== null && usage?.completionTokens !== undefined) {
      detailParts.push(`输出 Token：${formatTokenCount(usage.completionTokens)}`);
    }

    const responsePreview = content || "接口返回成功，但内容为空。";
    setSettingsTestState(
      "success",
      "设置有效，已收到响应。",
      `${detailParts.join(" · ")}\n返回内容：${responsePreview}`,
    );
  } catch (error) {
    setSettingsTestState("error", "设置测试失败。", error.message);
  } finally {
    finishConversationRequest(conversation.id);
    scheduleRender();
  }
}

function stopActiveConversation() {
  const conversation = getActiveConversation();
  const controller = runtime.controllers.get(conversation.id);

  if (controller) {
    controller.abort();
  }
}

function closeRetryMenus() {
  for (const menu of refs.messagesPanel.querySelectorAll(".retry-action-menu.is-open")) {
    menu.classList.remove("is-open");
    menu.querySelector(".retry-trigger")?.setAttribute("aria-expanded", "false");
    const popover = menu.querySelector(".retry-popover");
    if (popover) {
      popover.hidden = true;
    }
  }
}

function toggleRetryMenu(trigger) {
  const menu = trigger.closest(".retry-action-menu");
  if (!menu) {
    return;
  }

  const shouldOpen = !menu.classList.contains("is-open");
  closeRetryMenus();
  menu.classList.toggle("is-open", shouldOpen);
  trigger.setAttribute("aria-expanded", String(shouldOpen));

  const popover = menu.querySelector(".retry-popover");
  if (popover) {
    popover.hidden = !shouldOpen;
  }
}

function toggleThinkingBlock(messageId) {
  const conversation = getActiveConversation();
  const message = conversation.messages.find((item) => item.id === messageId);
  if (!message || !message.reasoningContent) {
    return;
  }

  message.reasoningCollapsed = !message.reasoningCollapsed;
  const article = refs.messagesPanel.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  const block = article?.querySelector('[data-block-kind="thinking"]');
  syncThinkingBlockCollapsed(block, message);
  schedulePersist();
}

async function handleMessageAction(event) {
  const button = event.target.closest(".message-action, .retry-option, .thinking-toggle");
  if (!button) {
    return;
  }

  const { action, messageId } = button.dataset;
  if (!action || !messageId) {
    return;
  }

  const conversation = getActiveConversation();
  const message = conversation.messages.find((item) => item.id === messageId);
  if (!message && action !== "stop-generation") {
    setNotice("找不到这条消息。", "error");
    return;
  }

  if (action === "copy-message") {
    closeRetryMenus();
    await copyTextToClipboard(getMessageCopyText(message));
  } else if (action === "edit-replay") {
    closeRetryMenus();
    setReplayDraft(messageId);
  } else if (action === "toggle-retry-menu") {
    event.stopPropagation();
    toggleRetryMenu(button);
  } else if (action === "toggle-thinking") {
    event.stopPropagation();
    closeRetryMenus();
    toggleThinkingBlock(messageId);
  } else if (action === "retry-current") {
    closeRetryMenus();
    await retryMessageFromContext(messageId);
  } else if (action === "retry-flash") {
    closeRetryMenus();
    await retryMessageFromContext(messageId, "deepseek-v4-flash");
  } else if (action === "retry-pro") {
    closeRetryMenus();
    await retryMessageFromContext(messageId, "deepseek-v4-pro");
  } else if (action === "stop-generation") {
    closeRetryMenus();
    stopActiveConversation();
  }
}

async function refreshModelCatalog() {
  clearNotice();

  if (!state.preferences.apiKey.trim()) {
    setNotice("拉取模型前请先填写 API Key。", "error");
    setInspectorOpen(true);
    return;
  }

  runtime.modelStatus = "正在拉取模型列表...";
  renderPreferences();

  try {
    const response = await fetch("/api/models", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiKey: state.preferences.apiKey,
        baseUrl: state.preferences.baseUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(await parseErrorResponse(response));
    }

    const payload = await response.json();
    runtime.modelCatalog = Array.isArray(payload.data) ? payload.data : [];
    runtime.modelStatus = `已拉取 ${runtime.modelCatalog.length} 个模型。`;
    scheduleRender();
  } catch (error) {
    runtime.modelCatalog = [];
    runtime.modelStatus = "拉取失败。";
    setNotice(`模型列表获取失败：${error.message}`, "error");
  }
}

function ensureAtLeastOneConversation() {
  if (state.conversations.length > 0) {
    return;
  }

  const conversation = createDefaultConversation();
  state.conversations = [conversation];
  state.activeConversationId = conversation.id;
}

function addConversation(copyFromActive = false) {
  const activeConversation = getActiveConversation();
  const source = copyFromActive ? activeConversation : null;
  const conversation = copyFromActive
    ? {
        ...structuredClone(source),
        id: createId(),
        title: `${source.title} 副本`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [],
        draft: "",
      }
    : createDefaultConversation(`新对话 ${state.conversations.length + 1}`);

  if (!copyFromActive) {
    const inheritedModel = asString(activeConversation?.requestConfig?.model).trim();
    if (inheritedModel) {
      conversation.requestConfig.model = inheritedModel;
    }
  }

  state.conversations.unshift(conversation);
  state.activeConversationId = conversation.id;
  runtime.replaySource = null;
  resetSettingsTestState();
  if (isCompactViewport()) {
    setSidebarOpen(false);
  }
  scheduleRender();
  schedulePersist();
}

function clearActiveConversation() {
  const conversation = getActiveConversation();
  if (runtime.controllers.has(conversation.id)) {
    return;
  }

  conversation.messages = [];
  conversation.draft = "";
  conversation.updatedAt = new Date().toISOString();
  runtime.replaySource = null;
  resetSettingsTestState();
  clearNotice();
  scheduleRender();
  schedulePersist();
}

function deleteConversationById(conversationId, confirmBeforeDelete = true) {
  const conversation = state.conversations.find((item) => item.id === conversationId);
  if (!conversation) {
    return;
  }

  if (hasActiveConversationRequest(conversation.id)) {
    setNotice("对话请求中，暂不能删除。", "error");
    return;
  }

  if (state.conversations.length === 1) {
    setNotice("至少保留一个对话。", "info");
    return;
  }

  if (
    confirmBeforeDelete &&
    !window.confirm(`确定删除“${conversation.title || "未命名对话"}”吗？此操作无法撤销。`)
  ) {
    return;
  }

  const index = state.conversations.findIndex((item) => item.id === conversation.id);
  state.conversations.splice(index, 1);
  ensureAtLeastOneConversation();

  if (state.activeConversationId === conversation.id) {
    state.activeConversationId =
      state.conversations[index]?.id ?? state.conversations[index - 1]?.id ?? state.conversations[0].id;
  }

  runtime.replaySource = null;
  resetSettingsTestState();
  clearNotice();
  scheduleRender();
  schedulePersist();
}

function deleteActiveConversation() {
  deleteConversationById(state.activeConversationId);
}

function bindConfigInput(input, field, transform = (value) => value) {
  const handler = () => {
    const value = input.type === "checkbox" ? input.checked : input.value;
    updateConversationConfig(field, transform(value));
  };

  input.addEventListener("input", handler);

  if (input.tagName === "SELECT" || input.type === "checkbox") {
    input.addEventListener("change", handler);
  }
}

function handleViewportChange() {
  const compact = isCompactViewport();

  if (compact !== runtime.compactViewport) {
    runtime.compactViewport = compact;
    runtime.sidebarOpen = false;
  }

  syncLayoutState();
}

function bindEvents() {
  refs.newConversationBtn.addEventListener("click", () => addConversation(false));
  refs.duplicateConversationBtn.addEventListener("click", () => addConversation(true));
  refs.clearConversationBtn.addEventListener("click", clearActiveConversation);
  refs.deleteConversationBtn.addEventListener("click", deleteActiveConversation);
  refs.stopBtn.addEventListener("click", stopActiveConversation);
  refs.messagesPanel.addEventListener("click", (event) => {
    void handleMessageAction(event);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".retry-action-menu")) {
      closeRetryMenus();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeRetryMenus();
    }
  });
  refs.settingsTestBtn.addEventListener("click", () => {
    void testCurrentSettings();
  });

  refs.sidebarDockToggleBtn.addEventListener("click", () => {
    if (isCompactViewport()) {
      setSidebarOpen(!runtime.sidebarOpen);
      return;
    }

    setSidebarCollapsed(!runtime.sidebarCollapsed);
  });
  refs.sidebarToggleBtn.addEventListener("click", () => {
    setSidebarOpen(true);
  });
  refs.sidebarCloseBtn.addEventListener("click", () => {
    setSidebarOpen(false);
  });
  refs.sidebarScrim.addEventListener("click", () => {
    setSidebarOpen(false);
  });

  refs.inspectorToggleBtn.addEventListener("click", () => {
    setInspectorOpen(!runtime.inspectorOpen);
  });
  refs.inspectorCloseBtn.addEventListener("click", () => {
    setInspectorOpen(false);
  });
  refs.inspectorBackdrop.addEventListener("click", () => {
    setInspectorOpen(false);
  });

  refs.conversationList.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-action='delete-conversation']");
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();

      const conversationId = deleteButton.dataset.conversationId;
      if (conversationId) {
        deleteConversationById(conversationId);
      }
      return;
    }

    const button = event.target.closest("[data-action='select-conversation']");
    if (!button) {
      return;
    }

    const conversationId = button.dataset.conversationId;
    if (!conversationId) {
      return;
    }

    state.activeConversationId = conversationId;
    runtime.replaySource = null;
    resetSettingsTestState();
    clearNotice();
    if (isCompactViewport()) {
      setSidebarOpen(false);
    }
    scheduleRender();
    schedulePersist();
  });

  refs.conversationTitleInput.addEventListener("input", () => {
    const conversation = getActiveConversation();
    conversation.title = refs.conversationTitleInput.value || "未命名对话";
    conversation.updatedAt = new Date().toISOString();
    renderConversationList();
    renderConversationHeader();
    schedulePersist();
  });

  refs.composerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    void sendCurrentDraft();
  });

  refs.apiKeyInput.addEventListener("input", () => {
    state.preferences.apiKey = refs.apiKeyInput.value;
    resetSettingsTestState();
    renderPreferences();
    schedulePersist();
  });

  refs.rememberApiKeyInput.addEventListener("change", () => {
    state.preferences.rememberApiKey = refs.rememberApiKeyInput.checked;
    if (!state.preferences.rememberApiKey) {
      state.preferences.apiKey = refs.apiKeyInput.value;
    }
    resetSettingsTestState();
    renderPreferences();
    schedulePersist();
  });

  refs.baseUrlInput.addEventListener("input", () => {
    state.preferences.baseUrl = refs.baseUrlInput.value || DEFAULT_BASE_URL;
    resetSettingsTestState();
    renderPreferences();
    schedulePersist();
  });

  bindConfigInput(refs.systemPromptInput, "systemPrompt");
  bindConfigInput(refs.thinkingTypeSelect, "thinkingType");
  bindConfigInput(refs.reasoningEffortSelect, "reasoningEffort");
  bindConfigInput(refs.streamToggle, "stream", Boolean);
  bindConfigInput(refs.includeUsageToggle, "includeUsage", Boolean);
  bindConfigInput(refs.responseFormatSelect, "responseFormatType");
  bindConfigInput(refs.maxTokensInput, "maxTokens");
  bindConfigInput(refs.temperatureInput, "temperature");
  bindConfigInput(refs.topPInput, "topP");
  bindConfigInput(refs.presencePenaltyInput, "presencePenalty");
  bindConfigInput(refs.frequencyPenaltyInput, "frequencyPenalty");
  bindConfigInput(refs.stopInput, "stop");
  bindConfigInput(refs.logprobsToggle, "logprobs", Boolean);
  bindConfigInput(refs.topLogprobsInput, "topLogprobs");
  bindConfigInput(refs.toolsJsonInput, "toolsJson");
  bindConfigInput(refs.toolChoiceModeSelect, "toolChoiceMode");
  bindConfigInput(refs.toolChoiceNameInput, "toolChoiceName");
  bindConfigInput(refs.toolChoiceCustomInput, "toolChoiceCustomJson");
  bindConfigInput(refs.extraBodyInput, "extraBodyJson");

  refs.modelPresetSelect.addEventListener("change", () => {
    if (refs.modelPresetSelect.value === "custom") {
      refs.customModelField.hidden = false;
      refs.customModelInput.disabled = false;
      updateConversationConfig("model", refs.customModelInput.value.trim());
      refs.customModelInput.focus();
      return;
    }

    refs.customModelField.hidden = true;
    refs.customModelInput.disabled = true;
    updateConversationConfig("model", refs.modelPresetSelect.value);
  });

  refs.customModelInput.addEventListener("input", () => {
    updateConversationConfig("model", refs.customModelInput.value.trim());
  });

  window.addEventListener("resize", handleViewportChange);
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncComposerTheme);
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    if (runtime.inspectorOpen) {
      setInspectorOpen(false);
    } else if (runtime.sidebarOpen && isCompactViewport()) {
      setSidebarOpen(false);
    }
  });
}

async function main() {
  enhanceSelectControls();
  bindEvents();
  await hydrateState();
  initComposerEditor();
  if (!MARKDOWN_PARSER?.parse || !HTML_SANITIZER?.sanitize || typeof MATH_RENDERER !== "function") {
    setNotice("Markdown / KaTeX 渲染器未完整加载，当前已回退为纯文本显示。", "error");
  }
  handleViewportChange();
  render();
}

void main();
