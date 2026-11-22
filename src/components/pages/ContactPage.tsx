"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight } from "lucide-react";
import styles from "./ContactPage.module.css";

interface ChatTurn {
  id: number;
  question: string;
  answer: string | null;
}

const SESSION_KEY = "chaniago_contact_ai_session_v1";
const MAX_STORED_TURNS = 12;

const SOCIAL_LINKS = [
  { label: "LinkedIn", href: "https://www.linkedin.com/in/justchaniago/" },
  { label: "GitHub", href: "https://github.com/Justchaniago" },
];

const TOPICS = [
  { label: "Projects", prompt: "What projects has Chaniago built?" },
  { label: "Stack", prompt: "What is Chaniago's core tech stack?" },
  { label: "Availability", prompt: "Is Chaniago currently available for work?" },
];

function getLocalFallbackReply(prompt: string): string {
  const q = prompt.toLowerCase();
  if (q.includes("stack") || q.includes("tech")) {
    return "TypeScript, React, Next.js, Node.js, and WebGL/GSAP for interactive interfaces paired with scalable backend architecture.";
  }
  if (q.includes("available") || q.includes("work") || q.includes("freelance") || q.includes("hire")) {
    return "Available for select freelance collaborations and senior engineering roles — reach out directly at hello@chaniago.me.";
  }
  if (q.includes("project") || q.includes("built")) {
    return "Focused on high-craft web applications, spatial & motion-rich interfaces, and end-to-end product systems.";
  }
  return "Available for select collaborations and engineering inquiries — reach out directly at hello@chaniago.me.";
}

function loadSessionTurns(): ChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatTurn[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function ContactPage({
  ready,
  onClose,
}: {
  ready: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [input, setInput] = useState("");
  const [activeTopic, setActiveTopic] = useState<string | null>(null);
  const [turns, setTurns] = useState<ChatTurn[] | null>(null);
  const [isSending, setIsSending] = useState(false);
  const lastSentAtRef = useRef(0);
  const nextIdRef = useRef(1);
  const streamEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setTurns(loadSessionTurns()));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (turns?.length) {
      nextIdRef.current = Math.max(nextIdRef.current, ...turns.map((t) => t.id)) + 1;
    }
  }, [turns]);

  useEffect(() => {
    if (turns === null) return; // Do not overwrite storage before restoration.
    try {
      const completed = turns.filter((t) => t.answer !== null).slice(-MAX_STORED_TURNS);
      if (completed.length > 0) {
        window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(completed));
      } else {
        window.sessionStorage.removeItem(SESSION_KEY);
      }
    } catch {
      // Ignore storage errors
    }
  }, [turns]);

  useEffect(() => {
    if (ready) streamEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [ready, turns, isSending]);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText("hello@chaniago.me");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = "mailto:hello@chaniago.me";
    }
  };

  const askQuestion = async (promptText: string, topicLabel?: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isSending || turns === null) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < 2000) return;
    lastSentAtRef.current = now;

    const turnId = nextIdRef.current++;
    setActiveTopic(topicLabel ?? null);
    setInput("");
    setIsSending(true);

    const recentHistory = turns
      .filter((t) => t.answer !== null)
      .slice(-2)
      .flatMap((t) => [
        { role: "user", content: t.question },
        { role: "assistant", content: t.answer as string },
      ]);

    setTurns((prev) => [...(prev ?? []).slice(-(MAX_STORED_TURNS - 1)), { id: turnId, question: trimmed, answer: null }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...recentHistory, { role: "user", content: trimmed }],
        }),
      });

      const data = (await res.json()) as { reply?: string };
      if (!res.ok && !data.reply) {
        throw new Error(`HTTP ${res.status}`);
      }

      const replyText = data.reply?.trim() || getLocalFallbackReply(trimmed);
      setTurns((prev) => prev?.map((t) => (t.id === turnId ? { ...t, answer: replyText } : t)) ?? null);
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, 320));
      const fallback = getLocalFallbackReply(trimmed);
      setTurns((prev) => prev?.map((t) => (t.id === turnId ? { ...t, answer: fallback } : t)) ?? null);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void askQuestion(input);
  };

  const handleClear = () => {
    setTurns([]);
    setActiveTopic(null);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className={`${styles.wrapper} ${ready ? styles.ready : ""}`} data-lenis-prevent>
      <span className={styles.gridBg} aria-hidden="true" />

      <div className={styles.columns}>
        <div className={styles.leftCol}>
          <p className={styles.eyebrow} data-page-part>
            03
          </p>
          <h1 className={styles.title} data-page-part>
            contact
          </h1>

          <div className={styles.linksBlock} data-page-part>
            <button
              type="button"
              className={styles.emailBtn}
              onClick={handleCopyEmail}
              aria-label="Copy email address hello@chaniago.me"
            >
              <span className={styles.emailText}>hello@chaniago.me</span>
              {copied ? <span className={styles.copiedBadge}>Copied</span> : null}
            </button>

            <nav className={styles.socialRow} aria-label="Direct links">
              {SOCIAL_LINKS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.socialLink}
                >
                  <span>{item.label}</span>
                  <ArrowUpRight className={styles.arrowIcon} aria-hidden="true" />
                </a>
              ))}
            </nav>
          </div>

          <div className={styles.actions} data-page-part>
            <button type="button" className={styles.returnButton} onClick={onClose}>
              <span className={styles.returnArrow} aria-hidden="true">←</span>
              <span>Return to home</span>
            </button>
          </div>
        </div>

        <section className={styles.rightCol} aria-label="Ask AI about Chaniago" data-page-part>
          {turns && turns.length > 0 ? (
            <div
              className={styles.stream}
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              data-lenis-prevent
              onWheel={(e) => e.stopPropagation()}
              onTouchMove={(e) => e.stopPropagation()}
            >
              {turns.map((turn) => (
                <div key={turn.id} className={styles.turn}>
                  <p className={styles.question}>{turn.question}</p>
                  <div className={styles.answerBox}>
                    {turn.answer === null ? (
                      <div className={styles.typing} aria-label="Thinking">
                        <span />
                        <span />
                        <span />
                      </div>
                    ) : (
                      <p className={styles.answerText}>{turn.answer}</p>
                    )}
                  </div>
                </div>
              ))}
              <div ref={streamEndRef} />
            </div>
          ) : null}

          <form className={styles.composer} onSubmit={handleSubmit}>
            <input
              type="text"
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI about my work..."
              aria-label="Ask AI about Chaniago's work"
              maxLength={240}
              disabled={isSending}
            />
            <button
              type="submit"
              className={styles.sendBtn}
              disabled={isSending || !input.trim()}
              aria-label="Submit question"
            >
              ↵
            </button>
          </form>

          <div className={styles.topicsRow}>
            <div className={styles.topics} aria-label="Quick topics">
              {TOPICS.map((topic) => (
                <button
                  key={topic.label}
                  type="button"
                  className={`${styles.topicBtn} ${
                    activeTopic === topic.label ? styles.topicBtnActive : ""
                  }`}
                  onClick={() => void askQuestion(topic.prompt, topic.label)}
                >
                  {topic.label}
                </button>
              ))}
            </div>
            {turns && turns.length > 0 && !isSending ? (
              <button
                type="button"
                className={styles.topicBtn}
                onClick={handleClear}
              >
                Clear
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
