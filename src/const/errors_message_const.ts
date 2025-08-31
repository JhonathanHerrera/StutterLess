// Speech Recognition Error Messages
export const SPEECH_RECOGNITION_ERRORS = {
  SPEECH_RECOGNITION_NOT_SUPPORTED: "Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari for the best experience.",
  SPEECH_RECOGNITION_INITIALIZATION_FAILED: "Failed to initialize speech recognition. Please refresh the page and try again.",
  SPEECH_RECOGNITION_START_FAILED: "Failed to start speech recognition:",
  SPEECH_RECOGNITION_STOP_FAILED: "Failed to stop speech recognition:",
  SPEECH_RECOGNITION_ERROR: "Speech recognition error:"
} as const;

// Browser Compatibility Messages
export const BROWSER_MESSAGES = {
  CHROME_RECOMMENDED: "Chrome is recommended for the best speech recognition experience."
} as const;

// UI Error Messages
export const UI_ERRORS = {
  TRANSCRIPT_EMPTY: "Your speech will appear here..."
} as const;


