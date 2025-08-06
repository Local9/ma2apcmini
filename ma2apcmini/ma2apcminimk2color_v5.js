// APC mini MA2 Integration - Modular Version
// This version uses separated modules for better maintainability

// Import modules
const WebSocketClient = require('./core/websocket-client');
const MidiClient = require('./core/midi-client');
const WebSocketHandlers = require('./handlers/websocket-handlers');
const settings = require('./config/settings');
const performance = require('./performance');

// Import existing performance modules
const { log, LOG_LEVELS } = require('./performance/logger');

// Connection state management
const connectionState = {
  isConnected: false,
  isReconnecting: false,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectDelay: 1000,
  maxReconnectDelay: 30000,
};

// Initialize clients
const midiClient = new MidiClient(settings.MIDI_IN_DEVICE, settings.MIDI_OUT_DEVICE);

// Initialize WebSocket handlers first (without client)
const websocketHandlers = new WebSocketHandlers(
  null, // Will be set after WebSocket client is created
  { ...settings, connectionState },
  {
    startInterval: () => {
      if (!settings.interval_on) {
        settings.interval_on = true;
        setInterval(interval, settings.INTERVAL_DELAY);
      }
    },
    refreshLedStates: () => {
      // Refresh LED states after reconnection
      log(LOG_LEVELS.INFO, "🔄 Refreshing LED states...");
    },
    scheduleReconnection: () => {
      scheduleReconnection();
    },
    processButtonLEDs: (obj) => {
      // Process button LED data
      log(LOG_LEVELS.DEBUG, "Processing button LEDs");
    },
    processFaderLEDs: (obj) => {
      // Process fader LED data
      log(LOG_LEVELS.DEBUG, "Processing fader LEDs");
    },
    midiclear: () => {
      if (midiClient) {
        midiClient.clearAllLeds();
      }
    },
    closeMidiDevices: () => {
      if (midiClient) {
        midiClient.close();
      }
    }
  }
);

// Reconnection function
function scheduleReconnection() {
  if (connectionState.isReconnecting) return;

  connectionState.isReconnecting = true;
  connectionState.reconnectAttempts++;
  const delay = Math.min(
    connectionState.reconnectDelay * Math.pow(2, connectionState.reconnectAttempts - 1),
    connectionState.maxReconnectDelay
  );

  log(LOG_LEVELS.WARN, `🔄 Scheduling reconnection attempt ${connectionState.reconnectAttempts}/${connectionState.maxReconnectAttempts} in ${delay}ms`);

  setTimeout(async () => {
    if (!connectionState.isConnected) {
      log(LOG_LEVELS.INFO, "🔄 Attempting to reconnect...");
      
      // Step 1: Reconnect MIDI devices first
      log(LOG_LEVELS.INFO, "🎹 Reconnecting MIDI devices...");
      await midiClient.connect();
      midiClient.setupEventHandlers({
        onNoteOn: handleMidiNoteOn,
        onNoteOff: handleMidiNoteOff,
        onCC: handleMidiCC,
        onError: (error) => {
          log(LOG_LEVELS.ERROR, "🎹 MIDI error:", error);
        }
      });
      
      // Step 2: Then reconnect WebSocket
      log(LOG_LEVELS.INFO, "🌐 Reconnecting WebSocket...");
      websocketClient.connect();
      
      // Reset connection state for new connection
      connectionState.isConnected = false;
    }
  }, delay);
}

// MIDI event handlers
function handleMidiNoteOn(msg) {
  const { note } = msg;
  log(LOG_LEVELS.DEBUG, `🎹 MIDI noteon: ${note}`);
  
  // Handle different button types
  if (note >= settings.SMALL_BUTTON_START && note <= settings.SMALL_BUTTON_END) {
    handleButtonPress(note);
  } else if (note >= settings.EXECUTOR_BUTTON_START && note <= settings.EXECUTOR_BUTTON_END) {
    handleExecutorButtonPress(note);
  }
}

function handleMidiNoteOff(msg) {
  const { note } = msg;
  log(LOG_LEVELS.DEBUG, `🎹 MIDI noteoff: ${note}`);
}

function handleMidiCC(msg) {
  const { controller, value } = msg;
  log(LOG_LEVELS.DEBUG, `🎹 MIDI CC: controller=${controller}, value=${value}`);
  
  if (controller >= settings.FADER_CONTROLLER_START && controller <= settings.FADER_CONTROLLER_END) {
    handleFaderMove(controller, value);
  }
}

function handleButtonPress(note) {
  // Send button press to GrandMA2
  const message = {
    requestType: "playbacks_userInput",
    cmdline: "",
    execIndex: settings.buttons[`wing${settings.WING_CONFIGURATION}`][note - settings.SMALL_BUTTON_START],
    pageIndex: settings.pageIndex,
    buttonId: 0,
    pressed: true,
    released: false,
    type: 0,
    session: settings.session,
    maxRequests: 0,
  };
  
  websocketClient.send(message);
}

function handleExecutorButtonPress(note) {
  // Handle executor button press
  log(LOG_LEVELS.INFO, `Executor button pressed: ${note}`);
}

function handleFaderMove(controller, value) {
  // Handle fader movement
  const faderValue = settings.faderValue[value] || 0;
  log(LOG_LEVELS.DEBUG, `Fader ${controller} moved to ${faderValue}`);
}

// Interval function for data requests
function interval() {
  // Send periodic data requests to GrandMA2
  if (websocketClient.getClient() && websocketClient.getClient().readyState === 1) {
    websocketClient.send({ session: settings.session });
  }
}

// Initialize system
async function initializeSystem() {
  try {
    log(LOG_LEVELS.INFO, "🚀 Starting APC mini MA2 integration...");
    
    // Step 1: Connect to MIDI devices
    log(LOG_LEVELS.INFO, `🎹 Connecting to MIDI device ${settings.MIDI_IN_DEVICE}`);
    await midiClient.connect();
    
    // Step 2: Set up MIDI event handlers
    midiClient.setupEventHandlers({
      onNoteOn: handleMidiNoteOn,
      onNoteOff: handleMidiNoteOff,
      onCC: handleMidiCC,
      onError: (error) => {
        log(LOG_LEVELS.ERROR, "🎹 MIDI error:", error);
      }
    });
    
    // Step 3: Connect to WebSocket
    log(LOG_LEVELS.INFO, `🔌 Connecting to GrandMA2 at ${settings.WS_URL}...`);
    websocketClient.connect();
    
    log(LOG_LEVELS.INFO, "✅ System initialization complete");
    
  } catch (error) {
    log(LOG_LEVELS.ERROR, "💥 Failed to initialize system:", error);
    process.exit(1);
  }
}

// Start the application
initializeSystem();

// Handle process termination
process.on('SIGINT', () => {
  log(LOG_LEVELS.INFO, "🛑 Shutting down...");
  if (midiClient) {
    midiClient.close();
  }
  if (websocketClient) {
    websocketClient.close();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log(LOG_LEVELS.INFO, "🛑 Shutting down...");
  if (midiClient) {
    midiClient.close();
  }
  if (websocketClient) {
    websocketClient.close();
  }
  process.exit(0);
}); 