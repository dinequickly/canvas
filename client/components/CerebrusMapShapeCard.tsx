import { stopEventPropagation } from '@tldraw/editor'
import type { CSSProperties } from 'react'
import type { CerebrusArtifactKind } from '../cerebrus/shapeMeta'

interface CerebrusMapShapeCardProps {
	title: string
	subtitle?: string
	artifactKind: CerebrusArtifactKind
	childCount: number
	role: 'folder' | 'file'
	emphasis: 'primary' | 'secondary' | 'tertiary'
	isCurrent: boolean
	onOpen?: () => void
}

const kindLabels: Record<CerebrusArtifactKind, string> = {
	course: 'Course',
	unit: 'Unit',
	lesson: 'Lesson',
	practice: 'Practice',
	test: 'Test',
	page: 'Page',
	surface: 'Surface',
	artifact: 'Artifact',
}

const kindAccents: Record<CerebrusArtifactKind, string> = {
	course: '#d97706',
	unit: '#0f766e',
	lesson: '#2563eb',
	practice: '#7c3aed',
	test: '#dc2626',
	page: '#475569',
	surface: '#334155',
	artifact: '#c2410c',
}

export function CerebrusMapShapeCard({
	title,
	subtitle,
	artifactKind,
	childCount,
	role,
	emphasis,
	isCurrent,
	onOpen,
}: CerebrusMapShapeCardProps) {
	const accent = kindAccents[artifactKind]
	const actionLabel = role === 'folder' ? (isCurrent ? 'Current folder' : 'Open folder') : 'Open document'

	return (
		<button
			type="button"
			style={cardStyle({ role, emphasis, isCurrent, accent })}
			onPointerDown={stopEventPropagation}
			onMouseDown={stopEventPropagation}
			onClick={(event) => {
				stopEventPropagation(event)
				onOpen?.()
			}}
		>
			<div style={headerStyle}>
				<div style={markerStyle({ role, accent })} />
				<div style={eyebrowStyle}>
					<span style={badgeStyle({ role, accent })}>{kindLabels[artifactKind]}</span>
					<span style={metaStyle}>{role === 'folder' ? `${childCount} items` : 'Leaf artifact'}</span>
				</div>
			</div>
			<div style={bodyStyle}>
				<h3 style={titleStyle({ role, emphasis })}>{title}</h3>
				{subtitle ? <p style={subtitleStyle({ emphasis })}>{subtitle}</p> : null}
			</div>
			<div style={footerStyle({ accent, emphasis })}>
				<span>{actionLabel}</span>
				{role === 'folder' ? <span>{childCount > 0 ? `${childCount} children` : 'Empty folder'}</span> : null}
			</div>
		</button>
	)
}

function cardStyle({
	role,
	emphasis,
	isCurrent,
	accent,
}: {
	role: 'folder' | 'file'
	emphasis: 'primary' | 'secondary' | 'tertiary'
	isCurrent: boolean
	accent: string
}): CSSProperties {
	const compact = emphasis === 'tertiary'
	const folderBackground =
		emphasis === 'primary'
			? 'linear-gradient(180deg, rgba(255,247,237,0.98) 0%, rgba(255,255,255,0.95) 100%)'
			: emphasis === 'secondary'
				? 'linear-gradient(180deg, rgba(240,253,250,0.98) 0%, rgba(255,255,255,0.94) 100%)'
				: 'linear-gradient(180deg, rgba(248,250,252,0.94) 0%, rgba(255,255,255,0.9) 100%)'
	const fileBackground =
		emphasis === 'primary'
			? 'linear-gradient(180deg, rgba(239,246,255,0.98) 0%, rgba(255,255,255,0.95) 100%)'
			: emphasis === 'secondary'
				? 'linear-gradient(180deg, rgba(248,250,252,0.96) 0%, rgba(255,255,255,0.92) 100%)'
				: 'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(255,255,255,0.86) 100%)'

	return {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column',
		justifyContent: 'space-between',
		alignItems: 'stretch',
		gap: compact ? '0.55rem' : '0.8rem',
		padding: compact ? '0.85rem 0.95rem' : role === 'folder' ? '1.05rem 1.1rem' : '0.95rem 1rem',
		borderRadius: role === 'folder' ? '24px' : '18px',
		border: isCurrent ? `1px solid ${accent}` : `1px solid ${role === 'folder' ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.14)'}`,
		background: role === 'folder' ? folderBackground : fileBackground,
		boxShadow: isCurrent
			? `0 18px 44px ${hexToRgba(accent, 0.18)}, inset 0 1px 0 rgba(255,255,255,0.84)`
			: compact
				? '0 10px 22px rgba(15, 23, 42, 0.06), inset 0 1px 0 rgba(255,255,255,0.78)'
				: '0 14px 34px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.82)',
		color: '#0f172a',
		textAlign: 'left',
		cursor: 'pointer',
	}
}

