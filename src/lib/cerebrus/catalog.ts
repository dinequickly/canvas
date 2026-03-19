import { z } from 'zod'

export const cerebrusElementIdSchema = z.string().min(1)

export const pageBackgroundSchema = z.enum(['default', 'blurred', 'transparent'])

export const pagePropsSchema = z.object({
	title: z.string().min(1),
	subtitle: z.string().optional(),
	background: pageBackgroundSchema.optional().default('default'),
	children: z.array(cerebrusElementIdSchema).default([]),
})

export const pageElementSchema = z.object({
	type: z.literal('Page'),
	props: pagePropsSchema,
	children: z.array(cerebrusElementIdSchema).optional(),
})

export const sectionPropsSchema = z.object({
	title: z.string().min(1),
	children: z.array(cerebrusElementIdSchema).default([]),
})

export const sectionElementSchema = z.object({
	type: z.literal('Section'),
	props: sectionPropsSchema,
	children: z.array(cerebrusElementIdSchema).optional(),
})

export const chartKindSchema = z.enum(['line', 'bar', 'area'])

export const chartSeriesItemSchema = z.object({
	label: z.string().min(1),
	value: z.number(),
})

export const chartPropsSchema = z.object({
	title: z.string().min(1).optional(),
	kind: chartKindSchema,
	series: z.array(chartSeriesItemSchema),
	caption: z.string().min(1).optional(),
})

