import { stopEventPropagation } from '@tldraw/editor'
import { type CSSProperties, useEffect, useState } from 'react'
import type { MultipleChoiceRenderableProps } from '../../../lib/cerebrus/registry'
import { useCerebrusEditing } from '../CerebrusEditingContext'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

export function MultipleChoiceComponent({
	elementId,
	label,
	options,
	correctOption,
}: MultipleChoiceRenderableProps) {
	const { isEditing } = useCerebrusEditing()
	const [selectedOption, setSelectedOption] = useState<string | null>(null)

	useEffect(() => {
		if (isEditing) {
			setSelectedOption(null)
		}
	}, [isEditing])

	return (
		<div style={cerebrusDocumentStyles.multipleChoice}>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="label"
				value={label}
				style={cerebrusTypography.formLabel}
				allowEmpty
			/>
			<div style={cerebrusDocumentStyles.multipleChoiceOptions}>
				{options.map((option, index) => {
					const isSelected = selectedOption === option
					const isCorrect = isEditing ? option === correctOption : isSelected && option === correctOption

					return (
						<button
							key={`${elementId}-${index}`}
							type="button"
							style={optionButtonStyle(isSelected, isCorrect)}
							onPointerDown={stopEventPropagation}
							onMouseDown={stopEventPropagation}
							onClick={(event) => {
								stopEventPropagation(event)
								if (!isEditing) {
									setSelectedOption(option)
								}
							}}
						>
							<div style={optionDotStyle(isSelected, isCorrect)} aria-hidden="true" />
							<p style={cerebrusTypography.fieldText}>{option}</p>
						</button>
					)
				})}
			</div>
		</div>
	)
}

function optionButtonStyle(isSelected: boolean, isCorrect: boolean): CSSProperties {
	return {
		...cerebrusDocumentStyles.multipleChoiceOption,
		appearance: 'none',
		width: '100%',
		textAlign: 'left',
		cursor: 'pointer',
		background: isSelected ? 'rgba(239, 246, 255, 0.96)' : 'rgba(255, 255, 255, 0.9)',
		border: isCorrect
			? '1px solid rgba(16, 185, 129, 0.35)'
			: isSelected
				? '1px solid rgba(59, 130, 246, 0.28)'
				: '1px solid rgba(148, 163, 184, 0.22)',
	}
}

function optionDotStyle(isSelected: boolean, isCorrect: boolean): CSSProperties {
	return {
		width: '0.95rem',
		height: '0.95rem',
		borderRadius: '999px',
		flexShrink: 0,
		marginTop: '0.25rem',
		border: isCorrect
			? '1px solid rgba(16, 185, 129, 0.6)'
			: isSelected
				? '1px solid rgba(59, 130, 246, 0.55)'
				: '1px solid rgba(148, 163, 184, 0.45)',
		background: isCorrect
			? 'rgba(16, 185, 129, 0.18)'
			: isSelected
				? 'rgba(59, 130, 246, 0.14)'
				: 'transparent',
	}
}
