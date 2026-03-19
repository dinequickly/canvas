import { Editor, TLShapeId } from 'tldraw'
import { type ArtifactRecord } from '../../src/lib/artifacts/schema'
import { ARTIFACT_SHAPE_TYPE, parseArtifactRecord, type ArtifactShape, getResolvedArtifactNavigation } from './ArtifactShapeUtil'

export interface CanvasArtifactShape {
	kind: 'artifact'
	shapeId: TLShapeId
	shapeType: typeof ARTIFACT_SHAPE_TYPE
	title: string
	x: number
	y: number
	w: number
	h: number
	artifact: ArtifactRecord
	navigation: ReturnType<typeof getResolvedArtifactNavigation>
}

function isArtifactShape(shape: { type: string }): shape is ArtifactShape {
	return shape.type === ARTIFACT_SHAPE_TYPE
}

export function readArtifactShapes(editor: Editor): CanvasArtifactShape[] {
	return editor
		.getCurrentPageShapes()
		.filter(isArtifactShape)
		.flatMap((shape) => {
			const artifact = parseArtifactRecord(shape)
			if (!artifact) return []

			return [
				{
					kind: 'artifact' as const,
					shapeId: shape.id,
					shapeType: ARTIFACT_SHAPE_TYPE,
					title: artifact.title,
					x: shape.x,
					y: shape.y,
					w: shape.props.w,
					h: shape.props.h,
					artifact,
					navigation: getResolvedArtifactNavigation(shape, artifact),
				},
			]
		})
}
