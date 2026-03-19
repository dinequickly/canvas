import { Box, TLShapeId } from 'tldraw'
import { artifactErrorStateSchema, artifactRecordSchema, type ArtifactBundle, type ArtifactErrorState, type ArtifactRecord, type ArtifactType } from '../../../src/lib/artifacts/schema'
import type { AgentModelName } from '../../../shared/models'
import { ARTIFACT_SHAPE_TYPE, ArtifactShape, createArtifactShapeId, getDefaultArtifactNavigationProps, getDefaultArtifactShapeSize, parseArtifactRecord } from '../../artifacts/ArtifactShapeUtil'
import { requestArtifactBundle } from '../../artifacts/requestArtifactBundle'
import { readArtifactShapes } from '../../artifacts/readArtifactShapes'
import { readWorkspaceShapes } from '../../workspace/readWorkspaceShapes'
import { BaseAgentAppManager } from './BaseAgentAppManager'

function createArtifactId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `artifact:${crypto.randomUUID()}`
	}

	return `artifact:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

function nowIso() {
	return new Date().toISOString()
}

function stringifyJson(value: unknown) {
	return JSON.stringify(value)
}

function createPlaceholderBundle(artifactType: ArtifactType): ArtifactBundle {
	return {
		artifactType,
		title: 'Generating artifact',
		description: 'The artifact agent is drafting the deliverable.',
		entryFile: '/App.tsx',
		files: {
			'/App.tsx': `import React from 'react'

