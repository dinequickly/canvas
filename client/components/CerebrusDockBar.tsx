import { FormEvent, useMemo, useState } from 'react'
import { TLShapeId, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, type AgentModelName } from '../../shared/models'
import { useAgent, useDockState, useOrchestrationState, useTldrawAgentApp } from '../agent/TldrawAgentAppProvider'
import { getActionInfo } from './chat-history/getActionInfo'

const defaultDockPrompt = 'Customize your view...'

function createDockRequestId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `dock:${crypto.randomUUID()}`
	}

	return `dock:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

function summarizePrompt(prompt: string) {
	const trimmed = prompt.trim()
	if (!trimmed) return 'No prompt'
	return trimmed.length > 96 ? `${trimmed.slice(0, 93)}…` : trimmed
}

export function CerebrusDockBar() {
	const app = useTldrawAgentApp()
	const agent = useAgent()
	const dockState = useDockState()
	const orchestrationState = useOrchestrationState()
	const [prompt, setPrompt] = useState('')
	const isGenerating = useValue('dock-agent-is-generating', () => agent.requests.isGenerating(), [agent])
	const modelName = useValue('dock-agent-model-name', () => agent.modelName.getModelName(), [agent])
	const history = useValue('dock-agent-history', () => agent.chat.getHistory(), [agent])

	const actionSummaries = useMemo(() => {
		if (!dockState.requestId) return []

		const summaries = history
			.filter(
				(item) =>
					item.type === 'action' &&
					item.requestId === dockState.requestId &&
					item.uiOrigin === 'dock' &&
					item.action.complete
			)
			.map((item) => getActionInfo(item.action, agent).summary ?? getActionInfo(item.action, agent).description)
			.filter((summary): summary is string => Boolean(summary))

		return Array.from(new Set(summaries))
	}, [agent, dockState.requestId, history])

	const cerebrusSummary = useMemo(() => {
		if (!dockState.handoff || dockState.handoff.type !== 'cerebrus') return null
		const created = dockState.handoff.operations.filter((operation) => operation.op === 'create').length
		const patched = dockState.handoff.operations.filter((operation) => operation.op === 'patch').length
		return {
			created,
			patched,
			total: dockState.handoff.operations.length,
			prettyJson: JSON.stringify({ operations: dockState.handoff.operations }, null, 2),
		}
	}, [dockState.handoff])

	const orchestrationSummary = useMemo(() => {
		if (!dockState.handoff || dockState.handoff.type !== 'orchestration') return null
		const rootRecord = orchestrationState.agents[dockState.handoff.rootAgentId]
		if (!rootRecord) return null

		const reports = app.orchestration.getChildReports(dockState.handoff.rootAgentId)
		const createdShapeIds = new Set<string>()
		const flags = new Set<string>()

		for (const entry of reports) {
			for (const shapeId of entry.report?.createdShapeIds ?? []) {
				createdShapeIds.add(shapeId)
			}
			for (const flag of entry.report?.flags ?? []) {
				flags.add(flag)
			}
		}

		const finishedChildren = reports.filter(
			(entry) => entry.status === 'complete' || entry.status === 'approved' || entry.status === 'needs-review'
		).length

		return {
			rootAgentId: dockState.handoff.rootAgentId,
			status: rootRecord.status,
			childCount: reports.length,
			finishedChildren,
			createdCount: createdShapeIds.size,
			flags: Array.from(flags),
		}
	}, [app.orchestration, dockState.handoff, orchestrationState])

	const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()

		if (isGenerating) {
			agent.cancel()
			return
		}

		const nextPrompt = prompt.trim()
		if (!nextPrompt) return

		const requestId = createDockRequestId()
		app.dock.startRun({
			requestId,
			prompt: nextPrompt,
			modelName,
		})

		agent.interrupt({
			input: {
				agentMessages: [nextPrompt],
				userMessages: [nextPrompt],
				bounds: agent.editor.getViewportPageBounds(),
				source: 'user',
				contextItems: agent.context.getItems(),
				requestId,
				uiOrigin: 'dock',
			},
		})

		setPrompt('')
	}

	const showResponse =
		dockState.status !== 'idle' && (Boolean(dockState.prompt) || Boolean(dockState.handoff) || actionSummaries.length > 0)

	return (
		<div className="cerebrus-dock-shell">
			{showResponse ? (
				<div className="cerebrus-dock-response">
					<div className="cerebrus-dock-response-header">
						<strong>
							{dockState.handoff?.type === 'cerebrus'
								? 'Cerebrus'
								: dockState.handoff?.type === 'artifact'
									? 'Artifact'
									: dockState.handoff?.type === 'orchestration'
										? 'Orchestration'
										: 'Agent Run'}
						</strong>
						<span>{dockState.modelName ?? modelName}</span>
					</div>
					<div className="cerebrus-dock-response-prompt">{summarizePrompt(dockState.prompt)}</div>
					<div className="cerebrus-dock-response-summary">
						<span>{dockState.status}</span>
						{cerebrusSummary ? <span>{cerebrusSummary.total} ops</span> : null}
						{cerebrusSummary ? <span>{cerebrusSummary.created} create</span> : null}
						{cerebrusSummary ? <span>{cerebrusSummary.patched} patch</span> : null}
						{orchestrationSummary ? (
							<span>
								{orchestrationSummary.finishedChildren}/{orchestrationSummary.childCount} spawned agents
							</span>
						) : null}
						{orchestrationSummary ? <span>{orchestrationSummary.createdCount} shapes</span> : null}
						{dockState.handoff?.type === 'artifact' && dockState.handoff.artifactType ? (
							<span>{dockState.handoff.artifactType}</span>
						) : null}
						{dockState.handoff?.type === 'artifact' && dockState.handoff.title ? (
							<span>{dockState.handoff.title}</span>
						) : null}
						{!dockState.handoff && actionSummaries.length > 0 ? (
							<span>{actionSummaries.length} action{actionSummaries.length === 1 ? '' : 's'}</span>
						) : null}
					</div>

					{dockState.handoff?.type === 'artifact' && dockState.handoff.shapeId ? (
						<button
							type="button"
							className="cerebrus-dock-response-link"
							onClick={() => app.navigation.openLeaf(dockState.handoff!.shapeId as TLShapeId)}
						>
							Open artifact
						</button>
					) : null}

					{cerebrusSummary ? (
						<details className="cerebrus-dock-response-json">
							<summary>View operations</summary>
							<pre>{cerebrusSummary.prettyJson}</pre>
						</details>
					) : null}

					{orchestrationSummary?.flags.length ? (
						<details className="cerebrus-dock-response-json">
							<summary>Review flags</summary>
							<pre>{JSON.stringify(orchestrationSummary.flags, null, 2)}</pre>
						</details>
					) : null}

					{!dockState.handoff && actionSummaries.length > 0 ? (
						<details className="cerebrus-dock-response-json">
							<summary>Action summaries</summary>
							<pre>{JSON.stringify(actionSummaries, null, 2)}</pre>
						</details>
					) : null}
				</div>
			) : null}

			<form className="cerebrus-dock" onSubmit={handleSubmit}>
				<button
					type="button"
					className="cerebrus-dock-button cerebrus-dock-button--ghost"
					onClick={() => {
						setPrompt('')
						app.dock.clear()
					}}
					aria-label="Clear dock prompt"
				>
					<span aria-hidden="true">×</span>
				</button>

				<label className="cerebrus-dock-model" aria-label="Dock model selector">
					<select
						value={modelName}
						onChange={(event) => agent.modelName.setModelName(event.target.value as AgentModelName)}
					>
						{Object.values(AGENT_MODEL_DEFINITIONS).map((model) => (
							<option key={model.name} value={model.name}>
								{model.name}
							</option>
						))}
					</select>
				</label>

				<input
					name="cerebrus-dock-prompt"
					value={prompt}
					onChange={(event) => setPrompt(event.target.value)}
					placeholder={defaultDockPrompt}
					className="cerebrus-dock-input"
					autoComplete="off"
				/>

				<button
					type={isGenerating ? 'button' : 'submit'}
					className="cerebrus-dock-button"
					onClick={
						isGenerating
							? () => {
									agent.cancel()
							  }
							: undefined
					}
					disabled={!isGenerating && prompt.trim() === ''}
					aria-label={isGenerating ? 'Stop agent run' : 'Send prompt to agent'}
				>
					{isGenerating ? <span aria-hidden="true">◼</span> : <span aria-hidden="true">↗</span>}
				</button>
			</form>

			{dockState.status === 'error' && dockState.error ? (
				<div className="cerebrus-dock-error">{dockState.error}</div>
			) : null}
		</div>
	)
}
