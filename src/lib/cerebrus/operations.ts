import { z } from 'zod'
import { cerebrusElementIdSchema, cerebrusElementSchema, cerebrusSpecSchema } from './catalog'

export const cerebrusSpecPatchSchema = z.object({
	root: cerebrusElementIdSchema.optional(),
	elements: z.record(z.string(), z.union([cerebrusElementSchema, z.null()])).optional(),
})

export const createShapeOperationSchema = z.object({
	op: z.literal('create'),
	spec: cerebrusSpecSchema,
})

export const patchShapeOperationSchema = z.object({
	op: z.literal('patch'),
	targetId: z.string().min(1),
	patch: cerebrusSpecPatchSchema,
})

export const cerebrusOperationSchema = z.discriminatedUnion('op', [
	createShapeOperationSchema,
	patchShapeOperationSchema,
])

export const cerebrusOperationBatchSchema = z.object({
	operations: z.array(cerebrusOperationSchema).min(1),
})

export type CerebrusSpecPatch = z.infer<typeof cerebrusSpecPatchSchema>
export type CreateShapeOperation = z.infer<typeof createShapeOperationSchema>
export type PatchShapeOperation = z.infer<typeof patchShapeOperationSchema>
export type CerebrusOperation = z.infer<typeof cerebrusOperationSchema>
export type CerebrusOperationBatch = z.infer<typeof cerebrusOperationBatchSchema>
