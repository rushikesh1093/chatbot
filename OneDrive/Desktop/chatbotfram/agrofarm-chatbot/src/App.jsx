import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [controller, setController] = useState(null);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:9000';

  const languages = [
    { code: 'en', name: 'English', voiceLang: 'en-US' },
    { code: 'hi', name: 'Hindi', voiceLang: 'hi-IN' },
    { code: 'ta', name: 'Tamil', voiceLang: 'ta-IN' },
    { code: 'te', name: 'Telugu', voiceLang: 'te-IN' },
    { code: 'mr', name: 'Marathi', voiceLang: 'mr-IN' },
    { code: 'bh', name: 'Bhojpuri', voiceLang: 'hi-IN' },
    { code: 'ha', name: 'Haryanvi', voiceLang: 'hi-IN' },
    { code: 'bn', name: 'Bengali', voiceLang: 'bn-IN' },
  ];

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content:
          '👋 Hello farmer! Ask me about crops, fertilizers, pests, diseases, or farming tips.',
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: 'smooth',
    });
  }, [messages]);

  const speak = (text, langCode) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.lang =
      languages.find((l) => l.code === langCode)?.voiceLang ||
      'en-US';

    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const stopResponse = () => {
    if (controller) {
      controller.abort();
    }

    window.speechSynthesis.cancel();

    setIsSpeaking(false);
    setLoading(false);

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: '⛔ Response stopped',
      },
    ]);
  };

  const clearChat = () => {
    window.speechSynthesis.cancel();

    setMessages([
      {
        role: 'assistant',
        content:
          '🌱 Chat cleared. Ask me anything about farming.',
      },
    ]);
  };

  const startSpeechRecognition = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition || null;

    if (!SpeechRecognition) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ Speech recognition is not supported in this browser. Use Chrome or Edge and allow microphone access.',
        },
      ]);

      return;
    }

    // Avoid creating multiple instances
    if (recognitionRef.current) return;

    try {
      const recognition = new SpeechRecognition();

      recognitionRef.current = recognition;

      recognition.lang =
        languages.find((l) => l.code === selectedLanguage)?.voiceLang ||
        'en-US';

      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;

        setInput(transcript);

        setIsListening(false);

        sendMessage(transcript);
      };

      recognition.onerror = (event) => {
        setIsListening(false);

        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: `⚠️ Speech recognition error: ${event.error || 'unknown'}`,
          },
        ]);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '⚠️ Could not start speech recognition. Check microphone permissions.',
        },
      ]);
    }
  };

  const stopSpeechRecognition = () => {
    const r = recognitionRef.current;
    if (r) {
      try {
        r.stop();
      } catch (e) {
        // ignore
      }
      recognitionRef.current = null;
    }

    setIsListening(false);
  };

  const sendMessage = async (rawInput) => {
    const textToSend = (rawInput ?? input).trim();

    if (!textToSend) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMessage]);

    setInput('');

    setLoading(true);

    const abortController = new AbortController();

    setController(abortController);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/chat`,
        {
          question: textToSend,
          language: selectedLanguage,
          history: messages.slice(-8),
        },
        {
          signal: abortController.signal,
        }
      );

      const answer =
        response.data?.answer ||
        'No response from backend';

      const assistantMessage = {
        role: 'assistant',
        content: answer,
        sources: response.data?.sources || [],
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      speak(answer, selectedLanguage);
    } catch (error) {
      if (
        error.name === 'CanceledError' ||
        axios.isCancel(error)
      ) {
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            '⚠️ Backend connection error. Please check server.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div>
          <div className="logo">
            🌱 Agrofarm AI
          </div>

          <button
            className="clear-btn"
            onClick={clearChat}
          >
            🗑️ Clear Chat
          </button>

          <div className="language-box">
            <label>Language</label>

            <select
              value={selectedLanguage}
              onChange={(e) =>
                setSelectedLanguage(e.target.value)
              }
              className="language-dropdown"
            >
              {languages.map((lang) => (
                <option
                  key={lang.code}
                  value={lang.code}
                >
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sidebar-footer">
          🚜 Smart Farming Assistant
        </div>
      </aside>

      <main className="main-chat">
        <header className="chat-header">
          <div>
            <h1>Agrofarm Assistant</h1>

            <p>
              AI support for farmers and crops
            </p>
          </div>

          <div className="header-right">
            <div className="online-status">
              {loading
                ? '🟢 Thinking...'
                : '🟢 Online'}
            </div>

            {isSpeaking && (
              <button
                className="stop-speech-btn"
                onClick={stopSpeech}
              >
                ⏹️ Stop Speech
              </button>
            )}
          </div>
        </header>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`message ${
                msg.role === 'user'
                  ? 'user-message'
                  : 'bot-message'
              }`}
            >
              <div className="message-content">
                <div className="message-text">
                  {msg.content}
                </div>

                {msg.sources &&
                  msg.sources.length > 0 && (
                    <div className="message-meta">
                      {msg.sources.map((s, i) => (
                        <span
                          key={i}
                          className="source-chip"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message bot-message">
              <div className="typing-box">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          <div ref={bottomRef}></div>
        </div>

        <div className="input-section">
          <div className="input-wrapper">
            <input
              type="text"
              value={input}
              placeholder="Ask about crops, fertilizers, diseases..."
              className="chat-input"
              disabled={loading}
              onChange={(e) =>
                setInput(e.target.value)
              }
              onKeyDown={handleKeyPress}
            />

            {loading ? (
              <button
                className="stop-btn"
                onClick={stopResponse}
              >
                Stop
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim()}
              >
                Send
              </button>
            )}

            <button
              className={`mic-btn ${
                isListening ? 'listening' : ''
              }`}
              onClick={() =>
                isListening
                  ? stopSpeechRecognition()
                  : startSpeechRecognition()
              }
            >
              {isListening ? '🎙️' : '🎤'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;