import type { CerebrusSpec } from '../../src/lib/cerebrus/catalog'

export type CerebrusArtifactKind =
	| 'course'
	| 'unit'
	| 'lesson'
	| 'practice'
	| 'test'
	| 'page'
	| 'surface'
	| 'artifact'

export type CerebrusDisplayMode = 'map' | 'document'

export interface CerebrusShapeNavigationProps {
	cerebrusId?: string
	artifactKind?: CerebrusArtifactKind
	parentCerebrusId?: string
	childCerebrusIds?: string[]
	orderIndex?: number
	displayMode?: CerebrusDisplayMode
	navigationLabel?: string
}

export interface ResolvedCerebrusShapeNavigation {
	cerebrusId: string
	artifactKind: CerebrusArtifactKind
	parentCerebrusId?: string
	childCerebrusIds: string[]
	orderIndex?: number
	displayMode: CerebrusDisplayMode
	navigationLabel: string
}

export function createCerebrusArtifactId() {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return `cerebrus:${crypto.randomUUID()}`
	}

	return `cerebrus:${Date.now()}:${Math.random().toString(36).slice(2)}`
}

export function getDefaultArtifactKind(spec: CerebrusSpec): CerebrusArtifactKind {
	const root = spec.elements[spec.root]
	if (!root) return 'surface'
	return root.type === 'Page' ? 'page' : 'surface'
}

export function getDefaultNavigationLabel(spec: CerebrusSpec) {
	const root = spec.elements[spec.root]
	if (!root) return 'Untitled'

	if ('title' in root.props && typeof root.props.title === 'string' && root.props.title.length > 0) {
		return root.props.title
	}

	if ('text' in root.props && typeof root.props.text === 'string' && root.props.text.length > 0) {
		return root.props.text
	}

	if ('content' in root.props && typeof root.props.content === 'string' && root.props.content.length > 0) {
		return root.props.content
	}

	return root.type
}

export function resolveCerebrusShapeNavigation(
	fallbackCerebrusId: string,
	spec: CerebrusSpec,
	props: CerebrusShapeNavigationProps
): ResolvedCerebrusShapeNavigation {
	return {
		cerebrusId: props.cerebrusId ?? fallbackCerebrusId,
		artifactKind: props.artifactKind ?? getDefaultArtifactKind(spec),
		parentCerebrusId: props.parentCerebrusId,
		childCerebrusIds: props.childCerebrusIds ?? [],
		orderIndex: props.orderIndex,
		displayMode: props.displayMode ?? 'document',
		navigationLabel: props.navigationLabel ?? getDefaultNavigationLabel(spec),
	}
}

export function buildCerebrusShapeNavigationProps(
	spec: CerebrusSpec,
	props: CerebrusShapeNavigationProps = {}
): Required<Pick<ResolvedCerebrusShapeNavigation, 'cerebrusId' | 'artifactKind' | 'childCerebrusIds' | 'displayMode' | 'navigationLabel'>> &
	Pick<ResolvedCerebrusShapeNavigation, 'parentCerebrusId' | 'orderIndex'> {
	const resolved = resolveCerebrusShapeNavigation(createCerebrusArtifactId(), spec, props)

	return {
		cerebrusId: resolved.cerebrusId,
		artifactKind: resolved.artifactKind,
		parentCerebrusId: resolved.parentCerebrusId,
		childCerebrusIds: resolved.childCerebrusIds,
		orderIndex: resolved.orderIndex,
		displayMode: resolved.displayMode,
		navigationLabel: resolved.navigationLabel,
	}
}
