import {
	BaseBoxShapeUtil,
	HTMLContainer,
	Rectangle2d,
	T,
	TLShape,
	createShapeId,
	useEditor,
	useValue,
} from 'tldraw'
import { artifactRecordSchema, type ArtifactRecord } from '../../src/lib/artifacts/schema'
import { CerebrusMapShapeCard } from '../components/CerebrusMapShapeCard'
import { getArtifactRole, getVisibleShapesForState } from '../cerebrus/navigationModel'
import { getCerebrusNavigationState } from '../cerebrus/navigationState'
import {
	buildCerebrusShapeNavigationProps,
	resolveCerebrusShapeNavigation,
	type CerebrusShapeNavigationProps,
} from '../cerebrus/shapeMeta'
import { readWorkspaceShapes } from '../workspace/readWorkspaceShapes'

export const ARTIFACT_SHAPE_TYPE = 'artifact-shape'

type ArtifactShapeProps = {
	w: number
	h: number
	artifactId: string
	artifactType: string
	title: string
	description?: string
	status: string
	sourceBundle: string
	previewState?: string
	entryFile: string
	lastRunAt?: string
	errorState?: string
	generationPrompt?: string
	generationModelName?: string
	cerebrusId?: string
	artifactKind?: string
	parentCerebrusId?: string
	childCerebrusIds?: string[]
	orderIndex?: number
	displayMode?: string
	navigationLabel?: string
}

declare module '@tldraw/tlschema' {
	export interface TLGlobalShapePropsMap {
		[ARTIFACT_SHAPE_TYPE]: ArtifactShapeProps
	}
}

export type ArtifactShape = TLShape<typeof ARTIFACT_SHAPE_TYPE>

export function createArtifactShapeId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return createShapeId(`artifact-shape:${crypto.randomUUID()}`)
	}

	return createShapeId(`artifact-shape:${Date.now()}:${Math.random().toString(36).slice(2)}`)
}

export function getDefaultArtifactShapeSize() {
	return {
		w: 560,
		h: 360,
	}
}

export function parseArtifactRecord(shape: ArtifactShape): ArtifactRecord | null {
	try {
		const sourceBundle = JSON.parse(shape.props.sourceBundle)
		const previewState = shape.props.previewState ? JSON.parse(shape.props.previewState) : {}
		const errorState = shape.props.errorState ? JSON.parse(shape.props.errorState) : undefined

		return artifactRecordSchema.parse({
			artifactId: shape.props.artifactId,
			artifactType: shape.props.artifactType,
			title: shape.props.title,
			description: shape.props.description,
			status: shape.props.status,
			sourceBundle,
			previewState,
			entryFile: shape.props.entryFile,
			lastRunAt: shape.props.lastRunAt,
			errorState,
			generationPrompt: shape.props.generationPrompt,
			generationModelName: shape.props.generationModelName,
		})
	} catch {
		return null
	}
}

export function getResolvedArtifactNavigation(shape: ArtifactShape, record: ArtifactRecord) {
	return resolveCerebrusShapeNavigation(String(shape.id), { root: 'artifact-root', elements: {} as never }, {
		cerebrusId: shape.props.cerebrusId,
		artifactKind: (shape.props.artifactKind as CerebrusShapeNavigationProps['artifactKind']) ?? 'artifact',
		parentCerebrusId: shape.props.parentCerebrusId,
		childCerebrusIds: shape.props.childCerebrusIds,
		orderIndex: shape.props.orderIndex,
		displayMode: shape.props.displayMode as CerebrusShapeNavigationProps['displayMode'],
		navigationLabel: shape.props.navigationLabel ?? record.title,
	})
}

function createGeometry(shape: ArtifactShape) {
	return new Rectangle2d({
		width: shape.props.w,
		height: shape.props.h,
		isFilled: true,
	})
}

function renderIndicator(shape: ArtifactShape) {
	return <rect width={shape.props.w} height={shape.props.h} />
}

function getShapeOpacity(emphasis: 'primary' | 'secondary' | 'tertiary' | 'hidden') {
	switch (emphasis) {
		case 'primary':
			return 1
		case 'secondary':
			return 0.94
		case 'tertiary':
			return 0.7
		default:
			return 0
	}
}

function getShapeTransform(emphasis: 'primary' | 'secondary' | 'tertiary' | 'hidden') {
	switch (emphasis) {
		case 'primary':
			return 'scale(1)'
		case 'secondary':
			return 'scale(0.985)'
		case 'tertiary':
			return 'scale(0.96)'
		default:
			return 'scale(0.94)'
	}
}

