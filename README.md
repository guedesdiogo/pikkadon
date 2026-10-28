# Pikkadon

One-time links that expire, for secrets that must never pass through a model.

An agent asks for a value (an API key, a bot token). Pikkadon opens a form behind a link that works once and for 15 minutes; the owner types the value there, and it goes straight to where it belongs. The value never passes through the model, the chat, a tool's output, a log or history.

Pikkadon is **a TypeScript kit, not a service**. Each host embeds it and keeps its own authentication ([ADR-0001](docs/adr/0001-kit-inside-each-host.md)):

| Host | Runtime | Who the owner is | Where the value goes |
|---|---|---|---|
| The Hermes agents | Node 22 daemon on a VPS, with a Python plugin | the owner's tailnet login and devices | delivered into the agent's `.env` |
| Kelpie, Zikaron | Cloudflare Workers | Cloudflare Access | kept encrypted in a Durable Object |
| Claude Code, Codex | Node 22, through `prumo-secrets` | the person at the terminal | `wrangler`, `gh` or `.dev.vars`, on stdin |

## Status

Pre-release. The plan is [Epic 1](https://github.com/guedesdiogo/pikkadon/issues/1); this repository has only its foundation so far. v0.1.0 will ship as an attested tarball on GitHub Releases, not on a package registry.

## The name

*Pikkadon* (פִּקָּדוֹן) is Hebrew for "deposit": something handed to someone for safekeeping. Leviticus 6:2-4 (5:21-23 in the Hebrew text) holds the one who received a deposit answerable for it, bound to restore it to whoever it belongs to.

The kit does both: it keeps the deposit (Kelpie, Zikaron) or delivers it to its owner (Hermes, Claude Code, Codex).

## Where it came from

Two mechanisms already took secrets this way:

- **Kelpie's encrypted store** ([guedesdiogo/kelpie](https://github.com/guedesdiogo/kelpie) at `f033cf3`): a Worker with a Durable Object, behind Cloudflare Access, that keeps the value under AES-GCM.
- **The Hermes vault, `cofre`**: a Python daemon on the agents' VPS, served on the tailnet, that delivers the value into the agent's `.env`. It took its link rules from Kelpie.

The form was the same in both; the code was not. Pikkadon is one implementation of the link, the value rules and the checks, with the same tests for every host. [ADR-0002](docs/adr/0002-origins.md) says what came from each and what stayed behind.

## Development

```bash
bun install
bun run lint
bun run typecheck
bun run test   # workerd and Node 22, with an 80% coverage gate
```

How to work in this repository is in [CLAUDE.md](CLAUDE.md).

## License

[MIT](LICENSE).
