import { Box, Editor, TLShapeId, TLShapePartial } from 'tldraw'
import { cerebrusSpecSchema, type CerebrusSpec } from '../../src/lib/cerebrus/catalog'
import {
	cerebrusOperationBatchSchema,
	type CerebrusOperation,
	type CerebrusOperationBatch,
	type CerebrusSpecPatch,
} from '../../src/lib/cerebrus/operations'
import {
	CEREBRUS_SHAPE_TYPE,
	createCerebrusShapeId,
	getDefaultCerebrusShapeSize,
	getDefaultShapeNavigationProps,
	type AnyCanvasCerebrusShape,
	type CanvasCerebrusShapeType,
	type CerebrusShape,
} from './CerebrusPageShapeUtil'
import { readCerebrusShapes } from './readCerebrusPageShapes'
import type { CanvasRegion } from '../orchestration/types'
import type { CerebrusShapeNavigationProps } from './shapeMeta'

function applySpecPatch(spec: CerebrusSpec, patch: CerebrusSpecPatch) {
	const nextSpec: CerebrusSpec = {
		root: patch.root ?? spec.root,
		elements: { ...spec.elements },
	}

	for (const [elementId, value] of Object.entries(patch.elements ?? {})) {
		if (value === null) {
			delete nextSpec.elements[elementId]
		} else {
			nextSpec.elements[elementId] = value
		}
	}

	return cerebrusSpecSchema.parse(nextSpec)
}

function getCreateGridStart(existingBounds: Array<{ x: number; y: number; w: number; h: number }>, viewport: Box) {
	if (existingBounds.length === 0) {
		return { x: viewport.x + 80, y: viewport.y + 80 }
	}

	const maxX = Math.max(...existingBounds.map((shape) => shape.x + shape.w))
	const minY = Math.min(...existingBounds.map((shape) => shape.y))

	return {
		x: maxX + 96,
		y: minY,
	}
}

function getCreatePosition(index: number, existingBounds: Array<{ x: number; y: number; w: number; h: number }>, viewport: Box) {
	const { w, h } = getDefaultCerebrusShapeSize()
	const start = getCreateGridStart(existingBounds, viewport)
	const columns = 2
	const gapX = 88
	const gapY = 88
	const column = index % columns
	const row = Math.floor(index / columns)

	return {
		x: start.x + column * (w + gapX),
		y: start.y + row * (h + gapY),
	}
}

function getRegionCreatePlacement(region: CanvasRegion, index: number, totalCreates: number, layout: 'vertical' | 'horizontal') {
	const gap = 24

	if (layout === 'horizontal') {
		const totalGap = gap * Math.max(0, totalCreates - 1)
		const slotWidth = (region.width - totalGap) / totalCreates

		return {
			x: region.x + index * (slotWidth + gap),
			y: region.y,
			w: slotWidth,
			h: region.height,
		}
	}

	const totalGap = gap * Math.max(0, totalCreates - 1)
	const slotHeight = (region.height - totalGap) / totalCreates

	return {
		x: region.x,
		y: region.y + index * (slotHeight + gap),
		w: region.width,
		h: slotHeight,
	}
}

function updateExistingShape(
	editor: Editor,
	targetId: TLShapeId,
	shapeType: CanvasCerebrusShapeType,
	nextSpec: CerebrusSpec
) {
	editor.updateShape({
		id: targetId,
		type: shapeType,
		props: {
			spec: JSON.stringify(nextSpec),
		},
	} satisfies TLShapePartial<AnyCanvasCerebrusShape>)
}

function createNewShape(
	editor: Editor,
	spec: CerebrusSpec,
	position: { x: number; y: number },
	size: { w: number; h: number } = getDefaultCerebrusShapeSize(),
	navigationProps?: CerebrusShapeNavigationProps
) {
	const { w, h } = size
	const id = createCerebrusShapeId()
	const nextNavigationProps = getDefaultShapeNavigationProps(spec, navigationProps)

	editor.createShape({
		id,
		type: CEREBRUS_SHAPE_TYPE,
		x: position.x,
		y: position.y,
		props: {
			w,
			h,
			spec: JSON.stringify(spec),
			...nextNavigationProps,
		},
	} satisfies TLShapePartial<CerebrusShape>)

	return id
}

export function applyCerebrusOperationBatch(
	editor: Editor,
	batch: CerebrusOperationBatch,
	options: {
		region?: CanvasRegion
		createLayout?: 'vertical' | 'horizontal'
		selectCreated?: boolean
		createNavigationProps?: CerebrusShapeNavigationProps[]
	} = {}
) {
	const parsedBatch = cerebrusOperationBatchSchema.parse(batch)
	const existingShapes = readCerebrusShapes(editor)
	const existingBounds = existingShapes.map((shape) => ({ x: shape.x, y: shape.y, w: shape.w, h: shape.h }))
	const viewport = editor.getViewportPageBounds()
	const createdIds: TLShapeId[] = []
	const createOperations = parsedBatch.operations.filter((operation) => operation.op === 'create')
	const shouldSelectCreated = options.selectCreated ?? true

	let createIndex = 0

	for (const operation of parsedBatch.operations) {
		if (operation.op === 'create') {
			const regionPlacement = options.region
				? getRegionCreatePlacement(
						options.region,
						createIndex,
						createOperations.length,
						options.createLayout ?? 'vertical'
				  )
				: null
			const position = regionPlacement
				? { x: regionPlacement.x, y: regionPlacement.y }
				: getCreatePosition(createIndex, existingBounds, viewport)
			const size = regionPlacement ? { w: regionPlacement.w, h: regionPlacement.h } : getDefaultCerebrusShapeSize()
			const id = createNewShape(
				editor,
				operation.spec,
				position,
				size,
				options.createNavigationProps?.[createIndex]
			)
			existingBounds.push({ x: position.x, y: position.y, w: size.w, h: size.h })
			createdIds.push(id)
			createIndex += 1
			continue
		}

		const targetShape = existingShapes.find((shape) => shape.shapeId === operation.targetId)
		if (!targetShape) {
			throw new Error(`Cannot patch Cerebrus shape "${operation.targetId}" because it was not found on the canvas.`)
		}

		const nextSpec = applySpecPatch(targetShape.spec, operation.patch)
		updateExistingShape(editor, targetShape.shapeId, targetShape.shapeType, nextSpec)
		targetShape.spec = nextSpec
	}

	if (shouldSelectCreated && createdIds.length > 0) {
		editor.select(...createdIds)
	}

	return createdIds
}

export type { CerebrusOperation, CerebrusOperationBatch }
