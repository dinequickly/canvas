import { useMemo, useState } from 'react'
import type { TLShapeId } from 'tldraw'
import { useNavigation, useTldrawAgentApp } from '../../agent/TldrawAgentAppProvider'
import type { CanvasArtifactShape } from '../../artifacts/readArtifactShapes'
import { Artifact, ArtifactAction, ArtifactActions, ArtifactClose, ArtifactContent, ArtifactDescription, ArtifactHeader, ArtifactTitle } from './Artifact'
import { ArtifactPreviewFrame } from './ArtifactPreviewFrame'
import type { ArtifactErrorState } from '../../../src/lib/artifacts/schema'

export function ArtifactStage({ shape, onBack }: { shape: CanvasArtifactShape; onBack: () => void }) {
	const app = useTldrawAgentApp()
	const navigation = useNavigation()
	const [showSource, setShowSource] = useState(false)
	const [refreshCount, setRefreshCount] = useState(0)
	const [isRegenerating, setIsRegenerating] = useState(false)
	const sourceEntries = useMemo(
		() => Object.entries(shape.artifact.sourceBundle.files).sort(([a], [b]) => a.localeCompare(b)),
		[shape.artifact.sourceBundle.files]
	)

	const handleRegenerate = async () => {
		setIsRegenerating(true)
		try {
			await app.artifacts.regenerate(shape.shapeId)
			setRefreshCount((current) => current + 1)
		} finally {
			setIsRegenerating(false)
		}
	}

	const handleDuplicate = () => {
		const nextId = app.artifacts.duplicate(shape.shapeId)
		navigation.openLeaf(nextId as TLShapeId)
	}

	return (
		<div className="artifact-stage">
			<Artifact>
				<ArtifactHeader>
					<div className="artifact__meta">
						<span className="artifact__eyebrow">{shape.artifact.artifactType}</span>
						<ArtifactTitle>{shape.artifact.title}</ArtifactTitle>
						{shape.artifact.description ? (
							<ArtifactDescription>{shape.artifact.description}</ArtifactDescription>
						) : null}
					</div>
					<ArtifactActions>
						<ArtifactAction
							tooltip="Refresh the live preview"
							label="Refresh preview"
							onClick={() => {
								app.artifacts.refresh(shape.shapeId)
								setRefreshCount((current) => current + 1)
							}}
						>
							Refresh
						</ArtifactAction>
						<ArtifactAction
							tooltip="Toggle source view"
							label="Toggle source view"
							onClick={() => setShowSource((current) => !current)}
						>
							{showSource ? 'Preview' : 'Source'}
						</ArtifactAction>
						<ArtifactAction
							tooltip="Duplicate this artifact"
							label="Duplicate artifact"
							onClick={handleDuplicate}
						>
							Duplicate
						</ArtifactAction>
						<ArtifactAction
							tooltip="Regenerate this artifact from its saved prompt"
							label="Regenerate artifact"
							onClick={handleRegenerate}
							disabled={isRegenerating}
						>
							{isRegenerating ? 'Regenerating…' : 'Regenerate'}
						</ArtifactAction>
						<ArtifactClose onClick={onBack}>Close</ArtifactClose>
					</ArtifactActions>
				</ArtifactHeader>

				{shape.artifact.errorState ? (
					<div className="artifact__error">
						<strong>{shape.artifact.errorState.source} error</strong>
						<span>{shape.artifact.errorState.message}</span>
					</div>
				) : null}

				<ArtifactContent>
					{showSource ? (
						<div className="artifact-source">
							{sourceEntries.map(([filePath, source]) => (
								<section key={filePath} className="artifact-source__file">
									<header>{filePath}</header>
									<pre>{source}</pre>
								</section>
							))}
						</div>
					) : (
						<ArtifactPreviewFrame
							bundle={shape.artifact.sourceBundle}
							previewState={shape.artifact.previewState}
							refreshToken={`${shape.artifact.lastRunAt ?? ''}:${refreshCount}`}
							onPreviewStateChange={(previewState) => app.artifacts.setPreviewState(shape.shapeId, previewState)}
							onErrorStateChange={(errorState: ArtifactErrorState | null) =>
								app.artifacts.setErrorState(shape.shapeId, errorState)
							}
						/>
					)}
				</ArtifactContent>
			</Artifact>
		</div>
	)
}
