# ehook CLI Usage Examples

## Basic Usage

Start listening for webhooks and forward them to localhost:3000

```bash
EHOOK_UUID=f0cbf750-a3c0-46b9-8b76-49dce01da454 ehook listen 3000
```

Output:
```
ehook CLI

│  Requests → https://www.ehook.app/api/webhook/f0cbf750-a3c0-46b9-8b76-49dce01da454
└─ Forwarded → http://localhost:3000

View dashboard: https://www.ehook.app

Events

[200] POST http://localhost:3000 (20ms)
[200] GET http://localhost:3000 (15ms)
```

## With Custom Path

Forward webhooks to a specific endpoint path:

```bash
EHOOK_UUID=f0cbf750-a3c0-46b9-8b76-49dce01da454 ehook listen 3000 --path /api/webhooks
```

This will forward all webhook events to `http://localhost:3000/api/webhooks`

## Development Workflow

1. Start your local server (e.g., on port 3000)
2. Run the ehook CLI with your webhook UUID
3. Send webhook events to your ehook.app URL
4. See events forwarded to your local server in real-time

## Retry Behavior

If your local server is unavailable or returns an error, the CLI will automatically retry the request up to 3 times with exponential backoff:

- First retry: 100ms delay
- Second retry: 200ms delay  
- Third retry: 400ms delay

Example output with retries:
```
[500] POST http://localhost:3000 (250ms) (2 retries)
[ERROR] POST http://localhost:3000 - Connection refused after 3 retries
```

## Environment Variables

- `EHOOK_UUID` (required): Your webhook UUID from ehook.app

## Getting Your UUID

1. Visit https://www.ehook.app
2. Copy your webhook URL: `https://www.ehook.app/api/webhook/YOUR-UUID`
3. Extract the UUID from the URL
4. Set it as an environment variable: `export EHOOK_UUID=YOUR-UUID`

