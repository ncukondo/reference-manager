# File Monitoring & Reload

## Monitoring

- Library directory monitored with `chokidar`
- Reload triggered only by canonical CSL file change
- Ignored patterns:
  - `*.tmp`
  - `*.bak`
  - `*.conflict.*`
  - `*.lock`
  - editor swap files

## Reload Policy

- Watch-based reload
- Polling fallback only
- Debounce: 500 ms
- Poll interval: 5 s
- JSON parse retry:
  - 200 ms × 10
- During reload:
  - Old index continues serving requests
