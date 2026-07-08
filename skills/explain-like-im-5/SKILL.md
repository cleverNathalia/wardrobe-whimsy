---
name: eli5
description: >
  Explain any complex topic, concept, code, or jargon in plain, simple language
  that anyone can understand — no prior knowledge assumed. Use this skill whenever
  the user says "explain this simply", "I don't understand", "break this down",
  "explain like I'm 5", "ELI5", "what does X mean in plain English", "dumbed down",
  "can you simplify this", or asks about something confusing even without using
  those exact words. Also trigger when the user pastes technical content (code,
  a document, jargon-heavy text) and seems lost or asks what it means. Err on the
  side of using this skill — if in doubt, simplify.
---

# ELI5 — Explain Like I'm 5

Your job is to take something confusing and make it click. Strip the jargon,
use real-world analogies, and never assume background knowledge the user hasn't
shown.

---

## Step 1 — Identify what needs explaining

Read the user's message carefully:
- Are they pasting a block of text, code, or a term they don't understand?
- Are they asking about a concept or process?
- Is there a specific part that's confusing, or the whole thing?

If it's not obvious what the confusing part is, ask one targeted question before
proceeding. Keep it brief — don't interrogate them.

---

## Step 2 — Choose the right mode

Pick the mode that fits the request:

### Mode A — Plain Language (default)
Use for: concepts, jargon, processes, ideas, documents.

Rules:
- Use short sentences. One idea per sentence.
- Replace every technical term with an everyday word or a quick explanation.
- Use a concrete real-world analogy. ("It's like a post office, but for data.")
- If there are steps or a sequence, number them.
- End with one sentence that captures the whole thing simply.

### Mode B — Code Clarifier
Use for: code snippets, functions, config files, error messages.

Rules:
- Start with what the code *does* in one sentence (not how).
- Walk through each significant part in plain English.
- Use an analogy if the logic is abstract. ("This loop is like a checklist — it
  goes through each item until there are none left.")
- Don't just re-describe the code line by line — explain the *purpose*.

### Mode C — Layered Explanation (use when the user wants to go deeper)
Use when: the user says "now explain it properly", "give me more detail",
"I want to actually understand it", or "break it into levels".

Deliver 3 levels:
1. **Simple** — As if explaining to a curious 10-year-old. No jargon.
2. **Clearer** — For a smart adult with no specialist knowledge. Some terms OK
   if immediately explained.
3. **Deeper** — For someone ready to engage with the real complexity. Introduce
   proper terms now, but still explain each one.

---

## Step 3 — Format the response

- Lead with the simplest possible one-liner summary.
- Then give the fuller explanation using the mode you chose.
- Use bullet points or numbered steps only if the concept has a sequence or
  multiple distinct parts. Otherwise, write in short prose.
- Avoid bold headers unless using Mode C (layered).
- Keep it concise — explain fully, but don't pad.

---

## Step 4 — Check in (optional, use judgement)

If the topic was complex or there's a natural next level of depth, end with a
light offer:

> "Want me to go deeper on any part of this?"

Don't ask this every time — only when it genuinely makes sense.

---

## Guardrails

- Never oversimplify to the point of being wrong. If simplification would
  make the explanation inaccurate, flag it: "This is a simplification — the
  real version is a bit more nuanced, but here's the core idea..."
- Don't use analogies that introduce new confusion.
- If the topic is medical, legal, or financial, simplify the *concept* but
  note that for real decisions they should consult a professional.
- If you genuinely don't know enough to explain it accurately, say so rather
  than guessing.
