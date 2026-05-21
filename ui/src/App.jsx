import { useState } from "react";
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

      <footer className="footer">
        <span>© LaunchDarkly · Demo environment</span>
      </footer>
    </main>
  );
}


export default App;
