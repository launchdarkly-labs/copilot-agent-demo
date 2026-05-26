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

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant embedded in a LaunchDarkly demo application.
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

const DEFAULT_MODEL = process.env.MODEL_DEFAULT;
const LD_PROJECT_KEY = process.env.LD_PROJECT_KEY;
const LD_AI_CONFIG_KEY = process.env.LD_AI_CONFIG_KEY;
const LD_AI_CONFIG_VARIATION_KEY = process.env.LD_AI_CONFIG_VARIATION_KEY || "default";
const LD_API_KEY = process.env.LD_API_KEY;

const modelPromises = new Map();
let runtimeChatConfigPromise;

function getModel(modelName, temperature) {
  if (!modelName) {
    throw new Error("No model configured. Set MODEL_DEFAULT or configure an AI Config model.");
  }

  const key = `${modelName}:${temperature}`;
  if (!modelPromises.has(key)) {
    modelPromises.set(
      key,
      initChatModel(modelName, { temperature })
    );
  }
  return modelPromises.get(key);
}

function resolveRuntimeChatConfig(data) {
  const variations = Array.isArray(data?.variations) ? data.variations : [];
  const selectedVariation = variations.find(
    (variation) =>
      variation?.key === LD_AI_CONFIG_VARIATION_KEY ||
      variation?.name === LD_AI_CONFIG_VARIATION_KEY
  ) || variations.find((variation) => variation?.name === "Default");

  const systemPromptFromVariation = selectedVariation?.messages?.find(
    (message) => message?.role === "system" && typeof message?.content === "string"
  )?.content;

  return {
    modelName: selectedVariation?.modelName || DEFAULT_MODEL,
    temperature:
      typeof selectedVariation?.parameters?.temperature === "number"
        ? selectedVariation.parameters.temperature
        : 0.4,
    systemPrompt: systemPromptFromVariation || DEFAULT_SYSTEM_PROMPT,
  };
}

function getRuntimeChatConfig() {
  if (!runtimeChatConfigPromise) {
    runtimeChatConfigPromise = (async () => {
      if (!LD_API_KEY || !LD_PROJECT_KEY || !LD_AI_CONFIG_KEY) {
        return {
          modelName: DEFAULT_MODEL,
          temperature: 0.4,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
        };
      }

      try {
        const response = await fetch(
          `https://app.launchdarkly.com/api/v2/projects/${LD_PROJECT_KEY}/ai-configs/${LD_AI_CONFIG_KEY}`,
          {
            headers: {
              Authorization: LD_API_KEY,
              "LD-API-Version": "beta",
            },
          }
        );

        if (!response.ok) {
          throw new Error(`LaunchDarkly AI Config request failed with ${response.status}`);
        }

        const data = await response.json();
        return resolveRuntimeChatConfig(data);
      } catch (error) {
        console.warn("Falling back to local model config:", error.message);
        return {
          modelName: DEFAULT_MODEL,
          temperature: 0.4,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
        };
      }
    })();
  }

  return runtimeChatConfigPromise;
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
    const runtimeChatConfig = await getRuntimeChatConfig();
    const m = await getModel(runtimeChatConfig.modelName, runtimeChatConfig.temperature);
    const response = await m.invoke([
      new SystemMessage(runtimeChatConfig.systemPrompt),
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
