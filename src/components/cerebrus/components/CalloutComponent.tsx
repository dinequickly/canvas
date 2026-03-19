import type { CalloutRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

export function CalloutComponent({ elementId, title, text, tone }: CalloutRenderableProps) {
	return (
		<aside style={cerebrusDocumentStyles.callout(tone ?? 'info')}>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="title"
				value={title}
				style={cerebrusTypography.formLabel}
				allowEmpty
			/>
			<EditableRichText as="p" elementId={elementId} propKey="text" value={text} style={cerebrusTypography.fieldText} />
		</aside>
	)
}
