---
title: Create an MCP Server in TypeScript in 4 Steps
head:
  - - meta
    - name: keywords
      content: create MCP server TypeScript, MCP server quickstart, MCP server tutorial, deploy MCP server, MCP Fusion quickstart, Claude Desktop MCP setup, Cursor MCP server
---

# Create and Deploy an MCP Server in TypeScript {#quickstart}

Go from an empty directory to a deployed MCP server in four commands. MCP Fusion scaffolds a production-ready TypeScript project with file-based tool routing, typed Presenters, PII redaction, middleware, tests, and pre-configured connections for Claude Desktop, Cursor, and Windsurf. No boilerplate, no manual wiring.

---

<!-- Editorial break: Hero -->
<div style="margin:48px 0;padding:56px 40px;background:#09090f;border:1px solid rgba(255,255,255,0.05);border-radius:12px;position:relative;overflow:hidden">
<div style="position:absolute;top:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(52,211,153,0.3),transparent)"></div>
<span style="font-size:9px;color:rgba(52,211,153,0.6);letter-spacing:3px;font-weight:700">ZERO TO PRODUCTION</span>
<div style="font-size:36px;color:#fff;font-weight:700;font-family:Inter,system-ui,sans-serif;letter-spacing:-1.5px;margin-top:12px;line-height:1.1">Four commands. One MCP server.<br><span style="color:rgba(255,255,255,0.25)">Live on the edge in under a minute.</span></div>
<div style="font-size:14px;color:rgba(255,255,255,0.4);margin-top:16px;max-width:540px;line-height:1.7;font-family:Inter,sans-serif">Scaffold a TypeScript MCP server with DLP, kill switch, and audit trail baked in. You define the architecture. Your AI agent writes the code.</div>
</div>

