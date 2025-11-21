import { createRealtimeClient } from './realtime.js';
import type { ForwardResult, ProxyOptions, WebhookEvent } from './types.js';
import { logEvent } from './ui.js';

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function forwardRequest(
  event: WebhookEvent,
  targetUrl: string,
  attempt: number = 0
): Promise<ForwardResult> {
  const startTime = Date.now();
  const maxRetries = 3;
  const baseDelay = 100; // ms

  try {
    // Reconstruct the request
    const url = new URL(targetUrl);
    
    // Add query parameters from the original request
    Object.entries(event.query).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });

    // Filter out platform-specific headers
    const headers: Record<string, string | string[]> = {};
    Object.entries(event.headers).forEach(([key, value]) => {
      if (!key.toLowerCase().startsWith('x-vercel-')) {
        headers[key] = value;
      }
    });

    // Prepare request options
    const options: RequestInit = {
      method: event.method,
      headers,
    };

    // Add body for non-GET requests
    if (event.body !== null && event.body !== undefined) {
      if (typeof event.body === 'string') {
        options.body = event.body;
      } else {
        options.body = JSON.stringify(event.body);
      }
    }

    const response = await fetch(url.toString(), options);
    const duration = Date.now() - startTime;

    return {
      success: true,
      statusCode: response.status,
      duration,
      retries: attempt,
    };
  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Retry with exponential backoff if we haven't exceeded max retries
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await sleep(delay);
      return forwardRequest(event, targetUrl, attempt + 1);
    }

    return {
      success: false,
      duration,
      error: error.message || 'Unknown error',
      retries: attempt,
    };
  }
}

export async function startProxy(options: ProxyOptions): Promise<void> {
  const { port, path, uuid } = options;
  const targetUrl = `http://localhost:${port}${path}`;

  const client = createRealtimeClient(uuid);

  client.on('webhook', async (event: WebhookEvent) => {
    const result = await forwardRequest(event, targetUrl);
    logEvent(event, result, targetUrl);
  });

  client.connect();

  let isShuttingDown = false;
  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n\nShutting down...');
    client.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

