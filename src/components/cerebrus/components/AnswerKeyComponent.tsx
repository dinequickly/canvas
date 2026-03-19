import type { AnswerKeyRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

export function AnswerKeyComponent({ elementId, answer, explanation }: AnswerKeyRenderableProps) {
	return (
		<div style={cerebrusDocumentStyles.answerKey}>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="answer"
				value={answer}
				style={cerebrusTypography.answerText}
			/>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="explanation"
				value={explanation}
				style={cerebrusTypography.caption}
				allowEmpty
			/>
		</div>
	)
}
