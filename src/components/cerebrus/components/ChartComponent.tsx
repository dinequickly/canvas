import { useId, type CSSProperties } from 'react'
import type { ChartProps } from '../../../lib/cerebrus/catalog'
import type { ChartRenderableProps } from '../../../lib/cerebrus/registry'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

const chartWidth = 560
const chartHeight = 220
const chartPadding = { top: 16, right: 18, bottom: 34, left: 18 }

function formatSeries(series: ChartProps['series']) {
	if (series.length === 0) {
		return []
	}

	const maxValue = Math.max(...series.map((item) => item.value), 0)
	const safeMax = maxValue === 0 ? 1 : maxValue
	const plotWidth = chartWidth - chartPadding.left - chartPadding.right
	const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
	const stepX = series.length > 1 ? plotWidth / (series.length - 1) : 0
	const barWidth = Math.min(52, plotWidth / Math.max(series.length, 1) - 12)

	return series.map((item, index) => {
		const x = chartPadding.left + (series.length > 1 ? stepX * index : plotWidth / 2)
		const normalized = item.value / safeMax
		const y = chartPadding.top + (1 - normalized) * plotHeight
		const barHeight = Math.max(0, chartHeight - chartPadding.bottom - y)

		return {
			...item,
			x,
			y,
			barHeight,
			barX: x - barWidth / 2,
			barWidth,
		}
	})
}

function buildLinePath(points: ReturnType<typeof formatSeries>) {
	return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}

function buildAreaPath(points: ReturnType<typeof formatSeries>) {
	if (points.length === 0) {
		return ''
	}

	const baselineY = chartHeight - chartPadding.bottom
	const first = points[0]
	const last = points[points.length - 1]

	return `M ${first.x} ${baselineY} L ${first.x} ${first.y} ${points
		.slice(1)
		.map((point) => `L ${point.x} ${point.y}`)
		.join(' ')} L ${last.x} ${baselineY} Z`
}

function renderChartGraphic(kind: ChartProps['kind'], points: ReturnType<typeof formatSeries>, areaGradientId: string) {
	if (points.length === 0) {
		return (
			<div style={cerebrusDocumentStyles.chartEmptyState}>
				<span style={cerebrusTypography.muted}>No chart data yet.</span>
			</div>
		)
	}

	const baselineY = chartHeight - chartPadding.bottom
	const linePath = buildLinePath(points)
	const areaPath = buildAreaPath(points)

	return (
		<svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label={`${kind} chart`} style={chartSvgStyle}>
			<defs>
				<linearGradient id={areaGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" stopColor="rgba(15, 23, 42, 0.22)" />
					<stop offset="100%" stopColor="rgba(15, 23, 42, 0.02)" />
				</linearGradient>
			</defs>
			<line
				x1={chartPadding.left}
				y1={baselineY}
				x2={chartWidth - chartPadding.right}
				y2={baselineY}
				stroke="rgba(148, 163, 184, 0.45)"
				strokeWidth="1"
			/>
			{points.map((point) => (
				<g key={point.label}>
					<line
						x1={point.x}
						y1={chartPadding.top}
						x2={point.x}
						y2={baselineY}
						stroke="rgba(148, 163, 184, 0.14)"
						strokeWidth="1"
					/>
					<text x={point.x} y={chartHeight - 10} textAnchor="middle" style={axisLabelStyle}>
						{point.label}
					</text>
				</g>
			))}
			{kind === 'bar'
				? points.map((point) => (
						<rect
							key={point.label}
							x={point.barX}
							y={point.y}
							width={point.barWidth}
							height={point.barHeight}
							rx="10"
							fill="rgba(15, 23, 42, 0.82)"
						/>
					))
				: null}
			{kind === 'area' ? <path d={areaPath} fill={`url(#${areaGradientId})`} /> : null}
			{kind !== 'bar' ? (
				<path
					d={linePath}
					fill="none"
					stroke="rgba(15, 23, 42, 0.88)"
					strokeWidth="3"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			) : null}
			{kind !== 'bar'
				? points.map((point) => (
						<g key={point.label}>
							<circle cx={point.x} cy={point.y} r="5.5" fill="#fff" stroke="rgba(15, 23, 42, 0.88)" strokeWidth="2" />
							<text x={point.x} y={point.y - 12} textAnchor="middle" style={valueLabelStyle}>
								{point.value}
							</text>
						</g>
					))
				: points.map((point) => (
						<text key={point.label} x={point.x} y={point.y - 10} textAnchor="middle" style={valueLabelStyle}>
							{point.value}
						</text>
					))}
		</svg>
	)
}

export function ChartComponent({ elementId, title, kind, series, caption }: ChartRenderableProps) {
	const points = formatSeries(series)
	const areaGradientId = useId()

	return (
		<figure style={cerebrusDocumentStyles.chart}>
			<EditableRichText
				as="figcaption"
				elementId={elementId}
				propKey="title"
				value={title}
				style={cerebrusTypography.chartTitle}
				allowEmpty
			/>
			<div style={cerebrusDocumentStyles.chartFrame}>{renderChartGraphic(kind, points, areaGradientId)}</div>
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

const chartSvgStyle: CSSProperties = {
	display: 'block',
	width: '100%',
	height: 'auto',
}

const axisLabelStyle: CSSProperties = {
	fontSize: '12px',
	fontWeight: 600,
	fill: 'rgba(15, 23, 42, 0.52)',
	letterSpacing: '-0.01em',
}

const valueLabelStyle: CSSProperties = {
	fontSize: '12px',
	fontWeight: 700,
	fill: 'rgba(15, 23, 42, 0.82)',
	letterSpacing: '-0.01em',
}
