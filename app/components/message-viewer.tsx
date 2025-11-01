"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { type WebhookEvent } from "@/app/actions/webhook"
import { deleteWebhookEvent } from "@/app/actions/webhook"
import { Trash2, Download, Copy, Terminal, Paperclip } from "lucide-react"
import Editor from "@monaco-editor/react"
import { toast } from "sonner"
import { useState } from "react"

type MessageViewerProps = {
  event: WebhookEvent | null
  onDelete: () => void
}

export function MessageViewer({ event, onDelete }: MessageViewerProps) {
  const [showHtml, setShowHtml] = useState(true)

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString()
  }

  const getPayloadSize = () => {
    if (!event) return "0 B"
    const size = new Blob([JSON.stringify(event)]).size
    if (size < 1024) return `${size} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    return `${(size / (1024 * 1024)).toFixed(2)} MB`
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const handleDelete = async () => {
    if (!event) return
    await deleteWebhookEvent(event.uuid, event.id)
    onDelete()
  }

  const handleExportJSON = () => {
    if (!event) return
    const json = JSON.stringify(event, null, 2)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${event.type === "email" ? "email" : "webhook"}-${
      event.id
    }.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(
      `Exported ${event.type === "email" ? "email" : "webhook"} as JSON`
    )
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No event selected</p>
          <p className="text-sm">
            Select an event from the inbox to view details
          </p>
        </div>
      </div>
    )
  }

  // Render email-specific view
  if (event.type === "email") {
    return (
      <ScrollArea className="h-full">
        <div className="p-6 space-y-6">
          {/* Header Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge className="bg-blue-500 text-white">EMAIL</Badge>
              <span className="text-sm text-muted-foreground">
                {formatTimestamp(event.timestamp)}
              </span>
              <Badge variant="outline" className="text-xs">
                {getPayloadSize()}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExportJSON}
                title="Export as JSON"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Email Subject */}
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">
              {event.subject || "(No Subject)"}
            </h2>
            <p className="text-xs text-muted-foreground">ID: {event.id}</p>
          </div>

          <Separator />

          {/* Email Headers */}
          <div className="space-y-3">
            <div className="text-sm flex">
              <span className="font-medium text-muted-foreground min-w-[100px]">
                From:
              </span>
              <span className="font-mono flex-1">{event.from}</span>
            </div>
            <div className="text-sm flex">
              <span className="font-medium text-muted-foreground min-w-[100px]">
                To:
              </span>
              <span className="font-mono flex-1">{event.to}</span>
            </div>
            {event.attachments && event.attachments.length > 0 && (
              <div className="text-sm flex">
                <span className="font-medium text-muted-foreground min-w-[100px]">
                  Attachments:
                </span>
                <div className="flex-1 space-y-1">
                  {event.attachments.map((att, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Paperclip className="h-3 w-3" />
                      {att.url ? (
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs hover:underline text-blue-600"
                        >
                          {att.filename} ({att.contentType},{" "}
                          {formatFileSize(att.size)})
                        </a>
                      ) : (
                        <span className="font-mono text-xs">
                          {att.filename} ({att.contentType},{" "}
                          {formatFileSize(att.size)})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* Email Content Toggle */}
          {event.emailHtml && event.emailText && (
            <div className="flex gap-2">
              <Button
                variant={showHtml ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHtml(true)}
              >
                HTML
              </Button>
              <Button
                variant={!showHtml ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHtml(false)}
              >
                Plain Text
              </Button>
            </div>
          )}

          {/* Email Body */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Email Content</h3>
            {showHtml && event.emailHtml ? (
              <div className="border rounded-md bg-white">
                <iframe
                  srcDoc={event.emailHtml}
                  className="w-full min-h-[400px] border-0"
                  sandbox="allow-same-origin"
                  title="Email HTML Content"
                />
              </div>
            ) : event.emailText ? (
              <div className="border rounded-md p-4 bg-muted">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {event.emailText}
                </pre>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No content</p>
            )}
          </div>

          <Separator />

          {/* Raw Headers */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Raw Headers</h3>
            {Object.keys(event.headers).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(event.headers).map(([key, value]) => (
                  <div key={key} className="text-sm flex">
                    <span className="font-medium text-muted-foreground min-w-[200px]">
                      {key}:
                    </span>
                    <span className="font-mono flex-1 break-all">
                      {String(value)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No headers</p>
            )}
          </div>
        </div>
      </ScrollArea>
    )
  }

  // Original webhook view below...

  const getMethodColor = (method: string) => {
    switch (method.toLowerCase()) {
      case "get":
        return "bg-blue-500"
      case "post":
        return "bg-green-500"
      case "put":
        return "bg-yellow-500"
      case "delete":
        return "bg-red-500"
      case "patch":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
    }
  }

  const handleCopyCurl = () => {
    const headers = Object.entries(event.headers)
      .map(([key, value]) => `-H "${key}: ${value}"`)
      .join(" \\\n  ")

    let bodyArg = ""
    if (event.body) {
      const bodyStr =
        typeof event.body === "object"
          ? JSON.stringify(event.body)
          : String(event.body)
      bodyArg = ` \\\n  -d '${bodyStr}'`
    }

    const curl = `curl -X ${event.method} '${event.url}' \\\n  ${headers}${bodyArg}`

    navigator.clipboard.writeText(curl)
    toast.success("Copied as cURL command")
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className={`${getMethodColor(event.method)} text-white`}>
              {event.method}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {formatTimestamp(event.timestamp)}
            </span>
            <Badge variant="outline" className="text-xs">
              {getPayloadSize()}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyCurl}
              title="Copy as cURL"
            >
              <Terminal className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportJSON}
              title="Export as JSON"
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Full URL */}
        <div className="space-y-1">
          <code className="text-sm font-mono bg-muted px-2 py-1 block break-all">
            {event.url}
          </code>
          <p className="text-xs text-muted-foreground">ID: {event.id}</p>
        </div>

        <Separator />

        {/* Headers */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Headers</h3>
          {Object.keys(event.headers).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(event.headers).map(([key, value]) => (
                <div key={key} className="text-sm flex">
                  <span className="font-medium text-muted-foreground min-w-[200px]">
                    {key}:
                  </span>
                  <span className="font-mono flex-1">{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No headers</p>
          )}
        </div>

        <Separator />

        {/* Query Parameters */}
        {Object.keys(event.query).length > 0 && (
          <>
            <div>
              <h3 className="text-sm font-semibold mb-3">Query Parameters</h3>
              <div className="space-y-2">
                {Object.entries(event.query).map(([key, value]) => (
                  <div key={key} className="text-sm flex">
                    <span className="font-medium text-muted-foreground min-w-[200px]">
                      {key}:
                    </span>
                    <span className="font-mono flex-1">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Body */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Body</h3>
          {event.body ? (
            <div className="border">
              <Editor
                height="400px"
                defaultLanguage={
                  typeof event.body === "object" ? "json" : "plaintext"
                }
                value={
                  typeof event.body === "object"
                    ? JSON.stringify(event.body, null, 2)
                    : String(event.body)
                }
                options={{
                  readOnly: true,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 13,
                  lineNumbers: "on",
                  folding: true,
                  wordWrap: "on",
                  automaticLayout: true,
                  contextmenu: true,
                  find: {
                    addExtraSpaceOnTop: false,
                    autoFindInSelection: "never",
                    seedSearchStringFromSelection: "never",
                  },
                }}
                theme="vs"
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No body</p>
          )}
        </div>
      </div>
    </ScrollArea>
  )
}
