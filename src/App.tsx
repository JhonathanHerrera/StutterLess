import React, { useState, useRef, useEffect } from "react";
import "./App.css";
import { SpeechData } from "./types";

const App: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const [speechHistory, setSpeechHistory] = useState<SpeechData[]>([]);
  const [speechSupported, setSpeechSupported] = useState(false);

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
          console.error("Speech recognition error:", event.error);
          setIsRecording(false);
        };

        recognitionRef.current.onend = () => {
          // Speech recognition ended
        };

        setSpeechSupported(true);
      } catch (error) {
        console.error("Failed to initialize speech recognition:", error);
        setSpeechSupported(false);
      }
    } else {
      setSpeechSupported(false);
    }
  }, []);

  const handleMouseDown = () => {
    setIsRecording(true);
    if (recognitionRef.current && speechSupported) {
      recognitionRef.current.start();
    }
  };

  const handleMouseUp = () => {
    setIsRecording(false);
    if (recognitionRef.current && speechSupported) {
      recognitionRef.current.stop();
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
              {transcript || "Your speech will appear here..."}
            </div>
          </div>

          <div className="history-section">
            <h3>Speech History</h3>
            <div className="history-list">
              {speechHistory
                .slice(-3)
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
                ))}
            </div>
          </div>
        </div>

        {!speechSupported && (
          <div className="browser-warning">
            <p>⚠️ Speech recognition is not supported in this browser.</p>
            <p>Please use Chrome, Edge, or Safari for the best experience.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
