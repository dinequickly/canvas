import { useEffect, useMemo, useState } from 'react'
import type { TLShapeId } from 'tldraw'
import { Renderer } from '../../src/components/cerebrus/Renderer'
import type { CerebrusEditablePropKey } from '../../src/components/cerebrus/CerebrusEditingContext'
import { cerebrusSpecSchema } from '../../src/lib/cerebrus/catalog'
import { useNavigation, useNavigationState, useTldrawAgentApp } from '../agent/TldrawAgentAppProvider'
import { ArtifactStage } from './artifacts/ArtifactStage'
import { getShapeRole } from '../cerebrus/navigationModel'
import type { CanvasWorkspaceShape } from '../workspace/readWorkspaceShapes'
import { getDefaultNavigationLabel } from '../cerebrus/shapeMeta'

export function CerebrusNavigationChrome() {
	const app = useTldrawAgentApp()
	const navigation = useNavigation()
	useNavigationState()
	const [isEditing, setIsEditing] = useState(false)
	const [expandedIds, setExpandedIds] = useState<string[]>([])

	const openedLeaf = navigation.getOpenedLeaf()
	const activeContainer = navigation.getActiveContainer()
	const currentShape = openedLeaf ?? activeContainer
	const currentPath = currentShape ? navigation.getPath(currentShape.shapeId) : []
	const currentPathSignature = currentPath.map((shape) => String(shape.shapeId)).join('|')
	const currentPathIds = useMemo(
		() => new Set(currentPath.map((shape) => String(shape.shapeId))),
		[currentPathSignature]
	)
	const rootShapes = navigation.getRootShapes()
	const hasNavigableTree = rootShapes.some((shape) => navigation.getChildren(shape.shapeId).length > 0)
	const showChrome = currentPath.length > 0 || hasNavigableTree

	useEffect(() => {
		setIsEditing(false)
	}, [openedLeaf?.shapeId])

	useEffect(() => {
		if (currentPath.length === 0) return
		setExpandedIds((current) => {
			const next = new Set(current)
			for (const shape of currentPath) {
				next.add(String(shape.shapeId))
			}
			return Array.from(next)
		})
	}, [currentPathSignature])

	const updateElementText = (elementId: string, propKey: CerebrusEditablePropKey, value: string | undefined) => {
		if (!openedLeaf || openedLeaf.kind !== 'cerebrus') return
		const currentElement = openedLeaf.spec.elements[elementId]
		if (!currentElement) return

		const nextSpec = cerebrusSpecSchema.parse({
			...openedLeaf.spec,
			elements: {
				...openedLeaf.spec.elements,
				[elementId]: {
					...currentElement,
					props: {
						...currentElement.props,
						[propKey]: value,
					},
				},
			},
		})

		app.editor.updateShape({
			id: openedLeaf.shapeId,
			type: openedLeaf.shapeType,
			props: {
				spec: JSON.stringify(nextSpec),
				navigationLabel:
					elementId === nextSpec.root && propKey === 'title'
						? getDefaultNavigationLabel(nextSpec)
						: openedLeaf.navigation.navigationLabel,
			},
		})
	}

	const outlineTree = useMemo(() => {
		if (rootShapes.length === 0 || !hasNavigableTree) return null

		return rootShapes.map((shape) => (
			<OutlineNode
				key={shape.navigation.cerebrusId}
				shape={shape}
				navigation={navigation}
				currentShapeId={currentShape ? String(currentShape.shapeId) : null}
				currentPathIds={currentPathIds}
				expandedIds={new Set(expandedIds)}
				ancestorCerebrusIds={new Set()}
				onToggle={(shapeId) => {
					setExpandedIds((current) =>
						current.includes(shapeId) ? current.filter((id) => id !== shapeId) : [...current, shapeId]
					)
				}}
				onSelect={(shapeId) => navigation.enterShape(shapeId)}
			/>
		))
	}, [currentPathIds, currentShape, expandedIds, hasNavigableTree, navigation, rootShapes])

	if (!showChrome) {
		return null
	}

	return (
		<>
			{currentPath.length > 0 ? (
				<div className="cerebrus-breadcrumb">
					{currentPath.map((shape, index) => (
						<button
							key={shape.navigation.cerebrusId}
							type="button"
							className={`cerebrus-breadcrumb__item ${index === currentPath.length - 1 ? 'is-current' : ''}`}
							onClick={() => navigation.enterShape(shape.shapeId)}
						>
							{shape.navigation.navigationLabel}
							{index < currentPath.length - 1 ? <span>/</span> : null}
						</button>
					))}
				</div>
			) : null}

			{hasNavigableTree ? <div className="cerebrus-outline">{outlineTree}</div> : null}

			{openedLeaf && openedLeaf.kind === 'cerebrus' ? (
				<div className={`cerebrus-document-shell ${hasNavigableTree ? 'has-outline' : 'is-wide'}`}>
					<div className="cerebrus-document-shell__header">
						<div className="cerebrus-document-shell__meta">
							<span>{openedLeaf.navigation.artifactKind}</span>
							<strong>{openedLeaf.navigation.navigationLabel}</strong>
						</div>
						<div className="cerebrus-document-shell__actions">
							<button
								type="button"
								className={isEditing ? 'is-active' : undefined}
								onClick={() => setIsEditing((current) => !current)}
							>
								{isEditing ? 'Done' : 'Interact'}
							</button>
							<button type="button" onClick={() => navigation.goBack()}>
								Back
							</button>
						</div>
					</div>
					<div className="cerebrus-document-shell__stage">
						<Renderer
							spec={openedLeaf.spec}
							isEditing={isEditing}
							onToggleEditing={(next) => setIsEditing(next ?? true)}
							onUpdateElementText={updateElementText}
						/>
					</div>
				</div>
			) : null}

			{openedLeaf && openedLeaf.kind === 'artifact' ? (
				<div className={`cerebrus-document-shell ${hasNavigableTree ? 'has-outline' : 'is-wide'}`}>
					<div className="cerebrus-document-shell__stage">
						<ArtifactStage shape={openedLeaf} onBack={() => navigation.goBack()} />
					</div>
				</div>
			) : null}
		</>
	)
}

