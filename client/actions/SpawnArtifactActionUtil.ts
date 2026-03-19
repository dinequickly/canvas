import { TldrawAgentApp } from '../agent/TldrawAgentApp'
import { parseArtifactRecord, type ArtifactShape } from '../artifacts/ArtifactShapeUtil'
import { registerActionUtil, AgentActionUtil } from './AgentActionUtil'
import type { SpawnArtifactAction } from '../../shared/schema/AgentActionSchemas'
import type { AgentModelName } from '../../shared/models'

export class SpawnArtifactActionUtil extends AgentActionUtil<SpawnArtifactAction> {
	static override type = 'spawnArtifact' as const

	override getInfo(action: SpawnArtifactAction) {
		return {
			description: action.intent,
			summary: `Spawned ${action.artifactType ?? 'artifact'} deliverable`,
		}
	}

	override sanitizeAction(action: SpawnArtifactAction) {
		const prompt = typeof action.prompt === 'string' ? action.prompt.trim() : ''
		if (!prompt) return null

		return {
			...action,
			prompt,
		}
	}

	override applyAction(action: SpawnArtifactAction) {
		const app = TldrawAgentApp.get(this.editor)
		if (!app) {
			throw new Error('Artifact actions require an active app instance.')
		}

		const modelName = (action.modelName as AgentModelName | undefined) ?? this.agent.modelName.getModelName()
		const requestId = this.agent.requests.getActiveRequest()?.requestId
		const { shapeId, promise } = app.artifacts.spawnFromPrompt({
			prompt: action.prompt,
			artifactType: action.artifactType,
			modelName,
			sourceAgentId: this.agent.id,
		})

		if (requestId) {
			app.dock.recordArtifactResult(requestId, {
				shapeId: String(shapeId),
				artifactType: action.artifactType,
				status: 'generating',
				modelName,
			})
		}

		return promise.then(() => {
			if (!requestId) return
			const shape = app.editor.getShape(shapeId)
			if (!shape || shape.type !== 'artifact-shape') return
			const record = parseArtifactRecord(shape as ArtifactShape)
			app.dock.recordArtifactResult(requestId, {
				shapeId: String(shape.id),
				artifactType: record?.artifactType ?? action.artifactType,
				title: record?.title,
				status: record?.status === 'error' ? 'error' : 'ready',
				modelName: record?.generationModelName ?? modelName,
			})
		})
	}
}

registerActionUtil(SpawnArtifactActionUtil)
