import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const NODE_MODULES_DIR = path.join(__dirname, "node_modules");
const STORE_PATH = path.join(DATA_DIR, "store.json");
const DEFAULT_BASE_URL = "https://api.deepseek.com";
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);
const VENDOR_ROOTS = new Map([
  ["dompurify", path.join(NODE_MODULES_DIR, "dompurify", "dist")],
  ["katex", path.join(NODE_MODULES_DIR, "katex", "dist")],
  ["marked", path.join(NODE_MODULES_DIR, "marked", "lib")],
  ["vditor", path.join(NODE_MODULES_DIR, "vditor")],
]);

const MIME_TYPES = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "application/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".gif", "image/gif"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
  [".ttf", "font/ttf"],
  [".woff", "font/woff"],
  [".woff2", "font/woff2"],
]);

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

const activeChatRequests = new Map();

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
  }
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

function asNullableString(value) {
  if (value === null || value === undefined) {
    return null;
  }

  return String(value);
}

function asBoolean(value, fallback = false) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return fallback;
}

function asNullableNumber(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const nextValue = Number.parseFloat(String(value ?? ""));
  return Number.isFinite(nextValue) ? nextValue : null;
}

function sanitizeBaseUrl(value) {
  const raw = asString(value, DEFAULT_BASE_URL).trim() || DEFAULT_BASE_URL;

  try {
    const url = new URL(raw);
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_BASE_URL;
  }
}

