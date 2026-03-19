import { generateText, stepCountIs, tool } from 'ai'
import { IRequest } from 'itty-router'
import { z } from 'zod'
import { cerebrusSpecSchema } from '../../src/lib/cerebrus/catalog'
import {
	cerebrusOperationSchema,
	cerebrusOperationBatchSchema,
	type CerebrusOperation,
	type CerebrusOperationBatch,
	type CerebrusSpecPatch,
} from '../../src/lib/cerebrus/operations'
import { buildCerebrusSystemPrompt } from '../../src/lib/cerebrus/systemPrompt'
import { DEFAULT_MODEL_NAME, AgentModelName, isValidModelName } from '../../shared/models'
import { Environment } from '../environment'
import { AgentService } from '../do/AgentService'

const canvasPageSchema = z.object({
	shapeId: z.string().min(1),
	shapeType: z.string().min(1).optional(),
	title: z.string().min(1),
	rootType: z.string().min(1).optional(),
	spec: cerebrusSpecSchema,
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
})

const cerebrusRequestSchema = z
	.object({
		prompt: z.string().min(1),
		modelName: z.string().optional(),
		shapes: z.array(canvasPageSchema).optional(),
		selectedShapeIds: z.array(z.string()).optional(),
		pages: z.array(canvasPageSchema).optional(),
		selectedPageIds: z.array(z.string()).optional(),
	})
	.transform((value) => ({
		prompt: value.prompt,
		modelName: value.modelName,
		shapes: value.shapes ?? value.pages ?? [],
		selectedShapeIds: value.selectedShapeIds ?? value.selectedPageIds ?? [],
	}))

const DEFAULT_CEREBRUS_MODEL: AgentModelName = DEFAULT_MODEL_NAME

function extractJsonObject(text: string): unknown {
	const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
	const candidate = fencedMatch ? fencedMatch[1] : text

	const firstBrace = candidate.indexOf('{')
	const lastBrace = candidate.lastIndexOf('}')
	if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
		throw new Error('Model response did not contain a JSON object.')
	}

	return JSON.parse(candidate.slice(firstBrace, lastBrace + 1))
}

function normalizeElementType(type: unknown) {
	if (typeof type !== 'string') return type

	switch (type.toLowerCase()) {
		case 'page':
			return 'Page'
		case 'section':
			return 'Section'
		case 'chart':
			return 'Chart'
		case 'metricgrid':
		case 'metric-grid':
			return 'MetricGrid'
		case 'timeline':
			return 'Timeline'
		case 'videoembed':
		case 'video-embed':
			return 'VideoEmbed'
		case 'heading':
			return 'Heading'
		case 'iframe':
			return 'IFrame'
		case 'formsection':
		case 'form-section':
			return 'FormSection'
		case 'question':
			return 'Question'
		case 'inputfield':
		case 'input-field':
			return 'InputField'
		case 'multiplechoice':
		case 'multiple-choice':
			return 'MultipleChoice'
		case 'answerkey':
		case 'answer-key':
			return 'AnswerKey'
		case 'callout':
			return 'Callout'
		case 'paragraph':
			return 'Paragraph'
		case 'text':
			return 'Text'
		default:
			return type
	}
}

