import { getCustomerGraphSession } from '../../auth/logic/authService.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// This visual queue intentionally paces already validated content. It does not
// reveal raw model tokens or hidden reasoning. It also protects the UX when a
// browser/dev proxy buffers several SSE frames and delivers them together.
const VISUAL_PACING = Object.freeze({
  initialProgressMs: 900,
  progressMs: 1650,
  statusMs: 650,
  wordMs: 150,
  signalMs: 1050,
  actionMs: 900,
});

const sleep = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

function authHeaders(accept = 'application/json') {
  const token = getCustomerGraphSession()?.accessToken;
  return {
    Accept: accept,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function responseError(response) {
  const data = await response.json().catch(() => ({}));
  return new Error(data?.detail || data?.message || 'AI analysis could not be completed.');
}

async function postAiAnalysis(path) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(),
  });

  if (!response.ok) throw await responseError(response);
  return response.json().catch(() => ({}));
}

function parseSseBlock(block) {
  const lines = block.replace(/\r/g, '').split('\n');
  let event = 'message';
  const payloadLines = [];

  lines.forEach((line) => {
    if (!line || line.startsWith(':')) return;
    if (line.startsWith('event:')) event = line.slice(6).trim() || 'message';
    if (line.startsWith('data:')) payloadLines.push(line.slice(5).trimStart());
  });

  if (!payloadLines.length) return null;
  const raw = payloadLines.join('\n');
  try {
    return { event, data: JSON.parse(raw) };
  } catch {
    return { event, data: { text: raw } };
  }
}

function notify(handlers, name, payload) {
  const handler = handlers?.[name];
  if (typeof handler === 'function') handler(payload);
}

function wordsForDisplay(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // Preserve a readable trailing space while text is revealed word by word.
  return clean.match(/\S+\s*/g) || [];
}

/**
 * Streams an already-authorised Dashboard widget analysis from the same public
 * endpoint. The browser receives request progress plus validated brief/signal/
 * action blocks. It never receives raw LLM tokens or hidden reasoning.
 *
 * Every UI event goes through a display queue so the experience remains
 * intentionally readable even when the network returns several events at once.
 */
export async function streamDashboardWidget(section, handlers = {}) {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/ai/analyse-dashboard?section=${encodeURIComponent(section)}&stream=true`,
    {
      method: 'POST',
      headers: authHeaders('text/event-stream, application/json'),
    },
  );

  if (!response.ok) throw await responseError(response);

  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  if (!contentType.includes('text/event-stream') || !response.body) {
    const result = await response.json().catch(() => ({}));
    notify(handlers, 'onComplete', result);
    return result;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completedResult = null;
  let streamError = null;
  let progressEventsSeen = 0;

  const revealBriefChunk = async (text) => {
    const words = wordsForDisplay(text);
    for (const word of words) {
      notify(handlers, 'onBriefChunk', { text: word });
      await sleep(VISUAL_PACING.wordMs);
    }
  };

  const processBlock = async (block) => {
    const parsed = parseSseBlock(block);
    if (!parsed) return;

    const { event, data } = parsed;
    if (event === 'progress') {
      const waitTime = progressEventsSeen === 0
        ? VISUAL_PACING.initialProgressMs
        : VISUAL_PACING.progressMs;
      progressEventsSeen += 1;
      await sleep(waitTime);
      notify(handlers, 'onProgress', data);
      return;
    }

    if (event === 'status') {
      await sleep(VISUAL_PACING.statusMs);
      notify(handlers, 'onStatus', data);
      return;
    }

    if (event === 'brief_chunk') {
      await revealBriefChunk(data?.text);
      return;
    }

    if (event === 'signal') {
      await sleep(VISUAL_PACING.signalMs);
      notify(handlers, 'onSignal', data);
      return;
    }

    if (event === 'recommended_action') {
      await sleep(VISUAL_PACING.actionMs);
      notify(handlers, 'onRecommendedAction', data);
      return;
    }

    if (event === 'complete') {
      completedResult = data;
      notify(handlers, 'onComplete', data);
      return;
    }

    if (event === 'error') {
      streamError = new Error(data?.message || 'AI analysis could not be completed.');
      notify(handlers, 'onError', data);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    buffer = buffer.replace(/\r\n/g, '\n');

    let separatorIndex = buffer.indexOf('\n\n');
    while (separatorIndex >= 0) {
      const block = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      // Awaiting keeps the UI display queue ordered and deliberately paced.
      await processBlock(block);
      separatorIndex = buffer.indexOf('\n\n');
    }

    if (streamError || done) break;
  }

  const tail = decoder.decode();
  if (tail) buffer += tail;
  if (buffer.trim()) await processBlock(buffer);
  if (streamError) throw streamError;
  if (!completedResult) throw new Error('The AI response stream ended before a validated result was received.');
  return completedResult;
}

/**
 * Swagger-friendly non-streaming mode. Kept for direct API tests and existing
 * integrations that expect a single JSON response.
 */
export function analyseDashboardWidget(section) {
  return postAiAnalysis(`/api/v1/ai/analyse-dashboard?section=${encodeURIComponent(section)}`);
}

/**
 * Runs an individual customer analysis for the selected customer.
 */
export function analyseCustomer(customerId) {
  return postAiAnalysis(`/api/v1/ai/customers/${encodeURIComponent(customerId)}/analyse`);
}
