## eHook - Webhook Inspector

A real-time webhook inspection tool that allows you to view and debug webhook payloads with a beautiful UI.

This project uses a Bun workspace monorepo structure:
- `packages/web/` - Next.js dashboard application
- `packages/cli/` - CLI tool (coming soon)

## Prerequisites

Before you begin, you'll need to set up an Upstash Redis database:

1. Go to [Upstash Console](https://console.upstash.com)
2. Create a new Redis database
3. Copy your Redis and QStash credentials

## Environment Variables

Create a `.env.local` file in the `packages/web/` directory with your Upstash credentials. Reference the `.env.example` file.

## Getting Started

Install dependencies from the root:

```bash
bun install
```

Run the development server:

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- **Unique Webhook URLs**: Each user gets a unique webhook URL that persists across sessions
- **Real-time Updates**: See webhook events appear instantly using Upstash Realtime
- **All HTTP Methods**: Accepts GET, POST, PUT, DELETE, PATCH, OPTIONS, and HEAD requests
- **Temporary Email Testing**: Inspect webhook payloads generated from temporary/disposable email addresses
- **Beautiful UI**: Built with shadcn/ui components and Tailwind CSS
- **Syntax Highlighting**: JSON payloads are displayed with syntax highlighting
- **History**: Last 50 webhook events are stored and can be reviewed
- **Multi-tab Support**: All tabs with the same UUID receive real-time updates

## Tech Stack

- Next.js 15 with App Router
- Bun workspace monorepo
- Upstash Redis, QStash, & Realtime
- shadcn/ui + Tailwind CSS
- TypeScript
