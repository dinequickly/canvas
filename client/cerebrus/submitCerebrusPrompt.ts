import type { TldrawAgentApp } from '../agent/TldrawAgentApp'
import type { CanvasRegion } from '../orchestration/types'
import { requestCerebrusOperations, type SuccessfulCerebrusResponse } from './requestCerebrusOperations'

export type CerebrusPromptResult =
	| ({
			mode: 'operations'
	  } & SuccessfulCerebrusResponse)
	| {
			mode: 'orchestration'
			rootAgentId: string
	  }

function getViewportOrchestrationRegion(app: TldrawAgentApp): CanvasRegion {
	const bounds = app.editor.getViewportPageBounds()
	const padding = 64

	return {
		x: bounds.x + padding,
		y: bounds.y + padding,
		width: Math.max(720, bounds.w - padding * 2),
		height: Math.max(520, bounds.h - padding * 2),
	}
}

export async function submitCerebrusPrompt(app: TldrawAgentApp, prompt: string): Promise<CerebrusPromptResult> {
	app.navigation.setActiveContainer(null)

	if (app.orchestration.shouldHandlePrompt(prompt)) {
		const rootRecord = app.orchestration.startFromPrompt(prompt, getViewportOrchestrationRegion(app))
		return {
			mode: 'orchestration',
			rootAgentId: rootRecord.agentId,
		}
	}

	const result = await requestCerebrusOperations(app.editor, prompt)
	return {
		mode: 'operations',
		...result,
	}
}