export const chartElementSchema = z.object({
	type: z.literal('Chart'),
	props: chartPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const metricToneSchema = z.enum(['default', 'success', 'warning', 'danger'])

export const metricGridItemSchema = z.object({
	label: z.string().min(1),
	value: z.string().min(1),
	change: z.string().optional(),
	tone: metricToneSchema.optional().default('default'),
})

export const metricGridColumnsSchema = z.enum(['2', '3', '4'])

export const metricGridPropsSchema = z.object({
	title: z.string().min(1).optional(),
	columns: metricGridColumnsSchema.optional().default('3'),
	metrics: z.array(metricGridItemSchema).min(1),
	caption: z.string().min(1).optional(),
})

export const metricGridElementSchema = z.object({
	type: z.literal('MetricGrid'),
	props: metricGridPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const timelineToneSchema = z.enum(['default', 'info', 'success', 'warning'])

export const timelineLayoutSchema = z.enum(['vertical', 'split'])

export const timelineEventSchema = z.object({
	title: z.string().min(1),
	text: z.string().min(1),
	date: z.string().optional(),
	tone: timelineToneSchema.optional().default('default'),
})

export const timelinePropsSchema = z.object({
	title: z.string().min(1).optional(),
	layout: timelineLayoutSchema.optional().default('vertical'),
	events: z.array(timelineEventSchema).min(1),
	caption: z.string().min(1).optional(),
})

export const timelineElementSchema = z.object({
	type: z.literal('Timeline'),
	props: timelinePropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const videoProviderSchema = z.enum(['youtube', 'vimeo', 'loom', 'generic'])
export const videoAspectRatioSchema = z.enum(['16:9', '4:3', '1:1'])

export const videoEmbedPropsSchema = z.object({
	src: z.string().min(1),
	title: z.string().min(1),
	provider: videoProviderSchema.optional().default('generic'),
	aspectRatio: videoAspectRatioSchema.optional().default('16:9'),
	caption: z.string().optional(),
})

export const videoEmbedElementSchema = z.object({
	type: z.literal('VideoEmbed'),
	props: videoEmbedPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const headingLevelSchema = z.enum(['1', '2', '3', '4'])

export const headingPropsSchema = z.object({
	text: z.string().min(1),
	level: headingLevelSchema,
})

export const headingElementSchema = z.object({
	type: z.literal('Heading'),
	props: headingPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const paragraphPropsSchema = z.object({
	text: z.string().min(1),
})

export const paragraphElementSchema = z.object({
	type: z.literal('Paragraph'),
	props: paragraphPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const textVariantSchema = z.enum(['body', 'caption', 'muted'])

export const textPropsSchema = z.object({
	content: z.string().min(1),
	variant: textVariantSchema.optional().default('body'),
})

export const textElementSchema = z.object({
	type: z.literal('Text'),
	props: textPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const iframePropsSchema = z.object({
	src: z.string().min(1),
	title: z.string().min(1),
	height: z.number().positive().optional(),
	caption: z.string().optional(),
})

export const iframeElementSchema = z.object({
	type: z.literal('IFrame'),
	props: iframePropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const formSectionPropsSchema = z.object({
	title: z.string().min(1),
	description: z.string().optional(),
	children: z.array(cerebrusElementIdSchema).default([]),
})

export const formSectionElementSchema = z.object({
	type: z.literal('FormSection'),
	props: formSectionPropsSchema,
	children: z.array(cerebrusElementIdSchema).optional(),
})

export const questionPropsSchema = z.object({
	prompt: z.string().min(1),
	children: z.array(cerebrusElementIdSchema).default([]),
})

export const questionElementSchema = z.object({
	type: z.literal('Question'),
	props: questionPropsSchema,
	children: z.array(cerebrusElementIdSchema).optional(),
})

export const inputFieldPropsSchema = z.object({
	label: z.string().min(1),
	placeholder: z.string().optional(),
	helperText: z.string().optional(),
})

export const inputFieldElementSchema = z.object({
	type: z.literal('InputField'),
	props: inputFieldPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const multipleChoicePropsSchema = z.object({
	label: z.string().optional(),
	options: z.array(z.string().min(1)).min(2),
	correctOption: z.string().optional(),
})

export const multipleChoiceElementSchema = z.object({
	type: z.literal('MultipleChoice'),
	props: multipleChoicePropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const answerKeyPropsSchema = z.object({
	answer: z.string().min(1),
	explanation: z.string().optional(),
})

export const answerKeyElementSchema = z.object({
	type: z.literal('AnswerKey'),
	props: answerKeyPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const calloutToneSchema = z.enum(['info', 'success', 'warning', 'danger'])

export const calloutPropsSchema = z.object({
	title: z.string().optional(),
	text: z.string().min(1),
	tone: calloutToneSchema.optional().default('info'),
})

export const calloutElementSchema = z.object({
	type: z.literal('Callout'),
	props: calloutPropsSchema,
	children: z.array(cerebrusElementIdSchema).max(0).optional(),
})

export const cerebrusCatalog = {
	Page: pageElementSchema,
	Section: sectionElementSchema,
	Chart: chartElementSchema,
	MetricGrid: metricGridElementSchema,
	Timeline: timelineElementSchema,
	VideoEmbed: videoEmbedElementSchema,
	Heading: headingElementSchema,
	Paragraph: paragraphElementSchema,
	Text: textElementSchema,
	IFrame: iframeElementSchema,
	FormSection: formSectionElementSchema,
	Question: questionElementSchema,
	InputField: inputFieldElementSchema,
	MultipleChoice: multipleChoiceElementSchema,
	AnswerKey: answerKeyElementSchema,
	Callout: calloutElementSchema,
} as const

export const documentPrimitiveTypes = [
	'Section',
	'Heading',
	'Paragraph',
	'Text',
	'FormSection',
	'Question',
	'InputField',
	'MultipleChoice',
	'AnswerKey',
	'Callout',
] as const

export const cerebrusElementSchema = z.discriminatedUnion('type', [
	pageElementSchema,
	sectionElementSchema,
	chartElementSchema,
	metricGridElementSchema,
	timelineElementSchema,
	videoEmbedElementSchema,
	headingElementSchema,
	paragraphElementSchema,
	textElementSchema,
	iframeElementSchema,
	formSectionElementSchema,
	questionElementSchema,
	inputFieldElementSchema,
	multipleChoiceElementSchema,
	answerKeyElementSchema,
	calloutElementSchema,
])

const documentPrimitiveTypeSet = new Set<string>(documentPrimitiveTypes)

function getReferencedChildren(element: z.infer<typeof cerebrusElementSchema>) {
	if (Array.isArray(element.children)) {
		return element.children
	}

	if ('children' in element.props && Array.isArray(element.props.children)) {
		return element.props.children
	}

	return []
}

function getRootValidationMessage(type: string) {
	return documentPrimitiveTypeSet.has(type)
		? `${type} is a document primitive and can only exist inside a Page.`
		: `Unknown root type "${type}".`
}

export const cerebrusSpecSchema = z
	.object({
		root: cerebrusElementIdSchema,
		elements: z.record(z.string(), cerebrusElementSchema),
	})
	.superRefine((spec, ctx) => {
		const rootElement = spec.elements[spec.root]
		if (!rootElement) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: `Root element "${spec.root}" is missing from elements.`,
				path: ['root'],
			})
			return
		}

		if (documentPrimitiveTypeSet.has(rootElement.type)) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: getRootValidationMessage(rootElement.type),
				path: ['root'],
			})
		}

		const parentCounts = new Map<string, number>()

		for (const [elementId, element] of Object.entries(spec.elements)) {
			const childIds = getReferencedChildren(element)
			const uniqueChildIds = new Set<string>()

			for (const childId of childIds) {
				if (!spec.elements[childId]) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Element "${elementId}" references missing child "${childId}".`,
						path: ['elements', elementId],
					})
					continue
				}

				if (uniqueChildIds.has(childId)) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Element "${elementId}" references child "${childId}" more than once.`,
						path: ['elements', elementId],
					})
					continue
				}

				uniqueChildIds.add(childId)
				parentCounts.set(childId, (parentCounts.get(childId) ?? 0) + 1)
			}

			if (!['Page', 'Section', 'FormSection', 'Question'].includes(element.type) && childIds.length > 0) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${element.type} "${elementId}" cannot have children.`,
					path: ['elements', elementId],
				})
			}
		}

		for (const [elementId, count] of parentCounts.entries()) {
			if (elementId === spec.root) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Root element "${elementId}" cannot also be referenced as a child.`,
					path: ['elements', elementId],
				})
				continue
			}

			if (count > 1) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Element "${elementId}" is referenced by multiple parents.`,
					path: ['elements', elementId],
				})
			}
		}

		const reachable = new Set<string>()
		const stack = new Set<string>()

		const visit = (elementId: string, insidePage: boolean) => {
			const element = spec.elements[elementId]
			if (!element) return

			if (stack.has(elementId)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Cycle detected at element "${elementId}".`,
					path: ['elements', elementId],
				})
				return
			}

			reachable.add(elementId)
			stack.add(elementId)

			const inPageSubtree = insidePage || element.type === 'Page'
			if (documentPrimitiveTypeSet.has(element.type) && !inPageSubtree) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `${element.type} "${elementId}" can only exist inside a Page.`,
					path: ['elements', elementId],
				})
			}

			for (const childId of getReferencedChildren(element)) {
				const child = spec.elements[childId]
				if (!child) continue

				if (child.type === 'Page') {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						message: `Page "${childId}" cannot be nested inside another element.`,
						path: ['elements', elementId],
					})
					continue
				}

				visit(childId, inPageSubtree)
			}

			stack.delete(elementId)
		}

		visit(spec.root, false)

		for (const elementId of Object.keys(spec.elements)) {
			if (!reachable.has(elementId)) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: `Element "${elementId}" is unreachable from the root.`,
					path: ['elements', elementId],
				})
			}
		}
	})

