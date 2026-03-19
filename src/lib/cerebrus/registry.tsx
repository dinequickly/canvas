import type { ComponentType, ReactNode } from 'react'
import { AnswerKeyComponent } from '../../components/cerebrus/components/AnswerKeyComponent'
import { CalloutComponent } from '../../components/cerebrus/components/CalloutComponent'
import { ChartComponent } from '../../components/cerebrus/components/ChartComponent'
import { FormSectionComponent } from '../../components/cerebrus/components/FormSectionComponent'
import { HeadingComponent } from '../../components/cerebrus/components/HeadingComponent'
import { IFrameComponent } from '../../components/cerebrus/components/IFrameComponent'
import { InputFieldComponent } from '../../components/cerebrus/components/InputFieldComponent'
import { MetricGridComponent } from '../../components/cerebrus/components/MetricGridComponent'
import { MultipleChoiceComponent } from '../../components/cerebrus/components/MultipleChoiceComponent'
import { PageComponent } from '../../components/cerebrus/components/PageComponent'
import { ParagraphComponent } from '../../components/cerebrus/components/ParagraphComponent'
import { QuestionComponent } from '../../components/cerebrus/components/QuestionComponent'
import { SectionComponent } from '../../components/cerebrus/components/SectionComponent'
import { TextComponent } from '../../components/cerebrus/components/TextComponent'
import { TimelineComponent } from '../../components/cerebrus/components/TimelineComponent'
import { VideoEmbedComponent } from '../../components/cerebrus/components/VideoEmbedComponent'
import type {
	AnswerKeyProps,
	CalloutProps,
	ChartProps,
	CerebrusComponentType,
	FormSectionProps,
	HeadingProps,
	IFrameProps,
	InputFieldProps,
	MetricGridProps,
	MultipleChoiceProps,
	PageProps,
	ParagraphProps,
	QuestionProps,
	SectionProps,
	TextProps,
	TimelineProps,
	VideoEmbedProps,
} from './catalog'

export interface CerebrusRenderableProps {
	elementId: string
	children?: ReactNode
}

export type PageRenderableProps = Omit<PageProps, 'children'> & CerebrusRenderableProps
export type SectionRenderableProps = Omit<SectionProps, 'children'> & CerebrusRenderableProps
export type ChartRenderableProps = ChartProps & Pick<CerebrusRenderableProps, 'elementId'>
export type MetricGridRenderableProps = MetricGridProps & Pick<CerebrusRenderableProps, 'elementId'>
export type TimelineRenderableProps = TimelineProps & Pick<CerebrusRenderableProps, 'elementId'>
export type VideoEmbedRenderableProps = VideoEmbedProps & Pick<CerebrusRenderableProps, 'elementId'>
export type HeadingRenderableProps = HeadingProps & Pick<CerebrusRenderableProps, 'elementId'>
export type IFrameRenderableProps = IFrameProps & Pick<CerebrusRenderableProps, 'elementId'>
export type FormSectionRenderableProps = Omit<FormSectionProps, 'children'> & CerebrusRenderableProps
export type QuestionRenderableProps = Omit<QuestionProps, 'children'> & CerebrusRenderableProps
export type InputFieldRenderableProps = InputFieldProps & Pick<CerebrusRenderableProps, 'elementId'>
export type MultipleChoiceRenderableProps = MultipleChoiceProps & Pick<CerebrusRenderableProps, 'elementId'>
export type AnswerKeyRenderableProps = AnswerKeyProps & Pick<CerebrusRenderableProps, 'elementId'>
export type CalloutRenderableProps = CalloutProps & Pick<CerebrusRenderableProps, 'elementId'>
export type ParagraphRenderableProps = ParagraphProps & Pick<CerebrusRenderableProps, 'elementId'>
export type TextRenderableProps = TextProps & CerebrusRenderableProps

export type CerebrusComponentPropsMap = {
	Page: PageRenderableProps
	Section: SectionRenderableProps
	Chart: ChartRenderableProps
	MetricGrid: MetricGridRenderableProps
	Timeline: TimelineRenderableProps
	VideoEmbed: VideoEmbedRenderableProps
	Heading: HeadingRenderableProps
	IFrame: IFrameRenderableProps
	FormSection: FormSectionRenderableProps
	Question: QuestionRenderableProps
	InputField: InputFieldRenderableProps
	MultipleChoice: MultipleChoiceRenderableProps
	AnswerKey: AnswerKeyRenderableProps
	Callout: CalloutRenderableProps
	Paragraph: ParagraphRenderableProps
	Text: TextRenderableProps
}

export type CerebrusRegistry = {
	[K in CerebrusComponentType]: ComponentType<CerebrusComponentPropsMap[K]>
}

export const cerebrusRegistry: CerebrusRegistry = {
	Page: PageComponent,
	Section: SectionComponent,
	Chart: ChartComponent,
	MetricGrid: MetricGridComponent,
	Timeline: TimelineComponent,
	VideoEmbed: VideoEmbedComponent,
	Heading: HeadingComponent,
	IFrame: IFrameComponent,
	FormSection: FormSectionComponent,
	Question: QuestionComponent,
	InputField: InputFieldComponent,
	MultipleChoice: MultipleChoiceComponent,
	AnswerKey: AnswerKeyComponent,
	Callout: CalloutComponent,
	Paragraph: ParagraphComponent,
	Text: TextComponent,
}