export default function App() {
  return (
    <div style={{ fontFamily: 'Georgia, serif', padding: 32, color: '#0f172a', background: '#fff7ed', minHeight: '100vh' }}>
      <h1 style={{ margin: 0, fontSize: 36 }}>Generating artifact…</h1>
      <p style={{ marginTop: 12, maxWidth: 520 }}>The artifact agent is producing a live preview for this deliverable.</p>
    </div>
  )
}
`,
		},
		previewState: {},
		suggestedActions: ['refresh', 'open-source', 'duplicate', 'regenerate', 'close'],
	}
}

function getCreateGridStart(existingBounds: Array<{ x: number; y: number; w: number; h: number }>, viewport: Box) {
	if (existingBounds.length === 0) {
		return { x: viewport.x + 80, y: viewport.y + 80 }
	}

	const maxX = Math.max(...existingBounds.map((shape) => shape.x + shape.w))
	const minY = Math.min(...existingBounds.map((shape) => shape.y))

	return {
		x: maxX + 96,
		y: minY,
	}
}

function getCreatePosition(index: number, existingBounds: Array<{ x: number; y: number; w: number; h: number }>, viewport: Box) {
	const { w, h } = getDefaultArtifactShapeSize()
	const start = getCreateGridStart(existingBounds, viewport)
	const columns = 2
	const gapX = 88
	const gapY = 88
	const column = index % columns
	const row = Math.floor(index / columns)

	return {
		x: start.x + column * (w + gapX),
		y: start.y + row * (h + gapY),
	}
}

function guessTitle(prompt: string) {
	const trimmed = prompt.trim()
	if (!trimmed) return 'New artifact'
	return trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed
}

export class AgentAppArtifactManager extends BaseAgentAppManager {
	reset() {
		// Artifact state is persisted in shapes.
	}

	spawnFromPrompt(options: {
		prompt: string
		artifactType?: ArtifactType
		modelName?: AgentModelName
		sourceAgentId?: string
	}) {
		const { editor } = this.app
		const viewport = editor.getViewportPageBounds()
		const existingBounds = readWorkspaceShapes(editor).map((shape) => ({
			x: shape.x,
			y: shape.y,
			w: shape.w,
			h: shape.h,
		}))
		const position = getCreatePosition(readArtifactShapes(editor).length, existingBounds, viewport)
		const shapeId = createArtifactShapeId()
		const artifactId = createArtifactId()
		const artifactType = options.artifactType ?? 'prototype'
		const placeholderBundle = createPlaceholderBundle(artifactType)
		const activeContainer = this.app.navigation.getActiveContainer()
		const parentNavigation = activeContainer
			? {
					parentCerebrusId: activeContainer.navigation.cerebrusId,
			  }
			: {}

		editor.createShape({
			id: shapeId,
			type: ARTIFACT_SHAPE_TYPE,
			x: position.x,
			y: position.y,
			props: {
				...getDefaultArtifactShapeSize(),
				artifactId,
				artifactType,
				title: guessTitle(options.prompt),
				description: 'Generating artifact…',
				status: 'generating',
				sourceBundle: stringifyJson(placeholderBundle),
				previewState: stringifyJson({}),
				entryFile: '/App.tsx',
				lastRunAt: nowIso(),
				generationPrompt: options.prompt,
				generationModelName: options.modelName,
				...getDefaultArtifactNavigationProps(guessTitle(options.prompt), parentNavigation),
			},
		})

		editor.select(shapeId)

		const promise = requestArtifactBundle(options.prompt, options.artifactType, options.modelName)
			.then(({ bundle, modelName }) => {
				const record = artifactRecordSchema.parse({
					artifactId,
					artifactType: bundle.artifactType,
					title: bundle.title,
					description: bundle.description,
					status: 'ready',
					sourceBundle: bundle,
					previewState: bundle.previewState,
					entryFile: bundle.entryFile,
					lastRunAt: nowIso(),
					generationPrompt: options.prompt,
					generationModelName: modelName ?? options.modelName,
				})

				editor.updateShape({
					id: shapeId,
					type: ARTIFACT_SHAPE_TYPE,
					props: {
						artifactType: record.artifactType,
						title: record.title,
						description: record.description,
						status: record.status,
						sourceBundle: stringifyJson(record.sourceBundle),
						previewState: stringifyJson(record.previewState),
						entryFile: record.entryFile,
						lastRunAt: record.lastRunAt,
						errorState: undefined,
						generationPrompt: record.generationPrompt,
						generationModelName: record.generationModelName,
						navigationLabel: record.title,
					},
				})
			})
			.catch((error) => {
				const errorState = artifactErrorStateSchema.parse({
					message: error instanceof Error ? error.message : 'Artifact generation failed.',
					source: 'generation',
					timestamp: nowIso(),
				})
				editor.updateShape({
					id: shapeId,
					type: ARTIFACT_SHAPE_TYPE,
					props: {
						status: 'error',
						errorState: stringifyJson(errorState),
					},
				})
				throw error
			})

		return {
			shapeId,
			promise,
		}
	}

	async regenerate(shapeId: TLShapeId) {
		const shape = this.getShape(shapeId)
		if (!shape) throw new Error('Artifact not found.')
		const prompt = shape.props.generationPrompt?.trim()
		if (!prompt) throw new Error('This artifact does not have a saved generation prompt.')

		this.app.editor.updateShape({
			id: shape.id,
			type: ARTIFACT_SHAPE_TYPE,
			props: {
				status: 'generating',
				errorState: undefined,
				lastRunAt: nowIso(),
			},
		})

		try {
			const { bundle, modelName } = await requestArtifactBundle(
				prompt,
				shape.props.artifactType as ArtifactType,
				shape.props.generationModelName as AgentModelName | undefined
			)
			this.app.editor.updateShape({
				id: shape.id,
				type: ARTIFACT_SHAPE_TYPE,
				props: {
					artifactType: bundle.artifactType,
					title: bundle.title,
					description: bundle.description,
					status: 'ready',
					sourceBundle: stringifyJson(bundle),
					previewState: stringifyJson(bundle.previewState),
					entryFile: bundle.entryFile,
					lastRunAt: nowIso(),
					errorState: undefined,
					generationModelName: modelName ?? shape.props.generationModelName,
					navigationLabel: bundle.title,
				},
			})
		} catch (error) {
			this.setErrorState(shapeId, {
				message: error instanceof Error ? error.message : 'Artifact regeneration failed.',
				source: 'generation',
				timestamp: nowIso(),
			})
			throw error
		}
	}

	refresh(shapeId: TLShapeId) {
		const shape = this.getShape(shapeId)
		if (!shape) return
		this.app.editor.updateShape({
			id: shape.id,
			type: ARTIFACT_SHAPE_TYPE,
			props: {
				lastRunAt: nowIso(),
			},
		})
	}

	duplicate(shapeId: TLShapeId) {
		const shape = this.getShape(shapeId)
		if (!shape) throw new Error('Artifact not found.')

		const record = parseArtifactRecord(shape)
		if (!record) throw new Error('Artifact data is invalid.')

		const nextId = createArtifactShapeId()
		const duplicatedTitle = `${record.title} Copy`
		const nextNavigation = getDefaultArtifactNavigationProps(duplicatedTitle, {
			parentCerebrusId: shape.props.parentCerebrusId,
			artifactKind: 'artifact',
		})

		this.app.editor.createShape({
			id: nextId,
			type: ARTIFACT_SHAPE_TYPE,
			x: shape.x + 48,
			y: shape.y + 48,
			props: {
				...shape.props,
				artifactId: createArtifactId(),
				title: duplicatedTitle,
				lastRunAt: nowIso(),
				navigationLabel: duplicatedTitle,
				...nextNavigation,
			},
		})

		this.app.editor.select(nextId)
		return nextId
	}

	setPreviewState(shapeId: TLShapeId, previewState: Record<string, unknown>) {
		const shape = this.getShape(shapeId)
		if (!shape) return

		const nextState = stringifyJson(previewState)
		if (shape.props.previewState === nextState) return

		this.app.editor.updateShape({
			id: shape.id,
			type: ARTIFACT_SHAPE_TYPE,
			props: {
				previewState: nextState,
			},
		})
	}

	setErrorState(shapeId: TLShapeId, errorState: ArtifactErrorState | null) {
		const shape = this.getShape(shapeId)
		if (!shape) return

		this.app.editor.updateShape({
			id: shape.id,
			type: ARTIFACT_SHAPE_TYPE,
			props: {
				status: errorState ? 'error' : shape.props.status,
				errorState: errorState ? stringifyJson(errorState) : undefined,
			},
		})
	}

	private getShape(shapeId: TLShapeId) {
		const shape = this.app.editor.getShape(shapeId)
		if (!shape || shape.type !== ARTIFACT_SHAPE_TYPE) return null
		return shape as ArtifactShape
	}
}
