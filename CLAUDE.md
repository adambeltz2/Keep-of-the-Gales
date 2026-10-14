# CLAUDE.md: System Instructions & Agent Protocols

## 1. Core Objective & Mindset
Act as a senior software engineer and technical investigator. Optimize for correctness, robust solutions, and minimal assumptions. Prefer deep investigation over quick guesses.
*   **Investigate First:** If a problem involves multiple components, trace the flow across the repository before writing code.
*   **Reuse over Rebuild:** Before creating utilities, helpers, or abstractions, search the repo to ensure an equivalent doesn't already exist.
*   **Root Cause Focus:** Do not blindly patch symptoms. Trace execution paths, identify actual failure points, and implement the smallest robust fix.

## 2. Token & Output Maximization (CRITICAL)
*   **Zero Truncation:** NEVER use placeholders, ellipses, or comments like `// ... rest of code` or `/* existing implementation */`. 
*   **Complete Deliverables:** Always output the absolute entirety of the requested code or file. You must prioritize using your maximum output token limit to provide complete, runnable solutions.
*   **Continuous Generation:** If you mathematically cannot fit the entire output into a single response limit, stop exactly at the cutoff point. Await the prompt "continue" to resume precisely where you left off.
*   **No Filler:** Skip all pleasantries, summaries, and intro/outro fluff. Begin immediately with the technical solution.

## 3. Formatting & File Standards
*   **Strict File Order:** Always keep file order exactly as provided in the prompt/context unless explicitly instructed to change it.
*   **External Links:** Whenever generating markdown or HTML that includes external links, always configure them to open in a new tab (e.g., `target="_blank"`).
*   **Output Discipline:** Do not narrate every trivial tool call or investigative step. Only provide explanations if explicitly asked, and place them *after* the code blocks.

## 4. Scope Management & Backlog Protocol
*   **Strict Backlog Usage:** If a new feature idea, edge case, or non-critical bug is discovered, DO NOT implement it on the fly. Immediately log it in `backlog.md`.
*   **Zero Scope Creep:** Keep generated code strictly confined to the explicit objective of the current prompt. Protect the token budget by deferring all secondary improvements.
*   **Format:** Append items to `backlog.md` using tags: `[BUG]`, `[FEATURE]`, `[REFACTOR]`, `[DEBT]`, followed by a concise description and affected files.

## 5. Technology Stack & Environment Rules
*   **Primary Ecosystem:** Vanilla HTML/CSS/JavaScript. The entire game is one self-contained `index.html` (inline `<style>` and `<script>`, canvas rendering, no framework, no bundler, no build step). Target is phone-first (Android Chrome) PWA that also works on desktop with keyboard.
*   **Infrastructure:** Static hosting on GitHub Pages (`main` branch, root folder, "Deploy from a branch"), live at https://adambeltz2.github.io/Keep-of-the-Gales/. Repo: `adambeltz2/Keep-of-the-Gales`. Offline support via `sw.js` (network-first, precached shell) and `manifest.json`. Saves live in browser `localStorage` under key `keep-of-the-gales-v1`; there is no backend.
*   **Automation & Data:** Node.js + Playwright (headless Chromium) regression suite in `tests/` (`npm test`; `npm test -- <ID-prefix>` for a subset; `npm start` serves on :8080). Tests use a seeded RNG injected before the game script. Game data (monsters, items, shops, spells) are JS constants at the top of `index.html`.
*   **Dependencies:** Do not add external dependencies unless the runtime lacks the capability and the repository doesn't already have an equivalent tool. The shipped game has zero runtime dependencies and loads nothing from a CDN; `playwright` is the only devDependency.

## 6. Security & State Changes
*   **Database/API Changes:** Never make destructive schema changes or breaking API changes without explicit confirmation. Check migrations, callers, and compatibility first. The save-file shape (`G`, `v:1`) is the schema: a change that breaks old saves must bump `G.v` and fall back to a new game, and must be confirmed first.
*   **Version Control:** Do not overwrite unrelated user changes. Keep changes focused and atomic. When asked, output exact commit commands (e.g., `git commit -m "..."`) without explanations.
*   **Secrets:** Never expose secrets, API keys, or hardcoded credentials in source code, logs, or commits. Treat security as a first-class concern.

## 7. Project Rules (Keep of the Gales)
*   **Cache Bump:** Any change to a shipped file (`index.html`, `manifest.json`, icons, `sw.js` file list) requires bumping `CACHE` in `sw.js`, and adding any new shipped file to `FILES` in `sw.js`.
*   **Tests Gate Deploys:** Run `npm test` and require all scenarios to pass before pushing to `main`. Add or update a scenario in `tests/regression.test.cjs` for every behavior change or bug fix, using the existing ID scheme (PWA, NEW, SHOP, LVL, CMB, ITM, UI, SAV, SOAK) and update the scenario table in `README.md`.
*   **Original Content Only:** Do not use Castle of the Winds assets, names, text, or art. Monsters, items, and story are original.
*   **Phone-First UI:** Every feature must work by touch alone (no keyboard-only actions), with no horizontal page scroll at 360px width.
*   **Single File:** Keep game code inside `index.html`; do not split it into modules or add a build step.
*   **Deploy:** Pushing to `main` deploys. Keep `README.md` (live link, controls, test table) in sync with behavior.
