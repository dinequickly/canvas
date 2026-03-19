import { Editor } from 'tldraw'
import { DEFAULT_MODEL_NAME } from '../../shared/models'
import type { CerebrusOperationBatch } from './applyCerebrusOperations'
import { applyCerebrusOperationBatch } from './applyCerebrusOperations'
import {
	CEREBRUS_PAGE_SHAPE_TYPE,
	CEREBRUS_SHAPE_TYPE,
} from './CerebrusPageShapeUtil'
import { readCerebrusShapes } from './readCerebrusPageShapes'

export type CerebrusResponse = {
	operations?: CerebrusOperationBatch['operations']
	modelName?: string
	error?: string
}

export type SuccessfulCerebrusResponse = {
	operations: CerebrusOperationBatch['operations']
	modelName?: string
}

export async function fetchCerebrusOperations(
	editor: Editor,
	prompt: string,
	options: {
		shapes?: ReturnType<typeof readCerebrusShapes>
		selectedShapeIds?: string[]
		modelName?: string
	} = {}
): Promise<SuccessfulCerebrusResponse> {
	const shapes = options.shapes ?? readCerebrusShapes(editor)
	const selectedShapeIds =
		options.selectedShapeIds ??
		editor
			.getSelectedShapes()
			.filter((shape) => shape.type === CEREBRUS_SHAPE_TYPE || shape.type === CEREBRUS_PAGE_SHAPE_TYPE)
			.map((shape) => shape.id)

	const response = await fetch('/cerebrus/generate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			prompt,
			modelName: options.modelName ?? DEFAULT_MODEL_NAME,
			shapes,
			selectedShapeIds,
		}),
	})

	const data = (await response.json()) as CerebrusResponse
	if (!response.ok || !data.operations) {
		throw new Error(data.error ?? 'Failed to generate Cerebrus operations.')
	}

	return {
		operations: data.operations,
		modelName: data.modelName,
	}
}

export async function requestCerebrusOperations(
	editor: Editor,
	prompt: string,
	options: {
		shapes?: ReturnType<typeof readCerebrusShapes>
		selectedShapeIds?: string[]
		modelName?: string
	} = {}
): Promise<SuccessfulCerebrusResponse> {
	const data = await fetchCerebrusOperations(editor, prompt, options)
	applyCerebrusOperationBatch(editor, { operations: data.operations })
	return data
}
