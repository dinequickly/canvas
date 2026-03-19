import { Editor, TLShapeId } from 'tldraw'
import type { CerebrusSpec } from '../../src/lib/cerebrus/catalog'
import {
	CEREBRUS_PAGE_SHAPE_TYPE,
	CEREBRUS_SHAPE_TYPE,
	type CanvasCerebrusShapeType,
	getResolvedShapeNavigation,
	getCerebrusShapeTitle,
	parseCerebrusShapeSpec,
	type AnyCanvasCerebrusShape,
} from './CerebrusPageShapeUtil'
import type { ResolvedCerebrusShapeNavigation } from './shapeMeta'

export interface CanvasCerebrusShape {
	kind: 'cerebrus'
	shapeId: TLShapeId
	shapeType: CanvasCerebrusShapeType
	title: string
	rootType: string
	spec: CerebrusSpec
	x: number
	y: number
	w: number
	h: number
	navigation: ResolvedCerebrusShapeNavigation
}

function isCanvasCerebrusShape(shape: { type: string }): shape is AnyCanvasCerebrusShape {
	return shape.type === CEREBRUS_SHAPE_TYPE || shape.type === CEREBRUS_PAGE_SHAPE_TYPE
}

export function readCerebrusShapes(editor: Editor): CanvasCerebrusShape[] {
	return editor
		.getCurrentPageShapes()
		.filter(isCanvasCerebrusShape)
		.flatMap((shape) => {
			const spec = parseCerebrusShapeSpec(shape.props.spec)
			if (!spec) return []

			const root = spec.elements[spec.root]

			return [
				{
					kind: 'cerebrus',
					shapeId: shape.id,
					shapeType: shape.type as CanvasCerebrusShapeType,
					title: getCerebrusShapeTitle(spec),
					rootType: root?.type ?? 'Unknown',
					spec,
					x: shape.x,
					y: shape.y,
					w: shape.props.w,
					h: shape.props.h,
					navigation: getResolvedShapeNavigation(shape, spec),
				},
			]
		})
}
