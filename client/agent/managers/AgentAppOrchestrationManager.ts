import { EditorAtom, uniqueId } from 'tldraw'
import { fetchCerebrusOperations } from '../../cerebrus/requestCerebrusOperations'
import { applyCerebrusOperationBatch } from '../../cerebrus/applyCerebrusOperations'
import { readCerebrusShapes } from '../../cerebrus/readCerebrusPageShapes'
import { createCerebrusArtifactId, type CerebrusShapeNavigationProps } from '../../cerebrus/shapeMeta'
import { cerebrusSpecSchema, type CerebrusSpec } from '../../../src/lib/cerebrus/catalog'
import type {
	AgentCompletionReport,
	AgentArtifactSummary,
	CanvasRegion,
	OrchestrationStoreState,
	OrchestratorAgentRecord,
	SpawnAgentInput,
} from '../../orchestration/types'
import { BaseAgentAppManager } from './BaseAgentAppManager'

const MAX_ORCHESTRATION_DEPTH = 3
const SERIES_PROMPT_REGEX =
	/(?:build|create|make)?\s*(?:me\s+|a\s+|an\s+)?(\d{1,2})[\s-]*part\s+(series|module|course)\s+(?:on|about)\s+(.+)/i

const CALC1_UNITS = [
	{
		title: 'Limits and Continuity',
		topics: ['Evaluating limits', 'Continuity checklist', 'Limit laws'],
		lessons: ['Reading graphs of limits', 'One-sided limits', 'Continuity practice'],
		tests: ['Limits checkpoint'],
	},
	{
		title: 'Derivatives',
		topics: ['Derivative definition', 'Rules of differentiation', 'Applications of tangent lines'],
		lessons: ['Difference quotient', 'Power and product rules', 'Derivative word problems'],
		tests: ['Derivative skills quiz'],
	},
	{
		title: 'Applications of Derivatives',
		topics: ['Optimization', 'Related rates', 'Curve sketching'],
		lessons: ['Optimization workflow', 'Related rates setup', 'First derivative test'],
		tests: ['Applications exit ticket'],
	},
	{
		title: 'Integrals',
		topics: ['Antiderivatives', 'Area accumulation', 'Definite integrals'],
		lessons: ['Reverse power rule', 'Riemann sum intuition', 'Fundamental theorem setup'],
		tests: ['Integrals check-in'],
	},
	{
		title: 'Accumulation and Review',
		topics: ['Net change', 'Average value', 'Exam review'],
		lessons: ['Accumulation functions', 'Average value practice', 'Mixed review'],
		tests: ['Course review form'],
	},
] as const

function getEmptyState(): OrchestrationStoreState {
	return {
		agents: {},
		rootAgentIds: [],
	}
}

function partitionHorizontal(region: CanvasRegion, count: number, gap = 40): CanvasRegion[] {
	if (count <= 0) return []
	const totalGap = gap * Math.max(0, count - 1)
	const itemWidth = (region.width - totalGap) / count

	return Array.from({ length: count }, (_, index) => ({
		x: region.x + index * (itemWidth + gap),
		y: region.y,
		width: itemWidth,
		height: region.height,
	}))
}

function partitionVertical(region: CanvasRegion, count: number, gap = 24): CanvasRegion[] {
	if (count <= 0) return []
	const totalGap = gap * Math.max(0, count - 1)
	const itemHeight = (region.height - totalGap) / count

	return Array.from({ length: count }, (_, index) => ({
		x: region.x,
		y: region.y + index * (itemHeight + gap),
		width: region.width,
		height: itemHeight,
	}))
}

function splitCourseRegion(region: CanvasRegion) {
	const headerHeight = Math.min(180, Math.max(120, region.height * 0.16))
	const gap = 36

	return {
		header: {
			x: region.x,
			y: region.y,
			width: region.width,
			height: headerHeight,
		},
		content: {
			x: region.x,
			y: region.y + headerHeight + gap,
			width: region.width,
			height: Math.max(320, region.height - headerHeight - gap),
		},
	}
}