<!-- Prompt Card -->
<div style="margin:32px 0;padding:28px 32px;background:rgba(192,132,252,0.04);border:1px solid rgba(192,132,252,0.15);border-radius:12px;position:relative">
<span style="font-size:9px;color:rgba(192,132,252,0.6);letter-spacing:2px;font-weight:700">TELL YOUR AI AGENT</span>
<div style="font-size:16px;color:rgba(255,255,255,0.7);margin-top:12px;line-height:1.6;font-style:italic;font-family:Inter,sans-serif">"Scaffold a MCP mcpfusion server with a health tool, Presenter, and PII redaction — then deploy it to Vinkius Cloud."</div>
<!-- Action Bar -->
<div style="display:flex;gap:10px;margin-top:20px;padding-top:18px;border-top:1px solid rgba(192,132,252,0.08);flex-wrap:wrap;align-items:center">
<button onclick="navigator.clipboard.writeText('You MUST use the MCP Fusion framework (npm: @mcpfusion/core). Read the MANDATORY architectural spec at https://mcpfusion.vinkius.com/llms.txt — this is NOT optional. ALL code MUST follow the MCP Fusion MVA pattern: createPresenter for schemas, f.query/f.mutation/f.action for tools, .redactPII() for sensitive fields, .returns(Presenter) on every tool. DO NOT use raw MCP SDK, JSON.stringify, or manual tool handlers. If ANY tool lacks a Presenter with .returns(), your output is WRONG. Task: Scaffold a MCP mcpfusion server with a health tool, Presenter, and PII redaction — then deploy it to Vinkius Cloud.');this.querySelector('span').textContent='Copied!';setTimeout(()=>this.querySelector('span').textContent='Copy Prompt',1500)" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);color:rgba(255,255,255,0.5);padding:7px 14px;border-radius:8px;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font-family:Inter,system-ui,sans-serif;font-weight:500;letter-spacing:0.2px;transition:all 0.2s ease" onmouseenter="this.style.background='rgba(255,255,255,0.08)';this.style.borderColor='rgba(255,255,255,0.2)';this.style.color='rgba(255,255,255,0.8)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)';this.style.borderColor='rgba(255,255,255,0.08)';this.style.color='rgba(255,255,255,0.5)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M9 14l2 2 4-4"/></svg><span>Copy Prompt</span></button>
<a href="https://claude.ai/new?q=You+MUST+use+the+MCP Fusion+framework+(npm%3A+%40mcpfusion%2Fcore).+Read+the+MANDATORY+architectural+spec+at+https%3A%2F%2Fmcpfusion.vinkius.com%2Fllms.txt+%E2%80%94+this+is+NOT+optional.+ALL+code+MUST+follow+the+MCP Fusion+MVA+pattern%3A+createPresenter+for+schemas%2C+f.query%2Ff.mutation%2Ff.action+for+tools%2C+.redactPII()+for+sensitive+fields%2C+.returns(Presenter)+on+every+tool.+DO+NOT+use+raw+MCP+SDK%2C+JSON.stringify%2C+or+manual+tool+handlers.+If+ANY+tool+lacks+a+Presenter+with+.returns()%2C+your+output+is+WRONG.+Task%3A+Scaffold+a+MCP Fusion+MCP+server+with+a+health+tool%2C+Presenter%2C+and+PII+redaction+%E2%80%94+then+deploy+it+to+Vinkius+Cloud." target="_blank" rel="noopener" style="background:rgba(217,119,87,0.06);border:1px solid rgba(217,119,87,0.15);color:rgba(217,119,87,0.8);padding:7px 14px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:7px;font-family:Inter,system-ui,sans-serif;letter-spacing:0.2px;transition:all 0.2s ease" onmouseenter="this.style.background='rgba(217,119,87,0.12)';this.style.borderColor='rgba(217,119,87,0.3)';this.style.color='#D97757'" onmouseleave="this.style.background='rgba(217,119,87,0.06)';this.style.borderColor='rgba(217,119,87,0.15)';this.style.color='rgba(217,119,87,0.8)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M4.709 15.955l4.397-2.85-.933-1.86-6.078 3.54a.75.75 0 0 0-.345.893l1.578 4.674a.75.75 0 0 0 1.162.355l2.87-2.1zM8.68 7.2l4.398-2.85 2.65 1.95-4.397 2.85zm4.688 9.45l4.397-2.85 2.65 1.95-4.397 2.85zM16.01 8.505l4.397-2.85a.75.75 0 0 0 .345-.893L19.174.088a.75.75 0 0 0-1.162-.355l-2.87 2.1.933 1.86 2.652-1.94 1.035 3.065-3.685 2.389z"/></svg> Open in Claude</a>
<a href="https://chatgpt.com/?q=You+MUST+use+the+MCP Fusion+framework+(npm%3A+%40mcpfusion%2Fcore).+Read+the+MANDATORY+architectural+spec+at+https%3A%2F%2Fmcpfusion.vinkius.com%2Fllms.txt+%E2%80%94+this+is+NOT+optional.+ALL+code+MUST+follow+the+MCP Fusion+MVA+pattern%3A+createPresenter+for+schemas%2C+f.query%2Ff.mutation%2Ff.action+for+tools%2C+.redactPII()+for+sensitive+fields%2C+.returns(Presenter)+on+every+tool.+DO+NOT+use+raw+MCP+SDK%2C+JSON.stringify%2C+or+manual+tool+handlers.+If+ANY+tool+lacks+a+Presenter+with+.returns()%2C+your+output+is+WRONG.+Task%3A+Scaffold+a+MCP Fusion+MCP+server+with+a+health+tool%2C+Presenter%2C+and+PII+redaction+%E2%80%94+then+deploy+it+to+Vinkius+Cloud." target="_blank" rel="noopener" style="background:rgba(16,163,127,0.06);border:1px solid rgba(16,163,127,0.15);color:rgba(16,163,127,0.8);padding:7px 14px;border-radius:8px;font-size:12px;text-decoration:none;font-weight:500;display:inline-flex;align-items:center;gap:7px;font-family:Inter,system-ui,sans-serif;letter-spacing:0.2px;transition:all 0.2s ease" onmouseenter="this.style.background='rgba(16,163,127,0.12)';this.style.borderColor='rgba(16,163,127,0.3)';this.style.color='#10A37F'" onmouseleave="this.style.background='rgba(16,163,127,0.06)';this.style.borderColor='rgba(16,163,127,0.15)';this.style.color='rgba(16,163,127,0.8)'"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zM8.392 12.84l-2.02-1.164a.076.076 0 0 1-.038-.057V6.035a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.794 5.42a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg> Open in ChatGPT</a>
</div>
</div>

