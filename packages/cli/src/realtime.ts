import EventSource from 'eventsource';
import type { WebhookEvent } from './types.js';

export interface RealtimeClient {
  connect: () => void;
  disconnect: () => void;
  on: (event: 'webhook', handler: (event: WebhookEvent) => void) => void;
}

export function createRealtimeClient(uuid: string): RealtimeClient {
  let eventSource: EventSource | null = null;
  const handlers: Map<string, Function[]> = new Map();

  const emit = (event: string, data?: any) => {
    const eventHandlers = handlers.get(event) || [];
    eventHandlers.forEach(handler => handler(data));
  };

  const connect = () => {
    const url = `https://www.ehook.app/api/realtime?channels=webhook:${uuid}&event=webhook.received`;
    
    eventSource = new EventSource(url);

    eventSource.onopen = () => {
      emit('connected');
    };

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        const webhookEvent = message?.data as WebhookEvent | undefined;

        if (webhookEvent && webhookEvent.id) {
          emit('webhook', webhookEvent);
        }
      } catch (error) {
        console.error('Error parsing webhook event:', error);
      }
    };

    eventSource.onerror = (error) => {
      emit('error');
      emit('disconnected');
      
      // Auto-reconnect after 5 seconds
      setTimeout(() => {
        if (eventSource) {
          eventSource.close();
          connect();
        }
      }, 5000);
    };
  };

  const disconnect = () => {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
      emit('disconnected');
    }
  };

  const on = (event: string, handler: Function) => {
    if (!handlers.has(event)) {
      handlers.set(event, []);
    }
    handlers.get(event)!.push(handler);
  };

  return {
    connect,
    disconnect,
    on: on as any,
  };
}

