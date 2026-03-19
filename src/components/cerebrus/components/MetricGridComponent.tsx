import type { CSSProperties } from 'react'
import type { MetricGridRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

export function MetricGridComponent({ elementId, title, columns, metrics, caption }: MetricGridRenderableProps) {
	return (
		<figure style={cerebrusDocumentStyles.metricGrid}>
			<div style={cerebrusDocumentStyles.metricGridHeader}>
				<EditableRichText
					as="figcaption"
					elementId={elementId}
					propKey="title"
					value={title}
					style={cerebrusTypography.chartTitle}
					allowEmpty
				/>
				<EditableRichText
					as="p"
					elementId={elementId}
					propKey="caption"
					value={caption}
					style={cerebrusTypography.caption}
					allowEmpty
				/>
			</div>
			<div style={cerebrusDocumentStyles.metricGridItems(columns)}>
				{metrics.map((metric, index) => (
					<div key={`${elementId}-${index}`} style={cerebrusDocumentStyles.metricCard(metric.tone ?? 'default')}>
						<p style={metricLabelStyle}>{metric.label}</p>
						<p style={metricValueStyle}>{metric.value}</p>
						{metric.change ? <p style={metricChangeStyle(metric.tone ?? 'default')}>{metric.change}</p> : null}
					</div>
				))}
			</div>
		</figure>
	)
}

const metricLabelStyle: CSSProperties = {
	margin: 0,
	fontSize: '0.8rem',
	lineHeight: 1.3,
	fontWeight: 700,
	letterSpacing: '0.04em',
	textTransform: 'uppercase',
	color: 'rgba(71, 85, 105, 0.72)',
}

const metricValueStyle: CSSProperties = {
	margin: 0,
	fontSize: '2rem',
	lineHeight: 1,
	fontWeight: 800,
	letterSpacing: '-0.05em',
	color: '#0f172a',
}

function metricChangeStyle(tone: 'default' | 'success' | 'warning' | 'danger'): CSSProperties {
	const toneMap = {
		default: 'rgba(71, 85, 105, 0.78)',
		success: 'rgba(5, 150, 105, 0.86)',
		warning: 'rgba(180, 83, 9, 0.86)',
		danger: 'rgba(220, 38, 38, 0.86)',
	} as const

	return {
		margin: 0,
		fontSize: '0.9rem',
		lineHeight: 1.35,
		fontWeight: 700,
		color: toneMap[tone],
	}
}
