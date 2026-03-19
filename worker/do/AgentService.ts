import { AnthropicProvider, createAnthropic } from '@ai-sdk/anthropic'
import { createGoogleGenerativeAI, GoogleGenerativeAIProvider } from '@ai-sdk/google'
import { createOpenAI, OpenAIProvider } from '@ai-sdk/openai'
import { generateObject, LanguageModel, ModelMessage, streamText } from 'ai'
import { AgentModelName, getAgentModelDefinition, isValidModelName } from '../../shared/models'
import {
	ChatHistoryPart,
	ContextItemsPart,
	DebugPart,
	MessagesPart,
	SelectedShapesPart,
} from '../../shared/schema/PromptPartDefinitions'
import { AgentAction } from '../../shared/types/AgentAction'
import { AgentPrompt } from '../../shared/types/AgentPrompt'
import { Streaming } from '../../shared/types/Streaming'
import { Environment } from '../environment'
import { buildMessages } from '../prompt/buildMessages'
import { buildSystemPrompt } from '../prompt/buildSystemPrompt'
import { getModelName } from '../prompt/getModelName'
import { closeAndParseJson } from './closeAndParseJson'
import { getSkillBundle, getSkillMenu, listSkills, type SkillBundle } from '../../src/lib/skills/registry'
import { z } from 'zod'

const agentSkillSelectionSchema = z.object({
	skillId: z.string().nullable(),
	reason: z.string().min(1),
})

function getProviderOptions(
	provider: LanguageModel['provider'],
	modelDefinition: ReturnType<typeof getAgentModelDefinition>
) {
	const geminiThinkingBudget = modelDefinition.thinking ? 256 : 0
	const openaiReasoningEffort = provider === 'openai.responses' ? 'none' : 'minimal'

	return {
		anthropic: {
			thinking: { type: 'disabled' as const },
		},
		google: {
			thinkingConfig: { thinkingBudget: geminiThinkingBudget },
		},
		openai: {
			reasoningEffort: openaiReasoningEffort,
		},
	}
}

function truncateText(value: string, maxLength = 700) {
	if (value.length <= maxLength) return value
	return `${value.slice(0, maxLength - 1)}…`
}

function buildRecentHistorySummary(historyPart?: ChatHistoryPart) {
	const promptItems = historyPart?.history.filter((item) => item.type === 'prompt').slice(-4) ?? []
	if (promptItems.length === 0) return 'None'

	return promptItems
		.map((item, index) => `${index + 1}. ${item.promptSource}: ${truncateText(item.agentFacingMessage, 240)}`)
		.join('\n')
}

function buildContextSummary(contextPart?: ContextItemsPart) {
	const items = contextPart?.items ?? []
	if (items.length === 0) return 'None'

	return items
		.slice(0, 6)
		.map((item, index) => `${index + 1}. ${truncateText(JSON.stringify(item), 260)}`)
		.join('\n')
}

function buildSelectedShapeSummary(selectedShapesPart?: SelectedShapesPart) {
	const shapeIds = selectedShapesPart?.shapeIds ?? []
	if (shapeIds.length === 0) return 'None'
	return shapeIds.join(', ')
}

function buildSkillSelectionPrompt(prompt: AgentPrompt) {
	const messagesPart = prompt.messages as MessagesPart | undefined
	const chatHistoryPart = prompt.chatHistory as ChatHistoryPart | undefined
	const contextItemsPart = prompt.contextItems as ContextItemsPart | undefined
	const selectedShapesPart = prompt.selectedShapes as SelectedShapesPart | undefined
	const latestRequest = messagesPart?.agentMessages.at(-1)?.trim() ?? ''

	if (!latestRequest) return ''

	return `Current request:
${latestRequest}

Recent prompt history:
${buildRecentHistorySummary(chatHistoryPart)}

Context items:
${buildContextSummary(contextItemsPart)}

Selected shapes:
${buildSelectedShapeSummary(selectedShapesPart)}`
}

function buildLoadedSkillSystemPrompt(skillBundle: SkillBundle) {
	return `A bundled domain skill has been loaded for this request.

Skill id: ${skillBundle.manifest.id}
Skill name: ${skillBundle.manifest.name}

Use the following guidance when it helps, while still obeying the base system prompt and action schema:

${skillBundle.content}`
}

export class AgentService {
	openai: OpenAIProvider
	anthropic: AnthropicProvider
	google: GoogleGenerativeAIProvider

