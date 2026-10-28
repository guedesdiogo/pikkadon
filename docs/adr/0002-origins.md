# ADR-0002: Pikkadon starts from Kelpie's store at `f033cf3` and the Hermes vault at `cc3f957`

- Status: Accepted
- Date: 2026-10-28
- Issue: [#1](https://github.com/guedesdiogo/pikkadon/issues/1)
- Accepted by Diogo with the plan of #1, on 2026-10-28

## Context

Pikkadon unifies two mechanisms that already work ([ADR-0001](0001-kit-inside-each-host.md)):

| Origin | Where | Language | License |
|---|---|---|---|
| **Kelpie's encrypted store** | [`guedesdiogo/kelpie`](https://github.com/guedesdiogo/kelpie/tree/f033cf3) at `f033cf3`: `apps/channel-egress/src/secrets/` (the Durable Object, `crypto.ts` and its schema) and `apps/admin-api/src/forms.ts` (the form) | TypeScript on workerd, with tests in Vitest and an 80% coverage floor | MIT, © 2026 Diogo Guedes |
| **The Hermes vault, `cofre`** | `guedesdiogo/hermes-agents` at `cc3f957`: `secrets/` (the daemon `cofre.py` and `e2e.sh`), its Hermes plugin, and the plan in `docs/plans/2026-10-23-secrets.md` | Python 3.12, standard library only; tested end to end against the VPS, with no unit tests | Private repository with no license; its author is the owner of this one |

The vault took its link rules from Kelpie (`hermes-agents` `docs/plans/2026-10-23-secrets.md:9`), so the form is the same in both. Kelpie has been off since 2026-10-23 (guedesdiogo/kelpie#514); the vault is on, and passed the Telegram test on 2026-10-24.

## Decision

### From Kelpie, at `f033cf3`

- **The encrypted store** (Story 1.3), starting from its `SecretStore` Durable Object:
  - AES-GCM under a 32-byte key, with a fresh IV on every write, the slot as additional data, and the key's version recorded;
  - claiming a link and storing its value in one transaction;
  - the store stays closed without the key.
- **Compatibility with what Kelpie already stores,** so its switch (guedesdiogo/kelpie#521) loses nothing:
  - the sealed format of `crypto.ts`: a test opens a slot that file sealed;
  - its drizzle migrations `0000` to `0002` and their journal table, reused rather than recreated;
  - the Durable Object's class name, which Kelpie keeps exporting as `SecretStore` or renames with a `renamed_classes` migration.
- **The link rules,** which the vault already shares: 32 random bytes in base64url with only the SHA-256 stored, 15 minutes, one use, five refused values close it, and a double click tolerated.
- **Cloudflare Access as the Workers owner gate,** as in front of Kelpie's form. The kit's gate checks the signature of `Cf-Access-Jwt-Assertion`, plus `aud`, `iss` and expiry (Story 1.3).
- **The tooling:** TypeScript, Biome, Vitest in workerd and the 80% coverage floor, through [Zikaron](https://github.com/guedesdiogo/zikaron), which took them from Kelpie.

### From the Hermes vault, at `cc3f957`

- **The value rules** (`secrets/cofre.py:224`): spaces trimmed at both ends; an empty value, one under 8 characters, a line break or `\0`, and one over 8 KiB refused. Its `${` and non-ASCII refusals become the rules of the Hermes `.env` destination, not of the core.
- **The checks per kind** (`secrets/cofre.py:197`), which combine with Kelpie's into `anthropic`, `openai`, `github`, `telegram`, `cloudflare` and `typesafe`; `generic` stores unchecked, and the page says so.
- **The requester policy:** free names under `^[A-Z][A-Z0-9_]{1,63}$` by default, and a limit on open links per requester.
- **The pages' hardening:** HTML without scripts, under `Content-Security-Policy: default-src 'none'`.
- **The Hermes owner gate:** the owner's Tailscale login plus a pinned device IP from the last hop of the `X-Forwarded-For` that `tailscale serve` appends.
- **The audit vocabulary** (`form_created`, `form_opened`, `value_refused`, `value_stored`, `value_applied`, and the rest), and the rule that an event never carries a value or a token.
- **Redaction:** the variants of a value (raw, base64, base64url, URL-encoded and JSON-escaped), and `wrap` and `scan`.
- **The plugin protocol,** unchanged: `request`, `cancel`, `names`, `list`, `subscribe` and `ack`, as JSON lines.
- **What runs on the VPS** (Story 1.6): the Python plugin, adjusted; the hardening of the `cofre` system user; the local name `cofre`; and a migration of `state.db` that carries the metadata over without reading or changing any value.

### What stays behind

- **In Kelpie:**
  - its three closed kinds and their fixed slots, which stay Kelpie's naming policy (Q5), applied through the requester policy;
  - what Kelpie does with a stored value, and its note to the owner (its ADR-0028);
  - the switch onto the kit, which happens in Kelpie's repository (guedesdiogo/kelpie#521).
- **In the vault:**
  - the Python daemon, rewritten in TypeScript on Node 22 (Q3, Q13);
  - identity by `SO_PEERCRED`, replaced by one socket per agent (Q15);
  - "standard library only": the daemon now depends on Node and on this kit.

  The vault stays installable from `cc3f957` until Story 1.6 passes on the VPS.
- **In neither, and not taken up in v1:** encrypting in the browser, device posture, and rotating the store's key.

### New in Pikkadon

- Audit events in the Workers store, which Kelpie's store doesn't record today.
- Unit tests for the vault's rules, which it only tested end to end.
- Shared JSON test cases for redaction, read by both the core's tests and the Python plugin's.

### License

Pikkadon is MIT, © 2026 Diogo Guedes.

- **Kelpie's code** is MIT under the same copyright. Files derived from it keep its notice.
- **The vault's code** sits in a private repository with no license, by the same author. Pikkadon re-implements the daemon in TypeScript and, in Story 1.6, brings the Python plugin into `hosts/hermes/`. Both are published here under this repository's MIT license, as part of the plan Diogo approved in #1.

## Consequences

- **Kelpie's compatibility is a hard constraint.** Getting the sealed format, the migrations or the class name wrong leaves Kelpie's store unreadable or empty, so all three are acceptance criteria of Story 1.3 and of guedesdiogo/kelpie#521.
- **The rules gain tests they never had on the vault side.** A rule the vault enforced but never tested is pinned by a test before the cutover.
- **Improvements diverge until each host switches.** A fix made here doesn't reach Kelpie or the running vault until they move onto the kit.

## Alternatives considered

- **Port the vault's Python as the core.** It would need a second implementation for Workers anyway, and Q3 set TypeScript as the core's language.
- **Depend on Kelpie's code.** The store lives inside Kelpie's `channel-egress` Worker, not in a published package, and Kelpie is off.
- **Write the store from scratch.** It would lose Kelpie's tests and break the compatibility with the slots Kelpie already sealed.

## References

- [Kelpie at `f033cf3`](https://github.com/guedesdiogo/kelpie/tree/f033cf3): `apps/channel-egress/src/secrets/`, `apps/admin-api/src/forms.ts`, `docs/secrets.md`.
- `guedesdiogo/hermes-agents` at `cc3f957` (private): `secrets/`, `docs/secrets.md`, `docs/plans/2026-10-23-secrets.md`.
- [#1](https://github.com/guedesdiogo/pikkadon/issues/1): the design and the owner's decisions.
