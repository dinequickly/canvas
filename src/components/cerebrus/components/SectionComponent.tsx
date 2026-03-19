import type { ReactNode } from 'react'
import type { SectionRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

type SectionComponentProps = Omit<SectionRenderableProps, 'children'> & {
	children?: ReactNode
}

export function SectionComponent({ elementId, title, children }: SectionComponentProps) {
	return (
		<section style={cerebrusDocumentStyles.section}>
			<EditableRichText as="h2" elementId={elementId} propKey="title" value={title} style={cerebrusTypography.sectionTitle} />
			<div style={cerebrusDocumentStyles.sectionBody}>{children}</div>
		</section>
	)
}
