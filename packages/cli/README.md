# ehook CLI

Proxy webhook events from ehook.app to your localhost for easy testing and development.

## Installation

```bash
npm install -g ehook
```

## Usage

### Listen for webhooks

Forward webhook events to your local server:

```bash
ehook listen <port> [--path /path]
```

**Arguments:**
- `<port>` - The localhost port to forward requests to (required)
- `--path` - Optional path to append to localhost URL (e.g., `/webhooks`)

**Environment Variables:**
- `EHOOK_UUID` - Your webhook UUID from ehook.app

**Example:**

```bash
# Forward to http://localhost:3000
EHOOK_UUID=f0cbf750-a3c0-46b9-8b76-49dce01da454 ehook listen 3000

# Forward to http://localhost:3000/api/webhook
EHOOK_UUID=f0cbf750-a3c0-46b9-8b76-49dce01da454 ehook listen 3000 --path /api/webhook
```

## Features

- 🔄 Real-time webhook event streaming via SSE
- 🔁 Automatic retry with exponential backoff on failures
- 📊 Live event log with status codes and timing
- 🎯 Preserves original request headers, body, and query parameters

## Development

```bash
# Install dependencies
bun install

# Run in development mode
bun run dev listen 3000

# Build for production
bun run build
```

## License

MIT

