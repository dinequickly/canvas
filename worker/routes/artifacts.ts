import { generateObject } from 'ai'
import { IRequest } from 'itty-router'
import { z } from 'zod'
import { buildArtifactSystemPrompt } from '../../src/lib/artifacts/systemPrompt'
import { artifactBundleSchema, artifactTypeSchema, type ArtifactBundle } from '../../src/lib/artifacts/schema'
import { AgentModelName, DEFAULT_MODEL_NAME, isValidModelName } from '../../shared/models'
import { Environment } from '../environment'
import { AgentService } from '../do/AgentService'

const artifactRequestSchema = z.object({
	prompt: z.string().min(1),
	artifactType: artifactTypeSchema.optional(),
	modelName: z.string().optional(),
})

const artifactResponseSchema = z.object({
	bundle: artifactBundleSchema,
	modelName: z.string().min(1),
})

const artifactBundleGenerationSchema = z.object({
	artifactType: artifactTypeSchema,
	title: z.string().min(1),
	description: z.string().min(1).optional(),
	entryFile: z.string().min(1),
	files: z.record(z.string(), z.string()),
	previewState: z.record(z.string(), z.unknown()).optional(),
	suggestedActions: z.array(z.string()).optional(),
})

const allowedExtensions = new Set(['.tsx', '.ts', '.jsx', '.js', '.css', '.json'])
const allowedImports = new Set(['react', 'react-dom/client', '@artifact/runtime'])
const likelyEntryCandidates = [
	'/App.tsx',
	'/App.jsx',
	'/src/App.tsx',
	'/src/App.jsx',
	'/main.tsx',
	'/main.jsx',
	'/index.tsx',
	'/index.jsx',
	'/main.ts',
	'/main.js',
	'/index.ts',
	'/index.js',
]

function getExtension(path: string) {
	const dot = path.lastIndexOf('.')
	return dot === -1 ? '' : path.slice(dot)
}

function normalizeRelativeImport(fromPath: string, specifier: string) {
	const fromSegments = fromPath.split('/').slice(0, -1)
	const importSegments = specifier.split('/')
	const stack = [...fromSegments]

	for (const segment of importSegments) {
		if (!segment || segment === '.') continue
		if (segment === '..') {
			stack.pop()
			continue
		}
		stack.push(segment)
	}

	return stack.join('/').startsWith('/') ? stack.join('/') : `/${stack.join('/')}`
}

function getImportSpecifiers(source: string) {
	const specifiers = new Set<string>()
	const staticImportPattern = /\b(?:import|export)\b[\s\S]*?\bfrom\s*['"]([^'"]+)['"]/g
	const sideEffectImportPattern = /\bimport\s*['"]([^'"]+)['"]/g
	const dynamicImportPattern = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
	const requirePattern = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g

	for (const pattern of [staticImportPattern, sideEffectImportPattern, dynamicImportPattern, requirePattern]) {
		for (const match of source.matchAll(pattern)) {
			if (match[1]) {
				specifiers.add(match[1])
			}
		}
	}

	return Array.from(specifiers)
}

function validateArtifactBundle(bundle: ArtifactBundle) {
	if (!bundle.files['/App.tsx']) {
		throw new Error('Artifact bundles must include /App.tsx.')
	}

	if (!bundle.files[bundle.entryFile]) {
		throw new Error(`Entry file "${bundle.entryFile}" was not found in files.`)
	}

	for (const [filePath, source] of Object.entries(bundle.files)) {
		const extension = getExtension(filePath)
		if (!allowedExtensions.has(extension)) {
			throw new Error(`Unsupported artifact file extension for "${filePath}".`)
		}

		if (/\bwindow\.parent\b|\bparent\./.test(source) || /\btop\./.test(source)) {
			throw new Error(`Forbidden parent window access found in "${filePath}".`)
		}

		if (extension === '.css' || extension === '.json') continue

		for (const specifier of getImportSpecifiers(source)) {
			if (allowedImports.has(specifier)) {
				continue
			}

			if (specifier.startsWith('./') || specifier.startsWith('../')) {
				const resolved = normalizeRelativeImport(filePath, specifier)
				const withExtension = Object.keys(bundle.files).some((candidate) => {
					if (candidate === resolved) return true
					return candidate.startsWith(`${resolved}.`)
				})

				if (!withExtension) {
					throw new Error(`Import "${specifier}" from "${filePath}" does not resolve to a bundled file.`)
				}
				continue
			}

			throw new Error(`Unsupported import "${specifier}" in "${filePath}".`)
		}
	}
}

function escapeTemplateLiteral(value: string) {
	return value.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
}

function createFallbackAppSource(candidate: z.infer<typeof artifactBundleGenerationSchema>) {
	const title = escapeTemplateLiteral(candidate.title || 'Generated artifact')
	const description = escapeTemplateLiteral(
		candidate.description || 'The model did not return a runnable /App.tsx file, so a fallback preview was created.'
	)

	return `import React from 'react'

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      padding: 32,
      fontFamily: 'Georgia, serif',
      background: 'linear-gradient(180deg, #fff7ed 0%, #ffffff 100%)',
      color: '#0f172a'
    }}>
      <div style={{
        maxWidth: 760,
        margin: '0 auto',
        background: 'rgba(255,255,255,0.88)',
        borderRadius: 24,
        padding: 28,
        boxShadow: '0 24px 60px rgba(15,23,42,0.08)'
      }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#c2410c' }}>
          Artifact Fallback
        </p>
        <h1 style={{ margin: '10px 0 0', fontSize: 40, lineHeight: 1.04, letterSpacing: '-0.05em' }}>${'`'}${title}${'`'}</h1>
        <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.6, color: 'rgba(51,65,85,0.82)' }}>${'`'}${description}${'`'}</p>
      </div>
    </div>
  )
}
`
}