function buildCourseSummarySpec(title: string, unitTitles: string[]): CerebrusSpec {
	return cerebrusSpecSchema.parse({
		root: 'course-page',
		elements: {
			'course-page': {
				type: 'Page',
				props: {
					title,
					subtitle: 'Course map',
					background: 'default',
					children: ['course-section'],
				},
			},
			'course-section': {
				type: 'Section',
				props: {
					title: 'Units',
					children: ['course-summary'],
				},
			},
			'course-summary': {
				type: 'Text',
				props: {
					content: unitTitles.join(' · '),
					variant: 'muted',
				},
			},
		},
	})
}

function buildUnitOverviewPrompt(unitTitle: string, topics: string[]) {
	return `Create exactly one Page titled "${unitTitle}" with subtitle "Calc 1 unit overview". Use one Section titled "Core ideas" and include Text or Paragraph content summarizing these topics: ${topics.join(
		', '
	)}. Add one Callout encouraging the learner to focus on patterns and vocabulary.`
}

function buildLessonOrTestPrompt(itemTitle: string, topics: string[], isTest: boolean) {
	const assessmentTone = isTest ? 'assessment' : 'lesson'
	const answerSectionTitle = isTest ? 'Answer key' : 'Worked example'

	return `Create exactly one Page titled "${itemTitle}" with subtitle "Calc 1 ${assessmentTone} form". The page should feel like a focused worksheet. Include:
- a FormSection titled "Warm-up"
- a Question with an InputField
- a Question with a MultipleChoice block using 3 or 4 options
- a FormSection titled "${answerSectionTitle}"
- an AnswerKey with a concise answer and explanation
- a Callout with tone "info"
Keep the form centered on these topics: ${topics.join(', ')}.`
}

type Calc1Unit = (typeof CALC1_UNITS)[number]

type ParsedSeriesPrompt = {
	partCount: number
	seriesKind: 'series' | 'module' | 'course'
	topic: string
}

export type OrchestrationWorkflowHint = 'auto' | 'series' | 'calc1-course'

function parseSeriesPrompt(prompt: string): ParsedSeriesPrompt | null {
	const match = prompt.trim().match(SERIES_PROMPT_REGEX)
	if (!match) return null

	const partCount = Number.parseInt(match[1], 10)
	if (!Number.isFinite(partCount) || partCount < 2 || partCount > 12) {
		return null
	}

	const rawTopic = match[3]?.trim().replace(/[.?!]\s*$/, '')
	if (!rawTopic) return null

	const seriesKind = match[2].toLowerCase() as ParsedSeriesPrompt['seriesKind']
	return {
		partCount,
		seriesKind,
		topic: rawTopic,
	}
}

function toTitleCase(value: string) {
	return value
		.split(/\s+/)
		.filter(Boolean)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join(' ')
}

function buildSeriesRootSpec(topic: string, partCount: number, seriesKind: ParsedSeriesPrompt['seriesKind']): CerebrusSpec {
	return cerebrusSpecSchema.parse({
		root: 'series-page',
		elements: {
			'series-page': {
				type: 'Page',
				props: {
					title: toTitleCase(topic),
					subtitle: `${partCount}-part ${seriesKind}`,
					background: 'default',
					children: ['series-section'],
				},
			},
			'series-section': {
				type: 'Section',
				props: {
					title: 'Series overview',
					children: ['series-summary', 'series-callout'],
				},
			},
			'series-summary': {
				type: 'Paragraph',
				props: {
					text: `A structured ${partCount}-part ${seriesKind} focused on ${topic}. Open each lesson to explore the sequence in order.`,
				},
			},
				'series-callout': {
					type: 'Callout',
					props: {
						tone: 'info',
						title: 'Suggested flow',
						text: 'Start with fundamentals, then move into worked examples, then finish with practice or synthesis.',
					},
				},
		},
	})
}

