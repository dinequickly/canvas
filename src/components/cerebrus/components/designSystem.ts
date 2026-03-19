import type { CSSProperties } from 'react'
import type { PageProps } from '../../../lib/cerebrus/catalog'

type CerebrusDocumentStyleMap = {
	page: (background: PageProps['background']) => CSSProperties
	stack: CSSProperties
	pageChrome: CSSProperties
	pageEditButton: (isEditing: boolean) => CSSProperties
	header: CSSProperties
	content: CSSProperties
	section: CSSProperties
	sectionBody: CSSProperties
	formSection: CSSProperties
	formSectionBody: CSSProperties
	question: CSSProperties
	questionBody: CSSProperties
	inputField: CSSProperties
	inputFieldSurface: CSSProperties
	multipleChoice: CSSProperties
	multipleChoiceOptions: CSSProperties
	multipleChoiceOption: CSSProperties
	answerKey: CSSProperties
	callout: (tone: 'info' | 'success' | 'warning' | 'danger') => CSSProperties
	chart: CSSProperties
	chartFrame: CSSProperties
	chartEmptyState: CSSProperties
	metricGrid: CSSProperties
	metricGridHeader: CSSProperties
	metricGridItems: (columns: '2' | '3' | '4') => CSSProperties
	metricCard: (tone: 'default' | 'success' | 'warning' | 'danger') => CSSProperties
	timeline: CSSProperties
	timelineRail: (layout: 'vertical' | 'split') => CSSProperties
	timelineEvent: (tone: 'default' | 'info' | 'success' | 'warning') => CSSProperties
	videoEmbed: CSSProperties
	videoEmbedFrame: CSSProperties
	videoEmbedSurface: (aspectRatio: '16:9' | '4:3' | '1:1') => CSSProperties
	iframe: CSSProperties
	iframeFrame: CSSProperties
}

export const cerebrusTypography = {
	title: {
		fontSize: 'clamp(3rem, 5vw, 5.5rem)',
		lineHeight: 0.96,
		fontWeight: 800,
		letterSpacing: '-0.05em',
		margin: 0,
	},
	subtitle: {
		fontSize: '1.5rem',
		lineHeight: 1.4,
		fontWeight: 600,
		color: 'rgba(15, 23, 42, 0.62)',
		margin: 0,
	},
	sectionTitle: {
		fontSize: '1.1rem',
		lineHeight: 1.35,
		fontWeight: 700,
		letterSpacing: '-0.02em',
		margin: 0,
	},
	paragraph: {
		fontSize: '1.15rem',
		lineHeight: 1.75,
		fontWeight: 400,
		letterSpacing: '-0.01em',
		margin: 0,
	},
	caption: {
		fontSize: '0.92rem',
		lineHeight: 1.55,
		fontWeight: 500,
		margin: 0,
	},
	muted: {
		fontSize: '1rem',
		lineHeight: 1.65,
		fontWeight: 500,
		color: 'rgba(15, 23, 42, 0.6)',
		margin: 0,
	},
	chartTitle: {
		fontSize: '1rem',
		lineHeight: 1.4,
		fontWeight: 700,
		letterSpacing: '-0.015em',
		margin: 0,
	},
	iframeTitle: {
		fontSize: '0.98rem',
		lineHeight: 1.45,
		fontWeight: 600,
		letterSpacing: '-0.01em',
		color: 'rgba(15, 23, 42, 0.78)',
		margin: 0,
	},
	formLabel: {
		fontSize: '0.96rem',
		lineHeight: 1.45,
		fontWeight: 700,
		letterSpacing: '-0.01em',
		margin: 0,
	},
	questionPrompt: {
		fontSize: '1.02rem',
		lineHeight: 1.55,
		fontWeight: 600,
		letterSpacing: '-0.012em',
		margin: 0,
	},
	fieldText: {
		fontSize: '1rem',
		lineHeight: 1.6,
		fontWeight: 500,
		color: 'rgba(15, 23, 42, 0.75)',
		margin: 0,
	},
	answerText: {
		fontSize: '1rem',
		lineHeight: 1.65,
		fontWeight: 600,
		margin: 0,
	},
} satisfies Record<string, CSSProperties>

