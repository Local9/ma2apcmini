const easymidi = require('easymidi');
const { log, LOG_LEVELS } = require('../performance/logger');

class MidiClient {
  constructor(inputDevice, outputDevice) {
    this.inputDevice = inputDevice;
    this.outputDevice = outputDevice;
    this.input = null;
    this.output = null;
    this.isConnected = false;
    this.eventHandlers = {};
  }

  async connect() {
    try {
      // Close any existing connections first
      this.close();

      // Create new connections
      this.input = new easymidi.Input(this.inputDevice);
      this.output = new easymidi.Output(this.outputDevice);
      this.isConnected = true;

      log(LOG_LEVELS.INFO, "🎹 MIDI devices connected successfully");
      return true;
    } catch (error) {
      this.isConnected = false;
      log(LOG_LEVELS.ERROR, "🎹 Failed to connect to MIDI devices", error);
      return false;
    }
  }

  close() {
    if (this.input && typeof this.input.close === "function") {
      try {
        this.input.close();
      } catch (error) {
        log(LOG_LEVELS.WARN, "⚠️ Error closing existing MIDI input:", error.message);
      }
    }
    if (this.output && typeof this.output.close === "function") {
      try {
        this.output.close();
      } catch (error) {
        log(LOG_LEVELS.WARN, "⚠️ Error closing existing MIDI output:", error.message);
      }
    }
    this.input = null;
    this.output = null;
    this.isConnected = false;
  }

  setupEventHandlers(handlers) {
    if (!this.input) return;

    this.eventHandlers = handlers;

    this.input.on("error", (error) => {
      log(LOG_LEVELS.ERROR, "🎹 MIDI input error:", error);
      if (this.eventHandlers.onError) {
        this.eventHandlers.onError(error);
      }
    });

    this.input.on("noteon", (msg) => {
      if (this.eventHandlers.onNoteOn) {
        this.eventHandlers.onNoteOn(msg);
      }
    });

    this.input.on("noteoff", (msg) => {
      if (this.eventHandlers.onNoteOff) {
        this.eventHandlers.onNoteOff(msg);
      }
    });

    this.input.on("cc", (msg) => {
      if (this.eventHandlers.onCC) {
        this.eventHandlers.onCC(msg);
      }
    });

    log(LOG_LEVELS.INFO, "🎹 MIDI event listeners configured");
  }

  sendNoteOn(note, velocity, channel) {
    if (this.output) {
      this.output.send("noteon", { note, velocity, channel });
    }
  }

  sendNoteOff(note, velocity, channel) {
    if (this.output) {
      this.output.send("noteoff", { note, velocity, channel });
    }
  }

  clearAllLeds() {
    if (this.output) {
      for (let i = 0; i < 128; i++) {
        this.output.send("noteon", { note: i, velocity: 0, channel: 0 });
      }
    }
  }

  getInput() {
    return this.input;
  }

  getOutput() {
    return this.output;
  }

  isDeviceConnected() {
    return this.isConnected;
  }
}

module.exports = MidiClient; 