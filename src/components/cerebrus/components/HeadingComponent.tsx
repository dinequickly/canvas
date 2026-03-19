import type { CSSProperties } from 'react'
import type { HeadingProps } from '../../../lib/cerebrus/catalog'
import type { HeadingRenderableProps } from '../../../lib/cerebrus/registry'
import { EditableRichText } from './EditableRichText'

const headingStyles: Record<HeadingProps['level'], CSSProperties> = {
	'1': {
		fontSize: '2.35rem',
		lineHeight: 1.05,
		fontWeight: 800,
		letterSpacing: '-0.04em',
		margin: 0,
	},
	'2': {
		fontSize: '1.9rem',
		lineHeight: 1.1,
		fontWeight: 760,
		letterSpacing: '-0.03em',
		margin: 0,
	},
	'3': {
		fontSize: '1.45rem',
		lineHeight: 1.2,
		fontWeight: 700,
		letterSpacing: '-0.025em',
		margin: 0,
	},
	'4': {
		fontSize: '1.15rem',
		lineHeight: 1.28,
		fontWeight: 700,
		letterSpacing: '-0.02em',
		margin: 0,
	},
}

export function HeadingComponent({ elementId, text, level }: HeadingRenderableProps) {
	switch (level) {
		case '1':
			return <EditableRichText as="h1" elementId={elementId} propKey="text" value={text} style={headingStyles['1']} />
		case '2':
			return <EditableRichText as="h2" elementId={elementId} propKey="text" value={text} style={headingStyles['2']} />
		case '3':
			return <EditableRichText as="h3" elementId={elementId} propKey="text" value={text} style={headingStyles['3']} />
		case '4':
			return <EditableRichText as="h4" elementId={elementId} propKey="text" value={text} style={headingStyles['4']} />
		default:
			return null
	}
}
