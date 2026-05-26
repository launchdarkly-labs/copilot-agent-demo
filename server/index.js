require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { initChatModel } = require("langchain/chat_models/universal");
const {
  AIMessage,
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

const DEFAULT_CHAT_CONFIG = {
  model: process.env.MODEL_DEFAULT,
  temperature: 0.4,
  messages: [{ role: "system", content: SYSTEM_PROMPT }],
};
const LD_PROJECT_KEY = process.env.LD_PROJECT_KEY;
const LD_AI_CONFIG_KEY = process.env.LD_AI_CONFIG_KEY;
const LD_ACCESS_TOKEN = process.env.LD_ACCESS_TOKEN;
const AI_CONFIG_CACHE_MS = Number.parseInt(
  process.env.AI_CONFIG_CACHE_MS ?? "30000",
  10
);

let modelState = { key: null, promise: null };
let chatConfigPromise;
let cachedChatConfig = DEFAULT_CHAT_CONFIG;
let cachedChatConfigAt = 0;

function hasLaunchDarklyAiConfig() {
  return Boolean(LD_PROJECT_KEY && LD_AI_CONFIG_KEY && LD_ACCESS_TOKEN);
}

function getModel(chatConfig) {
  const modelKey = JSON.stringify({
    model: chatConfig.model,
    temperature: chatConfig.temperature,
  });

  if (!modelState.promise || modelState.key !== modelKey) {
    modelState = {
      key: modelKey,
      promise: initChatModel(chatConfig.model, {
        temperature: chatConfig.temperature,
      }),
    };
  }

  return modelState.promise;
}

function normalizeChatConfig(variation = {}) {
  const provider = variation.modelConfigKey?.split(".")[0]?.toLowerCase();
  const model =
    provider && variation.modelName
      ? `${provider}:${variation.modelName}`
      : DEFAULT_CHAT_CONFIG.model;
  const temperature =
    typeof variation.parameters?.temperature === "number"
      ? variation.parameters.temperature
      : DEFAULT_CHAT_CONFIG.temperature;
  const messages = Array.isArray(variation.messages)
    ? variation.messages.filter(
        ({ role, content }) =>
          typeof role === "string" &&
          typeof content === "string" &&
          content.trim()
      )
    : DEFAULT_CHAT_CONFIG.messages;

  return {
    model,
    temperature,
    messages: messages.length ? messages : DEFAULT_CHAT_CONFIG.messages,
  };
}

async function fetchChatConfigFromLaunchDarkly() {
  const response = await fetch(
    `https://app.launchdarkly.com/api/v2/projects/${encodeURIComponent(
      LD_PROJECT_KEY
    )}/ai-configs/${encodeURIComponent(LD_AI_CONFIG_KEY)}`,
    {
      headers: {
        Authorization: LD_ACCESS_TOKEN,
        "LD-API-Version": "beta",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`LaunchDarkly AI config lookup failed with HTTP ${response.status}`);
  }

  const config = await response.json();
  const variation =
    config.variations?.find((item) => Array.isArray(item.messages) && item.messages.length) ??
    config.variations?.[0];

  return normalizeChatConfig(variation);
}

async function getChatConfig() {
  if (!hasLaunchDarklyAiConfig()) {
    return DEFAULT_CHAT_CONFIG;
  }

  const now = Date.now();
  if (now - cachedChatConfigAt < AI_CONFIG_CACHE_MS) {
    return cachedChatConfig;
  }

  if (!chatConfigPromise) {
    chatConfigPromise = fetchChatConfigFromLaunchDarkly()
      .then((chatConfig) => {
        cachedChatConfig = chatConfig;
        cachedChatConfigAt = Date.now();
        return chatConfig;
      })
      .catch((err) => {
        console.error("Failed to load AI config from LaunchDarkly:", err);
        cachedChatConfig = DEFAULT_CHAT_CONFIG;
        cachedChatConfigAt = Date.now();
        return DEFAULT_CHAT_CONFIG;
      })
      .finally(() => {
        chatConfigPromise = null;
      });
  }

  return chatConfigPromise;
}

function buildPromptMessages(seedMessages, userInput) {
  let hasRuntimeUserMessage = false;

  const promptMessages = seedMessages.flatMap(({ role, content }) => {
    switch (role) {
      case "system":
        return [new SystemMessage(content)];
      case "assistant":
        return [new AIMessage(content)];
      case "user": {
        const renderedContent = content.replace(/\{\{\s*message\s*\}\}/g, userInput);
        hasRuntimeUserMessage ||= renderedContent !== content;
        return [new HumanMessage(renderedContent)];
      }
      default:
        return [];
    }
  });

  if (!hasRuntimeUserMessage) {
    promptMessages.push(new HumanMessage(userInput));
  }

  return promptMessages;
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
    const chatConfig = await getChatConfig();
    const m = await getModel(chatConfig);
    const response = await m.invoke(
      buildPromptMessages(chatConfig.messages, message)
    );
    res.json({ reply: response.content });
  } catch (err) {
    console.error("LangChain error:", err);
    res.status(500).json({ error: err.message || "Upstream model error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
