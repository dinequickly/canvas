export type SkillTarget = 'cerebrus' | 'agent'

export interface SkillManifest {
	id: string
	name: string
	description: string
	targets: SkillTarget[]
	triggers: string[]
}

export interface SkillBundleFile {
	kind: 'skill' | 'reference' | 'asset'
	path: string
	content: string
}

export interface SkillBundle {
	manifest: SkillManifest
	content: string
	files: SkillBundleFile[]
}

interface ParsedFrontmatter {
	body: string
	frontmatter: Record<string, string | string[]>
}

const ENTRY_FILES = import.meta.glob('../../../skills/**/SKILL.md', {
	eager: true,
	query: '?raw',
	import: 'default',
}) as Record<string, string>

const REFERENCE_FILES = import.meta.glob('../../../skills/**/references/**/*.{md,txt,json}', {
	eager: true,
	query: '?raw',
	import: 'default',
}) as Record<string, string>

const ASSET_FILES = import.meta.glob('../../../skills/**/assets/**/*.{md,txt,json}', {
	eager: true,
	query: '?raw',
	import: 'default',
}) as Record<string, string>

const SKILL_TARGETS: SkillTarget[] = ['cerebrus', 'agent']

function stripQuotes(value: string) {
	const trimmed = value.trim()
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1)
	}
	return trimmed
}

function parseInlineList(value: string) {
	const trimmed = value.trim()
	if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
		return null
	}

	const inner = trimmed.slice(1, -1).trim()
	if (!inner) return []

	return inner
		.split(',')
		.map((entry) => stripQuotes(entry))
		.filter(Boolean)
}

function parseFrontmatter(source: string): ParsedFrontmatter {
	if (!source.startsWith('---\n') && source !== '---') {
		return {
			body: source.trim(),
			frontmatter: {},
		}
	}

	const lines = source.split('\n')
	if (lines[0].trim() !== '---') {
		return {
			body: source.trim(),
			frontmatter: {},
		}
	}

	let index = 1
	const frontmatterLines: string[] = []

	while (index < lines.length && lines[index].trim() !== '---') {
		frontmatterLines.push(lines[index])
		index += 1
	}

	if (index >= lines.length) {
		throw new Error('Unterminated frontmatter block in skill file.')
	}

	index += 1
	const frontmatter: Record<string, string | string[]> = {}

	for (let lineIndex = 0; lineIndex < frontmatterLines.length; lineIndex += 1) {
		const rawLine = frontmatterLines[lineIndex]
		const trimmedLine = rawLine.trim()
		if (!trimmedLine) continue

		const keyMatch = rawLine.match(/^([A-Za-z0-9_-]+):(.*)$/)
		if (!keyMatch) {
			throw new Error(`Invalid frontmatter line: "${rawLine}"`)
		}

		const [, key, rawValue] = keyMatch
		const value = rawValue.trim()

		if (value) {
			const inlineList = parseInlineList(value)
			frontmatter[key] = inlineList ?? stripQuotes(value)
			continue
		}

		const listValues: string[] = []
		let lookahead = lineIndex + 1
		while (lookahead < frontmatterLines.length) {
			const listLine = frontmatterLines[lookahead]
			const listMatch = listLine.match(/^\s*-\s+(.*)$/)
			if (!listMatch) break
			listValues.push(stripQuotes(listMatch[1]))
			lookahead += 1
		}

		if (listValues.length > 0) {
			frontmatter[key] = listValues
			lineIndex = lookahead - 1
			continue
		}

		frontmatter[key] = ''
	}

	return {
		body: lines.slice(index).join('\n').trim(),
		frontmatter,
	}
}

function getSkillIdFromEntryPath(filePath: string) {
	const match = filePath.match(/\/skills\/([^/]+)\/SKILL\.md$/)
	if (!match) {
		throw new Error(`Could not determine skill id from path "${filePath}".`)
	}
	return match[1]
}

function getSkillScopedPath(filePath: string, segment: 'references' | 'assets') {
	const match = filePath.match(new RegExp(`/skills/([^/]+)/${segment}/(.+)$`))
	if (!match) {
		throw new Error(`Could not determine ${segment} file path for "${filePath}".`)
	}
	return {
		skillId: match[1],
		path: match[2],
	}
}

function normalizeTargets(value: string | string[] | undefined, skillId: string) {
	const rawTargets = value === undefined ? SKILL_TARGETS : Array.isArray(value) ? value : [value]
	const normalized = Array.from(
		new Set(
			rawTargets
				.map((target) => target.trim())
				.filter(Boolean)
				.map((target) => {
					if (target !== 'cerebrus' && target !== 'agent') {
						throw new Error(`Skill "${skillId}" has unsupported target "${target}".`)
					}
					return target
				})
		)
	) as SkillTarget[]

	if (normalized.length === 0) {
		throw new Error(`Skill "${skillId}" must target at least one runtime.`)
	}

	return normalized
}

