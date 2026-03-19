import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'

export function Artifact(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className={['artifact', props.className].filter(Boolean).join(' ')} />
}

export function ArtifactHeader(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className={['artifact__header', props.className].filter(Boolean).join(' ')} />
}

export function ArtifactTitle(props: HTMLAttributes<HTMLParagraphElement>) {
	return <p {...props} className={['artifact__title', props.className].filter(Boolean).join(' ')} />
}

export function ArtifactDescription(props: HTMLAttributes<HTMLParagraphElement>) {
	return <p {...props} className={['artifact__description', props.className].filter(Boolean).join(' ')} />
}

export function ArtifactActions(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className={['artifact__actions', props.className].filter(Boolean).join(' ')} />
}

export function ArtifactAction({
	tooltip,
	label,
	icon,
	children,
	...props
}: {
	tooltip: string
	label: string
	icon?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			type={props.type ?? 'button'}
			className={['artifact__action', props.className].filter(Boolean).join(' ')}
			title={tooltip}
			aria-label={label}
		>
			{icon ? <span className="artifact__action-icon">{icon}</span> : null}
			{children ? <span>{children}</span> : null}
		</button>
	)
}

export function ArtifactClose(props: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			type={props.type ?? 'button'}
			className={['artifact__close', props.className].filter(Boolean).join(' ')}
		/>
	)
}

export function ArtifactContent(props: HTMLAttributes<HTMLDivElement>) {
	return <div {...props} className={['artifact__content', props.className].filter(Boolean).join(' ')} />
}