function buildApiUrl(baseUrl, endpoint) {
  const url = new URL(baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  const cleanEndpoint = endpoint.replace(/^\//, "");
  const basePath = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;

  url.pathname = `${basePath}${cleanEndpoint}`.replace(/\/+/g, "/");
  return url.toString();
}

function createDefaultConversation(title = "新对话") {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
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

function normalizeUsage(value) {
  if (!isObject(value)) {
    return null;
  }

  const completionDetails = isObject(value.completionTokensDetails)
    ? value.completionTokensDetails
    : isObject(value.completion_tokens_details)
      ? value.completion_tokens_details
      : {};

  return {
    completionTokens: asNullableNumber(value.completionTokens ?? value.completion_tokens),
    promptTokens: asNullableNumber(value.promptTokens ?? value.prompt_tokens),
    promptCacheHitTokens: asNullableNumber(
      value.promptCacheHitTokens ?? value.prompt_cache_hit_tokens,
    ),
    promptCacheMissTokens: asNullableNumber(
      value.promptCacheMissTokens ?? value.prompt_cache_miss_tokens,
    ),
    totalTokens: asNullableNumber(value.totalTokens ?? value.total_tokens),
    completionTokensDetails: {
      reasoningTokens: asNullableNumber(
        completionDetails.reasoningTokens ?? completionDetails.reasoning_tokens,
      ),
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
    stream: asBoolean(input.stream, DEFAULT_REQUEST_CONFIG.stream),
    includeUsage: asBoolean(input.includeUsage, DEFAULT_REQUEST_CONFIG.includeUsage),
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
    logprobs: asBoolean(input.logprobs, DEFAULT_REQUEST_CONFIG.logprobs),
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
    id: asString(value.id, randomUUID()),
    role,
    content: asString(value.content),
    reasoningContent: asString(value.reasoningContent ?? value.reasoning_content),
    toolCalls: Array.isArray(value.toolCalls ?? value.tool_calls)
      ? value.toolCalls ?? value.tool_calls
      : [],
    logprobs: isObject(value.logprobs) ? value.logprobs : null,
    usage: normalizeUsage(value.usage),
    model: asNullableString(value.model),
    finishReason: asNullableString(value.finishReason ?? value.finish_reason),
    createdAt: asString(value.createdAt, new Date().toISOString()),
    thinkingDurationMs: asNullableNumber(
      value.thinkingDurationMs ?? value.thinking_duration_ms,
    ),
    totalDurationMs: asNullableNumber(value.totalDurationMs ?? value.total_duration_ms),
    error: asNullableString(value.error),
    reasoningCollapsed: asBoolean(value.reasoningCollapsed),
    includeInContext: value.includeInContext !== false,
  };
}

function normalizeConversation(value, index) {
  const defaults = createDefaultConversation(`新对话 ${index + 1}`);
  const input = isObject(value) ? value : {};
  const messages = Array.isArray(input.messages)
    ? input.messages.map(normalizeMessage).filter(Boolean)
    : [];

  return {
    id: asString(input.id, defaults.id),
    title: asString(input.title, defaults.title),
    createdAt: asString(input.createdAt, defaults.createdAt),
    updatedAt: asString(input.updatedAt, defaults.updatedAt),
    draft: asString(input.draft),
    requestConfig: normalizeRequestConfig(input.requestConfig),
    messages,
  };
}

function normalizePreferences(value) {
  const input = isObject(value) ? value : {};

  return {
    apiKey: asString(input.apiKey),
    rememberApiKey: asBoolean(input.rememberApiKey),
    baseUrl: sanitizeBaseUrl(input.baseUrl),
  };
}

function normalizeState(candidate) {
  const defaults = createDefaultState();
  const input = isObject(candidate) ? candidate : {};
  const preferences = normalizePreferences(input.preferences);
  const conversations = Array.isArray(input.conversations) && input.conversations.length > 0
    ? input.conversations.map(normalizeConversation)
    : defaults.conversations;

  const state = {
    version: 1,
    updatedAt: new Date().toISOString(),
    preferences,
    conversations,
    activeConversationId: asString(input.activeConversationId, conversations[0].id),
  };

  if (!state.conversations.some((conversation) => conversation.id === state.activeConversationId)) {
    state.activeConversationId = state.conversations[0].id;
  }

  if (!state.preferences.rememberApiKey) {
    state.preferences.apiKey = "";
  }

  return state;
}

async function ensureStore() {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STORE_PATH);
  } catch {
    const state = createDefaultState();
    await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
  }
}

async function loadState() {
  await ensureStore();

  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return normalizeState(JSON.parse(raw));
  } catch {
    const state = createDefaultState();
    await fs.writeFile(STORE_PATH, JSON.stringify(state, null, 2), "utf8");
    return state;
  }
}

async function saveState(rawState) {
  const nextState = normalizeState(rawState);

  if (!nextState.preferences.rememberApiKey) {
    nextState.preferences.apiKey = "";
  }

  await ensureStore();
  await fs.writeFile(STORE_PATH, JSON.stringify(nextState, null, 2), "utf8");
  return nextState;
}

async function parseJsonBody(request) {
  const chunks = [];
  let totalLength = 0;

  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalLength += buffer.length;

    if (totalLength > 10 * 1024 * 1024) {
      throw new HttpError(413, "请求体过大。");
    }

    chunks.push(buffer);
  }

  if (chunks.length === 0) {
    return {};
  }

  const text = Buffer.concat(chunks).toString("utf8");

  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "请求体不是合法 JSON。");
  }
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function sendText(response, statusCode, body, contentType = "text/plain; charset=utf-8") {
  response.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function getStaticContentType(filePath) {
  return MIME_TYPES.get(path.extname(filePath).toLowerCase()) ?? "application/octet-stream";
}

function resolveSafePath(rootDir, pathname) {
  const resolvedPath = path.resolve(rootDir, `.${pathname}`);
  const normalizedRoot = `${rootDir}${path.sep}`;
  return resolvedPath === rootDir || resolvedPath.startsWith(normalizedRoot) ? resolvedPath : null;
}

async function serveFile(response, filePath) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile()) {
    throw new Error("Not a file");
  }

  const buffer = await fs.readFile(filePath);
  response.writeHead(200, {
    "Content-Type": getStaticContentType(filePath),
    "Content-Length": buffer.length,
    "Cache-Control": "no-store",
  });
  response.end(buffer);
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname.startsWith("/vendor/")) {
    const [, , packageName, ...segments] = pathname.split("/");
    const vendorRoot = VENDOR_ROOTS.get(packageName);

    if (!vendorRoot || segments.length === 0) {
      sendText(response, 404, "Not Found");
      return;
    }

    const resolvedPath = resolveSafePath(vendorRoot, `/${segments.join("/")}`);
    if (!resolvedPath) {
      sendText(response, 403, "Forbidden");
      return;
    }

    try {
      await serveFile(response, resolvedPath);
    } catch {
      sendText(response, 404, "Not Found");
    }
    return;
  }

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const resolvedPath = resolveSafePath(PUBLIC_DIR, pathname);
  if (!resolvedPath) {
    sendText(response, 403, "Forbidden");
    return;
  }

  try {
    await serveFile(response, resolvedPath);
  } catch {
    sendText(response, 404, "Not Found");
  }
}

function extractUpstreamError(text) {
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed?.error?.message === "string") {
      return parsed.error.message;
    }

    if (typeof parsed?.message === "string") {
      return parsed.message;
    }
  } catch {
    return text;
  }

  return text;
}