---

<!-- Editorial break: SKILL.md -->
<div style="margin:48px 0;padding:56px 40px;background:#09090f;border:1px solid rgba(255,255,255,0.05);border-radius:12px;position:relative;overflow:hidden">
<div style="position:absolute;top:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(192,132,252,0.3),transparent)"></div>
<span style="font-size:9px;color:rgba(192,132,252,0.6);letter-spacing:3px;font-weight:700">AI-FIRST DEVELOPMENT</span>
<div style="font-size:36px;color:#fff;font-weight:700;font-family:Inter,system-ui,sans-serif;letter-spacing:-1.5px;margin-top:12px;line-height:1.1">You are the architect.<br><span style="color:rgba(255,255,255,0.25)">The AI writes the code.</span></div>
<div style="font-size:14px;color:rgba(255,255,255,0.4);margin-top:16px;max-width:540px;line-height:1.7;font-family:Inter,sans-serif">MCP Fusion ships a <strong style="color:rgba(192,132,252,0.8)">SKILL.md</strong>, a machine-readable architectural spec that any AI coding agent can parse. Point Cursor, Claude Code, Copilot, or Windsurf at it and just describe what you need.</div>
</div>

<!-- Feature Grid: SKILL.md power -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:32px 0">

<div style="border:1px solid rgba(192,132,252,0.15);border-radius:10px;background:#09090f;padding:20px 24px">
<div style="font-size:13px;color:rgba(192,132,252,0.8);font-weight:600;font-family:Inter,sans-serif;margin-bottom:6px">What you say</div>
<div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.7;font-family:Inter,sans-serif;font-style:italic">"Create an MCP server for invoice management with Presenters, PII redaction on customer_ssn, and middleware auth."</div>
</div>

<div style="border:1px solid rgba(52,211,153,0.15);border-radius:10px;background:#09090f;padding:20px 24px">
<div style="font-size:13px;color:rgba(52,211,153,0.8);font-weight:600;font-family:Inter,sans-serif;margin-bottom:6px">What the AI produces</div>
<div style="font-size:12px;color:rgba(255,255,255,0.5);line-height:1.7;font-family:Inter,sans-serif">Production-quality MCP Fusion on the first try. Correct file-based routing, typed Presenters, <code style="font-size:10px">.redactPII()</code> chains, and middleware composition.</div>
</div>

</div>

SKILL.md teaches your AI agent the full framework architecture: the MVA pattern, Presenter contracts, middleware composition, and file-based routing conventions. You define what the MCP server does. The AI writes the TypeScript code. Works with Cursor, Claude Code, GitHub Copilot, Windsurf, and Cline.

> [!TIP]
> Learn more at [agentskills.io](https://agentskills.io). Agent Skills let you distribute domain expertise to any AI coding agent.

---

## Prerequisites {#prerequisites}

Node.js **18+** required.

```bash
npm install @mcpfusion/core @modelcontextprotocol/sdk
```

<!-- CTA Bar -->
<div style="display:flex;gap:12px;margin:20px 0;flex-wrap:wrap;align-items:center">
<a href="https://github.com/vinkius-labs/mcpfusion" target="_blank" rel="noopener" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);padding:10px 16px;border-radius:10px;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:all 0.2s ease" onmouseenter="this.style.background='rgba(255,255,255,0.08)'" onmouseleave="this.style.background='rgba(255,255,255,0.04)'"><img src="https://img.shields.io/github/stars/vinkius-labs/mcpfusion?style=social" alt="GitHub Stars" style="height:20px"></a>
</div>

::: tip Already using a project?
If you're adding MCP Fusion to an existing Node.js project — skip to [Building Tools](/building-tools).
:::

