# AGENTS.md

Guidance for AI coding agents (and humans) working in the Hugo repository. Read this before writing code.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## What Hugo is

A realtime AI voice assistant (the "command orb") and a showcase of the Vercel-native AI stack: Next.js 16 + React 19, AI SDK v7, Vercel AI Gateway realtime voice, the Eve agent framework, and Convex (DB + auth). See [README.md](./README.md) for the product overview and [IMPLEMENTATION_NOTES.md](./IMPLEMENTATION_NOTES.md) for architecture decisions.

## Installed coding-agent skills

Project-scoped skills live in `.agents/skills/<name>/SKILL.md`; `skills-lock.json` records their upstream sources, source paths, and content hashes. These are development instructions, **not** Hugo's runtime skills in `agent/hugo/skills/`. Do not add them to the assistant's system prompt, bundle them into the app, or load the entire catalog at once. Agents supporting `.agents/skills` can discover them directly; other agents should read the relevant entrypoint from the routing table below.

| Work | Skills to load as needed |
| --- | --- |
| React / Next.js performance and composition | `vercel-react-best-practices`, `vercel-composition-patterns` |
| AI SDK 7 / Gateway and in-process eve | `ai-sdk`, `eve` |
| Convex schema, functions, components, scheduling | `convex`, `convex-expert`, `convex-design`, `convex-docs`, `convex-add`, `convex-crons` |
| Backend authorization and regression tests | `convex-authz`, `convex-reviewer`, `convex-test`, `convex-verify` |
| Backend inventory, readiness, performance, diagnostics | `convex-explain-app`, `convex-launch-readiness`, `convex-advisor`, `convex-insights`, `convex-cost`, `convex-optimize`, `convex-monitor` |
| Controlled configuration, migrations and recovery | `convex-deploy-guard`, `convex-env`, `convex-migrate`, `convex-migrate-rehearse`, `convex-backup` |
| Planned personal-account Better Auth work | `better-auth-best-practices`, `create-auth`, `better-auth-security-best-practices`, `email-and-password-best-practices`, `two-factor-authentication-best-practices` |
| Planned transactional verification / recovery email | `resend`, `email-best-practices`, `react-email` |
| Browser acceptance, deterministic tests and tooling | `agent-browser`, `playwright-cli`, `vitest`, `pnpm` |
| Accessibility, interaction design and GPU rendering | `web-design-guidelines`, `emil-design-eng`, `typegpu` |
| Deployment cost/performance and operational writing | `vercel-optimize`, `writing-guidelines` |

### Project constraints take precedence over upstream recipes

- Installing skills does not install their CLIs, connect integrations, approve a migration, or authorize deployment, email delivery, transcript uploads, production-data mutations, or paid resources. Inspect bundled scripts before running them and apply the environment's approval rules.
- Inspect the current implementation, this file, installed package versions, and official version-matched documentation before significant changes. Reuse existing architecture and verify actual behavior; never equate generated code or mock tests with live-service proof.
- Preserve Next.js 16.3.x / React 19.3, AI SDK 7 / AI Gateway, eve's in-process authoring architecture, the existing Convex backend, and Hugo's dark-first tokens. Never upgrade frameworks or migrate to hosted eve simply to satisfy a skill.
- The upstream `next-upgrade` skill was retired in favor of the bundled migration guides and `pnpm dlx @next/codemod@latest upgrade`. Review codemod output: do not adopt Cache Components or add route opt-outs unless the app actually enables that feature.
- TypeGPU is on 0.12.x, matching the installed skill. Check APIs against installed types/source and matching docs before use.
- TypeScript 7's `tsc` is installed via the `@typescript/native` alias. The `typescript` alias intentionally resolves to Microsoft's `@typescript/typescript6` compatibility API for Next.js and typescript-eslint. Upgrade both aliases together; do not replace the compatibility alias with native TypeScript until dependent tools support its API.
- ESLint 10 uses the official `@eslint/compat` adapter for Next's legacy React/import/accessibility plugins. Keep all lint rules active; upstream plugin peer ranges may still advertise only ESLint 9.
- Better Auth is planned, not installed in the application. If migration is authorized, use the official Convex-hosted adapter and its supported Better Auth release (the attached scope identifies the 1.6 line; reverify compatibility). Preserve Hugo user IDs, roles, ownership, and `convex/model/authz.ts`; do not create a SQL auth database, link accounts by email alone, or grant admin from unverified email. Keep CSRF/origin checks enabled. Development auth cookies must use `SameSite=None; Secure` with exact trusted origins.
- Personal-account scope means email/password, verified email, recovery, TOTP and backup codes. Organization/SSO, social login, passkeys, SMS, billing, replacement agent runtimes, and new documentation frameworks are not authorized by installing skills. Resend guidance is preparatory until a real integration and verified sender are approved.
- Some upstream Convex entrypoints advertise optional sibling skills that are not installed. Consult the local lockfile rather than assuming the whole upstream catalog is present. In particular, do not invoke transcript-sharing, greenfield scaffolding, or replacement-auth recipes as part of readiness work.
- Preserve Anime.js v4, reduced-motion support, and the existing orb lifecycle. Design guidance is for incremental usability work, not a visual rebrand. The `farming-labs-docs` framework from the attachment is not part of Hugo's dependencies and was not installed.
- Keep all existing verification gates below. Report missing credentials, unsupported APIs, and blocked live journeys explicitly; never fabricate integrations or success evidence.

