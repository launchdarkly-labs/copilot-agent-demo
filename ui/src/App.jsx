import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);

  return (
    <main className="page">
      <header className="nav">
        <img
          src="/ld/launchdarkly-logo.svg"
          alt="LaunchDarkly"
          className="nav-logo"
        />
        <span className="nav-eyebrow">Copilot agent demo</span>
      </header>

      <section className="hero">
        <span className="hero-eyebrow">Runtime control for AI</span>
        <h1 className="hero-title">
          Move at AI speed.
          <br />
          <span className="gradient">Stay in control.</span>
        </h1>
        <p className="hero-sub">
          A minimal React app wired up to the LaunchDarkly client SDK. Toggle
          flags in your LaunchDarkly project and watch the UI react in
          real-time — no redeploys.
        </p>

        <div className="actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setCount((c) => c + 1)}
          >
            Click me <span className="count">{count}</span>
          </button>
          <a
            href="https://docs.launchdarkly.com/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost"
          >
            Read the docs
          </a>
        </div>
      </section>

      <div className="divider" />

      <ChatPanel />

      <footer className="footer">
        <span>© LaunchDarkly · Demo environment</span>
      </footer>
    </main>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hey! I'm the LaunchDarkly demo assistant. Ask me anything about controlling agents in runtime.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, pending]);

  async function send(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || pending) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setPending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setMessages((m) => [...m, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: `⚠ ${err.message}`, error: true },
      ]);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="chat">
      <header className="chat-header">
        <span className="chat-avatar" aria-hidden="true">
          <img src="/ld/ld-arrow.svg" alt="" />
        </span>
        <div>
          <h3>LaunchDarkly assistant</h3>
          <span className="chat-status">
            <span className="chat-status-dot" /> Online
          </span>
        </div>
      </header>

      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            <div
              className="chat-bubble"
              style={m.error ? { background: "var(--ld-error-bg)", color: "var(--ld-error)" } : undefined}
            >
              {m.role === "assistant" && !m.error ? (
                <div className="md">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.text}
                  </ReactMarkdown>
                </div>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="chat-msg chat-msg-assistant">
            <div className="chat-bubble chat-bubble-pending">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
      </div>

      <form className="chat-input" onSubmit={send}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={pending ? "Thinking…" : "Ask something…"}
          aria-label="Message"
          disabled={pending}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={!input.trim() || pending}
        >
          Send
        </button>
      </form>
    </section>
  );
}

export default App;
