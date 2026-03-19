import { useEffect, useMemo, useRef, useState } from 'react'
import * as React from 'react'
import * as ReactDOMClient from 'react-dom/client'
import * as ts from 'typescript'
import type { ArtifactBundle, ArtifactErrorState } from '../../../src/lib/artifacts/schema'

interface ArtifactPreviewFrameProps {
	bundle: ArtifactBundle
	previewState: Record<string, unknown>
	refreshToken: string
	onPreviewStateChange: (previewState: Record<string, unknown>) => void
	onErrorStateChange: (errorState: ArtifactErrorState | null) => void
}

const iframeDocument = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body, #root { margin: 0; padding: 0; width: 100%; height: 100%; background: #ffffff; }
      body { font-family: Georgia, serif; }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (() => {
        const rootEl = document.getElementById('root')
        let root = null
        let modules = {}
        let sourceFiles = {}
        let entryFile = '/App.tsx'
        let previewState = {}
        let cssTag = null
        let moduleCache = {}

        function post(type, payload) {
          window.parent.postMessage({ type, payload }, '*')
        }

        window.addEventListener('error', (event) => {
          post('artifact:error', {
            message: event.message || 'Runtime error',
            source: 'runtime',
            timestamp: new Date().toISOString(),
          })
        })

        window.addEventListener('unhandledrejection', (event) => {
          post('artifact:error', {
            message: event.reason && event.reason.message ? event.reason.message : 'Unhandled promise rejection',
            source: 'runtime',
            timestamp: new Date().toISOString(),
          })
        })

        function normalizePath(path) {
          return path.startsWith('/') ? path : '/' + path
        }

        function resolvePath(fromPath, specifier) {
          const fromSegments = fromPath.split('/').slice(0, -1)
          const next = [...fromSegments]
          for (const segment of specifier.split('/')) {
            if (!segment || segment === '.') continue
            if (segment === '..') {
              next.pop()
              continue
            }
            next.push(segment)
          }
          return normalizePath(next.join('/'))
        }

        function resolveModule(fromPath, specifier) {
          const resolved = resolvePath(fromPath, specifier)
          const candidates = [
            resolved,
            resolved + '.tsx',
            resolved + '.ts',
            resolved + '.jsx',
            resolved + '.js',
            resolved + '.json',
          ]
          return candidates.find((candidate) => candidate in sourceFiles || candidate in modules)
        }

        function runtimeModule() {
          return {
            useArtifactState(key, initialValue) {
              const React = window.React
              const hasValue = Object.prototype.hasOwnProperty.call(previewState, key)
              const [value, setValue] = React.useState(() =>
                hasValue ? previewState[key] : typeof initialValue === 'function' ? initialValue() : initialValue
              )
              React.useEffect(() => {
                previewState = { ...previewState, [key]: value }
                post('artifact:preview-state', previewState)
              }, [key, value])
              return [value, setValue]
            },
          }
        }

        function requireFrom(importer, specifier) {
          if (specifier === 'react') return window.React
          if (specifier === 'react-dom/client') return window.ReactDOMClient
          if (specifier === '@artifact/runtime') return runtimeModule()

          if (specifier.startsWith('./') || specifier.startsWith('../')) {
            const resolved = resolveModule(importer, specifier)
            if (!resolved) throw new Error('Could not resolve ' + specifier + ' from ' + importer)
            if (resolved.endsWith('.json')) return JSON.parse(sourceFiles[resolved])
            return executeModule(resolved)
          }

          throw new Error('Unsupported module import: ' + specifier)
        }

        function executeModule(path) {
          if (moduleCache[path]) return moduleCache[path].exports
          if (!(path in modules)) {
            throw new Error('Compiled module not found: ' + path)
          }

          const module = { exports: {} }
          moduleCache[path] = module
          const fn = new Function(
            'require',
            'module',
            'exports',
            'React',
            'ReactDOMClient',
            'ArtifactRuntime',
            modules[path]
          )
          fn(
            (specifier) => requireFrom(path, specifier),
            module,
            module.exports,
            window.React,
            window.ReactDOMClient,
            runtimeModule()
          )
          return module.exports
        }

        function applyCss(cssText) {
          if (!cssTag) {
            cssTag = document.createElement('style')
            document.head.appendChild(cssTag)
          }
          cssTag.textContent = cssText || ''
        }

        function renderBundle() {
          moduleCache = {}
          applyCss(sourceFiles['/styles.css'] || '')

          const entry = executeModule(entryFile)
          const App = entry.default || entry.App
          if (!App) {
            throw new Error('Entry file must export a default App component.')
          }

          if (!root) {
            root = window.ReactDOMClient.createRoot(rootEl)
          }

          root.render(window.React.createElement(App))
          post('artifact:error', null)
        }

        window.addEventListener('message', (event) => {
          if (event.source !== window.parent) return
          const data = event.data || {}
          if (data.type !== 'artifact:load' && data.type !== 'artifact:refresh') return

          modules = data.modules || {}
          sourceFiles = data.sourceFiles || {}
          entryFile = data.entryFile || '/App.tsx'
          previewState = data.previewState || {}

          try {
            renderBundle()
          } catch (error) {
            post('artifact:error', {
              message: error instanceof Error ? error.message : String(error),
              source: 'runtime',
              timestamp: new Date().toISOString(),
            })
          }
        })

        post('artifact:ready', null)
      })()
    </script>
  </body>