function normalizeSpecCandidate(candidate: unknown): unknown {
	if (!candidate || typeof candidate !== 'object') {
		return candidate
	}

	const rootObject =
		'spec' in candidate && candidate.spec && typeof candidate.spec === 'object' ? candidate.spec : candidate
	if (!rootObject || typeof rootObject !== 'object') {
		return candidate
	}

	const rootCandidate = rootObject as Record<string, unknown>
	const elementsCandidate = rootCandidate.elements

	let elements: Record<string, unknown> = {}
	if (Array.isArray(elementsCandidate)) {
		elements = Object.fromEntries(
			elementsCandidate
				.filter((element): element is Record<string, unknown> => !!element && typeof element === 'object')
				.map((element, index) => {
					const id = typeof element.id === 'string' && element.id.length > 0 ? element.id : `element-${index + 1}`
					return [id, element]
				})
		)
	} else if (elementsCandidate && typeof elementsCandidate === 'object') {
		elements = elementsCandidate as Record<string, unknown>
	}

	const normalizedElements = Object.fromEntries(
		Object.entries(elements).map(([id, rawElement]) => {
			if (!rawElement || typeof rawElement !== 'object') {
				return [id, rawElement]
			}

			const element = rawElement as Record<string, unknown>
			const type = normalizeElementType(element.type)
			const props =
				element.props && typeof element.props === 'object'
					? { ...(element.props as Record<string, unknown>) }
					: {}

			if (type === 'Page' || type === 'Section' || type === 'FormSection' || type === 'Question') {
				if (!Array.isArray(props.children) && Array.isArray(element.children)) {
					props.children = element.children
				}
			}

			if (type === 'Text') {
				if (typeof props.content !== 'string') {
					if (typeof element.text === 'string') props.content = element.text
					else if (typeof props.text === 'string') props.content = props.text
					else if (typeof element.content === 'string') props.content = element.content
				}
			}

			if (type === 'Paragraph') {
				if (typeof props.text !== 'string') {
					if (typeof element.text === 'string') props.text = element.text
					else if (typeof props.content === 'string') props.text = props.content
					else if (typeof element.content === 'string') props.text = element.content
				}
			}

			if (type === 'Heading') {
				if (typeof props.text !== 'string') {
					if (typeof element.text === 'string') props.text = element.text
					else if (typeof props.content === 'string') props.text = props.content
					else if (typeof element.content === 'string') props.text = element.content
				}
				if (typeof props.level === 'number') {
					props.level = String(props.level)
				}
			}

			return [id, { type, props }]
		})
	)

	const normalizedRoot =
		typeof rootCandidate.root === 'string'
			? rootCandidate.root
			: typeof rootCandidate.root === 'object' &&
				  rootCandidate.root &&
				  'id' in rootCandidate.root &&
				  typeof rootCandidate.root.id === 'string'
				? rootCandidate.root.id
				: undefined

	return {
		root: normalizedRoot,
		elements: normalizedElements,
	}
}

function normalizeSingleElementCandidate(value: unknown): unknown {
	const normalizedSpec = normalizeSpecCandidate({
		root: 'temp-root',
		elements: {
			'target-element': value,
		},
	})

	if (
		normalizedSpec &&
		typeof normalizedSpec === 'object' &&
		'elements' in normalizedSpec &&
		normalizedSpec.elements &&
		typeof normalizedSpec.elements === 'object'
	) {
		return (normalizedSpec.elements as Record<string, unknown>)['target-element']
	}

	return value
}

function normalizePatchCandidate(candidate: unknown): CerebrusSpecPatch {
	if (!candidate || typeof candidate !== 'object') {
		return {}
	}

	const raw = candidate as Record<string, unknown>
	const patchSource =
		'patch' in raw && raw.patch && typeof raw.patch === 'object'
			? (raw.patch as Record<string, unknown>)
			: 'specPatch' in raw && raw.specPatch && typeof raw.specPatch === 'object'
				? (raw.specPatch as Record<string, unknown>)
				: raw

	const fullSpecLike = normalizeSpecCandidate(patchSource)
	if (
		fullSpecLike &&
		typeof fullSpecLike === 'object' &&
		'root' in fullSpecLike &&
		'elements' in fullSpecLike
	) {
		return fullSpecLike as CerebrusSpecPatch
	}

	const elementsSource = patchSource.elements
	const normalizedElements =
		elementsSource && typeof elementsSource === 'object'
			? Object.fromEntries(
					Object.entries(elementsSource as Record<string, unknown>).map(([id, value]) => {
						if (value === null) return [id, null]
						return [id, normalizeSingleElementCandidate(value)]
					})
				)
			: undefined

	return {
		root: typeof patchSource.root === 'string' ? patchSource.root : undefined,
		elements: normalizedElements as CerebrusSpecPatch['elements'],
	}
}

