import { Editor, EditorAtom, TLShapeId } from 'tldraw'

export interface CerebrusNavigationState {
	activeContainerShapeId: TLShapeId | null
	openedLeafShapeId: TLShapeId | null
	viewMode: 'folder' | 'document'
}

const defaultNavigationState: CerebrusNavigationState = {
	activeContainerShapeId: null,
	openedLeafShapeId: null,
	viewMode: 'folder',
}

const $navigationState = new EditorAtom<CerebrusNavigationState>(
	'cerebrus-navigation',
	() => defaultNavigationState
)

export function getCerebrusNavigationState(editor: Editor) {
	return $navigationState.get(editor)
}

export function setCerebrusNavigationState(
	editor: Editor,
	updater: (state: CerebrusNavigationState) => CerebrusNavigationState
) {
	$navigationState.update(editor, updater)
}

export function resetCerebrusNavigationState(editor: Editor) {
	$navigationState.set(editor, defaultNavigationState)
}
