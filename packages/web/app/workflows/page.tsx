import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { db } from "@/db"
import { workflows } from "@/db/schema"
import { desc } from "drizzle-orm"
import { Clock, GitBranch } from "lucide-react"
import Link from "next/link"
import { CreateWorkflowButton } from "./create-workflow-button"

export default async function WorkflowsPage() {
  const allWorkflows = await db
    .select()
    .from(workflows)
    .orderBy(desc(workflows.updatedAt))

  return (
    <div className="flex-1 p-6">
      <div className="mx-auto max-w-5xl">
        {allWorkflows.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <GitBranch className="text-muted-foreground mb-4 size-12" />
            <CardTitle className="mb-2">No workflows yet</CardTitle>
            <CardDescription className="mb-6 text-center">
              Create your first workflow to automate tasks with triggers and
              actions.
            </CardDescription>
            <CreateWorkflowButton />
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allWorkflows.map((workflow) => (
              <Link key={workflow.id} href={`/workflows/${workflow.id}`}>
                <Card className="hover:bg-muted/50 h-full transition-colors">
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
                      <Badge
                        variant={
                          workflow.status === "active" ? "default" : "secondary"
                        }
                      >
                        {workflow.status || "draft"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
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
  )
}
