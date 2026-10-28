# ADR-0001: Pikkadon is a kit each host embeds, not a service

- Status: Accepted
- Date: 2026-10-28
- Issue: [#1](https://github.com/guedesdiogo/pikkadon/issues/1)
- Decided by Diogo in the interview of 2026-10-24 (Q2); accepted with the plan of #1, on 2026-10-28

## Context

Three mechanisms take a secret through a path of their own, so that the value never passes through a model:

| Mechanism | How it works |
|---|---|
| The Hermes vault, `cofre` | A Python daemon on the agents' VPS. The link is served on the tailnet, and the value goes into the agent's `.env`. |
| Kelpie's encrypted store | A Worker with a Durable Object. The link sits behind Cloudflare Access, and the value is kept under AES-GCM. |
| `prumo-secrets` | A hidden prompt in a terminal, on Node 22, that writes to `wrangler`, `gh` or `.dev.vars`. |

The form is the same in the first two: 32 random bytes, only the SHA-256 kept, 15 minutes, one use, five refused values close it. The contract differs: Kelpie **keeps** the value, while the vault and `prumo-secrets` **deliver** it to where it is used. The owner gate, the way a requester is identified and the need for redaction are specific to each host.

On 2026-10-24 Diogo asked whether the vault and Kelpie's store could become one project, so both evolve together, and named five consumers: Hermes, Kelpie, Zikaron, Claude Code and Codex (Q1). The analysis put three shapes on the table:

- **A. A central core on Cloudflare,** with a thin messenger on the VPS that fetches values for the Hermes agents.
- **B. A portable TypeScript core,** embedded and deployed by each host.
- **C. No shared code yet,** only a shared document of the rules.

Asked where the core should live (Q2), Diogo answered:

> «talvez apenas ser um codigo que a gente consegue usar dentro do hermes, kelpie, claude code, zikaron e etc. Para que cada um não precise sair da sua autenticação que eles ja se garantem por si só.»

That is: maybe just code we can use inside Hermes, Kelpie, Claude Code, Zikaron and so on, so that none of them has to leave the authentication they already rely on.

## Decision

**Pikkadon is code each host embeds (shape B), not a service.**

- **One TypeScript package,** `@guedesdiogo/pikkadon`, with subpath exports. The core has no DOM, Node or Workers types and runs on workerd, Node 22 and Bun (Q3). The adapters for the named hosts ship in the same package, each optional: `/workers` for the Durable Object store and the Access gate, `/node` for the daemon, the CLI and their gates.
- **Each host keeps its own gate and its own identity.** The kit defines the interfaces (owner gate, requester, destination, notice, storage); the host supplies or picks the adapter.
  - Hermes keeps the tailnet gate and identifies the agent by the socket it connected through.
  - Kelpie and Zikaron keep Cloudflare Access, and "a binding is the authorization".
  - Claude Code and Codex keep the person at the terminal.
- **A value never leaves the host that uses it.** A Hermes secret never passes through Cloudflare.
- **Each host keeps its own naming policy** (Q5). The kit takes a requester policy: the allowed names, the allowed kinds and the limit on open links.
- **The Hermes plugin stays in Python** with the minimum: its tools, the `.env` write and redaction. Its daemon moves to TypeScript, on Node 22 LTS (Q13).

## Consequences

- **There is no service to run, secure or keep up.** Each host's availability is its own: Hermes doesn't depend on Cloudflare being up.
- **A fix reaches a host only when the host moves to the new version.** Hosts pin a version of the release tarball (Q11, Story 1.5), so a release is a supply-chain event for every host: releases ship only from CI, on a tag, with an attestation.
- **The same rules run everywhere, with the same tests.** The core is tested on workerd and on Node; the cases for redaction are shared with the Python plugin's tests as JSON, so the two can't drift apart.
- **Each host deploys and operates its own copy,** with its own owner page and its own audit destination.
- **Identity on the VPS changes shape.** The Python vault reads the caller's uid with `SO_PEERCRED`, which Node's `net` module doesn't offer. So the daemon identifies the agent by one systemd socket unit per agent, guarded by the file's mode, instead (Q15). Story 1.6 confirms that the daemon can listen on the descriptors systemd hands it.
- **On the agent's own machine the kit is no boundary against the agent.** On a workstation the agent runs as the same user and already holds the `wrangler` and `gh` logins. The kit guarantees that the value the owner types never passes through the model; it doesn't stop the agent from writing a value of its own.

## Alternatives considered

- **A. A central core on Cloudflare.** It reuses Kelpie's code and tests directly, but:
  - Cloudflare would see every Hermes value in clear on submission;
  - the Hermes owner gate would move from the tailnet to Access, which isn't equivalent without device posture;
  - the Hermes agents' secrets would depend on Cloudflare being up.
  
  Diogo's answer to Q2 rules it out: each host keeps its own authentication.
- **C. No shared code yet.** The cheapest, but the two implementations would keep diverging, and Q1 named five consumers, not one.

## References

- [#1](https://github.com/guedesdiogo/pikkadon/issues/1): the design, the owner's decisions Q1 to Q15 and the stories.
- [ADR-0002](0002-origins.md): what comes from Kelpie and the vault.
