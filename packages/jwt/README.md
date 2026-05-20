<p align="center">
  <h1 align="center">@mcpfusion/jwt</h1>
  <p align="center">
    <strong>MCP JWT Authentication for MCP Fusion</strong> — A framework for creating secure MCP servers<br/>
    Standards-compliant JWT verification · JWKS auto-discovery · Auth0 · Clerk · Supabase · Firebase
  </p>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@mcpfusion/jwt"><img src="https://img.shields.io/npm/v/@mcpfusion/jwt?color=blue" alt="npm" /></a>
  <a href="https://github.com/vinkius-labs/mcpfusion/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-green" alt="License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node" />
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-compatible-purple" alt="MCP" /></a>
  <a href="https://mcpfusion.vinkius.com/"><img src="https://img.shields.io/badge/mcpfusion-framework-0ea5e9" alt="MCP Fusion" /></a>
</p>

---

> **MCP JWT Authentication for MCP Fusion** — the Model Context Protocol framework for building production MCP servers. Timing-safe JWT validation with `jose`, JWKS auto-discovery, and self-healing error responses. Works with any OIDC provider: Auth0, Clerk, Supabase, Firebase.

## Quick Start

```typescript
import { initMCPFusion } from '@mcpfusion/core';
import { jwtGuard } from '@mcpfusion/jwt';

const f = initMCPFusion<AppContext>();

const withJwt = jwtGuard({
    secret: process.env.JWT_SECRET!,
    algorithms: ['HS256'],
});

export default f.query('billing.invoices')
    .use(withJwt)
    .handle(async (input, ctx) => {
        // ctx.jwt contains the decoded payload
        return db.invoices.findMany({ where: { tenantId: ctx.jwt.sub } });
    });
```

## Features

| Feature | Description |
|---------|-------------|
| **Algorithms** | HS256, RS256, ES256 — all standard algorithms via `jose` |
| **JWKS** | Auto-discovery from `/.well-known/jwks.json` with key rotation |
| **Self-Healing** | Expired/invalid tokens return actionable hints to the LLM agent |
| **Timing-Safe** | Constant-time signature verification |
| **Zero Config** | Works with Auth0, Clerk, Supabase, Firebase, any OIDC provider |

## JWKS Auto-Discovery

```typescript
const withJwt = jwtGuard({
    jwksUri: 'https://auth.example.com/.well-known/jwks.json',
    issuer: 'https://auth.example.com/',
    audience: 'my-mcp-server',
});
```

## Installation

```bash
npm install @mcpfusion/jwt jose
```

### Peer Dependencies

| Package | Version |
|---------|---------|
| `@mcpfusion/core` | `^2.0.0` |
| `jose` | `^5.0.0` (optional) |

## Requirements

- **Node.js** ≥ 18.0.0
- **MCP Fusion** ≥ 2.0.0 (peer dependency)

## License

[Apache-2.0](https://github.com/vinkius-labs/mcpfusion/blob/main/LICENSE)
