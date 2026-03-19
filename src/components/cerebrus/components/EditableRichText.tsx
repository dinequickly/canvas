import { stopEventPropagation } from '@tldraw/editor'
import { type CSSProperties, type ElementType, useEffect, useRef, useState } from 'react'
import { type CerebrusEditablePropKey, useCerebrusEditing } from '../CerebrusEditingContext'

interface EditableRichTextProps {
	as: ElementType
	elementId: string
	propKey: CerebrusEditablePropKey
	value?: string
	style?: CSSProperties
	allowEmpty?: boolean
	placeholder?: string
}

export function EditableRichText({
	as: Tag,
	elementId,
	propKey,
	value,
	style,
	allowEmpty = false,
	placeholder,
}: EditableRichTextProps) {
	const { isEditing, updateText } = useCerebrusEditing()
	const ref = useRef<HTMLElement | null>(null)
	const [isHovered, setIsHovered] = useState(false)
	const markup = value?.trim() ? value : allowEmpty ? placeholder ?? '' : ''

	useEffect(() => {
		if (!isEditing || !ref.current) return
		if (document.activeElement === ref.current) return
		if (ref.current.innerHTML !== markup) {
			ref.current.innerHTML = markup
		}
	}, [isEditing, markup])

	if (!markup && !isEditing) {
		return null
	}

	const interactiveStyle: CSSProperties = isEditing
		? {
				cursor: 'text',
				userSelect: 'text',
				outline: isHovered ? '1px dashed rgba(59, 130, 246, 0.45)' : '1px solid transparent',
				outlineOffset: '4px',
				borderRadius: '12px',
				background: isHovered ? 'rgba(59, 130, 246, 0.06)' : 'transparent',
				transition: 'background 120ms ease, outline-color 120ms ease',
			}
		: {}

	const handleCommit = () => {
		if (!ref.current) return
		const nextMarkup = ref.current.innerHTML.trim()
		if (!nextMarkup && !allowEmpty) {
			ref.current.innerHTML = markup
			return
		}
		updateText(elementId, propKey, nextMarkup || undefined)
	}

	return (
		<Tag
			ref={ref}
			contentEditable={isEditing}
			suppressContentEditableWarning
			spellCheck={isEditing}
			tabIndex={isEditing ? 0 : undefined}
			style={{ ...style, ...interactiveStyle }}
			dangerouslySetInnerHTML={{ __html: markup }}
			onBlur={isEditing ? handleCommit : undefined}
			onMouseEnter={isEditing ? () => setIsHovered(true) : undefined}
			onMouseLeave={isEditing ? () => setIsHovered(false) : undefined}
			onPointerDown={isEditing ? stopEventPropagation : undefined}
			onMouseDown={isEditing ? stopEventPropagation : undefined}
			onClick={isEditing ? stopEventPropagation : undefined}
		/>
	)
}