function buildSeriesPartPrompt(topic: string, partNumber: number, partCount: number) {
	return `Create exactly one Page for part ${partNumber} of a ${partCount}-part series on ${topic}. Give the page a specific part title beginning with "Part ${partNumber}:". Make it feel like a substantial lesson, not a stub. Include an introduction, key concepts, multiple worked examples, a short practice section, an AnswerKey, and a closing summary. Use Callouts for definitions or important ideas when useful.`
}

export class AgentAppOrchestrationManager extends BaseAgentAppManager {
	private static $state = new EditorAtom<OrchestrationStoreState>('orchestration', getEmptyState)
	private runPromises = new Map<string, Promise<void>>()

	getState(): OrchestrationStoreState {
		return AgentAppOrchestrationManager.$state.get(this.app.editor)
	}

	private updateState(updater: (state: OrchestrationStoreState) => OrchestrationStoreState) {
		AgentAppOrchestrationManager.$state.update(this.app.editor, updater)
	}

	reset() {
		this.runPromises.clear()
		AgentAppOrchestrationManager.$state.set(this.app.editor, getEmptyState())
	}

	shouldHandlePrompt(prompt: string) {
		return /build\s+(an?\s+)?calc\s*1\s+course/i.test(prompt) || parseSeriesPrompt(prompt) !== null
	}

	startFromPrompt(prompt: string, region: CanvasRegion) {
		const parsedSeries = parseSeriesPrompt(prompt)
		if (parsedSeries) {
			return this.startOrchestration(
				prompt,
				{
					workflowType: 'series',
					prompt,
					topic: parsedSeries.topic,
					partCount: parsedSeries.partCount,
					seriesKind: parsedSeries.seriesKind,
					cerebrusId: createCerebrusArtifactId(),
				},
				region
			)
		}

		return this.startOrchestration(
			prompt,
			{
				workflowType: 'calc1-course',
				prompt,
				courseSlug: 'calc-1',
				expectedTopics: CALC1_UNITS.map((unit) => unit.title),
				cerebrusId: createCerebrusArtifactId(),
			},
			region
		)
	}

	startFromAction(prompt: string, region: CanvasRegion, workflowHint: OrchestrationWorkflowHint = 'auto') {
		if (workflowHint === 'auto') {
			return this.startFromPrompt(prompt, region)
		}

		if (workflowHint === 'series') {
			const parsedSeries = parseSeriesPrompt(prompt)
			if (!parsedSeries) {
				throw new Error('Series orchestration requires a prompt like "3 part series on ..." so the workflow can be inferred.')
			}

			return this.startOrchestration(
				prompt,
				{
					workflowType: 'series',
					prompt,
					topic: parsedSeries.topic,
					partCount: parsedSeries.partCount,
					seriesKind: parsedSeries.seriesKind,
					cerebrusId: createCerebrusArtifactId(),
				},
				region
			)
		}

		return this.startOrchestration(
			prompt,
			{
				workflowType: 'calc1-course',
				prompt,
				courseSlug: 'calc-1',
				expectedTopics: CALC1_UNITS.map((unit) => unit.title),
				cerebrusId: createCerebrusArtifactId(),
			},
			region
		)
	}

	startOrchestration(rootBrief: string, rootContext: Record<string, unknown>, rootRegion: CanvasRegion) {
		const rootRecord = this.createRecord({
			brief: rootBrief,
			sharedContext: rootContext,
			canvasRegion: rootRegion,
		})

		this.updateState((state) => ({
			...state,
			rootAgentIds: [...state.rootAgentIds, rootRecord.agentId],
		}))

		this.queueAgentRun(rootRecord.agentId)
		return rootRecord
	}

	spawnAgent(parentAgentId: string, input: SpawnAgentInput) {
		const parent = this.getAgentRecord(parentAgentId)
		if (!parent) {
			throw new Error(`Parent orchestrator agent "${parentAgentId}" was not found.`)
		}

		if (parent.depth >= MAX_ORCHESTRATION_DEPTH) {
			throw new Error(`Agent "${parentAgentId}" cannot spawn more children because max depth ${MAX_ORCHESTRATION_DEPTH} was reached.`)
		}

		const child = this.createRecord(input, parentAgentId, parent.depth + 1)

		this.updateState((state) => ({
			...state,
			agents: {
				...state.agents,
				[parentAgentId]: {
					...state.agents[parentAgentId],
					childAgentIds: [...state.agents[parentAgentId].childAgentIds, child.agentId],
				},
			},
		}))

		this.queueAgentRun(child.agentId)
		return child
	}

