// Configuration settings for the APC mini MA2 integration

// WebSocket Configuration
const WS_URL = process.env.WS_URL || "localhost";

// MIDI Device Configuration
const MIDI_IN_DEVICE = process.env.MIDI_IN_DEVICE || "APC mini";
const MIDI_OUT_DEVICE = process.env.MIDI_OUT_DEVICE || "APC mini";

// Wing Configuration (1, 2, or 3)
const WING_CONFIGURATION = parseInt(process.env.WING_CONFIGURATION) || 1;

// Client Configuration
const clientConfig = {
  username: process.env.MA2_USERNAME || "apcmini",
  password: process.env.MA2_PASSWORD || "remote",
  pageSelectMode: parseInt(process.env.PAGE_SELECT_MODE) || 0,
  marquee: {
    enabled: process.env.MARQUEE_ENABLED === 'true' || false,
    speed: parseInt(process.env.MARQUEE_SPEED) || 100,
    pattern: process.env.MARQUEE_PATTERN || "rainbow"
  }
};

// LED Configuration
const TOTAL_LEDS = 128;
const FADER_LED_OFFSET = 48;
const PAGE_SELECT_START = 89;
const PAGE_SELECT_END = 95;

// Button Configuration
const SMALL_BUTTON_START = 16;
const SMALL_BUTTON_END = 47;
const EXECUTOR_BUTTON_START = 56;
const EXECUTOR_BUTTON_END = 87;
const FADER_CONTROLLER_START = 48;
const FADER_CONTROLLER_END = 55;

// Fader Configuration
const SPECIAL_MASTER_MULTIPLIER = 1.0;
const SPECIAL_MASTER_3_MULTIPLIER = 1.0;

// Interval Configuration
const INTERVAL_DELAY = parseInt(process.env.INTERVAL_DELAY) || 100;
const REQUEST_THRESHOLD = parseInt(process.env.REQUEST_THRESHOLD) || 10;
const INITIALIZATION_DELAY = parseInt(process.env.INITIALIZATION_DELAY) || 2000;

// Debug Configuration
const DEBUG_MODE = process.env.DEBUG_MODE === 'true' || false;
const MAX_MIDI_HISTORY = parseInt(process.env.MAX_MIDI_HISTORY) || 50;

// Button mappings for different wing configurations
const buttons = {
  wing1: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
  wing2: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
  wing3: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32]
};

// Fader value mappings
const faderValue = {
  0: 0, 1: 8, 2: 16, 3: 24, 4: 32, 5: 40, 6: 48, 7: 56, 8: 64, 9: 72, 10: 80, 11: 88, 12: 96, 13: 104, 14: 112, 15: 120, 16: 127
};

// LED matrix and status arrays
const ledmatrix = new Array(128).fill(0);
const led_isrun = new Array(128).fill(0);

// Page indices
let pageIndex = 0;
let pageIndex2 = 0;

// Session management
let session = 0;
let request = 0;
let interval_on = false;

// Debug mode state
let debugMode = DEBUG_MODE;

// MIDI history for debugging
const midiHistory = [];

module.exports = {
  WS_URL,
  MIDI_IN_DEVICE,
  MIDI_OUT_DEVICE,
  WING_CONFIGURATION,
  clientConfig,
  TOTAL_LEDS,
  FADER_LED_OFFSET,
  PAGE_SELECT_START,
  PAGE_SELECT_END,
  SMALL_BUTTON_START,
  SMALL_BUTTON_END,
  EXECUTOR_BUTTON_START,
  EXECUTOR_BUTTON_END,
  FADER_CONTROLLER_START,
  FADER_CONTROLLER_END,
  SPECIAL_MASTER_MULTIPLIER,
  SPECIAL_MASTER_3_MULTIPLIER,
  INTERVAL_DELAY,
  REQUEST_THRESHOLD,
  INITIALIZATION_DELAY,
  DEBUG_MODE,
  MAX_MIDI_HISTORY,
  buttons,
  faderValue,
  ledmatrix,
  led_isrun,
  pageIndex,
  pageIndex2,
  session,
  request,
  interval_on,
  debugMode,
  midiHistory
}; 