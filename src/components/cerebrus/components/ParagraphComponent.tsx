import type { ParagraphRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

export function ParagraphComponent({ elementId, text }: ParagraphRenderableProps) {
	return <EditableRichText as="p" elementId={elementId} propKey="text" value={text} style={cerebrusTypography.paragraph} />
}