function normalizeStringArray(value: string | string[] | undefined) {
	if (value === undefined) return []
	return (Array.isArray(value) ? value : [value]).map((entry) => entry.trim()).filter(Boolean)
}

function formatSkillBundle(manifest: SkillManifest, files: SkillBundleFile[]) {
	const sections = [
		`Skill: ${manifest.name}`,
		`Skill ID: ${manifest.id}`,
		`Description: ${manifest.description}`,
		`Targets: ${manifest.targets.join(', ')}`,
		manifest.triggers.length > 0 ? `Triggers: ${manifest.triggers.join(', ')}` : '',
		'',
		...files.flatMap((file) => [
			`## ${file.kind === 'skill' ? 'Instructions' : file.kind === 'reference' ? `Reference: ${file.path}` : `Asset: ${file.path}`}`,
			file.content.trim(),
			'',
		]),
	]

	return sections.filter(Boolean).join('\n').trim()
}

function buildRegistry() {
	const manifests = new Map<string, SkillManifest>()
	const filesBySkill = new Map<string, SkillBundleFile[]>()

	for (const [filePath, source] of Object.entries(ENTRY_FILES)) {
		const skillId = getSkillIdFromEntryPath(filePath)
		if (manifests.has(skillId)) {
			throw new Error(`Duplicate skill entry detected for "${skillId}".`)
		}

		const { frontmatter, body } = parseFrontmatter(source)
		const name = typeof frontmatter.name === 'string' ? frontmatter.name.trim() : ''
		const description = typeof frontmatter.description === 'string' ? frontmatter.description.trim() : ''

		if (!name) {
			throw new Error(`Skill "${skillId}" is missing a non-empty "name" field.`)
		}

		if (!description) {
			throw new Error(`Skill "${skillId}" is missing a non-empty "description" field.`)
		}

		const manifest: SkillManifest = {
			id: skillId,
			name,
			description,
			targets: normalizeTargets(frontmatter.targets, skillId),
			triggers: normalizeStringArray(frontmatter.triggers),
		}

		manifests.set(skillId, manifest)
		filesBySkill.set(skillId, [
			{
				kind: 'skill',
				path: 'SKILL.md',
				content: body,
			},
		])
	}

	const appendFiles = (entries: Record<string, string>, kind: SkillBundleFile['kind'], segment: 'references' | 'assets') => {
		for (const [filePath, source] of Object.entries(entries).sort(([a], [b]) => a.localeCompare(b))) {
			const { skillId, path } = getSkillScopedPath(filePath, segment)
			const bucket = filesBySkill.get(skillId)
			if (!bucket) {
				throw new Error(`Skill "${skillId}" has a ${segment} file but no SKILL.md entry.`)
			}

			bucket.push({
				kind,
				path,
				content: source.trim(),
			})
		}
	}

	appendFiles(REFERENCE_FILES, 'reference', 'references')
	appendFiles(ASSET_FILES, 'asset', 'assets')

	return {
		manifests,
		bundles: new Map(
			Array.from(manifests.entries()).map(([skillId, manifest]) => {
				const files = filesBySkill.get(skillId) ?? []
				return [
					skillId,
					{
						manifest,
						files,
						content: formatSkillBundle(manifest, files),
					} satisfies SkillBundle,
				]
			})
		),
	}
}

const registry = buildRegistry()

export function listSkills(target?: SkillTarget) {
	const manifests = Array.from(registry.manifests.values()).sort((a, b) => a.id.localeCompare(b.id))
	return target ? manifests.filter((manifest) => manifest.targets.includes(target)) : manifests
}

export function getSkillMenu(target: SkillTarget) {
	const skills = listSkills(target)
	if (skills.length === 0) {
		return 'No bundled skills are currently available.'
	}

	return skills
		.map((skill) => {
			const triggerSuffix =
				skill.triggers.length > 0 ? ` Triggers: ${skill.triggers.join(', ')}.` : ''
			return `- \`${skill.id}\`: ${skill.description}${triggerSuffix}`
		})
		.join('\n')
}

export function getSkillBundle(skillId: string, target: SkillTarget): SkillBundle {
	const bundle = registry.bundles.get(skillId)
	if (!bundle) {
		throw new Error(`Unknown skill "${skillId}".`)
	}

	if (!bundle.manifest.targets.includes(target)) {
		throw new Error(`Skill "${skillId}" is not available for ${target}.`)
	}

	return bundle
}
