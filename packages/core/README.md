<div align="center">

<picture>
  
  <img width="844" height="343" alt="image" src="https://github.com/user-attachments/assets/a08b19cb-1149-4d40-ac10-37e430d1f46c" />


</picture>

The TypeScript framework for MCP Servers.

**Presenters shape perception.**<br>
A typed layer between your data and the AI agent — strips undeclared fields, redacts PII, gates tools by workflow state, and deploys to any edge.

[![npm version](https://img.shields.io/npm/v/@mcpfusion/core.svg?color=0ea5e9)](https://www.npmjs.com/package/@mcpfusion/core)
[![Downloads](https://img.shields.io/npm/dw/@mcpfusion/core)](https://www.npmjs.com/package/@mcpfusion/core)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MCP Standard](https://img.shields.io/badge/MCP-Standard-purple)](https://modelcontextprotocol.io/)
[![License](https://img.shields.io/badge/License-Apache_2.0-green)](https://github.com/vinkius-labs/mcpfusion/blob/main/LICENSE)
[![llms.txt](https://img.shields.io/badge/llms.txt-AI_Ready-8b5cf6)](https://mcpfusion.vinkius.com/llms.txt)

[Documentation](https://mcpfusion.vinkius.com/) · [Quick Start](https://mcpfusion.vinkius.com/quickstart-lightspeed) · [API Reference](https://mcpfusion.vinkius.com/api/) · [llms.txt](https://mcpfusion.vinkius.com/llms.txt)



<img width="920" height="580" alt="demo" src="https://github.com/user-attachments/assets/32a93236-f52d-4b17-b73f-ddeacbc7deb3" />

</div>

## Why MCP Fusion?

Every raw MCP server does the same thing: `JSON.stringify()` the database row and ships it to the LLM. The AI receives `password_hash`, `customer_ssn`, `internal_margin` — every column. No governance. No rules. No perception control.

MCP Fusion gives you three ways to fix this — pick the one that fits your team:

### Path 1: Declarative YAML — zero code

Define your entire MCP server in a single `mcpfusion.yaml`. No TypeScript. No build step.

```yaml
# mcpfusion.yaml — a complete MCP server
version: "1.0"
server:
  name: "github-tools"

connections:
  github:
    type: rest
    base_url: "https://api.github.com"
    auth:
      type: bearer
      token: "${SECRETS.GITHUB_TOKEN}"

tools:
  - name: search_repos
    description: "Search GitHub repositories"
    instruction: "Use for finding projects by topic or keyword."
    rules:
      - "Max 10 results per query"
    parameters:
      query: { type: string, required: true }
    execute:
      connection: github
      method: GET
      path: "/search/repositories"
      query: { q: "{{query}}", per_page: "10" }
    response:
      extract: ["items[].{full_name, description, stargazers_count, html_url}"]
```

```bash
mcpfusion yaml dev   # MCP server running — zero TypeScript
```

### Path 2: Presenter flow — control what the agent perceives

The Presenter is a typed perception layer. Your handler returns raw data. The Presenter shapes everything the agent sees:

```
Handler (raw data)         Presenter                    Agent (LLM)
──────────────────         ─────────                    ──────────
{ amount_cents,       →    Schema (allowlist)       →   Structured
  password_hash,           + Rules (contextual)         perception
  customer_ssn,            + PII redaction              package
  internal_margin }        + Suggested next actions
                           - password_hash  ← STRIPPED
                           - customer_ssn   ← REDACTED
                           - internal_margin ← STRIPPED
```

```typescript
import { createPresenter, f, t } from '@mcpfusion/core';

const InvoicePresenter = createPresenter('Invoice')
    .schema({ id: t.string, amount_cents: t.number, status: t.enum('paid', 'pending') })
    .redactPII(['*.customer_ssn'])
    .rules(['amount_cents is in CENTS — divide by 100 for display.'])
    .suggest((inv) => inv.status === 'pending'
        ? [suggest('billing.pay', 'Invoice pending — process payment')]
        : [suggest('billing.archive', 'Invoice settled — archive it')]);

export default f.query('billing.get_invoice')
    .describe('Get an invoice by ID')
    .withString('id', 'Invoice ID')
    .returns(InvoicePresenter)
    .handle(async (input, ctx) => ctx.db.invoices.findUnique({ where: { id: input.id } }));
```

Undeclared fields are stripped at RAM level. PII is redacted after UI logic runs (Late Guillotine). Rules travel with data, not in the system prompt. Next actions are computed from data state, not hardcoded.

### Path 3: Workflow gates — tools that appear only when valid

The FSM State Gate makes it physically impossible for the AI to call tools out of order. If the state is `empty`, `cart.pay` doesn't exist in `tools/list`:

```typescript
const gate = f.fsm({
    id: 'checkout', initial: 'empty',
    states: {
        empty:     { on: { ADD_ITEM: 'has_items' } },
        has_items: { on: { CHECKOUT: 'payment' } },
        payment:   { on: { PAY: 'confirmed' } },
        confirmed: { type: 'final' },
    },
});

export default f.mutation('cart.pay')
    .bindState('payment', 'PAY')  // Invisible until 'payment' state
    .handle(async (input, ctx) => ctx.db.payments.process(input.method));
```

| State | Visible tools |
|---|---|
| `empty` | `cart.add_item`, `cart.view` |
| `has_items` | `cart.add_item`, `cart.checkout`, `cart.view` |
| `payment` | `cart.pay`, `cart.view` |
| `confirmed` | `cart.view` |

---

## Get Started

```bash
npx @mcpfusion/core create my-server
cd my-server && npm run dev
```

Drop a file in `src/tools/`, restart — it's a live MCP tool:

```
src/tools/
├── billing/
│   ├── get_invoice.ts  → billing.get_invoice
│   └── pay.ts          → billing.pay
└── users/
    └── list.ts         → users.list
```

### Deploy

Same code, any platform. Zero changes:

```bash
mcpfusion deploy                  # Vinkius Edge (default)
vercel deploy                # Vercel Functions
wrangler deploy              # Cloudflare Workers
```

### Scaffold Options

```bash
mcpfusion create my-server                           # Vanilla — file-based routing
mcpfusion create my-api --vector prisma              # Prisma — CRUD with field-level security
mcpfusion create ops-bridge --vector n8n             # n8n — workflow bridge
mcpfusion create petstore --vector openapi           # OpenAPI → MCP in one command
mcpfusion create my-server --target vercel --yes     # Vercel Functions target
mcpfusion create my-server --target cloudflare --yes # Cloudflare Workers target
```

---

## Zero Learning Curve

MCP Fusion ships a [SKILL.md](https://agentskills.io) — a machine-readable architectural contract. Your AI agent reads the spec and writes the entire server. First pass, no corrections.

Open your project in **Cursor**, **Claude Code**, **GitHub Copilot**, or **Windsurf** and prompt:

> *"Build an MCP server for patient records with Prisma. Redact SSN and diagnosis from LLM output. Add an FSM that gates discharge tools until attending physician signs off."*

The agent reads the spec, produces correct Presenters, middleware, FSM gating, and file-based routing. You review the PR.

> 📄 **Machine-readable spec:** [mcpfusion.vinkius.com/llms.txt](https://mcpfusion.vinkius.com/llms.txt) — optimized for LLM consumption.

---

## Key Features

Egress Firewall (Presenter schema allowlist) · PII Redaction with Late Guillotine · FSM State Gate (tools disappear by state) · A2A Protocol Bridge (`@mcpfusion/a2a` — expose MCP servers as A2A-compliant agents with Agent Cards and task delegation) · Multi-Agent Swarm (`@mcpfusion/swarm` — HMAC-SHA256 delegation, namespace isolation, W3C tracing) · Middleware (pre-compiled, zero-allocation) · tRPC-style typed client · Self-healing errors · State Sync (RFC 7234 cache signals) · Zero-trust Sandbox (V8 isolate) · Prompt Engine · Agent Skills · Capability Governance (SHA-256 lockfile) · Inspector (real-time TUI dashboard) · Declarative YAML engine (`@mcpfusion/yaml`)

→ **[Full documentation](https://mcpfusion.vinkius.com/)**

---

## Code Generators

Turn existing infrastructure into MCP servers:

```bash
# OpenAPI / Swagger → typed MCP tools
npx openapi-gen generate -i ./petstore.yaml -o ./generated

# Prisma → CRUD tools with field-level security
npx prisma generate   # uses @mcpfusion/prisma-gen

# n8n → auto-discover webhook workflows
const n8n = await createN8nConnector({ url, apiKey, includeTags: ['ai-enabled'] });
```

---

## Ecosystem

### Core

| Package | Purpose |
|---|---|
| [`@mcpfusion/core`](https://www.npmjs.com/package/@mcpfusion/core) | Framework core — Presenters, Fluent API, middleware, routing |
| [`@mcpfusion/yaml`](https://www.npmjs.com/package/@mcpfusion/yaml) | Declarative YAML engine — define MCP servers without code |
| [`@mcpfusion/swarm`](https://github.com/vinkius-labs/mcpfusion/tree/main/packages/swarm) | Multi-agent orchestration — Federated Handoff Protocol |
| [`@mcpfusion/a2a`](https://github.com/vinkius-labs/mcpfusion/tree/main/packages/a2a) | A2A Protocol Bridge — Agent Cards, task delegation, structured message exchange |
| [`@mcpfusion/testing`](https://mcpfusion.vinkius.com/testing) | In-memory pipeline testing with MVA layer assertions |
| [`@mcpfusion/inspector`](https://mcpfusion.vinkius.com/inspector) | Real-time terminal dashboard via Shadow Socket |

### Adapters

| Package | Target |
|---|---|
| [`@mcpfusion/vercel`](https://mcpfusion.vinkius.com/vercel-adapter) | Vercel Functions (Edge / Node.js) |
| [`@mcpfusion/cloudflare`](https://mcpfusion.vinkius.com/cloudflare-adapter) | Cloudflare Workers |

### Generators & Connectors

| Package | Purpose |
|---|---|
| [`@mcpfusion/openapi-gen`](https://mcpfusion.vinkius.com/openapi-gen) | OpenAPI 3.x / Swagger 2.0 → MCP tools |
| [`@mcpfusion/prisma-gen`](https://mcpfusion.vinkius.com/prisma-gen) | Prisma schema → CRUD tools with field-level security |
| [`@mcpfusion/n8n`](https://mcpfusion.vinkius.com/n8n-connector) | n8n workflows → MCP tools |
| [`@mcpfusion/aws`](https://mcpfusion.vinkius.com/aws-connector) | AWS Lambda & Step Functions → MCP tools |
| [`@mcpfusion/skills`](https://mcpfusion.vinkius.com/skills) | Progressive instruction distribution for agents |

### Security & Auth

| Package | Purpose |
|---|---|
| [`@mcpfusion/oauth`](https://mcpfusion.vinkius.com/oauth) | RFC 8628 Device Flow |
| [`@mcpfusion/jwt`](https://mcpfusion.vinkius.com/jwt) | JWT verification — HS256 / RS256 / ES256 + JWKS |
| [`@mcpfusion/api-key`](https://mcpfusion.vinkius.com/api-key) | API key validation with timing-safe comparison |

---

## Documentation

Full guides, API reference, and cookbook recipes:

**[mcpfusion.vinkius.com](https://mcpfusion.vinkius.com/)** · **[llms.txt](https://mcpfusion.vinkius.com/llms.txt)** *(AI-optimized spec)*

## Contributing

See [CONTRIBUTING.md](https://github.com/vinkius-labs/mcpfusion/blob/main/CONTRIBUTING.md) for development setup and guidelines.

## Security

See [SECURITY.md](https://github.com/vinkius-labs/mcpfusion/blob/main/SECURITY.md) for reporting vulnerabilities.

## License

[Apache 2.0](https://github.com/vinkius-labs/mcpfusion/blob/main/LICENSE)
