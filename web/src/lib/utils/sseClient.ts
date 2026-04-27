type Listener = (data: any) => void;

class SseClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<Listener> = new Set();
  private reconnectTimer: NodeJS.Timeout | null = null;

  public connect() {
    if (this.eventSource) return;

    this.eventSource = new EventSource('/api/sse');

    this.eventSource.onopen = () => {
      console.log('[Global SSE] Connected');
      if (this.reconnectTimer) {
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
    };

    this.eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.listeners.forEach((listener) => listener(data));
      } catch (e) {
        console.error('[Global SSE] Parse error', e);
      }
    };

    this.eventSource.onerror = (e) => {
      console.log('[Global SSE] Connection error, reconnecting...');
      this.eventSource?.close();
      this.eventSource = null;
      // Auto reconnect with backoff could be added here
      if (!this.reconnectTimer) {
        this.reconnectTimer = setTimeout(() => {
          this.connect();
        }, 3000);
      }
    };
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public addListener(listener: Listener) {
    this.listeners.add(listener);
    if (this.listeners.size === 1) {
      this.connect();
    }
  }

  public removeListener(listener: Listener) {
    this.listeners.delete(listener);
    if (this.listeners.size === 0) {
      this.disconnect();
    }
  }
}

export const globalSseClient = new SseClient();