	getAgentRecord(agentId: string) {
		return this.getState().agents[agentId] ?? null
	}

	getChildReports(agentId: string) {
		return this.getDescendantRecords(agentId).map((record) => ({
			agentId: record.agentId,
			report: record.completionReport,
			status: record.status,
		}))
	}

	submitCompletionReport(agentId: string, report: AgentCompletionReport) {
		this.updateState((state) => ({
			...state,
			agents: {
				...state.agents,
				[agentId]: {
					...state.agents[agentId],
					completionReport: report,
					status:
						state.agents[agentId]?.status === 'approved'
							? 'approved'
							: report.status === 'needs-review'
								? 'needs-review'
								: report.status === 'blocked'
									? 'blocked'
									: 'complete',
				},
			},
		}))
	}

	approveChildWork(targetAgentId: string) {
		this.updateState((state) => ({
			...state,
			agents: {
				...state.agents,
				[targetAgentId]: {
					...state.agents[targetAgentId],
					status: 'approved',
				},
			},
		}))
	}

	respawnAgent(
		targetAgentId: string,
		updatedBrief: string,
		sharedContext?: Record<string, unknown>,
		canvasRegion?: CanvasRegion
	) {
		const target = this.getAgentRecord(targetAgentId)
		if (!target || !target.parentAgentId) {
			throw new Error(`Cannot respawn agent "${targetAgentId}" because it has no parent.`)
		}

		return this.spawnAgent(target.parentAgentId, {
			brief: updatedBrief,
			sharedContext: sharedContext ?? target.sharedContext,
			canvasRegion: canvasRegion ?? target.assignedRegion,
		})
	}

	async runParentReview(agentId: string) {
		const record = this.getAgentRecord(agentId)
		if (!record) return null

		const childReports = this.getDirectChildRecords(agentId).map((child) => ({
			agentId: child.agentId,
			report: child.completionReport,
			status: child.status,
		}))
		const duplicateTopics = new Set<string>()
		const seenTopics = new Set<string>()
		const flags: string[] = []
		const questions: string[] = []
		const expectedTopics = Array.isArray(record.sharedContext.expectedTopics)
			? record.sharedContext.expectedTopics.map(String)
			: []

		for (const child of childReports) {
			if (!child.report) {
				flags.push(`Child agent ${child.agentId} has no completion report.`)
				continue
			}

			for (const topic of child.report.topicsCovered) {
				if (seenTopics.has(topic)) {
					duplicateTopics.add(topic)
				}
				seenTopics.add(topic)
			}

			flags.push(...child.report.flags)
			questions.push(...child.report.questionsForParent)
		}

		if (duplicateTopics.size > 0) {
			flags.push(`Overlap detected: ${Array.from(duplicateTopics).join(', ')}`)
		}

		if (expectedTopics.length > 0) {
			const missingTopics = expectedTopics.filter((topic) => !seenTopics.has(topic))
			if (missingTopics.length > 0) {
				flags.push(`Coverage gap: ${missingTopics.join(', ')}`)
			}
		}

		const nextStatus = flags.length > 0 ? 'needs-review' : 'approved'
		this.updateState((state) => ({
			...state,
			agents: {
				...state.agents,
				[agentId]: {
					...state.agents[agentId],
					status: nextStatus,
				},
			},
		}))

		return {
			agentId,
			status: nextStatus,
			flags,
			questions,
			childCount: childReports.length,
		}
	}

