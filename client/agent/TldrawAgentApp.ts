import { Editor } from 'tldraw'
import { AgentAppAgentsManager } from './managers/AgentAppAgentsManager'
import { AgentAppArtifactManager } from './managers/AgentAppArtifactManager'
import { AgentAppDockManager } from './managers/AgentAppDockManager'
import { AgentAppNavigationManager } from './managers/AgentAppNavigationManager'
import { AgentAppOrchestrationManager } from './managers/AgentAppOrchestrationManager'
import { AgentAppPersistenceManager } from './managers/AgentAppPersistenceManager'

/**
 * The TldrawAgentApp class manages the agent system for a given editor instance.
 *
 * This is a coordinator class that handles app-level concerns shared across agents,
 * such as agent lifecycle management, persistence, and global settings.
 *
 * Individual agents (TldrawAgent) handle their own concerns like chat, context, and requests.
 * The app manages the agents and coordinates shared state.
 *
 * @example
 * ```tsx
 * const app = new TldrawAgentApp(editor, { onError: handleError })
 * const agent = app.agents.getAgent()
 * agent.prompt('Draw a cat')
 * ```
 */
export class TldrawAgentApp {
	private static apps = new WeakMap<Editor, TldrawAgentApp>()

	static get(editor: Editor) {
		return TldrawAgentApp.apps.get(editor) ?? null
	}

	/**
	 * Manager for agent lifecycle - creation, disposal, and tracking.
	 */
	agents: AgentAppAgentsManager

	/**
	 * Manager for deliverable artifact generation and persistence.
	 */
	artifacts: AgentAppArtifactManager

	/**
	 * Manager for the compact bottom dock request/run state.
	 */
	dock: AgentAppDockManager

	/**
	 * Manager for Cerebrus focus state and hierarchy-driven navigation.
	 */
	navigation: AgentAppNavigationManager

	/**
	 * Manager for orchestration state and spawned child-agent workflows.
	 */
	orchestration: AgentAppOrchestrationManager

	/**
	 * Manager for state persistence - loading, saving, and auto-save.
	 */
	persistence: AgentAppPersistenceManager

	/**
	 * Handle crash and dispose events.
	 */
	private handleCrash = () => this.dispose()
	private handleDispose = () => this.dispose()

	private _editor: Editor | null

	/**
	 * The editor associated with this app.
	 * @throws Error if the app has been disposed.
	 */
	get editor(): Editor {
		if (!this._editor) {
			throw new Error('TldrawAgentApp has been disposed')
		}
		return this._editor
	}

	constructor(
		editor: Editor,
		public options: {
			onError: (e: any) => void
		}
	) {
		this._editor = editor
		TldrawAgentApp.apps.set(editor, this)
		this.agents = new AgentAppAgentsManager(this)
		this.artifacts = new AgentAppArtifactManager(this)
		this.dock = new AgentAppDockManager(this)
		this.navigation = new AgentAppNavigationManager(this)
		this.orchestration = new AgentAppOrchestrationManager(this)
		this.persistence = new AgentAppPersistenceManager(this)
		editor.on('crash', this.handleCrash)
		editor.on('dispose', this.handleDispose)
	}

	/**
	 * Dispose of all resources. Call this during cleanup.
	 */
	dispose() {
		if (!this._editor) return
		this._editor.off('crash', this.handleCrash)
		this._editor.off('dispose', this.handleDispose)
		this.persistence.dispose()
		this.navigation.dispose()
		this.artifacts.dispose()
		this.dock.dispose()
		this.orchestration.dispose()
		this.agents.dispose()
		TldrawAgentApp.apps.delete(this._editor)
		this._editor = null
	}

	/**
	 * Reset everything to initial state.
	 */
	reset() {
		this.agents.reset()
		this.artifacts.reset()
		this.dock.reset()
		this.navigation.reset()
		this.orchestration.reset()
		this.persistence.reset()
	}
}
