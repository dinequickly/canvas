import type { TLShapeId } from 'tldraw'
import type { CanvasWorkspaceShape } from '../workspace/readWorkspaceShapes'
import type { CerebrusNavigationState } from './navigationState'
import type { CerebrusArtifactKind } from './shapeMeta'

export type CerebrusShapeRole = 'folder' | 'file'
export type CerebrusShapeEmphasis = 'primary' | 'secondary' | 'tertiary' | 'hidden'

export interface VisibleCerebrusShape {
	shape: CanvasWorkspaceShape
	role: CerebrusShapeRole
	depth: number | null
	emphasis: CerebrusShapeEmphasis
	isVisible: boolean
	isCurrent: boolean
	isOpenDocument: boolean
}

function sortShapes(shapes: CanvasWorkspaceShape[]) {
	return [...shapes].sort((a, b) => {
		const orderA = a.navigation.orderIndex ?? Number.MAX_SAFE_INTEGER
		const orderB = b.navigation.orderIndex ?? Number.MAX_SAFE_INTEGER
		if (orderA !== orderB) return orderA - orderB
		return a.navigation.navigationLabel.localeCompare(b.navigation.navigationLabel)
	})
}

function getMaps(shapes: CanvasWorkspaceShape[]) {
	return {
		byShapeId: new Map(shapes.map((shape) => [String(shape.shapeId), shape])),
		byCerebrusId: new Map(shapes.map((shape) => [shape.navigation.cerebrusId, shape])),
	}
}

export function isFolderArtifactKind(kind: CerebrusArtifactKind) {
	return kind === 'course' || kind === 'unit'
}

export function getArtifactRole(kind: CerebrusArtifactKind): CerebrusShapeRole {
	return isFolderArtifactKind(kind) ? 'folder' : 'file'
}

export function getShapeRole(shape: CanvasWorkspaceShape): CerebrusShapeRole {
	return getArtifactRole(shape.navigation.artifactKind)
}

export function getShapeById(shapes: CanvasWorkspaceShape[], shapeId: TLShapeId | null) {
	if (!shapeId) return null
	return getMaps(shapes).byShapeId.get(String(shapeId)) ?? null
}

export function getParentShape(shapes: CanvasWorkspaceShape[], shapeId: TLShapeId) {
	const { byCerebrusId } = getMaps(shapes)
	const shape = getShapeById(shapes, shapeId)
	if (!shape?.navigation.parentCerebrusId) return null
	return byCerebrusId.get(shape.navigation.parentCerebrusId) ?? null
}

export function getPathToShape(shapes: CanvasWorkspaceShape[], shapeId: TLShapeId) {
	const { byShapeId, byCerebrusId } = getMaps(shapes)
	const path: CanvasWorkspaceShape[] = []
	const visited = new Set<string>()

	let current = byShapeId.get(String(shapeId)) ?? null
	while (current && !visited.has(current.navigation.cerebrusId)) {
		visited.add(current.navigation.cerebrusId)
		path.unshift(current)
		current = current.navigation.parentCerebrusId
			? (byCerebrusId.get(current.navigation.parentCerebrusId) ?? null)
			: null
	}

	return path
}

export function getChildrenForShape(shapes: CanvasWorkspaceShape[], shapeId: TLShapeId) {
	const shape = getShapeById(shapes, shapeId)
	if (!shape) return []

	const childIds = new Set(shape.navigation.childCerebrusIds)
	const children = new Map<string, CanvasWorkspaceShape>()

	for (const candidate of shapes) {
		if (childIds.has(candidate.navigation.cerebrusId)) {
			children.set(candidate.navigation.cerebrusId, candidate)
		}
		if (candidate.navigation.parentCerebrusId === shape.navigation.cerebrusId) {
			children.set(candidate.navigation.cerebrusId, candidate)
		}
	}

	return sortShapes(Array.from(children.values()))
}

export function getSiblingsForShape(shapes: CanvasWorkspaceShape[], shapeId: TLShapeId) {
	const parent = getParentShape(shapes, shapeId)
	if (!parent) return []

	return getChildrenForShape(shapes, parent.shapeId).filter((shape) => String(shape.shapeId) !== String(shapeId))
}

