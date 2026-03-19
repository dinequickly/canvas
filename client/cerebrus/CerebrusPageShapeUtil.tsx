import {
	BaseBoxShapeUtil,
	HTMLContainer,
	Rectangle2d,
	T,
	TLShape,
	createShapeId,
	useEditor,
	useIsEditing,
	useValue,
} from 'tldraw'
import { CerebrusMapShapeCard } from '../components/CerebrusMapShapeCard'
import { getArtifactRole, getVisibleShapesForState } from './navigationModel'
import { getCerebrusNavigationState } from './navigationState'
import {
	buildCerebrusShapeNavigationProps,
	resolveCerebrusShapeNavigation,
	type CerebrusShapeNavigationProps,
} from './shapeMeta'
import { readCerebrusShapes } from './readCerebrusPageShapes'
import { readWorkspaceShapes } from '../workspace/readWorkspaceShapes'
import { Renderer } from '../../src/components/cerebrus/Renderer'
import type { CerebrusEditablePropKey } from '../../src/components/cerebrus/CerebrusEditingContext'
import {
	cerebrusSurfaceTypes,
	cerebrusSpecSchema,
	getCerebrusElementLabel,
	type CerebrusSpec,
} from '../../src/lib/cerebrus/catalog'

export const CEREBRUS_SHAPE_TYPE = 'cerebrus-shape'
export const CEREBRUS_PAGE_SHAPE_TYPE = 'cerebrus-page'
export type CanvasCerebrusShapeType = typeof CEREBRUS_SHAPE_TYPE | typeof CEREBRUS_PAGE_SHAPE_TYPE

type CerebrusShapeProps = {
	w: number
	h: number
	spec: string
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
		[CEREBRUS_SHAPE_TYPE]: CerebrusShapeProps
		[CEREBRUS_PAGE_SHAPE_TYPE]: CerebrusShapeProps
	}
}

export type CerebrusShape = TLShape<typeof CEREBRUS_SHAPE_TYPE>
export type LegacyCerebrusPageShape = TLShape<typeof CEREBRUS_PAGE_SHAPE_TYPE>
export type AnyCanvasCerebrusShape = CerebrusShape | LegacyCerebrusPageShape

export function parseCerebrusShapeSpec(spec: string): CerebrusSpec | null {
	try {
		return cerebrusSpecSchema.parse(JSON.parse(spec))
	} catch {
		return null
	}
}

export function getDefaultCerebrusShapeSize() {
	return {
		w: 720,
		h: 480,
	}
}