	constructor(env: Environment) {
		this.openai = createOpenAI({ apiKey: env.OPENAI_API_KEY })
		this.anthropic = createAnthropic({ apiKey: env.ANTHROPIC_API_KEY })
		this.google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY })
	}

	getModel(modelName: AgentModelName): LanguageModel {
		const modelDefinition = getAgentModelDefinition(modelName)
		const provider = modelDefinition.provider
		return this[provider](modelDefinition.id)
	}

	async *stream(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentAction>> {
		try {
			for await (const event of this.streamActions(prompt)) {
				yield event
			}
		} catch (error: any) {
			console.error('Stream error:', error)
			throw error
		}
	}

	private async *streamActions(prompt: AgentPrompt): AsyncGenerator<Streaming<AgentAction>> {
		const modelName = getModelName(prompt)
		const model = this.getModel(modelName)

		if (typeof model === 'string') {
			throw new Error('Model is a string, not a LanguageModel')
		}

		const { modelId, provider } = model
		if (!isValidModelName(modelId)) {
			throw new Error(`Model ${modelId} is not in AGENT_MODEL_DEFINITIONS`)
		}

		const modelDefinition = getAgentModelDefinition(modelId)
		const systemPrompt = buildSystemPrompt(prompt)
		const selectedSkill = await this.selectBundledSkill(model, modelDefinition, prompt)

		// Build messages with provider-specific options
		const messages: ModelMessage[] = []

		// Add system prompt with Anthropic caching if applicable
		if (provider === 'anthropic.messages') {
			// Anthropic requires explicit cache breakpoints. We set one at the end of the
			// system prompt to cache all system content (which generally changes together).
			messages.push({
				role: 'system',
				content: systemPrompt,
				providerOptions: {
					anthropic: { cacheControl: { type: 'ephemeral' } },
				},
			})
		} else {
			messages.push({
				role: 'system',
				content: systemPrompt,
			})
		}

		if (selectedSkill) {
			messages.push({
				role: 'system',
				content: buildLoadedSkillSystemPrompt(selectedSkill),
			})
		}

		// Add prompt messages
		const promptMessages = buildMessages(prompt)
		messages.push(...promptMessages)

		// Check for debug flags and log if enabled
		const debugPart = prompt.debug as DebugPart | undefined
		if (debugPart) {
			if (debugPart.logSystemPrompt) {
				const promptWithoutSchema = buildSystemPrompt(prompt, { withSchema: false })
				console.log('[DEBUG] System Prompt (without schema):\n', promptWithoutSchema)
			}
			if (debugPart.logMessages) {
				console.log('[DEBUG] Messages:\n', JSON.stringify(promptMessages, null, 2))
			}
		}

		// Add the assistant message to indicate the start of the actions
		messages.push({
			role: 'assistant',
			content: '{"actions": [{"_type":',
		})

		try {
			const { textStream } = streamText({
				model,
				messages,
				maxOutputTokens: 8192,
				temperature: 0,
				providerOptions: getProviderOptions(provider, modelDefinition),
				onAbort() {
					console.warn('Stream actions aborted')
				},
				onError: (e) => {
					console.error('Stream text error:', e)
					throw e
				},
			})

			const canForceResponseStart =
				provider === 'anthropic.messages' || provider === 'google.generative-ai'
			let buffer = canForceResponseStart ? '{"actions": [{"_type":' : ''
			let cursor = 0
			let maybeIncompleteAction: AgentAction | null = null

			let startTime = Date.now()
			for await (const text of textStream) {
				buffer += text

				const partialObject = closeAndParseJson(buffer)
				if (!partialObject) continue

				const actions = partialObject.actions
				if (!Array.isArray(actions)) continue
				if (actions.length === 0) continue

				// If the events list is ahead of the cursor, we know we've completed the current event
				// We can complete the event and move the cursor forward
				if (actions.length > cursor) {
					const action = actions[cursor - 1] as AgentAction
					if (action) {
						yield {
							...action,
							complete: true,
							time: Date.now() - startTime,
						}
						maybeIncompleteAction = null
					}
					cursor++
				}

				// Now let's check the (potentially new) current event
				// And let's yield it in its (potentially incomplete) state
				const action = actions[cursor - 1] as AgentAction
				if (action) {
					// If we don't have an incomplete event yet, this is the start of a new one
					if (!maybeIncompleteAction) {
						startTime = Date.now()
					}

					maybeIncompleteAction = action

					// Yield the potentially incomplete event
					yield {
						...action,
						complete: false,
						time: Date.now() - startTime,
					}
				}
			}

			// If we've finished receiving events, but there's still an incomplete event, we need to complete it
			if (maybeIncompleteAction) {
				yield {
					...maybeIncompleteAction,
					complete: true,
					time: Date.now() - startTime,
				}
			}
		} catch (error: any) {
			console.error('streamActions error:', error)
			throw error
		}
	}

	private async selectBundledSkill(
		model: LanguageModel,
		modelDefinition: ReturnType<typeof getAgentModelDefinition>,
		prompt: AgentPrompt
	): Promise<SkillBundle | null> {
		const availableSkills = listSkills('agent')
		if (availableSkills.length === 0) return null

		const selectionPrompt = buildSkillSelectionPrompt(prompt)
		if (!selectionPrompt) return null

		try {
			const result = await generateObject({
				model,
				schema: agentSkillSelectionSchema,
				system: `You decide whether the main canvas agent should load one bundled domain skill before responding.

Choose a skill only if it would materially improve domain-specific strategy or structure.
Return \`null\` for \`skillId\` when the request is generic canvas work, ordinary layout or editing, or when no listed skill is clearly relevant.
Do not invent skills. You may choose at most one.

Available skills:
${getSkillMenu('agent')}`,
				prompt: selectionPrompt,
				temperature: 0,
				maxOutputTokens: 300,
				providerOptions: getProviderOptions(model.provider, modelDefinition),
			})

			if (!result.object.skillId) return null
			return getSkillBundle(result.object.skillId, 'agent')
		} catch (error) {
			console.warn('Bundled skill preflight failed:', error)
			return null
		}
	}
}