interface OutlineNodeProps {
	shape: CanvasWorkspaceShape
	navigation: ReturnType<typeof useNavigation>
	currentShapeId: string | null
	currentPathIds: Set<string>
	expandedIds: Set<string>
	ancestorCerebrusIds: Set<string>
	onToggle: (shapeId: string) => void
	onSelect: (shapeId: TLShapeId) => void
}

function OutlineNode({
	shape,
	navigation,
	currentShapeId,
	currentPathIds,
	expandedIds,
	ancestorCerebrusIds,
	onToggle,
	onSelect,
}: OutlineNodeProps) {
	const children = navigation
		.getChildren(shape.shapeId)
		.filter((child) => !ancestorCerebrusIds.has(child.navigation.cerebrusId))
	const isExpanded = expandedIds.has(String(shape.shapeId))
	const isCurrent = currentShapeId === String(shape.shapeId)
	const isAncestor = !isCurrent && currentPathIds.has(String(shape.shapeId))
	const role = getShapeRole(shape)
	const nextAncestorIds = new Set(ancestorCerebrusIds)
	nextAncestorIds.add(shape.navigation.cerebrusId)

	return (
		<div className="cerebrus-outline-node">
			<div
				className={`cerebrus-outline-node__row ${isCurrent ? 'is-current' : ''} ${isAncestor ? 'is-ancestor' : ''}`}
			>
				<button type="button" className="cerebrus-outline-node__label" onClick={() => onSelect(shape.shapeId)}>
					<span className={`cerebrus-outline-node__icon role-${role} kind-${shape.navigation.artifactKind}`} />
					<span className="cerebrus-outline-node__copy">
						<strong>{shape.navigation.navigationLabel}</strong>
						<small>{children.length > 0 ? `${children.length} items` : shape.navigation.artifactKind}</small>
					</span>
				</button>
				{children.length > 0 ? (
					<button type="button" className="cerebrus-outline-node__toggle" onClick={() => onToggle(String(shape.shapeId))}>
						{isExpanded ? '−' : '+'}
					</button>
				) : null}
			</div>
			{children.length > 0 && isExpanded ? (
				<div className="cerebrus-outline-node__children">
					{children.map((child) => (
						<OutlineNode
							key={child.navigation.cerebrusId}
							shape={child}
							navigation={navigation}
							currentShapeId={currentShapeId}
							currentPathIds={currentPathIds}
							expandedIds={expandedIds}
							ancestorCerebrusIds={nextAncestorIds}
							onToggle={onToggle}
							onSelect={onSelect}
						/>
					))}
				</div>
			) : null}
		</div>
	)
}