async function readProxyPayload(request) {
  const body = await parseJsonBody(request);
  const apiKey = asString(body.apiKey).trim();
  const baseUrl = sanitizeBaseUrl(body.baseUrl);
  const conversationId = asString(body.conversationId).trim();
  const requestBody = isObject(body.requestBody) ? body.requestBody : null;

  if (!apiKey) {
    throw new HttpError(400, "请先提供 API Key。");
  }

  if (!requestBody) {
    throw new HttpError(400, "缺少 requestBody。");
  }

  if (!conversationId) {
    throw new HttpError(400, "缺少 conversationId，无法执行会话级重复请求保护。请刷新页面后重试。");
  }

  return { apiKey, baseUrl, conversationId, requestBody };
}

function beginChatRequest(conversationId) {
  if (!conversationId) {
    return () => {};
  }

  if (activeChatRequests.has(conversationId)) {
    throw new HttpError(
      409,
      "当前会话已有请求正在生成，已拒绝重复请求以避免重复消耗 token。",
    );
  }

  const requestId = randomUUID();
  activeChatRequests.set(conversationId, requestId);

  return () => {
    if (activeChatRequests.get(conversationId) === requestId) {
      activeChatRequests.delete(conversationId);
    }
  };
}

async function handleStateGet(_request, response) {
  const state = await loadState();
  sendJson(response, 200, { ok: true, state });
}

async function handleStatePost(request, response) {
  const body = await parseJsonBody(request);
  const state = await saveState(body);
  sendJson(response, 200, { ok: true, state });
}

async function handleModelsPost(request, response) {
  const body = await parseJsonBody(request);
  const apiKey = asString(body.apiKey).trim();
  const baseUrl = sanitizeBaseUrl(body.baseUrl);

  if (!apiKey) {
    throw new HttpError(400, "请先提供 API Key。");
  }

  const upstream = await fetch(buildApiUrl(baseUrl, "models"), {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const payload = await upstream.text();
  const contentType = upstream.headers.get("content-type") ?? "application/json; charset=utf-8";

  response.writeHead(upstream.status, {
    "Content-Type": contentType,
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

async function handleChatPost(request, response) {
  const { apiKey, baseUrl, conversationId, requestBody } = await readProxyPayload(request);
  const releaseChatRequest = beginChatRequest(conversationId);

  try {
    const upstream = await fetch(buildApiUrl(baseUrl, "chat/completions"), {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const payload = await upstream.text();
    const contentType = upstream.headers.get("content-type") ?? "application/json; charset=utf-8";

    response.writeHead(upstream.status, {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    });
    response.end(payload);
  } finally {
    releaseChatRequest();
  }
}

async function handleChatStreamPost(request, response) {
  const { apiKey, baseUrl, conversationId, requestBody } = await readProxyPayload(request);
  const releaseChatRequest = beginChatRequest(conversationId);
  const controller = new AbortController();

  request.on("close", () => {
    controller.abort();
  });

  try {
    const upstream = await fetch(buildApiUrl(baseUrl, "chat/completions"), {
      method: "POST",
      headers: {
        Accept: "text/event-stream",
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...requestBody, stream: true }),
      signal: controller.signal,
    });

    if (!upstream.ok) {
      const payload = await upstream.text();
      const contentType = upstream.headers.get("content-type") ?? "application/json; charset=utf-8";

      response.writeHead(upstream.status, {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      });
      response.end(payload);
      return;
    }

    response.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    if (!upstream.body) {
      response.end();
      return;
    }

    const reader = upstream.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        response.write(Buffer.from(value));
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        throw error;
      }
    } finally {
      response.end();
    }
  } finally {
    releaseChatRequest();
  }
}

function handleError(response, error) {
  if (error instanceof HttpError) {
    sendJson(response, error.statusCode, {
      ok: false,
      error: {
        message: error.message,
      },
    });
    return;
  }

  const message = extractUpstreamError(asString(error?.message, "服务器发生未知错误。"));
  sendJson(response, 500, {
    ok: false,
    error: {
      message,
    },
  });
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/state") {
      await handleStateGet(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/state") {
      await handleStatePost(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/models") {
      await handleModelsPost(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/chat") {
      await handleChatPost(request, response);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/chat/stream") {
      await handleChatStreamPost(request, response);
      return;
    }

    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }

    throw new HttpError(404, "接口不存在。");
  } catch (error) {
    handleError(response, error);
  }
});

await ensureStore();

server.listen(PORT, "127.0.0.1", () => {
  console.log(`DeepSeek Local Console is running at http://127.0.0.1:${PORT}`);
  console.log(`State persistence file: ${STORE_PATH}`);
});
