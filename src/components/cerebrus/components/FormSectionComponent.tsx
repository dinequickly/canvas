import type { ReactNode } from 'react'
import type { FormSectionRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

type FormSectionComponentProps = Omit<FormSectionRenderableProps, 'children'> & {
	children?: ReactNode
}

export function FormSectionComponent({
	elementId,
	title,
	description,
	children,
}: FormSectionComponentProps) {
	return (
		<section style={cerebrusDocumentStyles.formSection}>
			<EditableRichText
				as="h3"
				elementId={elementId}
				propKey="title"
				value={title}
				style={cerebrusTypography.sectionTitle}
			/>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="description"
				value={description}
				style={cerebrusTypography.muted}
				allowEmpty
			/>
			<div style={cerebrusDocumentStyles.formSectionBody}>{children}</div>
		</section>
	)
}