## Create Your MCP Server in 4 Steps {#scaffold}

Four commands. Under 60 seconds. Your MCP server running on the global edge.

<!-- Numbered steps -->
<div style="margin:32px 0">

<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:24px;padding:20px 24px;border-left:2px solid rgba(52,211,153,0.3);background:rgba(52,211,153,0.02);border-radius:0 8px 8px 0">
<span style="font-size:22px;color:rgba(52,211,153,0.5);font-weight:700;font-family:Inter,sans-serif;min-width:32px">01</span>
<div style="flex:1">
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif">Scaffold</div>
<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.3)">
<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px">
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="font-size:9px;color:rgba(255,255,255,0.25);margin-left:6px;letter-spacing:1px">terminal</span>
</div>
<div style="padding:12px">

```bash
mcpfusion create my-server
```

</div>
</div>
</div>
</div>

<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:24px;padding:20px 24px;border-left:2px solid rgba(129,140,248,0.3);background:rgba(129,140,248,0.02);border-radius:0 8px 8px 0">
<span style="font-size:22px;color:rgba(129,140,248,0.5);font-weight:700;font-family:Inter,sans-serif;min-width:32px">02</span>
<div style="flex:1">
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif">Develop locally</div>
<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.3)">
<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px">
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="font-size:9px;color:rgba(255,255,255,0.25);margin-left:6px;letter-spacing:1px">terminal</span>
</div>
<div style="padding:12px">

```bash
cd my-server
mcpfusion dev
```

</div>
</div>
<div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:8px;line-height:1.6;font-family:Inter,sans-serif">HMR — edit any tool, middleware, or Presenter and the server reloads instantly.</div>
</div>
</div>

<div style="display:flex;align-items:flex-start;gap:20px;margin-bottom:24px;padding:20px 24px;border-left:2px solid rgba(34,211,238,0.3);background:rgba(34,211,238,0.02);border-radius:0 8px 8px 0">
<span style="font-size:22px;color:rgba(34,211,238,0.5);font-weight:700;font-family:Inter,sans-serif;min-width:32px">03</span>
<div style="flex:1">
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif">Test</div>
<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.3)">
<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px">
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="font-size:9px;color:rgba(255,255,255,0.25);margin-left:6px;letter-spacing:1px">terminal</span>
</div>
<div style="padding:12px">

```bash
npm test
```

</div>
</div>
<div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:8px;line-height:1.6;font-family:Inter,sans-serif">Runs entirely in memory. No transport layer, no network calls. Every test passes straight out of the scaffold.</div>
</div>
</div>

<div style="display:flex;align-items:flex-start;gap:20px;padding:20px 24px;border-left:2px solid rgba(245,158,11,0.3);background:rgba(245,158,11,0.02);border-radius:0 8px 8px 0">
<span style="font-size:22px;color:rgba(245,158,11,0.5);font-weight:700;font-family:Inter,sans-serif;min-width:32px">04</span>
<div style="flex:1">
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif">Deploy to Vinkius Cloud</div>
<div style="margin-top:12px;border:1px solid rgba(255,255,255,0.08);border-radius:6px;overflow:hidden;background:rgba(0,0,0,0.3)">
<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px">
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.12)"></span>
<span style="font-size:9px;color:rgba(255,255,255,0.25);margin-left:6px;letter-spacing:1px">terminal</span>
</div>
<div style="padding:12px">

```bash
mcpfusion deploy
```

</div>
</div>
<div style="font-size:12px;color:rgba(255,255,255,0.35);margin-top:8px;line-height:1.6;font-family:Inter,sans-serif">Deployed to the global edge. DLP redaction, V8 sandbox, rate limiting, kill switch, and audit trail are all enabled by default. Share the connection token with any MCP client.</div>
</div>
</div>

</div>

That's it. **Four commands. Your server is live.** Skip the interactive prompts with `--yes` for defaults:

```bash
mcpfusion create my-api --vector prisma --transport sse --yes
```