export const cerebrusDocumentStyles: CerebrusDocumentStyleMap = {
	page(background: PageProps['background']) {
		const backgroundMap = {
			default:
				'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.95) 100%)',
			blurred: 'rgba(255,255,255,0.82)',
			transparent: 'transparent',
		} as const

		return {
			position: 'relative',
			height: '100%',
			width: '100%',
			padding: '3.5rem 3.25rem 4rem',
			borderRadius: '28px',
			background: backgroundMap[background],
			backdropFilter: background === 'blurred' ? 'blur(24px) saturate(140%)' : undefined,
			WebkitBackdropFilter: background === 'blurred' ? 'blur(24px) saturate(140%)' : undefined,
			border:
				background === 'transparent'
					? '1px dashed rgba(148, 163, 184, 0.45)'
					: '1px solid rgba(255, 255, 255, 0.8)',
			boxShadow:
				background === 'transparent'
					? 'none'
					: '0 28px 60px rgba(15, 23, 42, 0.12), inset 0 1px 0 rgba(255,255,255,0.75)',
			color: '#0f172a',
			overflow: 'auto',
		} satisfies CSSProperties
	},
	stack: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1.6rem',
	},
	pageChrome: {
		display: 'flex',
		justifyContent: 'flex-end',
		marginBottom: '0.25rem',
	},
	pageEditButton(isEditing: boolean) {
		return {
			appearance: 'none',
			border: isEditing ? '1px solid rgba(37, 99, 235, 0.35)' : '1px solid rgba(148, 163, 184, 0.24)',
			background: isEditing ? 'rgba(37, 99, 235, 0.12)' : 'rgba(255, 255, 255, 0.82)',
			color: '#0f172a',
			borderRadius: '999px',
			padding: '0.55rem 0.95rem',
			fontSize: '0.84rem',
			fontWeight: 700,
			letterSpacing: '-0.01em',
			cursor: 'pointer',
			boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)',
			backdropFilter: 'blur(14px)',
			WebkitBackdropFilter: 'blur(14px)',
		} satisfies CSSProperties
	},
	header: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1.25rem',
		marginBottom: '2rem',
	},
	content: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '2.5rem',
	},
	section: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1rem',
	},
	sectionBody: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1rem',
	},
	formSection: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1rem',
		padding: '1.35rem 1.4rem',
		borderRadius: '24px',
		border: '1px solid rgba(148, 163, 184, 0.16)',
		background: 'rgba(255, 255, 255, 0.62)',
		boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
	},
	formSectionBody: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1rem',
	},
	question: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.85rem',
		padding: '1rem 1.05rem',
		borderRadius: '18px',
		background: 'rgba(248, 250, 252, 0.88)',
		border: '1px solid rgba(148, 163, 184, 0.16)',
	},
	questionBody: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.85rem',
	},
	inputField: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.55rem',
	},
	inputFieldSurface: {
		minHeight: '3rem',
		display: 'flex',
		alignItems: 'center',
		padding: '0.85rem 1rem',
		borderRadius: '14px',
		background: '#fff',
		border: '1px solid rgba(148, 163, 184, 0.24)',
		boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
	},
	multipleChoice: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.7rem',
	},
	multipleChoiceOptions: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.6rem',
	},
	multipleChoiceOption: {
		display: 'flex',
		alignItems: 'flex-start',
		gap: '0.75rem',
		padding: '0.85rem 0.95rem',
		borderRadius: '14px',
		background: 'rgba(255, 255, 255, 0.9)',
		border: '1px solid rgba(148, 163, 184, 0.22)',
	},
	answerKey: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.55rem',
		padding: '1rem 1.05rem',
		borderRadius: '16px',
		background: 'rgba(236, 253, 245, 0.8)',
		border: '1px solid rgba(16, 185, 129, 0.18)',
	},
	callout(tone) {
		const toneMap = {
			info: {
				background: 'rgba(239, 246, 255, 0.92)',
				border: '1px solid rgba(96, 165, 250, 0.26)',
			},
			success: {
				background: 'rgba(236, 253, 245, 0.9)',
				border: '1px solid rgba(16, 185, 129, 0.22)',
			},
			warning: {
				background: 'rgba(255, 251, 235, 0.92)',
				border: '1px solid rgba(245, 158, 11, 0.22)',
			},
			danger: {
				background: 'rgba(254, 242, 242, 0.92)',
				border: '1px solid rgba(239, 68, 68, 0.2)',
			},
		} as const

		return {
			display: 'flex',
			flexDirection: 'column' as const,
			gap: '0.5rem',
			padding: '1rem 1.05rem',
			borderRadius: '16px',
			...toneMap[tone],
		} satisfies CSSProperties
	},
	chart: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.9rem',
		margin: 0,
	},
	chartFrame: {
		padding: '1rem 1rem 0.5rem',
		borderRadius: '24px',
		background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.88) 100%)',
		border: '1px solid rgba(148, 163, 184, 0.22)',
		boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.78)',
	},
	chartEmptyState: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: '12rem',
	},
	metricGrid: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1rem',
		margin: 0,
	},
	metricGridHeader: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.45rem',
	},
	metricGridItems(columns) {
		return {
			display: 'grid',
			gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
			gap: '0.9rem',
		} satisfies CSSProperties
	},
	metricCard(tone) {
		const toneMap = {
			default: {
				background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.9) 100%)',
				border: '1px solid rgba(148, 163, 184, 0.18)',
			},
			success: {
				background: 'linear-gradient(180deg, rgba(236,253,245,0.96) 0%, rgba(255,255,255,0.92) 100%)',
				border: '1px solid rgba(16, 185, 129, 0.18)',
			},
			warning: {
				background: 'linear-gradient(180deg, rgba(255,251,235,0.96) 0%, rgba(255,255,255,0.92) 100%)',
				border: '1px solid rgba(245, 158, 11, 0.18)',
			},
			danger: {
				background: 'linear-gradient(180deg, rgba(254,242,242,0.96) 0%, rgba(255,255,255,0.92) 100%)',
				border: '1px solid rgba(239, 68, 68, 0.18)',
			},
		} as const

		return {
			display: 'flex',
			flexDirection: 'column' as const,
			gap: '0.35rem',
			padding: '1rem 1.05rem',
			borderRadius: '18px',
			boxShadow: '0 16px 36px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.78)',
			...toneMap[tone],
		} satisfies CSSProperties
	},
	timeline: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '1rem',
		margin: 0,
	},
	timelineRail(layout) {
		return {
			display: 'grid',
			gridTemplateColumns: layout === 'split' ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
			gap: '0.95rem',
			position: 'relative',
		} satisfies CSSProperties
	},
	timelineEvent(tone) {
		const toneMap = {
			default: {
				background: 'rgba(255, 255, 255, 0.92)',
				border: '1px solid rgba(148, 163, 184, 0.18)',
			},
			info: {
				background: 'rgba(239, 246, 255, 0.92)',
				border: '1px solid rgba(96, 165, 250, 0.2)',
			},
			success: {
				background: 'rgba(236, 253, 245, 0.92)',
				border: '1px solid rgba(16, 185, 129, 0.18)',
			},
			warning: {
				background: 'rgba(255, 251, 235, 0.92)',
				border: '1px solid rgba(245, 158, 11, 0.18)',
			},
		} as const

		return {
			display: 'flex',
			flexDirection: 'column' as const,
			gap: '0.5rem',
			padding: '1rem 1.05rem',
			borderRadius: '18px',
			boxShadow: '0 14px 32px rgba(15, 23, 42, 0.06)',
			...toneMap[tone],
		} satisfies CSSProperties
	},
	videoEmbed: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.8rem',
		margin: 0,
	},
	videoEmbedFrame: {
		overflow: 'hidden',
		borderRadius: '24px',
		background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.88) 100%)',
		border: '1px solid rgba(148, 163, 184, 0.22)',
		boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.78)',
	},
	videoEmbedSurface(aspectRatio) {
		return {
			position: 'relative',
			width: '100%',
			paddingTop: aspectRatio === '4:3' ? '75%' : aspectRatio === '1:1' ? '100%' : '56.25%',
			background: 'rgba(15, 23, 42, 0.04)',
		} satisfies CSSProperties
	},
	iframe: {
		display: 'flex',
		flexDirection: 'column' as const,
		gap: '0.8rem',
		margin: 0,
	},
	iframeFrame: {
		overflow: 'hidden',
		borderRadius: '24px',
		background: 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,250,252,0.88) 100%)',
		border: '1px solid rgba(148, 163, 184, 0.22)',
		boxShadow: '0 18px 40px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.78)',
	},
}
