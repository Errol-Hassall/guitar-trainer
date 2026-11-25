import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { Trash2, Upload } from 'lucide-react'
import type { BackingTrack } from '#/lib/types'
import { bytesToBase64 } from '#/lib/audio'
import { formatUtcDateTime } from '#/lib/sessions'
import { createTrack, deleteTrack, listTracks } from '#/server/api'
import { TrackPlayer } from '#/components/track-player'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card } from '#/components/ui/card'
import { Field, controlClass } from '#/components/ui/field'
import { PageHeader } from '#/components/ui/page-header'

export const Route = createFileRoute('/tracks')({
  component: TracksPage,
  loader: () => listTracks(),
})

function TracksPage() {
  const router = useRouter()
  const tracks = Route.useLoaderData() as BackingTrack[]

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mode, setMode] = useState<'file' | 'url'>('file')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [confirmingId, setConfirmingId] = useState<number | null>(null)
  const fileRef = useRef<File | null>(null)

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    fileRef.current = file
    if (file !== null && name === '') {
      setName(file.name.replace(/\.[^.]+$/, ''))
    }
  }

  async function handleAdd() {
    setError('')
    try {
      const trimmedName = name.trim()
      if (trimmedName === '') throw new Error('Track name is required.')
      if (mode === 'file') {
        const file = fileRef.current
        if (!file) throw new Error('Choose an audio file first.')
        const dataB64 = bytesToBase64(new Uint8Array(await file.arrayBuffer()))
        await createTrack({
          data: { name: trimmedName, source: 'file', dataB64, mime: file.type || 'audio/mpeg' },
        })
        fileRef.current = null
      } else {
        await createTrack({
          data: { name: trimmedName, source: 'url', url: url.trim() },
        })
      }
      setName('')
      setUrl('')
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not add the track.')
    }
  }

  async function handleDelete(id: number) {
    setConfirmingId(null)
    try {
      await deleteTrack({ data: { id } })
      if (selectedId === id) setSelectedId(null)
      router.invalidate()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not delete the track.')
    }
  }

  const selected = tracks.find((track) => track.id === selectedId) ?? null

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <PageHeader
        title="Backing tracks"
        description="Play along at any tempo without changing pitch, loop sections and ramp up speed."
      />

      {error !== '' ? (
        <p role="alert" className="mb-4 rounded-lg border border-danger/40 bg-danger/15 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-col gap-4">
        <Card title="Add a track" description="Upload an audio file or point at an http(s) URL.">
          <div className="mb-3 flex gap-2">
            {(['file', 'url'] as const).map((value) => (
              <Button
                key={value}
                variant={mode === value ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setMode(value)}
                aria-pressed={mode === value}
              >
                {value === 'file' ? 'Audio file' : 'URL'}
              </Button>
            ))}
          </div>

          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handleAdd()
            }}
          >
            <Field label="Name" htmlFor="track-name">
              <input
                id="track-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Solo intro"
                className={`${controlClass} w-48`}
              />
            </Field>
            {mode === 'file' ? (
              <Field label="File" htmlFor="track-file">
                <input
                  id="track-file"
                  type="file"
                  accept="audio/*"
                  onChange={handleFile}
                  className={`${controlClass} w-64`}
                />
              </Field>
            ) : (
              <Field label="URL" htmlFor="track-url">
                <input
                  id="track-url"
                  type="url"
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://example.com/track.mp3"
                  className={`${controlClass} w-72`}
                />
              </Field>
            )}
            <Button type="submit">
              <Upload className="size-4" aria-hidden="true" /> Add track
            </Button>
          </form>
        </Card>

        <Card title="Library">
          <ul data-track-count={tracks.length} className="flex flex-col gap-2">
            {tracks.length === 0 ? (
              <p className="text-sm text-muted">No tracks yet.</p>
            ) : (
              tracks.map((track) => (
                <li
                  key={track.id}
                  data-track-id={track.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-raised px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{track.name}</p>
                    <p className="text-xs text-muted">{formatUtcDateTime(track.createdAt)}</p>
                  </div>
                  <Badge variant={track.source === 'file' ? 'teal' : undefined}>
                    {track.source === 'file' ? 'File' : 'URL'}
                  </Badge>
                  <Button size="sm" onClick={() => setSelectedId(track.id)}>
                    Load
                  </Button>
                  {confirmingId === track.id ? (
                    <>
                      <Button variant="danger" size="sm" onClick={() => void handleDelete(track.id)}>
                        Confirm
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setConfirmingId(null)}>
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Delete track ${track.name}`}
                      onClick={() => setConfirmingId(track.id)}
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))
            )}
          </ul>
        </Card>

        {selected ? (
          <Card title={selected.name} description={selected.source === 'url' ? selected.url : undefined}>
            <TrackPlayer track={selected} />
          </Card>
        ) : null}
      </div>
    </main>
  )
}