	private createRecord(
		input: SpawnAgentInput,
		parentAgentId: string | null = null,
		depth = 0
	): OrchestratorAgentRecord {
		const agentId = uniqueId()
		const record: OrchestratorAgentRecord = {
			agentId,
			parentAgentId,
			depth,
			status: 'idle',
			brief: input.brief,
			sharedContext: input.sharedContext,
			assignedRegion: input.canvasRegion,
			childAgentIds: [],
			completionReport: null,
		}

		this.updateState((state) => ({
			...state,
			agents: {
				...state.agents,
				[agentId]: record,
			},
		}))

		return record
	}

	private queueAgentRun(agentId: string) {
		const promise = this.runAgent(agentId).catch((error) => {
			console.error(error)
			const message = error instanceof Error ? error.message : 'Unknown orchestration error.'
			this.submitCompletionReport(agentId, {
				createdShapeIds: [],
				artifactSummaries: [],
				topicsCovered: [],
				flags: [message],
				questionsForParent: [],
				status: 'blocked',
			})
			this.app.options.onError(error)
		}).finally(() => {
			this.runPromises.delete(agentId)
		})

		this.runPromises.set(agentId, promise)
	}

	private async runAgent(agentId: string) {
		const record = this.getAgentRecord(agentId)
		if (!record) return

		this.updateState((state) => ({
			...state,
			agents: {
				...state.agents,
				[agentId]: {
					...state.agents[agentId],
					status: 'running',
				},
			},
		}))

		const workflowType = typeof record.sharedContext.workflowType === 'string' ? record.sharedContext.workflowType : 'calc1-course'

		if (workflowType === 'series') {
			if (record.depth === 0) {
				await this.runSeriesRootAgent(record)
				return
			}

			await this.runSeriesPartAgent(record)
			return
		}

		if (record.depth === 0) {
			await this.runRootAgent(record)
			return
		}

		if (record.depth === 1) {
			await this.runUnitAgent(record)
			return
		}

		await this.runLeafAgent(record)
	}

	private async runSeriesRootAgent(record: OrchestratorAgentRecord) {
		const topic = String(record.sharedContext.topic ?? 'Untitled series')
		const partCount =
			typeof record.sharedContext.partCount === 'number' && record.sharedContext.partCount > 1
				? record.sharedContext.partCount
				: 3
		const seriesKind =
			record.sharedContext.seriesKind === 'module' || record.sharedContext.seriesKind === 'course'
				? record.sharedContext.seriesKind
				: 'series'
		const rootCerebrusId = String(record.sharedContext.cerebrusId ?? createCerebrusArtifactId())
		const seriesLayout = splitCourseRegion(record.assignedRegion)
		const partRegions = partitionHorizontal(seriesLayout.content, partCount, 32)
		const partDescriptors = Array.from({ length: partCount }, (_, index) => ({
			partNumber: index + 1,
			cerebrusId: createCerebrusArtifactId(),
			orderIndex: index,
		}))

		const overview = await this.createSpecIntoRegion(
			seriesLayout.header,
			buildSeriesRootSpec(topic, partCount, seriesKind),
			[toTitleCase(topic)],
			{
				cerebrusId: rootCerebrusId,
				artifactKind: 'course',
				childCerebrusIds: partDescriptors.map((part) => part.cerebrusId),
				displayMode: 'map',
				navigationLabel: toTitleCase(topic),
			}
		)

		partDescriptors.forEach((part, index) => {
			this.spawnAgent(record.agentId, {
				brief: `Build part ${part.partNumber} of a ${partCount}-part ${seriesKind} on ${topic}.`,
				sharedContext: {
					workflowType: 'series',
					topic,
					partCount,
					partNumber: part.partNumber,
					parentCerebrusId: rootCerebrusId,
					cerebrusId: part.cerebrusId,
					orderIndex: part.orderIndex,
				},
				canvasRegion: partRegions[index],
			})
		})

		const latestRecord = this.getAgentRecord(record.agentId)
		await this.waitForChildren(latestRecord?.childAgentIds ?? [])

		const aggregate = this.collectDescendantArtifacts(record.agentId)
		this.submitCompletionReport(record.agentId, {
			createdShapeIds: [...overview.createdShapeIds, ...aggregate.createdShapeIds],
			artifactSummaries: [...overview.artifactSummaries, ...aggregate.artifactSummaries],
			topicsCovered: [topic],
			flags: [],
			questionsForParent: [],
			status: 'complete',
		})
	}

