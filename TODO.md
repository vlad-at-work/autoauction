# MAX/TG Rollback-First Hardening TODO

- [x] Add feature-flagged strict webhook validation to MAX route (`WEBHOOK_STRICT_MODE=true` enables checks; default behavior unchanged)
- [x] Add feature-flagged strict webhook validation to Telegram route (`WEBHOOK_STRICT_MODE=true` enables checks; default behavior unchanged)
- [x] Add safe structured warning logs for rejected payloads (no secrets)
- [ ] Run critical-path curl tests with strict mode OFF (behavior parity)
- [ ] Run malformed payload curl tests with strict mode ON
- [ ] Provide rollback commands/procedure for immediate disable via env flag