function normalizeOperationBatchCandidate(candidate: unknown): unknown {
	if (!candidate || typeof candidate !== 'object') {
		return candidate
	}

	const raw = candidate as Record<string, unknown>
	if (!Array.isArray(raw.operations)) {
		// Backward compatibility: allow a single spec to become one create op
		return {
			operations: [
				{
					op: 'create',
					spec: normalizeSpecCandidate(candidate),
				},
			],
		}
	}

	return {
		operations: raw.operations.map((operation) => {
			const op = operation as Record<string, unknown>
			const opType =
				typeof op.op === 'string'
					? op.op
					: typeof op.type === 'string'
						? op.type
						: typeof op.action === 'string'
							? op.action
							: 'create'

			if (opType === 'patch' || opType === 'update') {
				return {
					op: 'patch',
					targetId:
						typeof op.targetId === 'string'
							? op.targetId
							: typeof op.shapeId === 'string'
								? op.shapeId
								: typeof op.id === 'string'
									? op.id
									: '',
					patch: normalizePatchCandidate(op.patch ?? op.specPatch ?? op.spec ?? op),
				}
			}

			return {
				op: 'create',
				spec: normalizeSpecCandidate(op.spec ?? op),
			}
		}),
	}
}

function formatZodError(error: z.ZodError) {
	return error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('\n')
}

function buildRequestPrompt(
	prompt: string,
	shapes: z.infer<typeof canvasPageSchema>[],
	selectedShapeIds: string[]
) {
	const shapeSummaries =
		shapes.length === 0
			? 'No existing Cerebrus shapes are currently on the canvas.'
			: shapes
					.map(
						(shape) =>
							`- ${shape.shapeId}: "${shape.title}" [root=${shape.rootType ?? 'unknown'}] at (${Math.round(
								shape.x
							)}, ${Math.round(shape.y)}) size ${Math.round(shape.w)}x${Math.round(shape.h)}`
					)
					.join('\n')

	const selectedSummary =
		selectedShapeIds.length > 0
			? `Selected Cerebrus shape IDs: ${selectedShapeIds.join(', ')}`
			: 'No Cerebrus shapes are currently selected.'

	return `User request:
${prompt}

Canvas shape index:
${shapeSummaries}

${selectedSummary}

If you need to edit an existing shape, call the read_shapes tool before returning patch operations.
If the user is clearly asking for multiple artifacts, return multiple create operations.
If the user is refining an existing selected shape, prefer patch operations targeted at the selected shape IDs.
Prefer the commit_shape_operations batch tool when the user clearly wants several artifacts at once.
Prefer the commit_shape_operation tool when you are adding or updating one artifact at a time.
Do not stop after emitting only one operation if the request clearly asks for more than one.`
}

async function generateCandidate(
	model: ReturnType<AgentService['getModel']>,
	prompt: string,
	shapes: z.infer<typeof canvasPageSchema>[],
	selectedShapeIds: string[],
	feedback?: string
) {
	const feedbackSection = feedback ? `\n\nPrevious draft problems:\n${feedback}\n\nReturn a corrected JSON object only.` : ''
	const emittedOperations: CerebrusOperation[] = []
	const result = await generateText({
		model,
		system: buildCerebrusSystemPrompt(),
		prompt: `${buildRequestPrompt(prompt, shapes, selectedShapeIds)}${feedbackSection}`,
		tools: {
			read_shapes: tool({
				description:
					'Read existing Cerebrus shapes and their stored specs before deciding which shape IDs to patch.',
				inputSchema: z.object({
					ids: z.array(z.string()).optional(),
				}),
				execute: async ({ ids }) => {
					const results = ids && ids.length > 0 ? shapes.filter((shape) => ids.includes(shape.shapeId)) : shapes
					return {
						shapes: results,
					}
				},
			}),
			commit_shape_operation: tool({
				description:
					'Queue exactly one Cerebrus create or patch operation. Call this once per artifact you want to create or update.',
				inputSchema: z.object({
					operation: cerebrusOperationSchema,
				}),
				execute: async ({ operation }) => {
					emittedOperations.push(operation)
					return {
						queued: true,
						op: operation.op,
						targetId: operation.op === 'patch' ? operation.targetId : undefined,
					}
				},
			}),
			commit_shape_operations: tool({
				description:
					'Queue multiple Cerebrus create or patch operations in one call. Prefer this when the user asks for several artifacts at once.',
				inputSchema: z.object({
					operations: z.array(cerebrusOperationSchema).min(1),
				}),
				execute: async ({ operations }) => {
					emittedOperations.push(...operations)
					return {
						queued: operations.length,
						ops: operations.map((operation) => operation.op),
					}
				},
			}),
		},
		stopWhen: stepCountIs(10),
	})

	return {
		text: result.text,
		operations: emittedOperations,
	}
}