function ArtifactShapeContent({ shape }: { shape: ArtifactShape }) {
	const editor = useEditor()
	const record = parseArtifactRecord(shape)
	const navigationState = useValue('artifact-navigation-shape', () => getCerebrusNavigationState(editor), [editor])
	const visibleShapes = useValue(
		'artifact-navigation-visible-shapes',
		() => getVisibleShapesForState(readWorkspaceShapes(editor), getCerebrusNavigationState(editor)),
		[editor]
	)

	if (!record) {
		return (
			<HTMLContainer
				style={{
					width: shape.props.w,
					height: shape.props.h,
					overflow: 'hidden',
					backgroundColor: 'transparent',
					borderRadius: 28,
				}}
			>
				<div style={{ padding: 16 }}>
					<h1>Invalid Artifact</h1>
					<p>This shape does not contain a valid artifact record.</p>
				</div>
			</HTMLContainer>
		)
	}

	const navigation = getResolvedArtifactNavigation(shape, record)
	const visibility = visibleShapes.get(String(shape.id))
	const role = getArtifactRole(navigation.artifactKind)
	const isVisible = visibility?.isVisible ?? navigationState.viewMode !== 'document'
	const emphasis = visibility?.emphasis ?? 'hidden'
	const isCurrent = visibility?.isCurrent ?? false

	return (
		<HTMLContainer
			style={{
				width: shape.props.w,
				height: shape.props.h,
				overflow: 'hidden',
				backgroundColor: 'transparent',
				borderRadius: 28,
				opacity: isVisible ? getShapeOpacity(emphasis) : 0,
				pointerEvents: isVisible ? 'auto' : 'none',
				visibility: isVisible ? 'visible' : 'hidden',
				transform: isVisible ? getShapeTransform(emphasis) : 'scale(0.98)',
				transition: 'opacity 160ms ease, transform 160ms ease',
			}}
		>
			<CerebrusMapShapeCard
				title={record.title}
				subtitle={record.description ?? record.artifactType}
				artifactKind={navigation.artifactKind}
				childCount={0}
				role={role}
				emphasis={emphasis === 'hidden' ? 'tertiary' : emphasis}
				isCurrent={isCurrent}
				onOpen={() => {
					editor.select(shape.id)
					;(window as any).navigation?.enterShape?.(shape.id)
				}}
			/>
		</HTMLContainer>
	)
}

export class ArtifactShapeUtil extends BaseBoxShapeUtil<ArtifactShape> {
	static override type = ARTIFACT_SHAPE_TYPE
	static override props = {
		w: T.number,
		h: T.number,
		artifactId: T.string,
		artifactType: T.string,
		title: T.string,
		description: T.optional(T.string),
		status: T.string,
		sourceBundle: T.string,
		previewState: T.optional(T.string),
		entryFile: T.string,
		lastRunAt: T.optional(T.string),
		errorState: T.optional(T.string),
		generationPrompt: T.optional(T.string),
		generationModelName: T.optional(T.string),
		cerebrusId: T.optional(T.string),
		artifactKind: T.optional(T.literalEnum('course', 'unit', 'lesson', 'practice', 'test', 'page', 'surface', 'artifact')),
		parentCerebrusId: T.optional(T.string),
		childCerebrusIds: T.optional(T.arrayOf(T.string)),
		orderIndex: T.optional(T.number),
		displayMode: T.optional(T.literalEnum('map', 'document')),
		navigationLabel: T.optional(T.string),
	}

	override getDefaultProps(): ArtifactShape['props'] {
		return {
			...getDefaultArtifactShapeSize(),
			artifactId: '',
			artifactType: 'prototype',
			title: 'Untitled artifact',
			status: 'generating',
			sourceBundle: '',
			entryFile: '/App.tsx',
		}
	}

	override getGeometry(shape: ArtifactShape) {
		return createGeometry(shape)
	}

	override component(shape: ArtifactShape) {
		return <ArtifactShapeContent shape={shape} />
	}

	override indicator(shape: ArtifactShape) {
		return renderIndicator(shape)
	}
}

export function getDefaultArtifactNavigationProps(title: string, props: CerebrusShapeNavigationProps = {}) {
	return buildCerebrusShapeNavigationProps(
		{
			root: 'artifact-root',
			elements: {
				'artifact-root': {
					type: 'Text',
					props: {
						content: title,
						variant: 'body',
					},
				},
			},
		} as never,
		{
			artifactKind: 'artifact',
			displayMode: 'map',
			navigationLabel: title,
			...props,
		}
	)
}