function logArtifactCandidate(stage: string, candidate: z.infer<typeof artifactBundleGenerationSchema>) {
	try {
		console.log(
			`[artifact:${stage}] raw candidate summary`,
			JSON.stringify(
				{
					artifactType: candidate.artifactType,
					title: candidate.title,
					entryFile: candidate.entryFile,
					fileKeys: Object.keys(candidate.files ?? {}),
					suggestedActions: candidate.suggestedActions ?? [],
				},
				null,
				2
			)
		)
		console.log(`[artifact:${stage}] raw candidate full`, JSON.stringify(candidate, null, 2))
	} catch (error) {
		console.warn(`[artifact:${stage}] failed to log candidate`, error)
	}
}

function normalizeArtifactBundle(candidate: z.infer<typeof artifactBundleGenerationSchema>): ArtifactBundle {
	logArtifactCandidate('normalize', candidate)
	const normalizedFiles = Object.fromEntries(
		Object.entries(candidate.files).map(([filePath, source]) => [
			filePath.startsWith('/') ? filePath : `/${filePath}`,
			source,
		])
	)

	const normalizedEntryFile = candidate.entryFile.startsWith('/')
		? candidate.entryFile
		: `/${candidate.entryFile}`

	const commonAppPath =
		likelyEntryCandidates.find((candidatePath) => normalizedFiles[candidatePath]) ??
		(normalizedFiles[normalizedEntryFile] ? normalizedEntryFile : null) ??
		Object.keys(normalizedFiles).find((filePath) =>
			/\.(tsx|jsx|ts|js)$/.test(filePath) && !filePath.endsWith('.d.ts')
		) ??
		null

	if (!normalizedFiles['/App.tsx']) {
		if (commonAppPath && normalizedFiles[commonAppPath]) {
			console.warn(`[artifact:normalize] remapping "${commonAppPath}" to "/App.tsx"`)
			normalizedFiles['/App.tsx'] = normalizedFiles[commonAppPath]
		} else {
			console.warn('[artifact:normalize] no runnable app entry returned; synthesizing fallback /App.tsx')
			normalizedFiles['/App.tsx'] = createFallbackAppSource(candidate)
		}
	}

	const normalizedActions = (candidate.suggestedActions ?? []).filter((action): action is ArtifactBundle['suggestedActions'][number] =>
		['refresh', 'open-source', 'duplicate', 'regenerate', 'close'].includes(action)
	)

	return artifactBundleSchema.parse({
		artifactType: candidate.artifactType,
		title: candidate.title,
		description: candidate.description,
		entryFile: '/App.tsx',
		files: normalizedFiles,
		previewState: candidate.previewState ?? {},
		suggestedActions: normalizedActions,
	})
}

async function generateCandidate(
	model: ReturnType<AgentService['getModel']>,
	prompt: string,
	artifactType?: z.infer<typeof artifactTypeSchema>,
	repairFeedback?: string
) {
	const typeHint = artifactType ? `Requested artifact type: ${artifactType}` : 'Choose the best artifact type.'
	const finalPrompt = [typeHint, `User request: ${prompt}`, repairFeedback].filter(Boolean).join('\n\n')

	const result = await generateObject({
		model,
		system: buildArtifactSystemPrompt(),
		schema: artifactBundleGenerationSchema,
		prompt: finalPrompt,
		temperature: 0.4,
	})

	return normalizeArtifactBundle(artifactBundleGenerationSchema.parse(result.object))
}

async function generateValidatedBundle(
	model: ReturnType<AgentService['getModel']>,
	prompt: string,
	artifactType?: z.infer<typeof artifactTypeSchema>
) {
	const firstDraft = await generateCandidate(model, prompt, artifactType)
	try {
		validateArtifactBundle(firstDraft)
		return firstDraft
	} catch (error) {
		const repairFeedback = error instanceof Error ? error.message : 'Bundle validation failed.'
		const repairedDraft = await generateCandidate(model, prompt, artifactType, `Repair feedback: ${repairFeedback}`)
		validateArtifactBundle(repairedDraft)
		return repairedDraft
	}
}

export async function artifacts(request: IRequest, env: Environment) {
	try {
		const body = artifactRequestSchema.parse(await request.json())
		const service = new AgentService(env)
		const modelName: AgentModelName = isValidModelName(body.modelName) ? body.modelName : DEFAULT_MODEL_NAME
		const model = service.getModel(modelName)
		const bundle = await generateValidatedBundle(model, body.prompt, body.artifactType)

		return Response.json(
			artifactResponseSchema.parse({
				bundle,
				modelName,
			})
		)
	} catch (error) {
		console.error('Artifact generation failed:', error)
		const message = error instanceof Error ? error.message : 'Failed to generate artifact bundle.'
		return Response.json({ error: message }, { status: 400 })
	}
}
