export interface WebhookEvent {
  id: string;
  uuid: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  query: Record<string, string>;
  timestamp: number;
}

export interface ProxyOptions {
  port: number;
  path?: string;
  uuid: string;
}

export interface ForwardResult {
  success: boolean;
  statusCode?: number;
  duration: number;
  error?: string;
  retries?: number;
}

