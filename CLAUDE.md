# Pikkadon: instructions for coding agents

Pikkadon is a TypeScript kit, not a service: each host embeds it to take a secret through a one-time link that expires, and the value never passes through a model, the chat, a tool's output, a log or history. The hosts are the Hermes agents (a Python plugin and a Node daemon on a VPS), Kelpie and Zikaron (Cloudflare Workers), and Claude Code and Codex (through `prumo-secrets`). Each host keeps its own authentication. The v1 plan is [Epic 1](https://github.com/guedesdiogo/pikkadon/issues/1).

Project: `guedesdiogo/6`

## Language

Language: en (owner's decision of 2026-10-25: public repos under `guedesdiogo` are written in English unless Diogo asks otherwise).

- All prose in English: docs, ADRs, issues, PRs, commits and code comments. Identifiers in English.
- The prumo protocol markers stay as the tooling reads them: the «**Revisão**» comment with `Resultado:` and `Pendentes:`, «**Aceite** ·», and the ruleset names `prumo: main` and `prumo: sem force-push`.
- The pages' texts come in English and pt-BR (#1); pt-BR lives only in those texts and in test fixtures.

## Flow

The prumo standard applies, with these particulars:

- **Record:** the [Pikkadon Project](https://github.com/users/guedesdiogo/projects/6). Titles `[Epic N]`, `[Story N.M]`, `[Task N.M.K]`, `[Follow-up N.M]`; labels `type:*`, `epic:N`, `security`, `critico`, `merge:manual`.
- **Plan in the issue,** in the seven sections (Context, Goal, Out of scope, Plan, Acceptance criteria, Planned verification, Risks and rollback).
- **PR:** one `Closes #N` line per issue and the «Verification» section (residuals first, what ran with numbers, what did not run and why, risk, how to undo). The same Verification is commented on the issue.
- **Commits** conventional, citing `issue #N` without a keyword.
- **Review** with `/prumo:revisar`, with `protecao` on every PR: the whole kit is a critical scenario (secrets and cryptography). The «**Revisão**» goes on the issue and on the PR.
- **Merge** squash, under the prumo conditions, after the review is approved.
- **Decisions** in `docs/adr/`. Changing an accepted decision takes a new ADR.

## Done

This is a library with no staging (#1, "Done in this repository"):

- A story is Done when its PR is merged with CI green on `main`.
- A release ships only when Diogo asks for one, from a `vX.Y.Z` tag, built and attested by CI (Story 1.5).
- A release that carries a `critico` story waits for the mentor's «**Aceite**».

## Gates

They run in CI (`.github/workflows/ci.yml`, job `CI passed`, the check the `main` ruleset requires) and locally:

```bash
bun install --frozen-lockfile
bun run lint
bun run typecheck
bun run test
actionlint   # when a workflow changes
```

- `bun run test` runs every file under `test/` twice: in workerd (`@cloudflare/vitest-plugin`, without `nodejs_compat`) and in Node 22. A test that only makes sense on one runtime checks its project name.
- `bun run test` also measures coverage, and fails under 80% of statements, branches, functions or lines. To run one file without the gate: `bunx vitest run <file>`.
- The core (`src/`) is typechecked with no DOM, Node or Workers types, so it stays portable.

## Naming

- Identifiers and file names use *deposit* and *pikkadon*, never *secret*. The local secrets-guard treats any extensionless file whose name contains "secret" as a secret and blocks searches for such names.
- The one exception is a name kept for Kelpie's compatibility, such as its Durable Object class (Story 1.3).

## Limits

- **CI runs only on GitHub-hosted runners.** The repo is public: no self-hosted runner, no `pull_request_target`, no secrets in CI, minimal `permissions` and actions pinned by SHA.
- **Secrets never enter the repository or the chat,** nor the agent's context. A machine-generated one goes through a pipeline (`openssl rand -base64 32 | wrangler secret put NAME`); a third-party one through `prumo-secrets`.
- **Tests use only synthetic values.** The leak tests look for a synthetic value raw, in base64, URL-encoded and JSON-escaped.
- **No value or token in a log, an audit event, an error or an output,** in code or in tests.
- **No infrastructure identifier in the repo:** IPs, tailnet names, hostnames, accounts, zones, bot handles.
- **No tag and no release without Diogo's order.** The first one, v0.1.0, is Story 1.5.
- **The VPS cutover (Story 1.6) happens only on Diogo's order.**

## Where things are

- `docs/adr/`: decisions. [ADR-0001](docs/adr/0001-kit-inside-each-host.md): a kit inside each host, not a service. [ADR-0002](docs/adr/0002-origins.md): what came from Kelpie and the Hermes vault, and what stayed behind.
- `src/`: the core, from Story 1.2. The Workers adapters (Story 1.3) and the Node adapters (Story 1.4) become the subpath exports `@guedesdiogo/pikkadon/workers` and `@guedesdiogo/pikkadon/node`.
- `test/`: the tests, run on both runtimes.
- `hosts/hermes/`, from Story 1.6: what only the VPS uses (systemd units, `install.sh`, `e2e.sh`, the Python plugin).

## Reference projects

- [Kelpie](https://github.com/guedesdiogo/kelpie) at `f033cf3` (MIT): the encrypted store and the link rules.
- `guedesdiogo/hermes-agents` at `cc3f957` (private): the vault `cofre`, its value rules, checks, owner gate, audit and redaction.
- [Zikaron](https://github.com/guedesdiogo/zikaron): the repository layout and CI this one follows.
