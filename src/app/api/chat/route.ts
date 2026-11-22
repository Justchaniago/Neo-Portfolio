import { NextResponse, type NextRequest } from "next/server";
import { PORTFOLIO_SYSTEM_INSTRUCTION } from "@/lib/portfolioKnowledge";

const BURST_WINDOW_MS = 60_000;
const BURST_MAX_REQUESTS = 5;
const DAILY_WINDOW_MS = 86_400_000;
const DAILY_IP_MAX_REQUESTS = 20;
const GLOBAL_DAILY_MAX_REQUESTS = 300;
const CACHE_TTL_MS = 30 * 60_000;
const CACHE_MAX_ENTRIES = 100;
const MIN_PROMPT_LENGTH = 2;
const MAX_PROMPT_LENGTH = 240;

const burstBuckets = new Map<string, { count: number; resetAt: number }>();
const dailyIpBuckets = new Map<string, { count: number; resetAt: number }>();
const responseCache = new Map<string, { reply: string; expiresAt: number }>();
let globalDaily = { count: 0, resetAt: Date.now() + DAILY_WINDOW_MS };

function checkBucket(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  if (entry.count >= limit) return true;
  entry.count += 1;
  return false;
}

function isGlobalDailyExceeded(): boolean {
  const now = Date.now();
  if (now > globalDaily.resetAt) {
    globalDaily = { count: 1, resetAt: now + DAILY_WINDOW_MS };
    return false;
  }
  if (globalDaily.count >= GLOBAL_DAILY_MAX_REQUESTS) return true;
  globalDaily.count += 1;
  return false;
}

function isAllowedOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    const { hostname } = new URL(origin);
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
    return hostname === "chaniago.me" || hostname.endsWith(".chaniago.me");
  } catch {
    return false;
  }
}

function getCachedReply(key: string): string | null {
  const cached = responseCache.get(key);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    responseCache.delete(key);
    return null;
  }
  return cached.reply;
}

function setCachedReply(key: string, reply: string) {
  if (responseCache.size >= CACHE_MAX_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey) responseCache.delete(oldestKey);
  }
  responseCache.set(key, { reply, expiresAt: Date.now() + CACHE_TTL_MS });
}

interface IncomingMessage {
  role?: string;
  content?: string;
}

export async function POST(request: NextRequest) {
  if (!isAllowedOrigin(request)) {
    return NextResponse.json({ error: "Forbidden origin" }, { status: 403 });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured" },
      { status: 503 },
    );
  }

  let body: { messages?: IncomingMessage[] };
  try {
    body = (await request.json()) as { messages?: IncomingMessage[] };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-6) : [];
  const rawPrompt = rawMessages.at(-1)?.content?.trim() ?? "";
  if (rawPrompt.length < MIN_PROMPT_LENGTH) {
    return NextResponse.json(
      { reply: "Please enter a brief question about Chaniago’s work, stack, or availability." },
      { status: 400 },
    );
  }

  const prompt = rawPrompt.slice(0, MAX_PROMPT_LENGTH);
  const isSingleTurn = rawMessages.length <= 1;
  const cacheKey = prompt.toLowerCase().replace(/\s+/g, " ");

  // Serve cached replies for repeated single-turn questions (0 tokens used)
  if (isSingleTurn) {
    const cachedReply = getCachedReply(cacheKey);
    if (cachedReply) {
      return NextResponse.json({ reply: cachedReply, cached: true });
    }
  }

  const contents = rawMessages
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: (m.content ?? "").trim().slice(0, MAX_PROMPT_LENGTH) }],
    }))
    .filter((m) => m.parts[0].text.length > 0);

  const forwarded = request.headers.get("x-forwarded-for");
  const clientIp = forwarded?.split(",")[0]?.trim() || "local";

  if (
    checkBucket(burstBuckets, clientIp, BURST_MAX_REQUESTS, BURST_WINDOW_MS) ||
    checkBucket(dailyIpBuckets, clientIp, DAILY_IP_MAX_REQUESTS, DAILY_WINDOW_MS) ||
    isGlobalDailyExceeded()
  ) {
    return NextResponse.json(
      { reply: "Rate limit reached — please wait a moment or email hello@chaniago.me directly." },
      { status: 429 },
    );
  }

  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(12_000),
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: PORTFOLIO_SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 100,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[/api/chat] Gemini API error:", response.status, errText);
      return NextResponse.json(
        { error: "Upstream Gemini API error" },
        { status: 502 },
      );
    }

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const reply = data.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("")
      .trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Empty response from Gemini" },
        { status: 502 },
      );
    }

    if (isSingleTurn) {
      setCachedReply(cacheKey, reply);
    }
    return NextResponse.json({ reply });
  } catch (error) {
    console.error("[/api/chat] Unexpected error:", error);
    return NextResponse.json(
      { error: "Failed to reach Gemini API" },
      { status: 500 },
    );
  }
}
