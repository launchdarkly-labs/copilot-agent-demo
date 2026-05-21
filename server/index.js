require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initChatModel } = require("langchain/chat_models/universal");
const {
  SystemMessage,
  HumanMessage,
} = require("@langchain/core/messages");

const app = express();
const PORT = process.env.PORT || 3001;

const SYSTEM_PROMPT = `You are a helpful assistant embedded in a LaunchDarkly demo application.
Be concise, friendly, and specifically knowledgeable about feature flags,
progressive delivery, experimentation, and the LaunchDarkly product.
Keep responses brief unless explicitly asked for detail.

Format every response in Markdown. Use:
- Short paragraphs separated by blank lines.
- Bulleted or numbered lists when enumerating two or more items.
- \`inline code\` for flag keys, env vars, file paths, and SDK symbols.
- Fenced code blocks with a language tag (\`\`\`js, \`\`\`bash, etc.) for any multi-line code.
- Bold for the single most important phrase per answer, used sparingly.

Do not wrap the entire response in a code block. Do not include HTML.`;

const MODEL = process.env.MODEL_DEFAULT

let modelPromise;
function getModel() {
  if (!modelPromise) {
    modelPromise = initChatModel(
      MODEL,
      { temperature: 0.4 }
    );
  }
  return modelPromise;
}

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/hello", (_req, res) => {
  res.json({ message: "Hello from the server" });
});

app.post("/api/chat", async (req, res) => {
  const { message } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ error: "Body must include a non-empty 'message' string." });
  }

  try {
    const m = await getModel();
    const response = await m.invoke([
      new SystemMessage(SYSTEM_PROMPT),
      new HumanMessage(message),
    ]);
    res.json({ reply: response.content });
  } catch (err) {
    console.error("LangChain error:", err);
    res.status(500).json({ error: err.message || "Upstream model error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
