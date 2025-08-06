const crypto = require('crypto');
const { log, LOG_LEVELS } = require('../performance/logger');

class WebSocketHandlers {
  constructor(client, settings, callbacks) {
    this.client = client;
    this.settings = settings;
    this.callbacks = callbacks;
  }

  // Password hashing function for GrandMA2 Web Remote authentication
  hashPassword(password) {
    return crypto.createHash("md5").update(password).digest("hex");
  }

  // Validate response format
  validateResponse(response) {
    try {
      const data = JSON.parse(response);
      if (!data || typeof data !== "object") {
        log(LOG_LEVELS.WARN, "⚠️ Invalid response format", response);
        return false;
      }
      return true;
    } catch (error) {
      log(LOG_LEVELS.ERROR, "💥 Failed to parse response", error);
      return false;
    }
  }

  // Handle WebSocket messages
  handleMessage(event) {
    if (typeof event.data !== "string") return;

    try {
      if (!this.validateResponse(event.data)) {
        log(LOG_LEVELS.WARN, "⚠️ Invalid response received, skipping processing");
        return;
      }

      const obj = JSON.parse(event.data);
      this.processMessage(obj);
    } catch (error) {
      log(LOG_LEVELS.ERROR, "💥 Error processing message", error);
    }
  }

  // Process different message types
  processMessage(obj) {
    // Handle login and connection establishment first
    if (obj.status === "server ready") {
      this.handleServerReady();
      return;
    }

    if (obj.forceLogin === true && !this.settings.connectionState.isConnected) {
      this.handleForceLogin(obj);
      return;
    }

    if (obj.responseType === "login" && obj.result === true) {
      this.handleLoginSuccess();
      return;
    }

    if (obj.connections_limit_reached !== undefined) {
      this.handleConnectionLimit();
      return;
    }

    // Only check connection state for non-login messages
    if (!this.settings.connectionState.isConnected) {
      log(LOG_LEVELS.WARN, `⚠️ Received message but not connected (${obj.responseType || "unknown"}), ignoring`);
      if (!obj.responseType) {
        log(LOG_LEVELS.WARN, `🔍 Object: ${JSON.stringify(obj)}`);
      }
      return;
    }

    // Handle data requests
    if (this.settings.request >= this.settings.REQUEST_THRESHOLD) {
      this.handleDataRequest();
    }

    // Handle session management
    if (obj.session === 0) {
      this.handleSessionError();
    }

    if (obj.session) {
      this.handleSessionUpdate(obj);
    }

    // Handle text messages
    if (obj.text) {
      log(LOG_LEVELS.INFO, obj.text);
    }

    // Handle login errors
    if (obj.responseType === "login" && obj.result === false) {
      this.handleLoginError();
    }

    // Handle playback data
    if (obj.responseType === "playbacks") {
      this.handlePlaybackData(obj);
    }
  }

  handleServerReady() {
    log(LOG_LEVELS.INFO, "🟢 SERVER READY");
    this.client.send(JSON.stringify({ session: 0 }));
  }

  handleForceLogin(obj) {
    log(LOG_LEVELS.INFO, "🔐 LOGIN ...");
    this.settings.session = obj.session;
    this.client.send(
      JSON.stringify({
        requestType: "login",
        username: this.settings.clientConfig.username,
        password: this.hashPassword(this.settings.clientConfig.password),
        session: this.settings.session,
        maxRequests: 10,
      })
    );
  }

  handleLoginSuccess() {
    if (!this.settings.interval_on) {
      this.settings.interval_on = true;
      if (this.callbacks.startInterval) {
        this.callbacks.startInterval();
      }
      log(LOG_LEVELS.INFO, `🌍 Started fixed WebSocket frequency (${this.settings.INTERVAL_DELAY}ms)`);
    }
    log(LOG_LEVELS.INFO, "✅ ...LOGGED");
    log(LOG_LEVELS.INFO, `🔑 SESSION ${this.settings.session}`);
    this.settings.connectionState.isConnected = true;

    // Refresh LED states after successful reconnection
    if (this.settings.connectionState.reconnectAttempts > 0) {
      log(LOG_LEVELS.INFO, "🔄 WebSocket reconnection successful, refreshing LED states...");
      setTimeout(() => {
        if (this.callbacks.refreshLedStates) {
          this.callbacks.refreshLedStates();
        }
      }, 1000);
    }
  }

  handleConnectionLimit() {
    log(LOG_LEVELS.ERROR, "Connection limit reached - too many simultaneous connections");
    log(LOG_LEVELS.ERROR, "Please close other MA2 Web Remote connections and try again");
    this.settings.connectionState.isConnected = false;
    if (this.callbacks.scheduleReconnection) {
      this.callbacks.scheduleReconnection();
    }
  }

  handleDataRequest() {
    try {
      this.client.send(JSON.stringify({ session: this.settings.session }));
      this.client.send(
        JSON.stringify({
          requestType: "getdata",
          data: "set,clear,solo,high",
          session: this.settings.session,
          maxRequests: 1,
        })
      );
      this.settings.request = 0;
    } catch (error) {
      log(LOG_LEVELS.ERROR, "💥 Failed to send request", error);
    }
  }

  handleSessionError() {
    log(LOG_LEVELS.ERROR, "🔌 CONNECTION ERROR - attempting to reconnect");
    this.settings.connectionState.isConnected = false;
    if (this.callbacks.scheduleReconnection) {
      this.callbacks.scheduleReconnection();
    }
    this.client.send(JSON.stringify({ session: this.settings.session }));
  }

  handleSessionUpdate(obj) {
    if (obj.session === -1) {
      log(LOG_LEVELS.ERROR, `🔐 Please turn on Web Remote, and set Web Remote password to "${this.settings.clientConfig.password}"`);
      if (this.callbacks.midiclear) {
        this.callbacks.midiclear();
      }
      if (this.callbacks.closeMidiDevices) {
        this.callbacks.closeMidiDevices();
      }
      process.exit(1);
    } else {
      this.settings.session = obj.session;
    }
  }

  handleLoginError() {
    log(LOG_LEVELS.ERROR, "❌ ...LOGIN ERROR");
    log(LOG_LEVELS.ERROR, `🔑 SESSION ${this.settings.session}`);
  }

  handlePlaybackData(obj) {
    this.settings.request++;

    if (obj.responseSubType === 3) {
      // Button LED processing
      if (this.callbacks.processButtonLEDs) {
        this.callbacks.processButtonLEDs(obj);
      }
    }

    if (obj.responseSubType === 2) {
      // Fader LED processing
      if (this.callbacks.processFaderLEDs) {
        this.callbacks.processFaderLEDs(obj);
      }
    }
  }
}

module.exports = WebSocketHandlers; 