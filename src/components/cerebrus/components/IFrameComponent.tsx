import type { CSSProperties } from 'react'
import type { IFrameRenderableProps } from '../../../lib/cerebrus/registry'
import { useCerebrusEditing } from '../CerebrusEditingContext'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

const DEFAULT_IFRAME_HEIGHT = 420

const iframeStyle: CSSProperties = {
	display: 'block',
	width: '100%',
	border: 0,
	background: '#ffffff',
}

export function IFrameComponent({ elementId, src, title, height, caption }: IFrameRenderableProps) {
	const { isEditing } = useCerebrusEditing()

	return (
		<figure style={cerebrusDocumentStyles.iframe}>
			<div style={cerebrusDocumentStyles.iframeFrame}>
				<iframe
					src={src}
					title={title}
					loading="lazy"
					referrerPolicy="strict-origin-when-cross-origin"
					tabIndex={isEditing ? 0 : -1}
					style={{
						...iframeStyle,
						height: height ?? DEFAULT_IFRAME_HEIGHT,
						pointerEvents: isEditing ? 'auto' : 'none',
						zIndex: isEditing ? undefined : -1,
					}}
				/>
			</div>
			<EditableRichText
				as="figcaption"
				elementId={elementId}
				propKey={caption ? 'caption' : 'title'}
				value={caption ?? title}
				style={caption ? cerebrusTypography.caption : cerebrusTypography.iframeTitle}
				allowEmpty={Boolean(caption)}
			/>
		</figure>
	)
}
