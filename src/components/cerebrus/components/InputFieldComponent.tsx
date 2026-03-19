import { stopEventPropagation } from '@tldraw/editor'
import { type CSSProperties, useEffect, useState } from 'react'
import type { InputFieldRenderableProps } from '../../../lib/cerebrus/registry'
import { useCerebrusEditing } from '../CerebrusEditingContext'
import { cerebrusDocumentStyles, cerebrusTypography } from './designSystem'
import { EditableRichText } from './EditableRichText'

export function InputFieldComponent({
	elementId,
	label,
	placeholder,
	helperText,
}: InputFieldRenderableProps) {
	const { isEditing } = useCerebrusEditing()
	const [response, setResponse] = useState('')

	useEffect(() => {
		if (isEditing) {
			setResponse('')
		}
	}, [isEditing])

	return (
		<div style={cerebrusDocumentStyles.inputField}>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="label"
				value={label}
				style={cerebrusTypography.formLabel}
			/>
			<div style={cerebrusDocumentStyles.inputFieldSurface}>
				{isEditing ? (
					<EditableRichText
						as="p"
						elementId={elementId}
						propKey="placeholder"
						value={placeholder}
						style={cerebrusTypography.fieldText}
						allowEmpty
						placeholder="Type your answer here"
					/>
				) : (
					<input
						type="text"
						value={response}
						placeholder={placeholder ?? 'Type your answer here'}
						onPointerDown={stopEventPropagation}
						onMouseDown={stopEventPropagation}
						onClick={stopEventPropagation}
						onChange={(event) => setResponse(event.target.value)}
						style={inputStyle}
					/>
				)}
			</div>
			<EditableRichText
				as="p"
				elementId={elementId}
				propKey="helperText"
				value={helperText}
				style={cerebrusTypography.caption}
				allowEmpty
			/>
		</div>
	)
}

const inputStyle: CSSProperties = {
	width: '100%',
	border: 0,
	outline: 'none',
	background: 'transparent',
	color: '#0f172a',
	fontSize: '1rem',
	lineHeight: 1.6,
	fontWeight: 500,
	padding: 0,
}
