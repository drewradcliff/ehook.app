import type { ProxyOptions, WebhookEvent, ForwardResult } from './types.js';

let isInitialized = false;

export function displayUI(options: ProxyOptions): void {
  if (isInitialized) return;
  isInitialized = true;

  const { port, path, uuid } = options;
  const webhookUrl = `https://www.ehook.app/api/webhook/${uuid}`;
  const forwardUrl = `http://localhost:${port}${path}`;
  const dashboardUrl = 'https://www.ehook.app';

  console.clear();
  console.log('\n');
  console.log('ehook CLI\n');
  console.log('│  Requests → ' + webhookUrl);
  console.log('└─ Forwarded → ' + forwardUrl);
  console.log('\n');
  console.log('View dashboard: ' + dashboardUrl);
  console.log('\n');
  console.log('Events\n');
}

export function logEvent(
  event: WebhookEvent,
  result: ForwardResult,
  targetUrl: string
): void {
  const timestamp = new Date(event.timestamp).toLocaleTimeString();
  
  if (result.success) {
    const statusCode = result.statusCode || 0;
    const statusColor = getStatusColor(statusCode);
    const retryInfo = result.retries && result.retries > 0 ? ` (${result.retries} retries)` : '';
    
    console.log(
      `${statusColor}[${statusCode}]${resetColor} ${event.method} ${targetUrl} (${result.duration}ms)${retryInfo}`
    );
  } else {
    const retryInfo = result.retries && result.retries > 0 ? ` after ${result.retries} retries` : '';
    console.log(
      `${red}[ERROR]${resetColor} ${event.method} ${targetUrl} - ${result.error}${retryInfo}`
    );
  }
}

function getStatusColor(statusCode: number): string {
  if (statusCode >= 200 && statusCode < 300) {
    return green;
  } else if (statusCode >= 300 && statusCode < 400) {
    return cyan;
  } else if (statusCode >= 400 && statusCode < 500) {
    return yellow;
  } else if (statusCode >= 500) {
    return red;
  }
  return '';
}

// ANSI color codes
const green = '\x1b[32m';
const cyan = '\x1b[36m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const resetColor = '\x1b[0m';

