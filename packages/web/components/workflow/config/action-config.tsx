"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  currentWorkflowIdAtom,
  currentWorkflowNameAtom,
} from "@/lib/workflow-store";
import { useAtom } from "jotai";
import { Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { SchemaBuilder, type SchemaField } from "./schema-builder";

type ActionConfigProps = {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
};

// Send Email fields component
function SendEmailFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailTo">
          To (Email Address)
        </Label>
        <Input
          disabled={disabled}
          id="emailTo"
          onChange={(e) => onUpdateConfig("emailTo", e.target.value)}
          placeholder="user@example.com or {{NodeName.email}}"
          value={(config?.emailTo as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailSubject">
          Subject
        </Label>
        <Input
          disabled={disabled}
          id="emailSubject"
          onChange={(e) => onUpdateConfig("emailSubject", e.target.value)}
          placeholder="Subject or {{NodeName.title}}"
          value={(config?.emailSubject as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="emailBody">
          Body
        </Label>
        <Textarea
          disabled={disabled}
          id="emailBody"
          onChange={(e) => onUpdateConfig("emailBody", e.target.value)}
          placeholder="Email body. Use {{NodeName.field}} to insert data from previous nodes."
          rows={4}
          value={(config?.emailBody as string) || ""}
        />
      </div>
    </>
  );
}

// Send Slack Message fields component
function SendSlackMessageFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="slackChannel">
          Channel
        </Label>
        <Input
          disabled={disabled}
          id="slackChannel"
          onChange={(e) => onUpdateConfig("slackChannel", e.target.value)}
          placeholder="#general or @username or {{NodeName.channel}}"
          value={(config?.slackChannel as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label className="ml-1" htmlFor="slackMessage">
          Message
        </Label>
        <Textarea
          disabled={disabled}
          id="slackMessage"
          onChange={(e) => onUpdateConfig("slackMessage", e.target.value)}
          placeholder="Your message. Use {{NodeName.field}} to insert data from previous nodes."
          rows={4}
          value={(config?.slackMessage as string) || ""}
        />
      </div>
    </>
  );
}

// Database Query fields component
function DatabaseQueryFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="dbQuery">SQL Query</Label>
        <Textarea
          disabled={disabled}
          id="dbQuery"
          onChange={(e) => onUpdateConfig("dbQuery", e.target.value)}
          placeholder="SELECT * FROM users WHERE id = $1"
          rows={6}
          className="font-mono text-xs"
          value={(config?.dbQuery as string) || ""}
        />
        <p className="text-muted-foreground text-xs">
          The DATABASE_URL from your project integrations will be used to
          execute this query.
        </p>
      </div>
      <div className="space-y-2">
        <Label>Schema (Optional)</Label>
        <SchemaBuilder
          disabled={disabled}
          onChange={(schema) =>
            onUpdateConfig("dbSchema", JSON.stringify(schema))
          }
          schema={
            config?.dbSchema
              ? (JSON.parse(config.dbSchema as string) as SchemaField[])
              : []
          }
        />
      </div>
    </>
  );
}

// HTTP Request fields component
function HttpRequestFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="httpMethod">HTTP Method</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("httpMethod", value)}
          value={(config?.httpMethod as string) || "POST"}
        >
          <SelectTrigger className="w-full" id="httpMethod">
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="endpoint">URL</Label>
        <Input
          disabled={disabled}
          id="endpoint"
          onChange={(e) => onUpdateConfig("endpoint", e.target.value)}
          placeholder="https://api.example.com/endpoint or {{NodeName.url}}"
          value={(config?.endpoint as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="httpHeaders">Headers (JSON)</Label>
        <Textarea
          disabled={disabled}
          id="httpHeaders"
          onChange={(e) => onUpdateConfig("httpHeaders", e.target.value)}
          placeholder='{"Content-Type": "application/json"}'
          rows={4}
          className="font-mono text-xs"
          value={(config?.httpHeaders as string) || "{}"}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="httpBody">Body (JSON)</Label>
        <Textarea
          disabled={config?.httpMethod === "GET" || disabled}
          id="httpBody"
          onChange={(e) => onUpdateConfig("httpBody", e.target.value)}
          placeholder='{"key": "value"}'
          rows={6}
          className={`font-mono text-xs ${config?.httpMethod === "GET" ? "opacity-50" : ""}`}
          value={(config?.httpBody as string) || "{}"}
        />
        {config?.httpMethod === "GET" && (
          <p className="text-muted-foreground text-xs">
            Body is disabled for GET requests
          </p>
        )}
      </div>
    </>
  );
}

// Generate Text fields component
function GenerateTextFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="aiFormat">Format</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("aiFormat", value)}
          value={(config?.aiFormat as string) || "text"}
        >
          <SelectTrigger className="w-full" id="aiFormat">
            <SelectValue placeholder="Select format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="object">Object</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiModel">Model</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("aiModel", value)}
          value={(config?.aiModel as string) || "gpt-4o"}
        >
          <SelectTrigger className="w-full" id="aiModel">
            <SelectValue placeholder="Select model" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gpt-4o">GPT-4o</SelectItem>
            <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
            <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
            <SelectItem value="claude-3-5-haiku">Claude 3.5 Haiku</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="aiPrompt">Prompt</Label>
        <Textarea
          disabled={disabled}
          id="aiPrompt"
          onChange={(e) => onUpdateConfig("aiPrompt", e.target.value)}
          placeholder="Enter your prompt here. Use {{NodeName.field}} to reference previous outputs."
          rows={4}
          value={(config?.aiPrompt as string) || ""}
        />
      </div>
      {config?.aiFormat === "object" && (
        <div className="space-y-2">
          <Label>Schema</Label>
          <SchemaBuilder
            disabled={disabled}
            onChange={(schema) =>
              onUpdateConfig("aiSchema", JSON.stringify(schema))
            }
            schema={
              config?.aiSchema
                ? (JSON.parse(config.aiSchema as string) as SchemaField[])
                : []
            }
          />
        </div>
      )}
    </>
  );
}

