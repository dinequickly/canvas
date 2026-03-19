import { TldrawAgentApp } from '../agent/TldrawAgentApp'
import { requestCerebrusOperations } from '../cerebrus/requestCerebrusOperations'
import { registerActionUtil, AgentActionUtil } from './AgentActionUtil'
import type { GenerateCerebrusAction } from '../../shared/schema/AgentActionSchemas'
import type { AgentModelName } from '../../shared/models'

export class GenerateCerebrusActionUtil extends AgentActionUtil<GenerateCerebrusAction> {
	static override type = 'generateCerebrus' as const

	override getInfo(action: GenerateCerebrusAction) {
		return {
			description: action.intent,
			summary: 'Generated Cerebrus surface',
		}
	}

	override sanitizeAction(action: GenerateCerebrusAction) {
		const prompt = typeof action.prompt === 'string' ? action.prompt.trim() : ''
		if (!prompt) return null

		return {
			...action,
			prompt,
		}
	}

	override async applyAction(action: GenerateCerebrusAction) {
		const app = TldrawAgentApp.get(this.editor)
		if (!app) {
			throw new Error('Cerebrus generation actions require an active app instance.')
		}

		const modelName = (action.modelName as AgentModelName | undefined) ?? this.agent.modelName.getModelName()
		const result = await requestCerebrusOperations(this.editor, action.prompt, { modelName })
		const requestId = this.agent.requests.getActiveRequest()?.requestId

		if (requestId) {
			app.dock.recordCerebrusResult(requestId, {
				modelName: result.modelName ?? modelName,
				operations: result.operations,
			})
		}
	}
}

registerActionUtil(GenerateCerebrusActionUtil)