> **Pro tip:** `--vector prisma` is the fastest way to bridge **Prisma to MCP**. The Presenter schema strips internal columns before they reach the LLM.

### What `mcpfusion deploy` Activates {#what-just-happened}

When you deployed, Vinkius Cloud enabled **8 security layers** automatically:

<!-- Security grid -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin:24px 0">

<div style="border:1px solid rgba(52,211,153,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">🛡️</div>
<div style="font-size:10px;color:rgba(52,211,153,0.7);font-weight:600;font-family:Inter,sans-serif">DLP Engine</div>
</div>

<div style="border:1px solid rgba(129,140,248,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">🔒</div>
<div style="font-size:10px;color:rgba(129,140,248,0.7);font-weight:600;font-family:Inter,sans-serif">V8 Sandbox</div>
</div>

<div style="border:1px solid rgba(245,158,11,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">⚡</div>
<div style="font-size:10px;color:rgba(245,158,11,0.7);font-weight:600;font-family:Inter,sans-serif">Rate Limiter</div>
</div>

<div style="border:1px solid rgba(239,68,68,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">🚨</div>
<div style="font-size:10px;color:rgba(239,68,68,0.7);font-weight:600;font-family:Inter,sans-serif">Kill Switch</div>
</div>

<div style="border:1px solid rgba(34,211,238,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">📋</div>
<div style="font-size:10px;color:rgba(34,211,238,0.7);font-weight:600;font-family:Inter,sans-serif">Audit Trail</div>
</div>

<div style="border:1px solid rgba(192,132,252,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">🧱</div>
<div style="font-size:10px;color:rgba(192,132,252,0.7);font-weight:600;font-family:Inter,sans-serif">Egress Firewall</div>
</div>

<div style="border:1px solid rgba(52,211,153,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">🔄</div>
<div style="font-size:10px;color:rgba(52,211,153,0.7);font-weight:600;font-family:Inter,sans-serif">Circuit Breaker</div>
</div>

<div style="border:1px solid rgba(245,158,11,0.15);border-radius:8px;background:#09090f;padding:14px 16px;text-align:center">
<div style="font-size:14px;margin-bottom:4px">🔐</div>
<div style="font-size:10px;color:rgba(245,158,11,0.7);font-weight:600;font-family:Inter,sans-serif">Token Auth</div>
</div>

</div>