	private async runSeriesPartAgent(record: OrchestratorAgentRecord) {
		const topic = String(record.sharedContext.topic ?? 'Untitled series')
		const partCount =
			typeof record.sharedContext.partCount === 'number' && record.sharedContext.partCount > 1
				? record.sharedContext.partCount
				: 3
		const partNumber =
			typeof record.sharedContext.partNumber === 'number' && record.sharedContext.partNumber > 0
				? record.sharedContext.partNumber
				: record.depth

		const result = await this.generateIntoRegion(
			record.assignedRegion,
			buildSeriesPartPrompt(topic, partNumber, partCount),
			[topic, `Part ${partNumber}`],
			{
				cerebrusId:
					typeof record.sharedContext.cerebrusId === 'string'
						? record.sharedContext.cerebrusId
						: createCerebrusArtifactId(),
				artifactKind: 'lesson',
				parentCerebrusId:
					typeof record.sharedContext.parentCerebrusId === 'string'
						? record.sharedContext.parentCerebrusId
						: undefined,
				orderIndex:
					typeof record.sharedContext.orderIndex === 'number'
						? record.sharedContext.orderIndex
						: undefined,
				displayMode: 'map',
			}
		)

		this.submitCompletionReport(record.agentId, {
			createdShapeIds: result.createdShapeIds,
			artifactSummaries: result.artifactSummaries,
			topicsCovered: [topic, `Part ${partNumber}`],
			flags: [],
			questionsForParent: [],
			status: 'complete',
		})
	}

	private async runRootAgent(record: OrchestratorAgentRecord) {
		const courseLayout = splitCourseRegion(record.assignedRegion)
		const unitRegions = partitionHorizontal(courseLayout.content, CALC1_UNITS.length, 48)
		const courseCerebrusId = String(record.sharedContext.cerebrusId ?? createCerebrusArtifactId())
		const unitDescriptors = CALC1_UNITS.map((unit, index) => ({
			unit,
			region: unitRegions[index],
			cerebrusId: createCerebrusArtifactId(),
			orderIndex: index,
		}))

		const courseSummary = await this.createSpecIntoRegion(
			courseLayout.header,
			buildCourseSummarySpec('Calc 1', CALC1_UNITS.map((unit) => unit.title)),
			['Calc 1'],
			{
				cerebrusId: courseCerebrusId,
				artifactKind: 'course',
				childCerebrusIds: unitDescriptors.map((descriptor) => descriptor.cerebrusId),
				displayMode: 'map',
				navigationLabel: 'Calc 1',
			}
		)

		unitDescriptors.forEach(({ unit, region, cerebrusId, orderIndex }) => {
			this.spawnAgent(record.agentId, {
				brief: `Build the ${unit.title} unit for a Calc 1 course.`,
				sharedContext: {
					courseTitle: 'Calc 1',
					unit,
					expectedTopics: [...unit.lessons, ...unit.tests],
					courseCerebrusId,
					cerebrusId,
					orderIndex,
				},
				canvasRegion: region,
			})
		})

		const latestRecord = this.getAgentRecord(record.agentId)
		await this.waitForChildren(latestRecord?.childAgentIds ?? [])

		const aggregate = this.collectDescendantArtifacts(record.agentId)
		this.submitCompletionReport(record.agentId, {
			createdShapeIds: [...courseSummary.createdShapeIds, ...aggregate.createdShapeIds],
			artifactSummaries: [...courseSummary.artifactSummaries, ...aggregate.artifactSummaries],
			topicsCovered: CALC1_UNITS.map((unit) => unit.title),
			flags: [],
			questionsForParent: [],
			status: 'complete',
		})
		await this.runParentReview(record.agentId)
	}