export function getRootShapes(shapes: CanvasWorkspaceShape[]) {
	const { byCerebrusId } = getMaps(shapes)
	return sortShapes(
		shapes.filter((shape) => {
			if (!shape.navigation.parentCerebrusId) return true
			return !byCerebrusId.has(shape.navigation.parentCerebrusId)
		})
	)
}

export function getDefaultActiveContainer(shapes: CanvasWorkspaceShape[]) {
	const roots = getRootShapes(shapes)
	return (
		roots.find((shape) => shape.navigation.artifactKind === 'course') ??
		roots.find((shape) => getShapeRole(shape) === 'folder') ??
		roots.find((shape) => getChildrenForShape(shapes, shape.shapeId).length > 0) ??
		null
	)
}

export function getActiveContainerShape(shapes: CanvasWorkspaceShape[], state: CerebrusNavigationState) {
	const explicitContainer = getShapeById(shapes, state.activeContainerShapeId)
	if (explicitContainer && getShapeRole(explicitContainer) === 'folder') {
		return explicitContainer
	}

	if (state.viewMode === 'document') {
		const openedLeaf = getShapeById(shapes, state.openedLeafShapeId)
		if (openedLeaf) {
			const parent = getParentShape(shapes, openedLeaf.shapeId)
			if (parent && getShapeRole(parent) === 'folder') {
				return parent
			}
		}
	}

	return getDefaultActiveContainer(shapes)
}

export function getOpenedLeafShape(shapes: CanvasWorkspaceShape[], state: CerebrusNavigationState) {
	const shape = getShapeById(shapes, state.openedLeafShapeId)
	if (!shape) return null
	return getShapeRole(shape) === 'file' ? shape : null
}

export function getCurrentShape(shapes: CanvasWorkspaceShape[], state: CerebrusNavigationState) {
	if (state.viewMode === 'document') {
		return getOpenedLeafShape(shapes, state)
	}

	return getActiveContainerShape(shapes, state)
}

export function getActiveRootShape(shapes: CanvasWorkspaceShape[], state: CerebrusNavigationState) {
	const current = getCurrentShape(shapes, state)
	if (!current) {
		return getRootShapes(shapes)[0] ?? null
	}

	return getPathToShape(shapes, current.shapeId)[0] ?? current
}

export function getVisibleShapesForState(shapes: CanvasWorkspaceShape[], state: CerebrusNavigationState) {
	const current = getCurrentShape(shapes, state)
	const openedLeaf = getOpenedLeafShape(shapes, state)
	const activeContainer = getActiveContainerShape(shapes, state)
	const visible = new Map<string, VisibleCerebrusShape>()

	for (const shape of shapes) {
		visible.set(String(shape.shapeId), {
			shape,
			role: getShapeRole(shape),
			depth: null,
			emphasis: 'hidden',
			isVisible: false,
			isCurrent: current ? String(current.shapeId) === String(shape.shapeId) : false,
			isOpenDocument: openedLeaf ? String(openedLeaf.shapeId) === String(shape.shapeId) : false,
		})
	}

	if (state.viewMode === 'document' && openedLeaf) {
		return visible
	}

	if (activeContainer) {
		const visited = new Set<string>()
		const markSubtree = (shape: CanvasWorkspaceShape, depth: number) => {
			if (visited.has(shape.navigation.cerebrusId)) return
			visited.add(shape.navigation.cerebrusId)

			visible.set(String(shape.shapeId), {
				shape,
				role: getShapeRole(shape),
				depth,
				emphasis: depth === 0 ? 'primary' : depth === 1 ? 'secondary' : 'tertiary',
				isVisible: true,
				isCurrent: String(shape.shapeId) === String(activeContainer.shapeId),
				isOpenDocument: false,
			})

			for (const child of getChildrenForShape(shapes, shape.shapeId)) {
				markSubtree(child, depth + 1)
			}
		}

		markSubtree(activeContainer, 0)
		return visible
	}

	for (const root of getRootShapes(shapes)) {
		visible.set(String(root.shapeId), {
			shape: root,
			role: getShapeRole(root),
			depth: 0,
			emphasis: 'primary',
			isVisible: true,
			isCurrent: false,
			isOpenDocument: false,
		})
	}

	return visible
}