> [!TIP]
> fusion blocks PII locally by default. Need compliance proof for SOC2, GDPR, or HIPAA? [Connect to Vinkius Cloud for tamper-proof audit logs →](https://docs.vinkius.com/getting-started)

### Zero-Config AI Integration {#skill-injection}

When you run `mcpfusion create`, the CLI auto-injects SKILL.md into your IDE's rule files: `.cursorrules`, `.windsurfrules`, `.clinerules`. The moment you open the project, your AI coding agent already understands the MCP Fusion architecture. No manual setup required.

---

## Scaffolded Project Structure {#structure}

<!-- Code screen: Project structure -->
<div style="margin:24px 0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;background:#09090f">
<div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px">
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:8px;letter-spacing:1px">project structure</span>
</div>
<div style="padding:20px">

```text
my-server/
├── src/
│   ├── MCP Fusion            # initMCPFusion<AppContext>()
│   ├── context.ts           # AppContext type + factory
│   ├── server.ts            # Bootstrap with autoDiscover
│   ├── tools/
│   │   └── system/
│   │       ├── health.ts    # Health check with Presenter
│   │       └── echo.ts      # Connectivity test
│   ├── presenters/
│   │   └── SystemPresenter.ts
│   ├── prompts/
│   │   └── greet.ts
│   └── middleware/
│       └── auth.ts
├── tests/
│   ├── setup.ts
│   └── system.test.ts
├── .cursor/mcp.json         # Pre-configured for Cursor
├── .cursorrules             # SKILL.md → Cursor rules (auto-generated)
├── .windsurfrules           # SKILL.md → Windsurf rules (auto-generated)
├── SKILL.md                 # AI architectural contract
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

</div>
</div>

Every file contains real, working code. The server boots, the tests pass, and Cursor connects out of the box. SKILL.md is automatically injected into your IDE rules so your AI agent knows the conventions from the start.

---

## Connect Your MCP Server to Claude, Cursor, or Windsurf {#run}

Once your TypeScript MCP server is running, connect it to your AI client. MCP Fusion generates the Cursor config automatically. For other clients, add the JSON snippet below to the relevant config file.

<!-- Feature Grid: Client configs -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:32px 0">

<div style="border:1px solid rgba(52,211,153,0.15);border-radius:10px;background:#09090f;padding:20px 24px">
<div style="font-size:13px;color:rgba(52,211,153,0.8);font-weight:600;font-family:Inter,sans-serif;margin-bottom:6px">Cursor</div>
<div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.7;font-family:Inter,sans-serif">Pre-wired. The CLI generates <code style="font-size:10px">.cursor/mcp.json</code> for you. Open the folder in Cursor and it connects automatically.</div>
</div>

<div style="border:1px solid rgba(129,140,248,0.15);border-radius:10px;background:#09090f;padding:20px 24px">
<div style="font-size:13px;color:rgba(129,140,248,0.8);font-weight:600;font-family:Inter,sans-serif;margin-bottom:6px">Claude Desktop</div>
<div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.7;font-family:Inter,sans-serif">Add to <code style="font-size:10px">claude_desktop_config.json</code></div>
</div>

<div style="border:1px solid rgba(34,211,238,0.15);border-radius:10px;background:#09090f;padding:20px 24px">
<div style="font-size:13px;color:rgba(34,211,238,0.8);font-weight:600;font-family:Inter,sans-serif;margin-bottom:6px">Claude Code</div>
<div style="font-size:12px;color:rgba(255,255,255,0.35);line-height:1.7;font-family:Inter,sans-serif"><code style="font-size:10px">claude mcp add my-server npx tsx src/server.ts</code></div>
</div>

</div>

::: code-group
```json [Claude Desktop]
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["tsx", "src/server.ts"]
    }
  }
}
```
```json [VS Code + Copilot]
{
  "servers": {
    "my-server": {
      "command": "npx",
      "args": ["tsx", "src/server.ts"]
    }
  }
}
```
```json [Windsurf / Cline]
{
  "mcpServers": {
    "my-server": {
      "command": "npx",
      "args": ["tsx", "src/server.ts"]
    }
  }
}
```
:::

For remote deployments that support multiple simultaneous clients, use SSE transport: `mcpfusion create my-api --transport sse`

---

<!-- Editorial break: autoDiscover -->
<div style="margin:48px 0;padding:56px 40px;background:#09090f;border:1px solid rgba(255,255,255,0.05);border-radius:12px;position:relative;overflow:hidden">
<div style="position:absolute;top:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(129,140,248,0.3),transparent)"></div>
<span style="font-size:9px;color:rgba(129,140,248,0.6);letter-spacing:3px;font-weight:700">FILE-BASED ROUTING</span>
<div style="font-size:36px;color:#fff;font-weight:700;font-family:Inter,system-ui,sans-serif;letter-spacing:-1.5px;margin-top:12px;line-height:1.1">Drop a file. It's a tool.<br><span style="color:rgba(255,255,255,0.25)">No imports, no registration.</span></div>
</div>

## File-Based Tool Routing with autoDiscover {#autodiscover}

MCP Fusion uses file-based routing for MCP tools, similar to how Next.js routes pages. Drop a TypeScript file in `src/tools/` and it becomes an MCP tool automatically. No imports, no manual registration.

<!-- Code screen -->
<div style="margin:24px 0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;background:#09090f">
<div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px">
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:8px;letter-spacing:1px">src/server.ts — scaffolded</span>
</div>
<div style="padding:20px">

```typescript
import { ToolRegistry, autoDiscover } from '@mcpfusion/core';