// Condition fields component
function ConditionFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="condition">Condition Expression</Label>
      <Input
        disabled={disabled}
        id="condition"
        onChange={(e) => onUpdateConfig("condition", e.target.value)}
        placeholder="e.g., 5 > 3, status === 200, {{PreviousNode.value}} > 100"
        value={(config?.condition as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        Enter a JavaScript expression that evaluates to true or false. You can
        use @ to reference previous node outputs.
      </p>
    </div>
  );
}

// Scrape fields component
function ScrapeFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="url">URL</Label>
      <Input
        disabled={disabled}
        id="url"
        onChange={(e) => onUpdateConfig("url", e.target.value)}
        placeholder="https://example.com or {{NodeName.url}}"
        value={(config?.url as string) || ""}
      />
    </div>
  );
}

// Search fields component
function SearchFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="query">Search Query</Label>
        <Input
          disabled={disabled}
          id="query"
          onChange={(e) => onUpdateConfig("query", e.target.value)}
          placeholder="Search query or {{NodeName.query}}"
          value={(config?.query as string) || ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="limit">Result Limit</Label>
        <Input
          disabled={disabled}
          id="limit"
          onChange={(e) => onUpdateConfig("limit", e.target.value)}
          placeholder="10"
          type="number"
          value={(config?.limit as string) || ""}
        />
      </div>
    </>
  );
}

// Action categories and their actions
const ACTION_CATEGORIES = {
  System: ["HTTP Request", "Database Query", "Condition"],
  AI: ["Generate Text"],
  Web: ["Scrape", "Search"],
  Resend: ["Send Email"],
  Slack: ["Send Slack Message"],
} as const;

type ActionCategory = keyof typeof ACTION_CATEGORIES;

// Get category for an action type
const getCategoryForAction = (actionType: string): ActionCategory | null => {
  for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
    if (actions.includes(actionType as never)) {
      return category as ActionCategory;
    }
  }
  return null;
};

export function ActionConfig({
  config,
  onUpdateConfig,
  disabled,
}: ActionConfigProps) {
  const [_workflowId] = useAtom(currentWorkflowIdAtom);
  const [_workflowName] = useAtom(currentWorkflowNameAtom);

  const actionType = (config?.actionType as string) || "";
  const selectedCategory = actionType ? getCategoryForAction(actionType) : null;
  const [category, setCategory] = useState<ActionCategory | "">(
    selectedCategory || ""
  );

  // Sync category state when actionType changes (e.g., when switching nodes)
  useEffect(() => {
    const newCategory = actionType ? getCategoryForAction(actionType) : null;
    setCategory(newCategory || "");
  }, [actionType]);

  const handleCategoryChange = (newCategory: ActionCategory) => {
    setCategory(newCategory);
    // Auto-select the first action in the new category
    const firstAction = ACTION_CATEGORIES[newCategory][0];
    onUpdateConfig("actionType", firstAction);
  };

  const handleActionTypeChange = (value: string) => {
    onUpdateConfig("actionType", value);
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionCategory">
            Category
          </Label>
          <Select
            disabled={disabled}
            onValueChange={(value) =>
              handleCategoryChange(value as ActionCategory)
            }
            value={category || undefined}
          >
            <SelectTrigger className="w-full" id="actionCategory">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="System">
                <div className="flex items-center gap-2">
                  <Settings className="size-4" />
                  <span>System</span>
                </div>
              </SelectItem>
              <SelectItem value="AI">
                <div className="flex items-center gap-2">
                  <span>🤖</span>
                  <span>AI</span>
                </div>
              </SelectItem>
              <SelectItem value="Resend">
                <div className="flex items-center gap-2">
                  <span>📧</span>
                  <span>Resend</span>
                </div>
              </SelectItem>
              <SelectItem value="Slack">
                <div className="flex items-center gap-2">
                  <span>💬</span>
                  <span>Slack</span>
                </div>
              </SelectItem>
              <SelectItem value="Web">
                <div className="flex items-center gap-2">
                  <span>🌐</span>
                  <span>Web</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="ml-1" htmlFor="actionType">
            Action
          </Label>
          <Select
            disabled={disabled || !category}
            onValueChange={handleActionTypeChange}
            value={actionType || undefined}
          >
            <SelectTrigger className="w-full" id="actionType">
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              {category &&
                ACTION_CATEGORIES[category].map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Send Email fields */}
      {config?.actionType === "Send Email" && (
        <SendEmailFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Send Slack Message fields */}
      {config?.actionType === "Send Slack Message" && (
        <SendSlackMessageFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Database Query fields */}
      {config?.actionType === "Database Query" && (
        <DatabaseQueryFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* HTTP Request fields */}
      {config?.actionType === "HTTP Request" && (
        <HttpRequestFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Generate Text fields */}
      {config?.actionType === "Generate Text" && (
        <GenerateTextFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Condition fields */}
      {config?.actionType === "Condition" && (
        <ConditionFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Scrape fields */}
      {config?.actionType === "Scrape" && (
        <ScrapeFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}

      {/* Search fields */}
      {config?.actionType === "Search" && (
        <SearchFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      )}
    </>
  );
}
