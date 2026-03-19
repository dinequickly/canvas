import { stopEventPropagation } from '@tldraw/editor'
import type { ReactNode } from 'react'
import type { PageRenderableProps } from '../../../lib/cerebrus/registry'
import { useCerebrusEditing } from '../CerebrusEditingContext'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

type PageComponentProps = Omit<PageRenderableProps, 'children'> & {
	children?: ReactNode
}

export function PageComponent({ elementId, title, subtitle, background, children }: PageComponentProps) {
	const { isEditing, toggleEditing } = useCerebrusEditing()

	return (
		<div data-background={background} style={cerebrusDocumentStyles.page(background)}>
			<div style={cerebrusDocumentStyles.stack}>
				<div style={cerebrusDocumentStyles.pageChrome}>
					<button
						type="button"
						style={cerebrusDocumentStyles.pageEditButton(isEditing)}
						onPointerDown={stopEventPropagation}
						onMouseDown={stopEventPropagation}
						onClick={(event) => {
							stopEventPropagation(event)
							toggleEditing(!isEditing)
						}}
					>
						{isEditing ? 'Done' : 'Edit text'}
					</button>
				</div>
				<header style={cerebrusDocumentStyles.header}>
					<EditableRichText as="h1" elementId={elementId} propKey="title" value={title} style={cerebrusTypography.title} />
					<EditableRichText
						as="p"
						elementId={elementId}
						propKey="subtitle"
						value={subtitle}
						style={cerebrusTypography.subtitle}
						allowEmpty
					/>
				</header>
				<div style={cerebrusDocumentStyles.content}>{children}</div>
			</div>
		</div>
	)
}