const registry = f.registry();
const discovered = await autoDiscover(
  registry,
  new URL('./tools', import.meta.url).pathname
);
console.error(`📦 Discovered ${discovered.length} tool file(s)`);
```

</div>
</div>

Your directory structure maps directly to tool namespaces:

<!-- Code screen -->
<div style="margin:24px 0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;background:#09090f">
<div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px">
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:8px;letter-spacing:1px">naming convention</span>
</div>
<div style="padding:20px">

```text
src/tools/
├── billing/
│   ├── get_invoice.ts    → billing.get_invoice
│   └── pay.ts            → billing.pay
├── users/
│   ├── list.ts           → users.list
│   └── ban.ts            → users.ban
└── system/
    └── health.ts         → system.health
```

</div>
</div>

### Export Resolution

| Priority | What it looks for | Example |
|:-:|---|---|
| 1 | `export default` | `export default f.query('weather.get').handle(...)` |
| 2 | Named `tool` export | `export const tool = f.query(...)` |
| 3 | Any exported builder | Scans all exports for `getName()` |

<!-- Code screen -->
<div style="margin:24px 0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;background:#09090f">
<div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px">
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:8px;letter-spacing:1px">src/tools/weather/get.ts</span>
</div>
<div style="padding:20px">

```typescript
import { f } from '../../MCP Fusion.js';

export default f.query('weather.get')
  .describe('Get current weather for a city')
  .withString('city', 'City name')
  .handle(async (input) => {
    return { city: input.city, temp_c: 18, condition: 'Clear' };
  });
```

</div>
</div>

You can also export multiple tools from a single file. autoDiscover picks up all exported builders (Priority 3).

### Advanced Options

| Option | Default | Description |
|---|---|---|
| `pattern` | `/(ts\|js\|mjs)$/` | Regex filter for file names |
| `recursive` | `true` | Scan subdirectories |
| `loader` | `'esm'` | Module system (`'esm'` or `'cjs'`) |
| `resolve` | Priority cascade | Custom export resolver |

---

## Scaffold Templates (Vectors) {#vectors}

Vectors are pre-configured scaffold templates that set up common MCP server patterns. Each one adds the right dependencies, environment variables, and starter code for a specific use case.

| Vector | What it adds |
|---|---|
| `vanilla` | `autoDiscover()` file routing. Zero deps |
| `prisma` | Prisma schema + DB tool stubs + `@mcpfusion/prisma-gen` |
| `n8n` | `N8nConnector` — n8n workflows as MCP tools |
| `openapi` | OpenAPI spec → Models/Views/Agents |
| `oauth` | RFC 8628 Device Flow + `requireAuth()` |

<!-- Code screen -->
<div style="margin:24px 0;border:1px solid rgba(255,255,255,0.1);border-radius:8px;overflow:hidden;background:#09090f">
<div style="padding:10px 16px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:8px">
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="width:6px;height:6px;border-radius:50%;background:rgba(255,255,255,0.15)"></span>
<span style="font-size:10px;color:rgba(255,255,255,0.3);margin-left:8px;letter-spacing:1px">different scaffolds</span>
</div>
<div style="padding:12px">

```bash
# Database-driven MCP server
mcpfusion create inventory-api --vector prisma --transport sse

# n8n workflow bridge
mcpfusion create ops-bridge --vector n8n

