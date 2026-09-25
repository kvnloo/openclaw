# #139151 premise check — CONFIRMED LIVE, routed to secops (2026-09-25)

Claim checked: secret egress proxy mints CA certs without RFC 5280 key identifiers.

Verified on current main:
- `src/proxy-capture/ca.ts` `buildLocalProxyCaOpenSslConfig` emits only `basicConstraints = critical, CA:TRUE` and `keyUsage = critical, keyCertSign, cRLSign`. No `subjectKeyIdentifier`, no `authorityKeyIdentifier` anywhere in the CA or leaf generation path (leaf adds only `subjectAltName` + `extendedKeyUsage=serverAuth`).

Premise confirmed on current main. No drift.

Disposition: NO design question and NO fix from this lane. Labels carry `clawsweeper:needs-security-review`; ClawSweeper's 09-05 review explicitly routed the bounded certificate repair to secops owners and excluded it from unattended fix dispatch. Repairing TLS trust material is outside this lane's guardrails. Recorded here so the confirmation is not lost.