export const cerebrusSurfaceTypes = Object.keys(cerebrusCatalog).filter(
	(type) => !documentPrimitiveTypeSet.has(type)
) as Array<keyof typeof cerebrusCatalog>

export const cerebrusComponentDocs = [
	{
		type: 'Page',
		description:
			'Rich document root. Page is root-capable and may contain any registered non-Page Cerebrus component.',
		props: {
			title: 'Required string.',
			subtitle: 'Optional string.',
			background: 'Optional enum: "default" | "blurred" | "transparent". Defaults to "default".',
			children: 'Array of child element IDs. Page may contain any registered component except Page.',
		},
	},
	{
		type: 'Section',
		description:
			'Document section container used to group related content inside a Page subtree. Section cannot be used as a standalone root.',
		props: {
			title: 'Required string.',
			children: 'Array of child element IDs. Section may contain any registered component except Page.',
		},
	},
	{
		type: 'Chart',
		description:
			'Inline or standalone chart primitive for lightweight data visualization. Chart may be the root of a Cerebrus shape or a child inside a Page.',
		props: {
			title: 'Optional string.',
			kind: 'Required enum: "line" | "bar" | "area".',
			series: 'Required array of objects shaped like { label: string, value: number }.',
			caption: 'Optional string.',
		},
	},
	{
		type: 'MetricGrid',
		description:
			'Standalone or inline metric summary surface for KPIs, highlights, and at-a-glance stats. MetricGrid may be the root of a Cerebrus shape or a child inside a Page.',
		props: {
			title: 'Optional string.',
			columns: 'Optional enum: "2" | "3" | "4". Defaults to "3".',
			metrics: 'Required array of objects shaped like { label: string, value: string, change?: string, tone?: "default" | "success" | "warning" | "danger" }.',
			caption: 'Optional string.',
		},
	},
	{
		type: 'Timeline',
		description:
			'Standalone or inline sequence surface for roadmaps, histories, milestones, and ordered processes. Timeline may be the root of a Cerebrus shape or a child inside a Page.',
		props: {
			title: 'Optional string.',
			layout: 'Optional enum: "vertical" | "split". Defaults to "vertical".',
			events: 'Required array of objects shaped like { title: string, text: string, date?: string, tone?: "default" | "info" | "success" | "warning" }.',
			caption: 'Optional string.',
		},
	},
	{
		type: 'VideoEmbed',
		description:
			'Standalone or inline video surface for lessons, walkthroughs, and demos. VideoEmbed may be the root of a Cerebrus shape or a child inside a Page.',
		props: {
			src: 'Required string.',
			title: 'Required string.',
			provider: 'Optional enum: "youtube" | "vimeo" | "loom" | "generic". Defaults to "generic".',
			aspectRatio: 'Optional enum: "16:9" | "4:3" | "1:1". Defaults to "16:9".',
			caption: 'Optional string.',
		},
	},
	{
		type: 'Heading',
		description: 'Document heading. Heading can only exist inside a Page subtree.',
		props: {
			text: 'Required string.',
			level: 'Required enum: "1" | "2" | "3" | "4".',
		},
	},
	{
		type: 'Paragraph',
		description: 'Primary long-form prose block. Paragraph can only exist inside a Page subtree.',
		props: {
			text: 'Required string.',
		},
	},
	{
		type: 'Text',
		description: 'Flexible text primitive for body copy, captions, and muted supporting text. Text can only exist inside a Page subtree.',
		props: {
			content: 'Required string.',
			variant: 'Optional enum: "body" | "caption" | "muted". Defaults to "body".',
		},
	},
	{
		type: 'IFrame',
		description:
			'Embedded external document or media block. IFrame may be the root of a Cerebrus shape or a child inside a Page.',
		props: {
			src: 'Required string.',
			title: 'Required string.',
			height: 'Optional positive number. Defaults to a document-appropriate embed height when omitted.',
			caption: 'Optional string.',
		},
	},
	{
		type: 'FormSection',
		description: 'Page-only form grouping container for lesson and test content.',
		props: {
			title: 'Required string.',
			description: 'Optional supporting description.',
			children: 'Array of child element IDs for questions, callouts, or form controls.',
		},
	},
	{
		type: 'Question',
		description: 'Page-only question container used inside forms.',
		props: {
			prompt: 'Required question prompt string.',
			children: 'Array of child element IDs for InputField, MultipleChoice, AnswerKey, or Callout.',
		},
	},
	{
		type: 'InputField',
		description: 'Page-only read/write form field visual for short answers.',
		props: {
			label: 'Required field label.',
			placeholder: 'Optional placeholder string.',
			helperText: 'Optional helper text.',
		},
	},
	{
		type: 'MultipleChoice',
		description: 'Page-only multiple choice block.',
		props: {
			label: 'Optional label for the answer group.',
			options: 'Required array of two or more option strings.',
			correctOption: 'Optional correct option string.',
		},
	},
	{
		type: 'AnswerKey',
		description: 'Page-only answer and explanation block.',
		props: {
			answer: 'Required answer string.',
			explanation: 'Optional explanation string.',
		},
	},
	{
		type: 'Callout',
		description: 'Page-only highlighted note block.',
		props: {
			title: 'Optional callout title.',
			text: 'Required callout body text.',
			tone: 'Optional enum: "info" | "success" | "warning" | "danger". Defaults to "info".',
		},
	},
] as const