</html>`

function normalizeModulePath(filePath: string) {
	return filePath.startsWith('/') ? filePath : `/${filePath}`
}

function compileArtifactBundle(bundle: ArtifactBundle) {
	const modules: Record<string, string> = {}

	for (const [filePath, source] of Object.entries(bundle.files)) {
		const normalizedPath = normalizeModulePath(filePath)
		if (normalizedPath.endsWith('.css') || normalizedPath.endsWith('.json')) continue

		const output = ts.transpileModule(source, {
			compilerOptions: {
				target: ts.ScriptTarget.ES2020,
				module: ts.ModuleKind.CommonJS,
				jsx: ts.JsxEmit.React,
				esModuleInterop: true,
				allowJs: true,
			},
			fileName: normalizedPath,
		})

		modules[normalizedPath] = output.outputText
	}

	return {
		modules,
		sourceFiles: Object.fromEntries(
			Object.entries(bundle.files).map(([filePath, source]) => [normalizeModulePath(filePath), source])
		),
	}
}

export function ArtifactPreviewFrame({
	bundle,
	previewState,
	refreshToken,
	onPreviewStateChange,
	onErrorStateChange,
}: ArtifactPreviewFrameProps) {
	const iframeRef = useRef<HTMLIFrameElement | null>(null)
	const [isFrameReady, setIsFrameReady] = useState(false)
	const compiled = useMemo(() => {
		try {
			return {
				ok: true as const,
				...compileArtifactBundle(bundle),
			}
		} catch (error) {
			return {
				ok: false as const,
				error:
					error instanceof Error
						? error.message
						: 'The artifact preview could not be compiled.',
			}
		}
	}, [bundle])

	useEffect(() => {
		if (compiled.ok) {
			onErrorStateChange(null)
			return
		}

		onErrorStateChange({
			message: compiled.error,
			source: 'compile',
			timestamp: new Date().toISOString(),
		})
	}, [compiled, onErrorStateChange])

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			if (event.source !== iframeRef.current?.contentWindow) return
			const { type, payload } = event.data ?? {}

			if (type === 'artifact:ready') {
				setIsFrameReady(true)
				return
			}

			if (type === 'artifact:preview-state') {
				onPreviewStateChange(payload ?? {})
				return
			}

			if (type === 'artifact:error') {
				onErrorStateChange(payload ?? null)
			}
		}

		window.addEventListener('message', handleMessage)
		return () => window.removeEventListener('message', handleMessage)
	}, [onErrorStateChange, onPreviewStateChange])

	useEffect(() => {
		if (!compiled.ok || !isFrameReady) return
		const frame = iframeRef.current
		if (!frame?.contentWindow) return

		frame.contentWindow.React = React
		frame.contentWindow.ReactDOMClient = ReactDOMClient
		frame.contentWindow.postMessage(
			{
				type: 'artifact:load',
				modules: compiled.modules,
				sourceFiles: compiled.sourceFiles,
				entryFile: bundle.entryFile,
				previewState,
				refreshToken,
			},
			'*'
		)
	}, [bundle.entryFile, compiled, isFrameReady, previewState, refreshToken])

	if (!compiled.ok) {
		return (
			<div className="artifact-preview artifact-preview--error">
				<strong>Preview compile failed</strong>
				<pre>{compiled.error}</pre>
			</div>
		)
	}

	return (
		<iframe
			ref={iframeRef}
			title={bundle.title}
			className="artifact-preview"
			sandbox="allow-scripts allow-same-origin"
			srcDoc={iframeDocument}
		/>
	)
}
