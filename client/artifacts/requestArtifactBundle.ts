import type { ArtifactBundle, ArtifactType } from '../../src/lib/artifacts/schema'
import type { AgentModelName } from '../../shared/models'

type ArtifactResponse = {
	bundle?: ArtifactBundle
	modelName?: string
	error?: string
}

export async function requestArtifactBundle(
	prompt: string,
	artifactType?: ArtifactType,
	modelName?: AgentModelName
) {
	const response = await fetch('/artifacts/generate', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			prompt,
			artifactType,
			modelName,
		}),
	})

	const data = (await response.json()) as ArtifactResponse
	if (!response.ok || !data.bundle) {
		throw new Error(data.error ?? 'Failed to generate artifact bundle.')
	}

	return {
		bundle: data.bundle,
		modelName: data.modelName,
	}
}
