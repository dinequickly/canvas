import { EditorAtom } from 'tldraw'
import type { AgentModelName } from '../../../shared/models'
import type { CerebrusOperationBatch } from '../../cerebrus/applyCerebrusOperations'
import { BaseAgentAppManager } from './BaseAgentAppManager'

export type DockRunStatus = 'idle' | 'running' | 'complete' | 'error' | 'cancelled'

export type DockHandoffSummary =
	| {
			type: 'cerebrus'
			modelName: string
			operations: CerebrusOperationBatch['operations']
	  }
	| {
			type: 'artifact'
			shapeId: string
			artifactType?: string
			title?: string
			status: 'generating' | 'ready' | 'error'
			modelName?: string
	  }
	| {
			type: 'orchestration'
			rootAgentId: string
	  }

export interface DockRunState {
	requestId: string | null
	prompt: string
	status: DockRunStatus
	modelName: string | null
	error: string | null
	handoff: DockHandoffSummary | null
	startedAt: string | null
	completedAt: string | null
}

function getEmptyDockState(): DockRunState {
	return {
		requestId: null,
		prompt: '',
		status: 'idle',
		modelName: null,
		error: null,
		handoff: null,
		startedAt: null,
		completedAt: null,
	}
}

function nowIso() {
	return new Date().toISOString()
}

export class AgentAppDockManager extends BaseAgentAppManager {
	private static $state = new EditorAtom<DockRunState>('dock-run', getEmptyDockState)

	getState() {
		return AgentAppDockManager.$state.get(this.app.editor)
	}

	private updateState(updater: (state: DockRunState) => DockRunState) {
		AgentAppDockManager.$state.update(this.app.editor, updater)
	}

	reset() {
		AgentAppDockManager.$state.set(this.app.editor, getEmptyDockState())
	}

	clear() {
		this.reset()
	}

	startRun(input: { requestId: string; prompt: string; modelName: AgentModelName }) {
		this.updateState(() => ({
			requestId: input.requestId,
			prompt: input.prompt,
			status: 'running',
			modelName: input.modelName,
			error: null,
			handoff: null,
			startedAt: nowIso(),
			completedAt: null,
		}))
	}

	completeRun(requestId: string) {
		this.updateState((state) => {
			if (state.requestId !== requestId || state.status !== 'running') return state
			return {
				...state,
				status: 'complete',
				completedAt: nowIso(),
			}
		})
	}

	failRun(requestId: string, error: string) {
		this.updateState((state) => {
			if (state.requestId !== requestId) return state
			return {
				...state,
				status: 'error',
				error,
				completedAt: nowIso(),
			}
		})
	}

	cancelRun(requestId: string) {
		this.updateState((state) => {
			if (state.requestId !== requestId || state.status !== 'running') return state
			return {
				...state,
				status: 'cancelled',
				completedAt: nowIso(),
			}
		})
	}

	recordCerebrusResult(requestId: string, result: { modelName: string; operations: CerebrusOperationBatch['operations'] }) {
		this.updateState((state) => {
			if (state.requestId !== requestId || state.status === 'cancelled') return state
			return {
				...state,
				modelName: result.modelName,
				handoff: {
					type: 'cerebrus',
					modelName: result.modelName,
					operations: result.operations,
				},
			}
		})
	}

	recordArtifactResult(
		requestId: string,
		result: {
			shapeId: string
			artifactType?: string
			title?: string
			status: 'generating' | 'ready' | 'error'
			modelName?: string
		}
	) {
		this.updateState((state) => {
			if (state.requestId !== requestId || state.status === 'cancelled') return state
			return {
				...state,
				modelName: result.modelName ?? state.modelName,
				handoff: {
					type: 'artifact',
					shapeId: result.shapeId,
					artifactType: result.artifactType,
					title: result.title,
					status: result.status,
					modelName: result.modelName,
				},
			}
		})
	}

	recordOrchestrationResult(requestId: string, result: { rootAgentId: string }) {
		this.updateState((state) => {
			if (state.requestId !== requestId || state.status === 'cancelled') return state
			return {
				...state,
				handoff: {
					type: 'orchestration',
					rootAgentId: result.rootAgentId,
				},
			}
		})
	}
}
