# Wave C chunk 10

Fork-only audit chunk (kvnloo/openclaw). Nothing posted upstream.

- Item 1: message-visibility / read-state edge cases in retained sessions — NEGATIVE
  (guard-key alignment, re-presentation ordering, hidden-tab deferral, server CAS all verified;
  one noted observation: presented-gate is route-level, deliberate).
- Item 2: outbox recovery ordering under reconnect — NEGATIVE (recovery items never auto-flush;
  per-client drain lanes; epoch-captured reconciliation; positive-delivery-proof before resume).
- Item 3: #158013 watch (read-only) — still open, 2 clawsweeper[bot] comments, no human
  maintainer reply. No revision.