# Authenticated API
mcpfusion create secure-api --vector oauth
```

</div>
</div>

Each vector adds its dependencies to `package.json` and required environment variables to `.env.example`. You can combine flags: `mcpfusion create my-api --vector prisma --vector oauth` for a database-backed server with auth.

---

<!-- Editorial break: Self-hosted -->
<div style="margin:48px 0;padding:56px 40px;background:#09090f;border:1px solid rgba(255,255,255,0.05);border-radius:12px;position:relative;overflow:hidden">
<div style="position:absolute;top:0;left:0;width:100%;height:1px;background:linear-gradient(90deg,transparent,rgba(34,211,238,0.3),transparent)"></div>
<span style="font-size:9px;color:rgba(34,211,238,0.6);letter-spacing:3px;font-weight:700">SELF-HOSTED</span>
<div style="font-size:36px;color:#fff;font-weight:700;font-family:Inter,system-ui,sans-serif;letter-spacing:-1.5px;margin-top:12px;line-height:1.1">Deploy anywhere.<br><span style="color:rgba(255,255,255,0.25)">Same code, any runtime.</span></div>
</div>

## Deploy Your MCP Server {#self-hosted}

MCP mcpfusion servers run anywhere Node.js runs. Deploy to Vinkius Cloud for zero-config managed hosting, or self-host on Vercel, Cloudflare Workers, AWS Lambda, or Docker.

<!-- Deploy cards -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:32px 0">

<a href="https://docs.vinkius.com/getting-started" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(192,132,252,0.5);letter-spacing:2px;font-weight:600">MANAGED</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Vinkius Cloud</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif"><code style="font-size:10px">mcpfusion deploy</code> — global edge, DLP, kill switch.</div>
<span style="font-size:10px;color:rgba(192,132,252,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Learn more →</span>
</a>

<a href="/vercel-adapter" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(129,140,248,0.5);letter-spacing:2px;font-weight:600">VERCEL</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Vercel Edge</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">Next.js App Router — one line of code.</div>
<span style="font-size:10px;color:rgba(129,140,248,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read guide →</span>
</a>

<a href="/cloudflare-adapter" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(34,211,238,0.5);letter-spacing:2px;font-weight:600">CLOUDFLARE</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Cloudflare Workers</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">Edge-native with D1, KV, and R2.</div>
<span style="font-size:10px;color:rgba(34,211,238,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read guide →</span>
</a>

</div>

> [!TIP]
> Install the [Vinkius extension](https://marketplace.visualstudio.com/items?itemName=vinkius.cloud-extension) to monitor servers from VS Code, Cursor, or Windsurf — live connections, logs, and tool toggling.

---

## Next Steps {#next}

<!-- Navigation cards -->
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:32px 0">

<a href="/building-tools" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(34,211,238,0.5);letter-spacing:2px;font-weight:600">BUILD</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Building Tools</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">Semantic verbs, parameters, annotations.</div>
<span style="font-size:10px;color:rgba(34,211,238,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read more →</span>
</a>

<a href="/presenter" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(129,140,248,0.5);letter-spacing:2px;font-weight:600">VIEW</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Presenter</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">Shape what the LLM sees.</div>
<span style="font-size:10px;color:rgba(129,140,248,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read more →</span>
</a>

<a href="/middleware" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(245,158,11,0.5);letter-spacing:2px;font-weight:600">GUARD</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Middleware</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">Auth, rate limiting, logging.</div>
<span style="font-size:10px;color:rgba(245,158,11,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read more →</span>
</a>

</div>

<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:0 0 32px">

<a href="/testing" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(52,211,153,0.5);letter-spacing:2px;font-weight:600">TESTING</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Test Harness</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">In-memory tool assertions.</div>
<span style="font-size:10px;color:rgba(52,211,153,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read more →</span>
</a>

<a href="/governance/" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(239,68,68,0.5);letter-spacing:2px;font-weight:600">GOVERNANCE</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Capability Lockfile</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">Lock your capability surface.</div>
<span style="font-size:10px;color:rgba(239,68,68,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read more →</span>
</a>

<a href="/quickstart" style="text-decoration:none;display:block;padding:24px;border:1px solid rgba(255,255,255,0.06);border-radius:8px;background:rgba(255,255,255,0.02)">
<span style="font-size:8px;color:rgba(192,132,252,0.5);letter-spacing:2px;font-weight:600">MANUAL</span>
<div style="font-size:14px;color:#fff;font-weight:600;font-family:Inter,sans-serif;margin-top:8px">Traditional Setup</div>
<div style="font-size:11px;color:rgba(255,255,255,0.3);margin-top:6px;line-height:1.5;font-family:Inter,sans-serif">Step-by-step without scaffolding.</div>
<span style="font-size:10px;color:rgba(192,132,252,0.6);margin-top:12px;display:block;font-family:Inter,sans-serif">Read more →</span>
</a>

</div>
