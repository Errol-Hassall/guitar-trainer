import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import type { AppExport } from '#/lib/types'
import { getCsvExport, getJsonExport, getMarkdownExport, importExercises, importTemplates, restoreBackup } from '#/server/api'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/data')({ component: DataPage })

async function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function stamp(): string {
  return new Date().toISOString().slice(0, 10)
}

function DataPage() {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const [restoreFile, setRestoreFile] = useState<File | null>(null)

  async function runExport(key: string, filename: string, type: string, fetchContent: () => Promise<string>) {
    setBusy(key)
    setError(null)
    setStatus(null)
    try {
      await download(filename, await fetchContent(), type)
      setStatus(`Downloaded ${filename}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Export failed.')
    } finally {
      setBusy(null)
    }
  }

  async function handleImportMarkdown(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy('import')
    setError(null)
    setStatus(null)
    try {
      const created = await importTemplates({ data: { markdown: await file.text() } })
      setStatus(
        created > 0
          ? `Imported ${created} template${created === 1 ? '' : 's'} from ${file.name}.`
          : 'No new templates found in that file.',
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import failed.')
    } finally {
      setBusy(null)
    }
  }

  async function handleImportExercises(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy('import-exercises')
    setError(null)
    setStatus(null)
    try {
      const created = await importExercises({ data: { markdown: await file.text() } })
      setStatus(
        created > 0
          ? `Imported ${created} exercise${created === 1 ? '' : 's'} from ${file.name}.`
          : 'No new exercises found in that file.',
      )
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Import failed.')
    } finally {
      setBusy(null)
    }
  }

  function handleRestoreFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    setStatus(null)
    setRestoreFile(file)
  }

  async function confirmRestore() {
    if (!restoreFile) return
    setBusy('restore')
    setError(null)
    setStatus(null)
    try {
      const parsed: unknown = JSON.parse(await restoreFile.text())
      // The server re-validates with the backup schema; this cast only satisfies the client type.
      await restoreBackup({ data: parsed as AppExport })
      setRestoreFile(null)
      setStatus(`Restored all app data from ${restoreFile.name}.`)
    } catch (cause) {
      setError(
        cause instanceof SyntaxError
          ? 'That file is not valid JSON.'
          : cause instanceof Error
            ? cause.message
            : 'Restore failed.',
      )
    } finally {
      setBusy(null)
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <PageHeader
        title="Data"
        description="Everything lives in one SQLite file on your machine. Export it, or restore a backup."
      />

      {error ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="mb-4 rounded-lg border border-success/40 bg-success/15 px-3 py-2 text-sm text-success">
          {status}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <Card title="Export" description="Take your data with you — human-readable, spreadsheet-ready or a full backup.">
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => void runExport('md', `guitar-trainer-${stamp()}.md`, 'text/markdown', getMarkdownExport)}
            >
              Markdown
            </Button>
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => void runExport('json', `guitar-trainer-backup-${stamp()}.json`, 'application/json', getJsonExport)}
            >
              JSON backup
            </Button>
            <Button
              variant="secondary"
              disabled={busy !== null}
              onClick={() => void runExport('csv', `sessions-${stamp()}.csv`, 'text/csv', getCsvExport)}
            >
              Session CSV
            </Button>
          </div>
        </Card>

        <Card title="Import templates" description="Reads the Templates section of a Guitar Trainer markdown export (or a file in that format). Existing names are skipped.">
          <Field label="Markdown file" htmlFor="import-markdown">
            <input
              id="import-markdown"
              type="file"
              accept=".md,.markdown,text/markdown"
              onChange={handleImportMarkdown}
              className={`${controlClass} file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-ink`}
            />
          </Field>
        </Card>

        <Card title="Import exercise pack" description="Reads the Exercises section of a Guitar Trainer markdown export (or a file in that format). Existing names are skipped.">
          <Field label="Markdown file" htmlFor="import-exercises">
            <input
              id="import-exercises"
              type="file"
              accept=".md,.markdown,text/markdown"
              onChange={handleImportExercises}
              className={`${controlClass} file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-accent-ink`}
            />
          </Field>
        </Card>

        <Card title="Restore from backup" description="Replaces ALL app data with the contents of a JSON backup file.">
          {restoreFile ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Replace everything in the app with <span className="font-medium">{restoreFile.name}</span>?
                This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button variant="danger" disabled={busy !== null} onClick={() => void confirmRestore()}>
                  Confirm restore
                </Button>
                <Button variant="ghost" disabled={busy !== null} onClick={() => setRestoreFile(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Field label="Backup file (.json)" htmlFor="restore-backup">
              <input
                id="restore-backup"
                type="file"
                accept=".json,application/json"
                onChange={handleRestoreFile}
                className={`${controlClass} file:mr-3 file:rounded-lg file:border-0 file:bg-raised file:px-3 file:py-1.5 file:text-sm file:font-medium`}
              />
            </Field>
          )}
        </Card>
      </div>
    </main>
  )
}
