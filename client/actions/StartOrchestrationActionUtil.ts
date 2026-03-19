import { TldrawAgentApp } from '../agent/TldrawAgentApp'
import { registerActionUtil, AgentActionUtil } from './AgentActionUtil'
import type { StartOrchestrationAction } from '../../shared/schema/AgentActionSchemas'

function getViewportOrchestrationRegion(app: TldrawAgentApp) {
	const bounds = app.editor.getViewportPageBounds()
	const padding = 64

	return {
		x: bounds.x + padding,
		y: bounds.y + padding,
		width: Math.max(720, bounds.w - padding * 2),
		height: Math.max(520, bounds.h - padding * 2),
	}
}

export class StartOrchestrationActionUtil extends AgentActionUtil<StartOrchestrationAction> {
	static override type = 'startOrchestration' as const

	override getInfo(action: StartOrchestrationAction) {
		return {
			description: action.intent,
			summary: 'Started orchestration workflow',
		}
	}

	override sanitizeAction(action: StartOrchestrationAction) {
		const prompt = typeof action.prompt === 'string' ? action.prompt.trim() : ''
		if (!prompt) return null

		return {
			...action,
			prompt,
		}
	}

	override applyAction(action: StartOrchestrationAction) {
		const app = TldrawAgentApp.get(this.editor)
		if (!app) {
			throw new Error('Orchestration actions require an active app instance.')
		}

		const rootRecord = app.orchestration.startFromAction(
			action.prompt,
			getViewportOrchestrationRegion(app),
			action.workflowHint ?? 'auto'
		)
		const requestId = this.agent.requests.getActiveRequest()?.requestId
		if (requestId) {
			app.dock.recordOrchestrationResult(requestId, {
				rootAgentId: rootRecord.agentId,
			})
		}
	}
}

registerActionUtil(StartOrchestrationActionUtil)
