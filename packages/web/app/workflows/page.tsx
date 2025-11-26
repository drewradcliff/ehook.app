import { db } from "@/db";
import { workflows } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Plus, GitBranch, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function WorkflowsPage() {
  const allWorkflows = await db
    .select()
    .from(workflows)
    .orderBy(desc(workflows.updatedAt));

  return (
    <div className="flex-1 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">
              Create and manage automated workflows
            </p>
          </div>
          <Button asChild>
            <Link href="/workflows/new">
              <Plus className="mr-2 size-4" />
              New Workflow
            </Link>
          </Button>
        </div>

        {allWorkflows.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <GitBranch className="mb-4 size-12 text-muted-foreground" />
            <CardTitle className="mb-2">No workflows yet</CardTitle>
            <CardDescription className="mb-6 text-center">
              Create your first workflow to automate tasks with triggers and actions.
            </CardDescription>
            <Button asChild>
              <Link href="/workflows/new">
                <Plus className="mr-2 size-4" />
                Create Workflow
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allWorkflows.map((workflow) => (
              <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {workflow.name || "Untitled Workflow"}
                        </CardTitle>
                        {workflow.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {workflow.description}
                          </CardDescription>
                        )}
                      </div>
                      <Badge variant={workflow.status === "active" ? "default" : "secondary"}>
                        {workflow.status || "draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="size-4" />
                      <span>
                        Updated{" "}
                        {workflow.updatedAt
                          ? new Date(workflow.updatedAt).toLocaleDateString()
                          : "never"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

