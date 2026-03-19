import type { ReactNode } from 'react'
import type { QuestionRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

type QuestionComponentProps = Omit<QuestionRenderableProps, 'children'> & {
	children?: ReactNode
}

export function QuestionComponent({ elementId, prompt, children }: QuestionComponentProps) {
	return (
		<div style={cerebrusDocumentStyles.question}>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="prompt"
				value={prompt}
				style={cerebrusTypography.questionPrompt}
			/>
			<div style={cerebrusDocumentStyles.questionBody}>{children}</div>
		</div>
	)
}
