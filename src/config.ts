import dotenv from "dotenv";

dotenv.config();

interface Config {
  BOT_TOKEN: string;
  DO_API_URL: string;
  DO_API_USERNAME: string;
  DO_API_PASSWORD: string;
  DO_API_TOKEN?: string; // Оставляем для совместимости
  OPENROUTER_API_KEY?: string;
  GEMINI_API_KEY?: string;
  OPENAI_API_KEY?: string;
}

export const config: Config = {
  BOT_TOKEN: process.env.BOT_TOKEN || "",
  DO_API_URL: process.env.DO_API_URL || "",
  DO_API_USERNAME: process.env.DO_API_USERNAME || "",
  DO_API_PASSWORD: process.env.DO_API_PASSWORD || "",
  DO_API_TOKEN: process.env.DO_API_TOKEN,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY
};

// Проверка обязательных переменных
const requiredEnvVars = ["BOT_TOKEN", "DO_API_URL", "DO_API_USERNAME", "DO_API_PASSWORD"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Отсутствуют переменные окружения: ${missingVars.join(", ")}`);
  process.exit(1);
}
