import type { CSSProperties } from 'react'
import type { VideoEmbedRenderableProps } from '../../../lib/cerebrus/registry'
import { useCerebrusEditing } from '../CerebrusEditingContext'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

const videoFrameStyle: CSSProperties = {
	position: 'absolute',
	inset: 0,
	width: '100%',
	height: '100%',
	border: 0,
	background: '#000',
}

export function VideoEmbedComponent({
	elementId,
	src,
	title,
	provider,
	aspectRatio,
	caption,
}: VideoEmbedRenderableProps) {
	const { isEditing } = useCerebrusEditing()

	return (
		<figure style={cerebrusDocumentStyles.videoEmbed}>
			<div style={cerebrusDocumentStyles.videoEmbedFrame}>
				<div style={cerebrusDocumentStyles.videoEmbedSurface(aspectRatio)}>
					<iframe
						src={src}
						title={title}
						loading="lazy"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowFullScreen
						referrerPolicy="strict-origin-when-cross-origin"
						tabIndex={isEditing ? 0 : -1}
						style={{
							...videoFrameStyle,
							pointerEvents: isEditing ? 'auto' : 'none',
							zIndex: isEditing ? undefined : -1,
						}}
					/>
				</div>
			</div>
			<div style={metaRowStyle}>
				<EditableRichText
					as="figcaption"
					elementId={elementId}
					propKey="title"
					value={title}
					style={cerebrusTypography.iframeTitle}
				/>
				{provider ? <span style={providerBadgeStyle}>{provider}</span> : null}
			</div>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="caption"
				value={caption}
				style={cerebrusTypography.caption}
				allowEmpty
			/>
		</figure>
	)
}

const metaRowStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	justifyContent: 'space-between',
	gap: '0.75rem',
}

const providerBadgeStyle: CSSProperties = {
	display: 'inline-flex',
	alignItems: 'center',
	justifyContent: 'center',
	padding: '0.25rem 0.55rem',
	borderRadius: '999px',
	background: 'rgba(15, 23, 42, 0.08)',
	color: 'rgba(15, 23, 42, 0.74)',
	fontSize: '0.72rem',
	fontWeight: 800,
	letterSpacing: '0.04em',
	textTransform: 'uppercase',
}