	private async runUnitAgent(record: OrchestratorAgentRecord) {
		const unit = record.sharedContext.unit as Calc1Unit
		const slots = partitionVertical(record.assignedRegion, unit.lessons.length + unit.tests.length + 1, 24)
		const unitCerebrusId = String(record.sharedContext.cerebrusId ?? createCerebrusArtifactId())
		const courseCerebrusId =
			typeof record.sharedContext.courseCerebrusId === 'string'
				? record.sharedContext.courseCerebrusId
				: undefined
		const lessonAndTestEntries = [
			...unit.lessons.map((lesson) => ({
				title: lesson,
				isTest: false,
				artifactKind: 'lesson' as const,
			})),
			...unit.tests.map((test) => ({
				title: test,
				isTest: true,
				artifactKind: 'test' as const,
			})),
		].map((entry, index) => ({
			...entry,
			cerebrusId: createCerebrusArtifactId(),
			orderIndex: index,
		}))

		const overview = await this.generateIntoRegion(
			slots[0],
			buildUnitOverviewPrompt(unit.title, [...unit.topics]),
			[unit.title, ...unit.topics],
			{
				cerebrusId: unitCerebrusId,
				artifactKind: 'unit',
				parentCerebrusId: courseCerebrusId,
				childCerebrusIds: lessonAndTestEntries.map((entry) => entry.cerebrusId),
				orderIndex:
					typeof record.sharedContext.orderIndex === 'number' ? record.sharedContext.orderIndex : undefined,
				displayMode: 'map',
				navigationLabel: unit.title,
			}
		)

		lessonAndTestEntries.forEach((entry, index) => {
			const focusedTopics = [unit.topics[index % unit.topics.length]]

			this.spawnAgent(record.agentId, {
				brief: `${entry.isTest ? 'Build a test form' : 'Build a lesson form'} for ${entry.title}.`,
				sharedContext: {
					courseTitle: 'Calc 1',
					unitTitle: unit.title,
					title: entry.title,
					isTest: entry.isTest,
					topics: focusedTopics,
					cerebrusId: entry.cerebrusId,
					parentCerebrusId: unitCerebrusId,
					orderIndex: entry.orderIndex,
					artifactKind: entry.artifactKind,
				},
				canvasRegion: slots[index + 1],
			})
		})

		const latestRecord = this.getAgentRecord(record.agentId)
		await this.waitForChildren(latestRecord?.childAgentIds ?? [])

		const aggregate = this.collectDescendantArtifacts(record.agentId)
		this.submitCompletionReport(record.agentId, {
			createdShapeIds: [...overview.createdShapeIds, ...aggregate.createdShapeIds],
			artifactSummaries: [...overview.artifactSummaries, ...aggregate.artifactSummaries],
			topicsCovered: [...unit.topics, ...unit.lessons, ...unit.tests],
			flags: [],
			questionsForParent: [],
			status: 'complete',
		})
		await this.runParentReview(record.agentId)
	}

	private async runLeafAgent(record: OrchestratorAgentRecord) {
		const title = String(record.sharedContext.title ?? 'Calc 1 form')
		const isTest = Boolean(record.sharedContext.isTest)
		const topics = Array.isArray(record.sharedContext.topics)
			? record.sharedContext.topics.map(String)
			: [String(record.sharedContext.unitTitle ?? 'Calc 1')]
		const artifactKind =
			record.sharedContext.artifactKind === 'test'
				? 'test'
				: record.sharedContext.artifactKind === 'practice'
					? 'practice'
					: 'lesson'

		const result = await this.generateIntoRegion(
			record.assignedRegion,
			buildLessonOrTestPrompt(title, topics, isTest),
			[title],
			{
				cerebrusId:
					typeof record.sharedContext.cerebrusId === 'string'
						? record.sharedContext.cerebrusId
						: createCerebrusArtifactId(),
				artifactKind,
				parentCerebrusId:
					typeof record.sharedContext.parentCerebrusId === 'string'
						? record.sharedContext.parentCerebrusId
						: undefined,
				orderIndex:
					typeof record.sharedContext.orderIndex === 'number'
						? record.sharedContext.orderIndex
						: undefined,
				displayMode: 'map',
				navigationLabel: title,
			}
		)

		this.submitCompletionReport(record.agentId, {
			createdShapeIds: result.createdShapeIds,
			artifactSummaries: result.artifactSummaries,
			topicsCovered: [title],
			flags: [],
			questionsForParent: [],
			status: 'complete',
		})
	}

