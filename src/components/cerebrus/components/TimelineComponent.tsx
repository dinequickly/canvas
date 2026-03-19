import type { CSSProperties } from 'react'
import type { TimelineRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

export function TimelineComponent({ elementId, title, layout, events, caption }: TimelineRenderableProps) {
	return (
		<figure style={cerebrusDocumentStyles.timeline}>
			<EditableRichText
				as="figcaption"
				elementId={elementId}
				propKey="title"
				value={title}
				style={cerebrusTypography.chartTitle}
				allowEmpty
			/>
			<div style={cerebrusDocumentStyles.timelineRail(layout)}>
				{events.map((event, index) => (
					<article
						key={`${elementId}-${index}`}
						style={{
							...cerebrusDocumentStyles.timelineEvent(event.tone ?? 'default'),
							gridColumn: layout === 'split' ? ((index % 2) + 1).toString() : undefined,
						}}
					>
						{event.date ? <p style={eventDateStyle}>{event.date}</p> : null}
						<h3 style={eventTitleStyle}>{event.title}</h3>
						<p style={eventBodyStyle}>{event.text}</p>
					</article>
				))}
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

const eventDateStyle: CSSProperties = {
	margin: 0,
	fontSize: '0.8rem',
	lineHeight: 1.3,
	fontWeight: 700,
	letterSpacing: '0.04em',
	textTransform: 'uppercase',
	color: 'rgba(71, 85, 105, 0.68)',
}

const eventTitleStyle: CSSProperties = {
	margin: 0,
	fontSize: '1.15rem',
	lineHeight: 1.2,
	fontWeight: 760,
	letterSpacing: '-0.03em',
	color: '#0f172a',
}

const eventBodyStyle: CSSProperties = {
	margin: 0,
	fontSize: '0.98rem',
	lineHeight: 1.55,
	fontWeight: 500,
	color: 'rgba(51, 65, 85, 0.84)',
}