function tryParseTextOperationBatch(text: string) {
	try {
		const candidate = normalizeOperationBatchCandidate(extractJsonObject(text))
		const parsed = cerebrusOperationBatchSchema.safeParse(candidate)
		return parsed.success ? parsed.data : null
	} catch {
		return null
	}
}

function mergeOperationBatches(...batches: Array<CerebrusOperationBatch | null>) {
	const merged: CerebrusOperation[] = []
	const seen = new Set<string>()

	for (const batch of batches) {
		if (!batch) continue

		for (const operation of batch.operations) {
			const signature = JSON.stringify(operation)
			if (seen.has(signature)) continue
			seen.add(signature)
			merged.push(operation)
		}
	}

	return merged.length > 0 ? cerebrusOperationBatchSchema.parse({ operations: merged }) : null
}

async function generateValidatedOperationBatch(
	model: ReturnType<AgentService['getModel']>,
	prompt: string,
	shapes: z.infer<typeof canvasPageSchema>[],
	selectedShapeIds: string[]
): Promise<CerebrusOperationBatch> {
	const firstDraft = await generateCandidate(model, prompt, shapes, selectedShapeIds)
	const firstToolBatch =
		firstDraft.operations.length > 0 ? cerebrusOperationBatchSchema.parse({ operations: firstDraft.operations }) : null
	const firstTextBatch = tryParseTextOperationBatch(firstDraft.text)
	const firstMergedBatch = mergeOperationBatches(firstToolBatch, firstTextBatch)

	if (firstMergedBatch) {
		return firstMergedBatch
	}

	const firstCandidate = normalizeOperationBatchCandidate(extractJsonObject(firstDraft.text))
	const firstParse = cerebrusOperationBatchSchema.safeParse(firstCandidate)

	if (firstParse.success) {
		return firstParse.data
	}

	const repairFeedback = `${formatZodError(firstParse.error)}\n\nPrevious draft:\n${JSON.stringify(firstCandidate, null, 2)}`
	const repairedDraft = await generateCandidate(model, prompt, shapes, selectedShapeIds, repairFeedback)
	const repairedToolBatch =
		repairedDraft.operations.length > 0
			? cerebrusOperationBatchSchema.parse({ operations: repairedDraft.operations })
			: null
	const repairedTextBatch = tryParseTextOperationBatch(repairedDraft.text)
	const repairedMergedBatch = mergeOperationBatches(repairedToolBatch, repairedTextBatch)

	if (repairedMergedBatch) {
		return repairedMergedBatch
	}

	const repairedCandidate = normalizeOperationBatchCandidate(extractJsonObject(repairedDraft.text))
	return cerebrusOperationBatchSchema.parse(repairedCandidate)
}

export async function cerebrus(request: IRequest, env: Environment) {
	try {
		const body = cerebrusRequestSchema.parse(await request.json())
		const modelName = isValidModelName(body.modelName) ? body.modelName : DEFAULT_CEREBRUS_MODEL

		const service = new AgentService(env)
		const model = service.getModel(modelName)
		const batch = await generateValidatedOperationBatch(model, body.prompt, body.shapes, body.selectedShapeIds)

		return Response.json({
			operations: batch.operations,
			modelName,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Failed to generate Cerebrus operations.'
		return Response.json({ error: message }, { status: 400 })
	}
}
