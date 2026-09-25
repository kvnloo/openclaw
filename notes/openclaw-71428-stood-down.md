# Investigated, stood down — openclaw/openclaw#71428

**RFC:** `allowConversationAccess` as plugin manifest field
(`openclaw.plugin.json` → `permissions.conversationAccess`) instead of host
config (`plugins.entries.<id>.hooks.allowConversationAccess`).

**Drift check (2026-09-25):** confirmed unimplemented on main —
`resolveConversationAccessAllowed` (`src/plugins/hook-policy-decisions.ts`)
still reads only the host config (`PluginEntryConfig["hooks"]`); no
manifest field or loader/registry merge path exists. Codex review 2026-04-26
agrees.

**Why stood down:** clawsweeper review 2026-04-30 states the maintainer
position — "the proposed manifest field would let a third-party plugin
grant itself access to sensitive conversation content." The current
host-config gating is an intentional security boundary: conversation
access must remain an explicit host decision, not a self-granted plugin
permission. Implementing the RFC as written would weaken a security
boundary (factory hard guardrail). The RFC's real problem (Smarter-Claw
maintains two ~12 LOC schema patches) is a DX papercut, not a design gap —
and the fix for a papercut must not be self-grantable permissions.

**Possible future angle (not pursued):** a trusted-origin manifest
permission (e.g., manifest-declared + host allowlist) — but that's a new
proposal, not this RFC, and needs maintainer initiation.
