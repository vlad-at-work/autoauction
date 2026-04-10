# Staging Stabilization TODO

- [x] Review current staging workflow vs production and keep changes minimal.
- [x] Restore Telegram deploy notification in `.github/workflows/deploy-staging.yml` using existing repo secrets.
- [ ] Perform read-only VPS diagnostics for disk/memory/load/services/log pressure.
- [ ] Summarize diagnosis and define safe next steps toward "small staging frontend change → manual merge → stable prod promotion".
