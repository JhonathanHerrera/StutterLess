import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { SpeechData } from "./types/types";
import {
  SPEECH_RECOGNITION_ERRORS,
  BROWSER_MESSAGES,
  UI_DEFAULT_MESSAGES,
} from "./const/errors_message_const";
import {
  DEFAULT_HISTORY_ITEMS_TO_SHOW,
  HISTORY_ITEMS_AMOUNT,
} from "./const/front_page_const";

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [speechHistory, setSpeechHistory] = useState<SpeechData[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [historyItemsToShow, setHistoryItemsToShow] = useState<number>(
    DEFAULT_HISTORY_ITEMS_TO_SHOW
  );

  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Initialize speech recognition
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      try {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();

        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event) => {
          let finalTranscript = "";

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript;
            }
          }

          if (finalTranscript) {
            setTranscript(finalTranscript);
            setSpeechHistory((prev) => [
              ...prev,
              {
                text: finalTranscript,
                confidence:
                  event.results[event.results.length - 1][0].confidence,
                timestamp: new Date(),
              },
            ]);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error(
            SPEECH_RECOGNITION_ERRORS.SPEECH_RECOGNITION_ERROR,
            event.error
          );
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          setIsRecording(false);
        };

        setSpeechSupported(true);
      } catch (error) {
        console.error(
          SPEECH_RECOGNITION_ERRORS.SPEECH_RECOGNITION_INITIALIZATION_FAILED,
          error
        );
        setSpeechSupported(false);
      }
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const handleMouseDown = () => {
    if (isRecording) return; // Prevent multiple starts

    setIsRecording(true);
    if (recognitionRef.current && speechSupported) {
      try {
        recognitionRef.current.start();
      } catch (error) {
        console.error(
          SPEECH_RECOGNITION_ERRORS.SPEECH_RECOGNITION_START_FAILED,
          error
        );
        setIsRecording(false);
      }
    }
  };

  const handleMouseUp = () => {
    if (!isRecording) return; // Prevent stopping if not recording

    setIsRecording(false);
    if (recognitionRef.current && speechSupported) {
      try {
        recognitionRef.current.stop();
      } catch (error) {
        console.error(
          SPEECH_RECOGNITION_ERRORS.SPEECH_RECOGNITION_STOP_FAILED,
          error
        );
      }
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseDown();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  };

  const clearHistory = () => {
    setSpeechHistory([]);
    setTranscript("");
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>StutterLess</h1>
          <p>Hold to talk and practice your speech</p>
        </header>

        <div className="main-content">
          <div className="hold-button-container">
            <button
              className={`hold-button ${isRecording ? "recording" : ""}`}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <div className="button-content">
                <div className="mic-icon">🎤</div>
                <span className="button-text">
                  {isRecording ? "Recording..." : "Hold to Talk"}
                </span>
              </div>
              {isRecording && <div className="pulse-ring"></div>}
            </button>
          </div>

          <div className="transcript-section">
            <h3>Your Speech</h3>
            <div className="transcript-box">
              {transcript || UI_DEFAULT_MESSAGES.TRANSCRIPT_EMPTY}
            </div>
          </div>

          <div className="history-section">
            <div className="history-header">
              <h3>Speech History</h3>
              <div className="history-controls">
                <select
                  value={historyItemsToShow}
                  onChange={(e) =>
                    setHistoryItemsToShow(Number(e.target.value))
                  }
                  className="history-select"
                >
                  {HISTORY_ITEMS_AMOUNT.map((number) => (
                    <option value={number}>Show {number}</option>
                  ))}
                  <option value={speechHistory.length}>
                    Show All: {speechHistory.length}
                  </option>
                </select>
                <button
                  onClick={clearHistory}
                  className="clear-history-btn"
                  disabled={speechHistory.length === 0}
                >
                  🗑️ Clear History
                </button>
              </div>
            </div>
            <div className="history-list">
              {speechHistory.length === 0 ? (
                <div className="history-empty">
                  <p>
                    No speech history yet. Start talking to see your recordings!
                  </p>
                </div>
              ) : (
                speechHistory
                  .slice(-historyItemsToShow)
                  .reverse()
                  .map((item, index) => (
                    <div key={index} className="history-item">
                      <div className="history-text">{item.text}</div>
                      <div className="history-meta">
                        <span className="confidence">
                          Confidence: {(item.confidence * 100).toFixed(1)}%
                        </span>
                        <span className="timestamp">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {!speechSupported && (
          <div className="browser-warning">
            <p>{SPEECH_RECOGNITION_ERRORS.SPEECH_RECOGNITION_NOT_SUPPORTED}</p>
            <p>{BROWSER_MESSAGES.CHROME_RECOMMENDED}</p>
          </div>
        )}

        <div className="secondary-container">
          <h2>Dysfluency Detection Coming Soon</h2>
          <p>
            For Preview: Read this https://arxiv.org/html/2409.13582v1#bib.bib4
          </p>
        </div>
      </div>
    </div>
  );
};

export default App;
