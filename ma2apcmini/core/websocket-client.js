const W3CWebSocket = require('websocket').w3cwebsocket;
const { log, LOG_LEVELS } = require('../performance/logger');

class WebSocketClient {
  constructor(url, handlers) {
    this.url = url;
    this.handlers = handlers;
    this.client = null;
    this.isConnected = false;
  }

  connect() {
    this.client = new W3CWebSocket(this.url);
    this.setupEventHandlers();
    return this.client;
  }

  setupEventHandlers() {
    if (!this.client) return;

    this.client.onerror = (error) => {
      log(LOG_LEVELS.ERROR, "💥 Connection Error");
      if (this.handlers.onError) {
        this.handlers.onError(error);
      }
    };

    this.client.onopen = () => {
      log(LOG_LEVELS.INFO, "✅ WebSocket Client Connected");
      if (this.handlers.onOpen) {
        this.handlers.onOpen();
      }
    };

    this.client.onclose = (event) => {
      log(LOG_LEVELS.WARN, "🔌 Client Closed");
      if (this.handlers.onClose) {
        this.handlers.onClose(event);
      }
    };

    this.client.onmessage = (event) => {
      if (this.handlers.onMessage) {
        this.handlers.onMessage(event);
      }
    };
  }

  send(message) {
    if (this.client && this.client.readyState === this.client.OPEN) {
      this.client.send(JSON.stringify(message));
    }
  }

  close() {
    if (this.client) {
      this.client.close();
    }
  }

  getClient() {
    return this.client;
  }
}

module.exports = WebSocketClient; 