const headerStyle: CSSProperties = {
	display: 'flex',
	alignItems: 'center',
	gap: '0.75rem',
}

function markerStyle({ role, accent }: { role: 'folder' | 'file'; accent: string }): CSSProperties {
	return {
		width: role === 'folder' ? '18px' : '14px',
		height: role === 'folder' ? '18px' : '18px',
		borderRadius: role === 'folder' ? '6px' : '5px',
		background: role === 'folder'
			? `linear-gradient(180deg, ${hexToRgba(accent, 0.28)} 0%, ${hexToRgba(accent, 0.12)} 100%)`
			: `linear-gradient(180deg, ${hexToRgba(accent, 0.2)} 0%, ${hexToRgba(accent, 0.08)} 100%)`,
		border: `1px solid ${hexToRgba(accent, 0.28)}`,
		flexShrink: 0,
	}
}

const eyebrowStyle: CSSProperties = {
	display: 'flex',
	flexWrap: 'wrap',
	alignItems: 'center',
	gap: '0.45rem',
}

function badgeStyle({ role, accent }: { role: 'folder' | 'file'; accent: string }): CSSProperties {
	return {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: role === 'folder' ? '0.32rem 0.62rem' : '0.24rem 0.55rem',
		borderRadius: '999px',
		background: hexToRgba(accent, role === 'folder' ? 0.12 : 0.09),
		color: accent,
		fontSize: '0.68rem',
		fontWeight: 800,
		letterSpacing: '0.04em',
		textTransform: 'uppercase',
	}
}

const metaStyle: CSSProperties = {
	fontSize: '0.72rem',
	fontWeight: 700,
	color: 'rgba(71, 85, 105, 0.7)',
}

const bodyStyle: CSSProperties = {
	display: 'flex',
	flexDirection: 'column',
	gap: '0.4rem',
}

function titleStyle({
	role,
	emphasis,
}: {
	role: 'folder' | 'file'
	emphasis: 'primary' | 'secondary' | 'tertiary'
}): CSSProperties {
	return {
		margin: 0,
		fontSize: role === 'folder' ? (emphasis === 'primary' ? '1.4rem' : '1.16rem') : emphasis === 'tertiary' ? '1rem' : '1.08rem',
		lineHeight: role === 'folder' ? 1.02 : 1.14,
		fontWeight: role === 'folder' ? 800 : 760,
		letterSpacing: '-0.045em',
	}
}

function subtitleStyle({ emphasis }: { emphasis: 'primary' | 'secondary' | 'tertiary' }): CSSProperties {
	return {
		margin: 0,
		fontSize: emphasis === 'tertiary' ? '0.82rem' : '0.88rem',
		lineHeight: 1.42,
		fontWeight: 520,
		color: 'rgba(51, 65, 85, 0.72)',
		display: '-webkit-box',
		WebkitLineClamp: emphasis === 'tertiary' ? 2 : 3,
		WebkitBoxOrient: 'vertical',
		overflow: 'hidden',
	}
}

function footerStyle({
	accent,
	emphasis,
}: {
	accent: string
	emphasis: 'primary' | 'secondary' | 'tertiary'
}): CSSProperties {
	return {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: '0.75rem',
		marginTop: 'auto',
		fontSize: emphasis === 'tertiary' ? '0.72rem' : '0.76rem',
		lineHeight: 1.3,
		fontWeight: 750,
		color: hexToRgba(accent, 0.9),
	}
}

function hexToRgba(hex: string, alpha: number) {
	const normalized = hex.replace('#', '')
	const value = normalized.length === 3 ? normalized.split('').map((char) => `${char}${char}`).join('') : normalized
	const r = Number.parseInt(value.slice(0, 2), 16)
	const g = Number.parseInt(value.slice(2, 4), 16)
	const b = Number.parseInt(value.slice(4, 6), 16)
	return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
