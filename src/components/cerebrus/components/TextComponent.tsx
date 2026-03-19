import type { ReactNode } from 'react'
import type { TextRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

type TextComponentProps = TextRenderableProps & {
	children?: ReactNode
}

export function TextComponent({ elementId, content, variant }: TextComponentProps) {
	const style =
		variant === 'caption'
			? cerebrusTypography.caption
			: variant === 'muted'
				? cerebrusTypography.muted
				: cerebrusTypography.paragraph

	return <EditableRichText as="p" elementId={elementId} propKey="content" value={content} style={style} />
}
