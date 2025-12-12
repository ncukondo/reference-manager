# Runtime & Distribution

## Node.js

- Minimum Node.js version: **22**

## Distribution

- Distributed as a global CLI:
  ```bash
  npm install -g reference-manager
  ```

## Server Startup Model

- `reference-manager` CLI automatically starts a local background server when needed
- Server lifecycle:
  - Auto-start on demand
  - PID and port tracked via portfile
  - Reused across CLI invocations