	private async createSpecIntoRegion(
		region: CanvasRegion,
		spec: CerebrusSpec,
		topicsCovered: string[],
		navigationProps?: CerebrusShapeNavigationProps
	) {
		const createdShapeIds = applyCerebrusOperationBatch(
			this.app.editor,
			{ operations: [{ op: 'create', spec }] },
			{
				region,
				createLayout: 'vertical',
				selectCreated: false,
				createNavigationProps: navigationProps ? [navigationProps] : undefined,
			}
		)

		const createdIdSet = new Set(createdShapeIds.map((shapeId) => String(shapeId)))
		const artifactSummaries = readCerebrusShapes(this.app.editor)
			.filter((shape) => createdIdSet.has(String(shape.shapeId)))
			.map((shape) => ({
				shapeId: String(shape.shapeId),
				rootType: shape.rootType,
				title: shape.title,
			}))

		return {
			createdShapeIds: createdShapeIds.map(String),
			artifactSummaries,
			topicsCovered,
		}
	}

	private async generateIntoRegion(
		region: CanvasRegion,
		prompt: string,
		topicsCovered: string[],
		navigationProps?: CerebrusShapeNavigationProps
	) {
		const response = await fetchCerebrusOperations(this.app.editor, prompt, {
			selectedShapeIds: [],
		})
		const createdShapeIds = applyCerebrusOperationBatch(
			this.app.editor,
			{ operations: response.operations },
			{
				region,
				createLayout: 'vertical',
				selectCreated: false,
				createNavigationProps: navigationProps ? [navigationProps] : undefined,
			}
		)

		const createdIdSet = new Set(createdShapeIds.map((shapeId) => String(shapeId)))
		const artifactSummaries = readCerebrusShapes(this.app.editor)
			.filter((shape) => createdIdSet.has(String(shape.shapeId)))
			.map((shape) => ({
				shapeId: String(shape.shapeId),
				rootType: shape.rootType,
				title: shape.title,
			}))

		return {
			createdShapeIds: createdShapeIds.map(String),
			artifactSummaries,
			topicsCovered,
		}
	}

	private getDirectChildRecords(agentId: string) {
		const parent = this.getAgentRecord(agentId)
		if (!parent) return []

		return parent.childAgentIds
			.map((childId) => this.getAgentRecord(childId))
			.filter((record): record is OrchestratorAgentRecord => Boolean(record))
	}

	private getDescendantRecords(agentId: string): OrchestratorAgentRecord[] {
		const descendants: OrchestratorAgentRecord[] = []

		const visit = (parentId: string) => {
			for (const child of this.getDirectChildRecords(parentId)) {
				descendants.push(child)
				visit(child.agentId)
			}
		}

		visit(agentId)
		return descendants
	}

	private async waitForChildren(childIds: string[]) {
		const waits = childIds
			.map((childId) => this.runPromises.get(childId))
			.filter((promise): promise is Promise<void> => Boolean(promise))
		await Promise.all(waits)
	}

	private collectDescendantArtifacts(agentId: string) {
		const createdShapeIds = new Set<string>()
		const artifactById = new Map<string, AgentArtifactSummary>()

		for (const record of this.getDescendantRecords(agentId)) {
			const report = record.completionReport
			if (!report) continue

			for (const shapeId of report.createdShapeIds) {
				createdShapeIds.add(shapeId)
			}

			for (const artifact of report.artifactSummaries) {
				artifactById.set(artifact.shapeId, artifact)
			}
		}

		return {
			createdShapeIds: Array.from(createdShapeIds),
			artifactSummaries: Array.from(artifactById.values()),
		}
	}
}
