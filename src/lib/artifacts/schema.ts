import { z } from 'zod'

export const artifactTypeSchema = z.enum([
	'slideshow',
	'web-design',
	'react-component',
	'document',
	'code',
	'prototype',
])

export const artifactStatusSchema = z.enum(['generating', 'ready', 'error'])

export const artifactActionIdSchema = z.enum([
	'refresh',
	'open-source',
	'duplicate',
	'regenerate',
	'close',
])

export const artifactFilePathSchema = z.string().min(1).regex(/^\//, 'Artifact file paths must be absolute.')

export const artifactFilesSchema = z.record(artifactFilePathSchema, z.string())

export const artifactPreviewStateSchema = z.record(z.string(), z.unknown()).default({})

export const artifactBundleSchema = z.object({
	artifactType: artifactTypeSchema,
	title: z.string().min(1),
	description: z.string().min(1).optional(),
	entryFile: artifactFilePathSchema,
	files: artifactFilesSchema,
	previewState: artifactPreviewStateSchema,
	suggestedActions: z.array(artifactActionIdSchema).default([]),
})

export const artifactErrorStateSchema = z.object({
	message: z.string().min(1),
	source: z.enum(['generation', 'compile', 'runtime']),
	timestamp: z.string().min(1),
})

export const artifactRecordSchema = z.object({
	artifactId: z.string().min(1),
	artifactType: artifactTypeSchema,
	title: z.string().min(1),
	description: z.string().optional(),
	status: artifactStatusSchema,
	sourceBundle: artifactBundleSchema,
	previewState: artifactPreviewStateSchema,
	entryFile: artifactFilePathSchema,
	lastRunAt: z.string().optional(),
	errorState: artifactErrorStateSchema.optional(),
	generationPrompt: z.string().min(1).optional(),
	generationModelName: z.string().min(1).optional(),
})

export type ArtifactType = z.infer<typeof artifactTypeSchema>
export type ArtifactStatus = z.infer<typeof artifactStatusSchema>
export type ArtifactActionId = z.infer<typeof artifactActionIdSchema>
export type ArtifactBundle = z.infer<typeof artifactBundleSchema>
export type ArtifactErrorState = z.infer<typeof artifactErrorStateSchema>
export type ArtifactRecord = z.infer<typeof artifactRecordSchema>
