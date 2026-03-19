import { Fragment } from 'react'
import { cerebrusRegistry } from '../../lib/cerebrus/registry'
import {
	type AnswerKeyProps,
	cerebrusSpecSchema,
	type CalloutProps,
	type ChartProps,
	type CerebrusSpec,
	type FormSectionProps,
	type HeadingProps,
	type IFrameProps,
	type InputFieldProps,
	type MetricGridProps,
	type MultipleChoiceProps,
	type PageProps,
	type ParagraphProps,
	type QuestionProps,
	type SectionProps,
	type TextProps,
	type TimelineProps,
	type VideoEmbedProps,
} from '../../lib/cerebrus/catalog'
import { CerebrusEditingContext, type CerebrusEditablePropKey } from './CerebrusEditingContext'

type RendererElement = {
	type: string
	props: Record<string, unknown>
	children?: string[]
}

export interface RendererProps {
	spec: {
		root: string
		elements: Record<string, RendererElement>
	}
	isEditing?: boolean
	onToggleEditing?: (next?: boolean) => void
	onUpdateElementText?: (elementId: string, propKey: CerebrusEditablePropKey, value: string | undefined) => void
}

function getChildIds(element: RendererElement | CerebrusSpec['elements'][string]) {
	if (Array.isArray(element.children)) {
		return element.children
	}

	const propsChildren =
		'children' in element.props && Array.isArray(element.props.children) ? element.props.children : undefined

	return Array.isArray(propsChildren) ? propsChildren.filter((child): child is string => typeof child === 'string') : []
}

function renderElement(elementId: string, spec: CerebrusSpec) {
	const element = spec.elements[elementId]
	if (!element) {
		return null
	}

	const children = getChildIds(element).map((childId) => (
		<Fragment key={childId}>{renderElement(childId, spec)}</Fragment>
	))

	if (element.type === 'Page') {
		const Component = cerebrusRegistry.Page
		const props = { ...(element.props as PageProps), children: undefined } satisfies Omit<PageProps, 'children'> & {
			children?: undefined
		}
		return <Component elementId={elementId} {...props} children={children} />
	}

	if (element.type === 'Section') {
		const Component = cerebrusRegistry.Section
		const props = {
			...(element.props as SectionProps),
			children: undefined,
		} satisfies Omit<SectionProps, 'children'> & { children?: undefined }
		return <Component elementId={elementId} {...props} children={children} />
	}

	if (element.type === 'Chart') {
		const Component = cerebrusRegistry.Chart
		const props = { ...(element.props as ChartProps) } satisfies ChartProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'MetricGrid') {
		const Component = cerebrusRegistry.MetricGrid
		const props = { ...(element.props as MetricGridProps) } satisfies MetricGridProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'Timeline') {
		const Component = cerebrusRegistry.Timeline
		const props = { ...(element.props as TimelineProps) } satisfies TimelineProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'VideoEmbed') {
		const Component = cerebrusRegistry.VideoEmbed
		const props = { ...(element.props as VideoEmbedProps) } satisfies VideoEmbedProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'Heading') {
		const Component = cerebrusRegistry.Heading
		const props = { ...(element.props as HeadingProps) } satisfies HeadingProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'IFrame') {
		const Component = cerebrusRegistry.IFrame
		const props = { ...(element.props as IFrameProps) } satisfies IFrameProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'Paragraph') {
		const Component = cerebrusRegistry.Paragraph
		const props = { ...(element.props as ParagraphProps) } satisfies ParagraphProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'Text') {
		const Component = cerebrusRegistry.Text
		const props = { ...(element.props as TextProps) } satisfies TextProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'FormSection') {
		const Component = cerebrusRegistry.FormSection
		const props = {
			...(element.props as FormSectionProps),
			children: undefined,
		} satisfies Omit<FormSectionProps, 'children'> & { children?: undefined }
		return <Component elementId={elementId} {...props} children={children} />
	}

	if (element.type === 'Question') {
		const Component = cerebrusRegistry.Question
		const props = {
			...(element.props as QuestionProps),
			children: undefined,
		} satisfies Omit<QuestionProps, 'children'> & { children?: undefined }
		return <Component elementId={elementId} {...props} children={children} />
	}

	if (element.type === 'InputField') {
		const Component = cerebrusRegistry.InputField
		const props = { ...(element.props as InputFieldProps) } satisfies InputFieldProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'MultipleChoice') {
		const Component = cerebrusRegistry.MultipleChoice
		const props = { ...(element.props as MultipleChoiceProps) } satisfies MultipleChoiceProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'AnswerKey') {
		const Component = cerebrusRegistry.AnswerKey
		const props = { ...(element.props as AnswerKeyProps) } satisfies AnswerKeyProps
		return <Component elementId={elementId} {...props} />
	}

	if (element.type === 'Callout') {
		const Component = cerebrusRegistry.Callout
		const props = { ...(element.props as CalloutProps) } satisfies CalloutProps
		return <Component elementId={elementId} {...props} />
	}

	return null
}

export function Renderer({ spec, isEditing = false, onToggleEditing, onUpdateElementText }: RendererProps) {
	const parsedSpec = cerebrusSpecSchema.parse(spec)

	return (
		<CerebrusEditingContext.Provider
			value={{
				isEditing,
				toggleEditing: onToggleEditing ?? (() => undefined),
				updateText: onUpdateElementText ?? (() => undefined),
			}}
		>
			{renderElement(parsedSpec.root, parsedSpec)}
		</CerebrusEditingContext.Provider>
	)
}
