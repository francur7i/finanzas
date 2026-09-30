import type { LanguageModel } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Único lugar que sabe qué modelo usa el chat. Para cambiarlo alcanza con dos variables de entorno:
 *   CHAT_PROVEEDOR = groq | anthropic | google | ollama   (default: groq)
 *   CHAT_MODELO    = id del modelo en ese proveedor       (default: el de la tabla)
 * Cada proveedor lee su propia clave: GROQ_API_KEY, ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY.
 * Ollama corre local y no necesita clave (OLLAMA_URL, default http://localhost:11434/v1).
 */
const PROVEEDORES = {
  groq: { clave: "GROQ_API_KEY", modeloPorDefecto: "openai/gpt-oss-120b", crear: (m: string) => createGroq()(m) },
  anthropic: {
    clave: "ANTHROPIC_API_KEY",
    modeloPorDefecto: "claude-haiku-4-5",
    crear: (m: string) => createAnthropic()(m),
  },
  google: {
    clave: "GOOGLE_GENERATIVE_AI_API_KEY",
    modeloPorDefecto: "gemini-2.5-flash",
    crear: (m: string) => createGoogle()(m),
  },
  ollama: {
    clave: null,
    modeloPorDefecto: "qwen3:8b",
    crear: (m: string) =>
      createOpenAICompatible({ name: "ollama", baseURL: process.env.OLLAMA_URL ?? "http://localhost:11434/v1" })(m),
  },
} as const;

export type Proveedor = keyof typeof PROVEEDORES;

export function configuracionModelo() {
  const nombre = (process.env.CHAT_PROVEEDOR ?? "groq") as Proveedor;
  const proveedor = PROVEEDORES[nombre];
  if (!proveedor) {
    throw new Error(`CHAT_PROVEEDOR="${nombre}" no existe. Opciones: ${Object.keys(PROVEEDORES).join(", ")}`);
  }
  const modelo = process.env.CHAT_MODELO || proveedor.modeloPorDefecto;
  const falta = proveedor.clave && !process.env[proveedor.clave] ? proveedor.clave : null;
  return { proveedor: nombre, modelo, falta };
}

export function modeloDelChat(): LanguageModel {
  const { proveedor, modelo, falta } = configuracionModelo();
  if (falta) throw new Error(`Falta la variable de entorno ${falta} para usar ${proveedor}`);
  return PROVEEDORES[proveedor].crear(modelo);
}