function truncateLabel(value: string, limit = 60) {
	return value.length > limit ? `${value.slice(0, limit - 1)}…` : value
}

export function getCerebrusElementLabel(element: z.infer<typeof cerebrusElementSchema>) {
	switch (element.type) {
		case 'Page':
			return element.props.title
		case 'Section':
			return element.props.title
		case 'Chart':
			return element.props.title ?? `${element.props.kind} chart`
		case 'MetricGrid':
			return element.props.title ?? 'Metric grid'
		case 'Timeline':
			return element.props.title ?? 'Timeline'
		case 'VideoEmbed':
			return element.props.title
		case 'Heading':
			return truncateLabel(element.props.text)
		case 'Paragraph':
			return truncateLabel(element.props.text)
		case 'Text':
			return truncateLabel(element.props.content)
		case 'IFrame':
			return element.props.title
		case 'FormSection':
			return element.props.title
		case 'Question':
			return truncateLabel(element.props.prompt)
		case 'InputField':
			return element.props.label
		case 'MultipleChoice':
			return element.props.label ?? 'Multiple choice'
		case 'AnswerKey':
			return truncateLabel(element.props.answer)
		case 'Callout':
			return element.props.title ?? truncateLabel(element.props.text)
	}
}

export type PageProps = z.infer<typeof pagePropsSchema>
export type PageElement = z.infer<typeof pageElementSchema>
export type SectionProps = z.infer<typeof sectionPropsSchema>
export type SectionElement = z.infer<typeof sectionElementSchema>
export type ChartKind = z.infer<typeof chartKindSchema>
export type ChartSeriesItem = z.infer<typeof chartSeriesItemSchema>
export type ChartProps = z.infer<typeof chartPropsSchema>
export type ChartElement = z.infer<typeof chartElementSchema>
export type MetricTone = z.infer<typeof metricToneSchema>
export type MetricGridItem = z.infer<typeof metricGridItemSchema>
export type MetricGridProps = z.infer<typeof metricGridPropsSchema>
export type MetricGridElement = z.infer<typeof metricGridElementSchema>
export type TimelineTone = z.infer<typeof timelineToneSchema>
export type TimelineLayout = z.infer<typeof timelineLayoutSchema>
export type TimelineEvent = z.infer<typeof timelineEventSchema>
export type TimelineProps = z.infer<typeof timelinePropsSchema>
export type TimelineElement = z.infer<typeof timelineElementSchema>
export type VideoProvider = z.infer<typeof videoProviderSchema>
export type VideoAspectRatio = z.infer<typeof videoAspectRatioSchema>
export type VideoEmbedProps = z.infer<typeof videoEmbedPropsSchema>
export type VideoEmbedElement = z.infer<typeof videoEmbedElementSchema>
export type HeadingProps = z.infer<typeof headingPropsSchema>
export type HeadingElement = z.infer<typeof headingElementSchema>
export type ParagraphProps = z.infer<typeof paragraphPropsSchema>
export type ParagraphElement = z.infer<typeof paragraphElementSchema>
export type TextProps = z.infer<typeof textPropsSchema>
export type TextElement = z.infer<typeof textElementSchema>
export type IFrameProps = z.infer<typeof iframePropsSchema>
export type IFrameElement = z.infer<typeof iframeElementSchema>
export type FormSectionProps = z.infer<typeof formSectionPropsSchema>
export type FormSectionElement = z.infer<typeof formSectionElementSchema>
export type QuestionProps = z.infer<typeof questionPropsSchema>
export type QuestionElement = z.infer<typeof questionElementSchema>
export type InputFieldProps = z.infer<typeof inputFieldPropsSchema>
export type InputFieldElement = z.infer<typeof inputFieldElementSchema>
export type MultipleChoiceProps = z.infer<typeof multipleChoicePropsSchema>
export type MultipleChoiceElement = z.infer<typeof multipleChoiceElementSchema>
export type AnswerKeyProps = z.infer<typeof answerKeyPropsSchema>
export type AnswerKeyElement = z.infer<typeof answerKeyElementSchema>
export type CalloutProps = z.infer<typeof calloutPropsSchema>
export type CalloutElement = z.infer<typeof calloutElementSchema>
export type CerebrusElement = z.infer<typeof cerebrusElementSchema>
export type CerebrusSpec = z.infer<typeof cerebrusSpecSchema>
export type CerebrusComponentType = keyof typeof cerebrusCatalog
export type DocumentPrimitiveType = (typeof documentPrimitiveTypes)[number]
