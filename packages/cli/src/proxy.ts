import { createRealtimeClient } from './realtime.js';
import { logEvent } from './ui.js';
import type { ProxyOptions, WebhookEvent, ForwardResult } from './types.js';

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
      url.searchParams.append(key, value);
    });

    // Filter out platform-specific headers
    const headers: Record<string, string> = {};
    Object.entries(event.headers).forEach(([key, value]) => {
      if (!key.toLowerCase().startsWith('x-vercel-') && 
          !key.toLowerCase().startsWith('x-forwarded-') &&
          key.toLowerCase() !== 'host') {
        headers[key] = value;
      }
    });

    // Prepare request options
    const options: RequestInit = {
      method: event.method,
      headers,
    };

    // Add body for non-GET requests
    if (event.method !== 'GET' && event.method !== 'HEAD' && event.body !== null) {
      if (typeof event.body === 'string') {
        options.body = event.body;
      } else if (typeof event.body === 'object') {
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

  client.on('connected', () => {
    // UI will handle this
  });

  client.on('disconnected', () => {
    // UI will handle this
  });

  client.on('error', () => {
    // UI will handle this
  });

  client.on('webhook', async (event: WebhookEvent) => {
    const result = await forwardRequest(event, targetUrl);
    logEvent(event, result, targetUrl);
  });

  client.connect();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\nShutting down...');
    client.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    client.disconnect();
    process.exit(0);
  });
}