function getUniqueCerebrusShapeSeed() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `cerebrus-shape:${crypto.randomUUID()}`
	}

	return `cerebrus-shape:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

export function createCerebrusShapeId() {
	return createShapeId(getUniqueCerebrusShapeSeed())
}

export function getCerebrusShapeTitle(spec: CerebrusSpec) {
	const root = spec.elements[spec.root]
	return root ? getCerebrusElementLabel(root) : 'Untitled'
}

function getShapeSubtitle(spec: CerebrusSpec) {
	const root = spec.elements[spec.root]
	if (!root) return undefined
	return 'subtitle' in root.props && typeof root.props.subtitle === 'string' ? root.props.subtitle : undefined
}

function getInvalidShapeLabel(rawSpec: string) {
	try {
		const parsed = JSON.parse(rawSpec) as { root?: string; elements?: Record<string, { type?: string }> }
		const root = parsed.root && parsed.elements ? parsed.elements[parsed.root] : undefined
		if (root?.type && !cerebrusSurfaceTypes.includes(root.type as (typeof cerebrusSurfaceTypes)[number])) {
			return `Invalid Cerebrus Root: ${root.type}`
		}
	} catch {
		// ignore parse noise and fall through to the generic label
	}

	return 'Invalid Cerebrus Shape'
}

function createGeometry(shape: AnyCanvasCerebrusShape) {
	return new Rectangle2d({
		width: shape.props.w,
		height: shape.props.h,
		isFilled: true,
	})
}

function renderIndicator(shape: AnyCanvasCerebrusShape) {
	return <rect width={shape.props.w} height={shape.props.h} />
}

function CerebrusShapeContent({ shape }: { shape: AnyCanvasCerebrusShape }) {
	const editor = useEditor()
	const isEditing = useIsEditing(shape.id)
	const spec = parseCerebrusShapeSpec(shape.props.spec)
	const navigationState = useValue('cerebrus-navigation-shape', () => getCerebrusNavigationState(editor), [editor])
	const visibleShapes = useValue(
		'cerebrus-navigation-visible-shapes',
		() => getVisibleShapesForState(readWorkspaceShapes(editor), getCerebrusNavigationState(editor)),
		[editor]
	)

	if (!spec) {
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
					<h1>{getInvalidShapeLabel(shape.props.spec)}</h1>
					<p>This shape does not contain a valid Cerebrus spec.</p>
				</div>
			</HTMLContainer>
		)
	}

	const navigation = resolveCerebrusShapeNavigation(String(shape.id), spec, {
		cerebrusId: shape.props.cerebrusId,
		artifactKind: shape.props.artifactKind as CerebrusShapeNavigationProps['artifactKind'],
		parentCerebrusId: shape.props.parentCerebrusId,
		childCerebrusIds: shape.props.childCerebrusIds,
		orderIndex: shape.props.orderIndex,
		displayMode: shape.props.displayMode as CerebrusShapeNavigationProps['displayMode'],
		navigationLabel: shape.props.navigationLabel,
	})
	const visibility = visibleShapes.get(String(shape.id))
	const role = getArtifactRole(navigation.artifactKind)
	const isVisible = visibility?.isVisible ?? navigationState.viewMode !== 'document'
	const emphasis = visibility?.emphasis ?? 'hidden'
	const isCurrent = visibility?.isCurrent ?? false
	const renderMode = navigationState.viewMode === 'document' ? null : navigation.displayMode
	const usesLiveDocumentRenderer = renderMode === 'document'

	const toggleEditing = (next?: boolean) => {
		editor.select(shape.id)
		editor.setEditingShape(next === false ? null : shape.id)
	}

	const updateElementText = (elementId: string, propKey: CerebrusEditablePropKey, value: string | undefined) => {
		if (!spec) return
		const currentElement = spec.elements[elementId]
		if (!currentElement) return

		const nextSpec = cerebrusSpecSchema.parse({
			...spec,
			elements: {
				...spec.elements,
				[elementId]: {
					...currentElement,
					props: {
						...currentElement.props,
						[propKey]: value,
					},
				},
			},
		})

		editor.updateShape({
			id: shape.id,
			type: shape.type,
			props: {
				spec: JSON.stringify(nextSpec),
			},
		})
	}

	return (
		<HTMLContainer
			style={{
				width: shape.props.w,
				height: shape.props.h,
				overflow: 'hidden',
				backgroundColor: 'transparent',
				borderRadius: 28,
				opacity: isVisible ? (usesLiveDocumentRenderer ? 1 : getShapeOpacity(emphasis)) : 0,
				pointerEvents: isVisible ? 'auto' : 'none',
				visibility: isVisible ? 'visible' : 'hidden',
				// Keep live document surfaces crisp on the board; scaling nested iframes/text softens them.
				transform: isVisible
					? usesLiveDocumentRenderer
						? 'scale(1)'
						: getShapeTransform(emphasis)
					: 'scale(0.98)',
				transition: usesLiveDocumentRenderer ? 'opacity 160ms ease' : 'opacity 160ms ease, transform 160ms ease',
			}}
		>
			{renderMode === 'document' ? (
				<Renderer
					spec={spec}
					isEditing={isEditing}
					onToggleEditing={toggleEditing}
					onUpdateElementText={updateElementText}
				/>
			) : (
				<CerebrusMapShapeCard
					title={navigation.navigationLabel}
					subtitle={getShapeSubtitle(spec)}
					artifactKind={navigation.artifactKind}
					childCount={navigation.childCerebrusIds.length}
					role={role}
					emphasis={emphasis === 'hidden' ? 'tertiary' : emphasis}
					isCurrent={isCurrent}
					onOpen={() => {
						editor.select(shape.id)
						;(window as any).navigation?.enterShape?.(shape.id)
					}}
				/>
			)}
		</HTMLContainer>
	)
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

export class CerebrusShapeUtil extends BaseBoxShapeUtil<CerebrusShape> {
	static override type = CEREBRUS_SHAPE_TYPE
	static override props = {
		w: T.number,
		h: T.number,
		spec: T.string,
		cerebrusId: T.optional(T.string),
		artifactKind: T.optional(T.literalEnum('course', 'unit', 'lesson', 'practice', 'test', 'page', 'surface', 'artifact')),
		parentCerebrusId: T.optional(T.string),
		childCerebrusIds: T.optional(T.arrayOf(T.string)),
		orderIndex: T.optional(T.number),
		displayMode: T.optional(T.literalEnum('map', 'document')),
		navigationLabel: T.optional(T.string),
	}

	override canEdit() {
		return true
	}

	override canScroll() {
		return true
	}

	override getDefaultProps(): CerebrusShape['props'] {
		return {
			...getDefaultCerebrusShapeSize(),
			spec: '',
		}
	}

	override getGeometry(shape: CerebrusShape) {
		return createGeometry(shape)
	}

	override component(shape: CerebrusShape) {
		return <CerebrusShapeContent shape={shape} />
	}

	override indicator(shape: CerebrusShape) {
		return renderIndicator(shape)
	}
}

export class LegacyCerebrusPageShapeUtil extends BaseBoxShapeUtil<LegacyCerebrusPageShape> {
	static override type = CEREBRUS_PAGE_SHAPE_TYPE
	static override props = {
		w: T.number,
		h: T.number,
		spec: T.string,
		cerebrusId: T.optional(T.string),
		artifactKind: T.optional(T.literalEnum('course', 'unit', 'lesson', 'practice', 'test', 'page', 'surface', 'artifact')),
		parentCerebrusId: T.optional(T.string),
		childCerebrusIds: T.optional(T.arrayOf(T.string)),
		orderIndex: T.optional(T.number),
		displayMode: T.optional(T.literalEnum('map', 'document')),
		navigationLabel: T.optional(T.string),
	}

	override canEdit() {
		return true
	}

	override canScroll() {
		return true
	}

	override getDefaultProps(): LegacyCerebrusPageShape['props'] {
		return {
			...getDefaultCerebrusShapeSize(),
			spec: '',
		}
	}

	override getGeometry(shape: LegacyCerebrusPageShape) {
		return createGeometry(shape)
	}

	override component(shape: LegacyCerebrusPageShape) {
		return <CerebrusShapeContent shape={shape} />
	}

	override indicator(shape: LegacyCerebrusPageShape) {
		return renderIndicator(shape)
	}
}

export function getResolvedShapeNavigation(shape: AnyCanvasCerebrusShape, spec: CerebrusSpec) {
	return resolveCerebrusShapeNavigation(String(shape.id), spec, {
		cerebrusId: shape.props.cerebrusId,
		artifactKind: shape.props.artifactKind as CerebrusShapeNavigationProps['artifactKind'],
		parentCerebrusId: shape.props.parentCerebrusId,
		childCerebrusIds: shape.props.childCerebrusIds,
		orderIndex: shape.props.orderIndex,
		displayMode: shape.props.displayMode as CerebrusShapeNavigationProps['displayMode'],
		navigationLabel: shape.props.navigationLabel,
	})
}

export function getDefaultShapeNavigationProps(spec: CerebrusSpec, props?: CerebrusShapeNavigationProps) {
	return buildCerebrusShapeNavigationProps(spec, props)
}
