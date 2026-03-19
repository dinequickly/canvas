import { Editor } from 'tldraw'
import { type CanvasArtifactShape, readArtifactShapes } from '../artifacts/readArtifactShapes'
import { type CanvasCerebrusShape, readCerebrusShapes } from '../cerebrus/readCerebrusPageShapes'

export type CanvasWorkspaceShape = CanvasCerebrusShape | CanvasArtifactShape

export function readWorkspaceShapes(editor: Editor): CanvasWorkspaceShape[] {
	return [...readCerebrusShapes(editor), ...readArtifactShapes(editor)]
}
