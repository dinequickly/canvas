import type { TLShapeId } from 'tldraw'
import { getCerebrusNavigationState, resetCerebrusNavigationState, setCerebrusNavigationState } from '../../cerebrus/navigationState'
import {
	getActiveContainerShape,
	getActiveRootShape,
	getChildrenForShape,
	getCurrentShape,
	getOpenedLeafShape,
	getPathToShape,
	getRootShapes,
	getShapeById,
	getShapeRole,
	getSiblingsForShape,
	getVisibleShapesForState,
} from '../../cerebrus/navigationModel'
import { type CanvasWorkspaceShape, readWorkspaceShapes } from '../../workspace/readWorkspaceShapes'
import { BaseAgentAppManager } from './BaseAgentAppManager'

export class AgentAppNavigationManager extends BaseAgentAppManager {
	getState() {
		return getCerebrusNavigationState(this.app.editor)
	}

	reset() {
		resetCerebrusNavigationState(this.app.editor)
	}

	setActiveContainer(shapeId: TLShapeId | null) {
		if (!shapeId) {
			setCerebrusNavigationState(this.app.editor, (state) => ({
				...state,
				activeContainerShapeId: null,
				openedLeafShapeId: null,
				viewMode: 'folder',
			}))
			return
		}

		const shape = this.getShape(shapeId)
		if (!shape || getShapeRole(shape) !== 'folder') {
			setCerebrusNavigationState(this.app.editor, (state) => ({
				...state,
				activeContainerShapeId: null,
				openedLeafShapeId: null,
				viewMode: 'folder',
			}))
			return
		}

		setCerebrusNavigationState(this.app.editor, () => ({
			activeContainerShapeId: shapeId,
			openedLeafShapeId: null,
			viewMode: 'folder',
		}))
		this.app.editor.select(shapeId)
	}

	getActiveContainer() {
		return getActiveContainerShape(this.getShapes(), this.getState())
	}

	enterShape(shapeId: TLShapeId) {
		const shape = this.getShape(shapeId)
		if (!shape) return

		if (getShapeRole(shape) === 'folder') {
			this.setActiveContainer(shapeId)
			return
		}

		this.openLeaf(shapeId)
	}

	openLeaf(shapeId: TLShapeId) {
		const leafShape = this.getShape(shapeId)
		if (!leafShape || getShapeRole(leafShape) !== 'file') {
			return
		}

		const parent = leafShape.navigation.parentCerebrusId ? this.getPath(shapeId).at(-2) ?? null : null
		setCerebrusNavigationState(this.app.editor, (state) => ({
			...state,
			activeContainerShapeId: parent?.shapeId ?? state.activeContainerShapeId,
			openedLeafShapeId: shapeId,
			viewMode: 'document',
		}))
		this.app.editor.select(shapeId)
	}

	getOpenedLeaf() {
		return getOpenedLeafShape(this.getShapes(), this.getState())
	}

	getCurrentShape() {
		return getCurrentShape(this.getShapes(), this.getState())
	}

	goBack() {
		const state = this.getState()
		if (state.viewMode === 'document') {
			const openedLeaf = this.getOpenedLeaf()
			const parent = openedLeaf ? this.getPath(openedLeaf.shapeId).at(-2) ?? null : null
			setCerebrusNavigationState(this.app.editor, (current) => ({
				...current,
				activeContainerShapeId: parent?.shapeId ?? current.activeContainerShapeId,
				openedLeafShapeId: null,
				viewMode: 'folder',
			}))
			if (parent) {
				this.app.editor.select(parent.shapeId)
			}
			return
		}

		const activeContainer = this.getActiveContainer()
		if (!activeContainer) return

		const parent = this.getPath(activeContainer.shapeId).at(-2) ?? null
		if (!parent) {
			return
		}

		this.setActiveContainer(parent.shapeId)
	}

	getPath(shapeId: TLShapeId) {
		return getPathToShape(this.getShapes(), shapeId)
	}

	getChildren(shapeId: TLShapeId) {
		return getChildrenForShape(this.getShapes(), shapeId)
	}

	getSiblings(shapeId: TLShapeId) {
		return getSiblingsForShape(this.getShapes(), shapeId)
	}

	getVisibleShapes() {
		return getVisibleShapesForState(this.getShapes(), this.getState())
	}

	getActiveRoot() {
		return getActiveRootShape(this.getShapes(), this.getState())
	}

	getRootShapes() {
		return getRootShapes(this.getShapes())
	}

	private getShape(shapeId: TLShapeId) {
		return getShapeById(this.getShapes(), shapeId)
	}

	private getShapes(): CanvasWorkspaceShape[] {
		return readWorkspaceShapes(this.app.editor)
	}
}
