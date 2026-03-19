export interface CanvasRegion {
	x: number
	y: number
	width: number
	height: number
}

export type AgentCompletionStatus = 'complete' | 'needs-review' | 'blocked'
export type OrchestratorAgentStatus =
	| 'idle'
	| 'running'
	| 'complete'
	| 'needs-review'
	| 'blocked'
	| 'approved'

export interface AgentArtifactSummary {
	shapeId: string
	rootType: string
	title: string
}

export interface AgentCompletionReport {
	createdShapeIds: string[]
	artifactSummaries: AgentArtifactSummary[]
	topicsCovered: string[]
	flags: string[]
	questionsForParent: string[]
	status: AgentCompletionStatus
}

export interface SpawnAgentInput {
	brief: string
	sharedContext: Record<string, unknown>
	canvasRegion: CanvasRegion
}

export interface OrchestratorAgentRecord {
	agentId: string
	parentAgentId: string | null
	depth: number
	status: OrchestratorAgentStatus
	brief: string
	sharedContext: Record<string, unknown>
	assignedRegion: CanvasRegion
	childAgentIds: string[]
	completionReport: AgentCompletionReport | null
}

export interface OrchestrationStoreState {
	agents: Record<string, OrchestratorAgentRecord>
	rootAgentIds: string[]
}
