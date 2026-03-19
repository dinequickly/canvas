import { FormEvent, useMemo, useState } from 'react'
import { useOrchestrationState, useTldrawAgentApp } from '../agent/TldrawAgentAppProvider'
import type { CerebrusOperationBatch } from '../cerebrus/applyCerebrusOperations'
import { submitCerebrusPrompt } from '../cerebrus/submitCerebrusPrompt'

const defaultPrompt =
	"Create a landing page with title 'Rivers', subtitle 'Generative UI & prose', and a body that's a poem about generative UI."

export function CerebrusPlayground() {
	const app = useTldrawAgentApp()
	const orchestrationState = useOrchestrationState()
	const [prompt, setPrompt] = useState(defaultPrompt)
	const [operations, setOperations] = useState<CerebrusOperationBatch['operations'] | null>(null)
	const [modelName, setModelName] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [isGenerating, setIsGenerating] = useState(false)
	const [orchestrationRootId, setOrchestrationRootId] = useState<string | null>(null)

	const prettyOperations = useMemo(
		() => (operations ? JSON.stringify({ operations }, null, 2) : ''),
		[operations]
	)

	const orchestrationSummary = useMemo(() => {
		if (!orchestrationRootId) return null
		const rootRecord = orchestrationState.agents[orchestrationRootId]
		if (!rootRecord) return null

		const reports = app.orchestration.getChildReports(orchestrationRootId)
		const createdShapeIds = new Set<string>()

		for (const entry of reports) {
			for (const shapeId of entry.report?.createdShapeIds ?? []) {
				createdShapeIds.add(shapeId)
			}
		}

		return {
			status: rootRecord.status,
			childCount: reports.length,
			createdCount: createdShapeIds.size,
		}
	}, [app.orchestration, orchestrationRootId, orchestrationState])

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		setIsGenerating(true)
		setError(null)
		try {
			const data = await submitCerebrusPrompt(app, prompt)
			if (data.mode === 'orchestration') {
				setOperations(null)
				setModelName('cerebrus-orchestrator')
				setOrchestrationRootId(data.rootAgentId)
			} else {
				setOperations(data.operations)
				setModelName(data.modelName ?? null)
				setOrchestrationRootId(null)
			}
		} catch (requestError) {
			setOperations(null)
			setModelName(null)
			setOrchestrationRootId(null)
			setError(requestError instanceof Error ? requestError.message : 'Failed to generate Cerebrus operations.')
		} finally {
			setIsGenerating(false)
		}
	}

	return (
		<div className="cerebrus-playground">
			<div className="cerebrus-playground-header">
				<div>
					<strong>Cerebrus</strong>
				</div>
				{modelName ? <span>{modelName}</span> : null}
			</div>
			<form className="cerebrus-playground-form" onSubmit={handleSubmit}>
				<textarea
					name="cerebrus-prompt"
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					placeholder="Describe the page you want the model to build."
				/>
				<button
					type="submit"
					className="cerebrus-playground-submit"
					disabled={isGenerating || prompt.trim() === ''}
				>
					{isGenerating ? 'Generating…' : 'Generate'}
				</button>
			</form>
			{error ? <div className="cerebrus-playground-error">{error}</div> : null}
			{orchestrationSummary ? (
				<div className="cerebrus-playground-result">
					Orchestration {orchestrationSummary.status}. {orchestrationSummary.childCount} spawned agents,{' '}
					{orchestrationSummary.createdCount} shapes created so far.
				</div>
			) : null}
			{operations ? (
				<>
					<div className="cerebrus-playground-result">
						Applied as create/patch operations on Cerebrus shapes on the canvas.
					</div>
					<details className="cerebrus-playground-json">
						<summary>Operations JSON</summary>
						<pre>{prettyOperations}</pre>
					</details>
				</>
			) : null}
		</div>
	)
}
