import { useEffect, useRef, useState } from 'react';
import './App.css';

// Defined outside component so it's stable across renders
const languages = [
  { code: 'en', name: 'English', voiceLang: 'en-US', welcome: '👋 Hello farmer! Ask me about crops, fertilizers, pests, diseases, or farming tips.' },
  { code: 'hi', name: 'Hindi', voiceLang: 'hi-IN', welcome: '👋 नमस्ते किसान! फसलों, खाद, कीटों, बीमारियों या खेती के बारे में पूछें।' },
  { code: 'ta', name: 'Tamil', voiceLang: 'ta-IN', welcome: '👋 வணக்கம் விவசாயி! பயிர்கள், உரங்கள், பூச்சிகள் அல்லது விவசாய குறிப்புகள் பற்றி கேளுங்கள்।' },
  { code: 'te', name: 'Telugu', voiceLang: 'te-IN', welcome: '👋 నమస్కారం రైతు! పంటలు, ఎరువులు, తెగుళ్లు లేదా వ్యవసాయ చిట్కాల గురించి అడగండి।' },
  { code: 'mr', name: 'Marathi', voiceLang: 'mr-IN', welcome: '👋 नमस्कार शेतकरी! पिके, खते, कीड, रोग किंवा शेतीच्या टिप्सबद्दल विचारा.' },
  { code: 'bh', name: 'Bhojpuri', voiceLang: 'hi-IN', welcome: '👋 प्रणाम किसान भाई! फसल, खाद, कीड़ा-मकोड़ा या खेती के बारे में पूछीं।' },
  { code: 'ha', name: 'Haryanvi', voiceLang: 'hi-IN', welcome: '👋 नमस्ते किसान! फसल, खाद, कीड़े-मकोड़े या खेती के बारे में पूछो।' },
  { code: 'bn', name: 'Bengali', voiceLang: 'bn-IN', welcome: '👋 নমস্কার কৃষক! ফসল, সার, কীটপতঙ্গ বা চাষের টিপস সম্পর্কে জিজ্ঞেস করুন।' },
];

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [controller, setController] = useState(null);
  const speechRetriesRef = useRef(0);

  // Always holds the latest selectedLanguage — safe to read inside callbacks
  const selectedLanguageRef = useRef(selectedLanguage);
  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const API_URL =
    'https://chatbot-backend-production-b64c.up.railway.app';

  useEffect(() => {
    setMessages([
      {
        role: 'assistant',
        content: languages.find((l) => l.code === 'en')?.welcome,
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

    // Use the passed langCode, falling back to the ref for the current language
    const code = langCode ?? selectedLanguageRef.current;
    utterance.lang =
      languages.find((l) => l.code === code)?.voiceLang || 'en-US';

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

  const handleLanguageChange = (newLang) => {
    // Stop any ongoing speech or recognition first
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
      recognitionRef.current = null;
    }
    setIsListening(false);

    // Abort any in-flight request
    if (controller) {
      controller.abort();
      setController(null);
    }
    setLoading(false);
    setInput('');

    setSelectedLanguage(newLang);

    // Start fresh with a welcome message in the new language
    const welcome = languages.find((l) => l.code === newLang)?.welcome || languages[0].welcome;
    setMessages([{ role: 'assistant', content: welcome }]);
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

  const startSpeechRecognition = async () => {
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

    speechRetriesRef.current = 0;

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;

      recognition.lang =
        languages.find((l) => l.code === selectedLanguageRef.current)?.voiceLang || 'en-US';
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(transcript);

        if (event.results[event.results.length - 1].isFinal) {
          setIsListening(false);
          try { recognition.stop(); } catch (e) {}
        }
      };

      recognition.onerror = (event) => {
        // 'no-speech' just means silence timeout — not an error worth showing
        // while the user may still be about to speak; let onend handle cleanup
        if (event.error === 'no-speech') return;

        setIsListening(false);
        recognitionRef.current = null;

        const errorMessages = {
          'not-allowed': '⚠️ Microphone permission denied. Please allow access in your browser settings.',
          'network': '⚠️ Network error during speech recognition. Check your connection.',
          'aborted': null, // user stopped — no message needed
        };

        const msg = event.error in errorMessages
          ? errorMessages[event.error]
          : `⚠️ Speech recognition error: ${event.error || 'unknown'}`;

        if (msg) {
          setMessages((prev) => [...prev, { role: 'assistant', content: msg }]);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      setIsListening(false);
      recognitionRef.current = null;
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
      const response = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: textToSend,
          language: selectedLanguageRef.current,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      const answer =
        data?.answer ||
        'No response from backend';

      const assistantMessage = {
        role: 'assistant',
        content: answer,
        sources: data?.sources || [],
      };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      speak(answer, selectedLanguageRef.current);
    } catch (error) {
      if (error.name === 'AbortError') {
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
              onChange={(e) => handleLanguageChange(e.target.value)}
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