Skills were installed with `pnpm dlx skills@1.7.0 add <source> --skill <names...> --agent codex --yes` into the shared `.agents/skills` location. Review upstream changes and version compatibility before a targeted update; commit updated skill files and `skills-lock.json` together. Avoid blanket catalog installs or copying one skill into multiple agent directories.

## Before you commit — always run

```bash
pnpm lint && pnpm typecheck && pnpm test
```

All three must pass. If you touched Convex functions, also run `pnpm convex:codegen` and commit the generated changes. `pnpm build` must also succeed.

## The Eve agent layer (`agent/hugo/`)

Hugo is authored the **Eve** way (a filesystem-first agent: `instructions.md`, `skills/`, `tools/`, `agent.ts` via `defineAgent`), but invoked **in-process** from Next.js Route Handlers via AI SDK v7 (`lib/ai.ts` assembles the system prompt from `instructions.md` + `skills/`). This keeps Hugo a single, cleanly-deployable Next app.

- **Instructions:** `agent/hugo/instructions.md` is Hugo's core system prompt.
- **Skills:** add a focused Markdown file to `agent/hugo/skills/`; it is assembled into the prompt.
- **Tools:** add an AI-SDK `tool()` in `agent/hugo/tools/index.ts`. Tools execute against Convex with the authenticated user's token, wrap `execute` in the existing `logged(...)` helper (records to the `toolCalls` ledger), and `redact(...)` sensitive I/O. Keep the client-safe projection in `agent/hugo/tools/registry.ts` in sync.

To graduate to Eve's hosted durable runtime later: wrap `next.config` with `withEve` and run `eve dev` — no changes to the agent files required.

## The Convex authorization invariant (non-negotiable)

> **Never trust a client-supplied `userId`. Every Convex function that touches user-owned data must resolve identity through `convex/model/authz.ts`.**

- `requireUser(ctx)` — authenticated, active user.
- `requireAdmin(ctx)` — authenticated admin.
- `assertOwnerOrAdmin(user, ownerId)` / `canAccess(user, ownerId)` — per-resource checks.
- `logAudit(ctx, ...)` — call from every admin mutation (immutable audit trail).

Derive identity from the authenticated context, then check ownership — do not read a `userId` from args to decide access. Roles are set only in trusted backend code (`convex/auth.ts`), never from the client. Add a test under `convex/tests/` for unauthenticated and cross-user cases.

## Client / server boundary rules

- **Server-only modules** import `"server-only"` (e.g. `lib/convex-server.ts`, `agent/hugo/tools/index.ts`). Never import them — or any secret — into a `"use client"` component.
- **Keep shared, stateless helpers in non-client modules** so both RSC and client code can call them. Example: `buttonVariants` lives in `components/ui/button-variants.ts` (a non-client module), not in the `"use client"` button component, so server components can style a `<Link>` like a button.
- Route Handlers carry the user's Convex JWT into backend calls so authorization is enforced everywhere. The AI Gateway key never reaches the browser — realtime uses short-lived, server-minted tokens.
- Only `NEXT_PUBLIC_*` values are safe on the client. Never expose a secret through that prefix.

## Design system tokens

Use the CSS variables / Tailwind tokens from `app/globals.css` rather than hard-coded colors:

- Surfaces: `--background`, `--surface`, `--surface-elevated`, `--border`, `--border-strong`.
- Text: `--text-primary`, `--text-secondary`, `--text-muted`.
- Accents: `--hugo-cyan`, `--hugo-blue`, `--accent-magenta`; status: `--success`, `--warning`, `--error`.
- The app is **dark-first** (light mode is supported, secondary). The orb's 10 states and motion live in `components/hugo/HugoOrb.tsx` (Anime.js v4) and honor `prefers-reduced-motion`. JS-side colors that must match the CSS live in `lib/constants.ts` (`PALETTE`).

## Conventions

- TypeScript strict, ESM, Node 22+. Use the `@/*` path alias.
- Conventional Commits (`feat:`, `fix:`, `docs:`, …). Branch off `main`.
- No secrets in tracked files. `.env.local` is gitignored; `.env.example` holds placeholders only.
- See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full workflow and [SECURITY.md](./SECURITY.md) for the security posture.


<claude-mem-context>
# Memory Context

# claude-mem status

This project has no memory yet. The current session will seed it; subsequent sessions will receive auto-injected context for relevant past work.

Memory injection starts on your second session in a project.

`/learn-codebase` is available if the user wants to front-load the entire repo into memory in a single pass (~5 minutes on a typical repo, optional). Otherwise memory builds passively as work happens.

Live activity: http://localhost:37777
How it works: `/how-it-works`

This message disappears once the first observation lands.
</claude-mem-context>
