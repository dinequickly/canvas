import { createContext, useContext } from 'react'

export type CerebrusEditablePropKey =
	| 'answer'
	| 'caption'
	| 'content'
	| 'description'
	| 'explanation'
	| 'helperText'
	| 'label'
	| 'placeholder'
	| 'prompt'
	| 'subtitle'
	| 'text'
	| 'title'

export interface CerebrusEditingContextValue {
	isEditing: boolean
	toggleEditing: (next?: boolean) => void
	updateText: (elementId: string, propKey: CerebrusEditablePropKey, value: string | undefined) => void
}

const defaultContextValue: CerebrusEditingContextValue = {
	isEditing: false,
	toggleEditing: () => undefined,
	updateText: () => undefined,
}

export const CerebrusEditingContext = createContext<CerebrusEditingContextValue>(defaultContextValue)

export function useCerebrusEditing() {
	return useContext(CerebrusEditingContext)
}
