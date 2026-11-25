import { useMemo, useRef, useState } from 'react'
import { Pause, Play, Trash2, Volume2 } from 'lucide-react'
import type {
  AccentLevel,
  BeatUnit,
  ClickSound,
  MetronomePreset,
  PresetInput,
  Subdivision,
} from '#/lib/types'
import {
  ACCENT_LABELS,
  BEAT_UNITS,
  BPM_MAX,
  BPM_MIN,
  CLICK_SOUND_LABELS,
  CLICK_SOUNDS,
  PRACTICAL_BPM_MAX,
  PRACTICAL_BPM_MIN,
  SUBDIVISION_LABELS,
  SUBDIVISIONS,
} from '#/lib/types'
import {
  calculateTapTempo,
  clampBpm,
  cycleAccent,
  defaultAccents,
  effectiveClicksPerMinute,
  resizeAccents,
  subdivisionOffsets,
} from '#/lib/metronome'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card } from './ui/card'
import { Field, controlClass } from './ui/field'
import { BeatDisplay } from './metronome/beat-display'
import { useMetronome } from './metronome/use-metronome'

type PresetStatus = 'idle' | 'saving' | 'saved' | 'error'

export function MetronomePanel({
  presets,
  onSavePreset,
  onDeletePreset,
}: {
  presets: MetronomePreset[]
  onSavePreset: (input: PresetInput) => Promise<void>
  onDeletePreset: (id: number) => Promise<void>
}) {
  const [bpm, setBpm] = useState(90)
  const [beats, setBeats] = useState(4)
  const [beatUnit, setBeatUnit] = useState<BeatUnit>(4)
  const [subdivision, setSubdivision] = useState<Subdivision>('none')
  const [accents, setAccents] = useState<AccentLevel[]>(() => defaultAccents(4))
  const [countInBars, setCountInBars] = useState(1)
  const [gapClick, setGapClick] = useState(false)
  const [sound, setSound] = useState<ClickSound>('woodblock')
  const [haptics, setHaptics] = useState(false)
  const [volumeDominant, setVolumeDominant] = useState(90)
  const [volumeAccent, setVolumeAccent] = useState(60)
  const [volumeNormal, setVolumeNormal] = useState(45)
  const [volumeSubdivision, setVolumeSubdivision] = useState(30)

  const [presetName, setPresetName] = useState('')
  const [presetStatus, setPresetStatus] = useState<PresetStatus>('idle')

  const tapsRef = useRef<number[]>([])

  const settings = useMemo(
    () => ({
      bpm,
      beats,
      beatUnit,
      subdivision,
      accents,
      countInBars,
      gapClick,
      sound,
      haptics,
      volumes: {
        dominant: volumeDominant / 100,
        accent: volumeAccent / 100,
        normal: volumeNormal / 100,
        subdivision: volumeSubdivision / 100,
      },
    }),
    [
      bpm,
      beats,
      beatUnit,
      subdivision,
      accents,
      countInBars,
      gapClick,
      sound,
      haptics,
      volumeDominant,
      volumeAccent,
      volumeNormal,
      volumeSubdivision,
    ],
  )

  const { isPlaying, start, stop, getVisual } = useMetronome(settings)

  function handleTap() {
    const now = performance.now()
    const taps = tapsRef.current
    if (taps.length > 0 && now - taps[taps.length - 1] > 2000) {
      taps.length = 0
    }
    taps.push(now)
    if (taps.length > 6) taps.shift()
    const value = calculateTapTempo(taps)
    if (value !== null) setBpm(value)
  }

  function handleBeatsChange(raw: number) {
    const next = Math.min(16, Math.max(1, Math.round(Number.isFinite(raw) ? raw : 4)))
    setBeats(next)
    setAccents((previous) => resizeAccents(previous, next))
  }

  function handleLoadPreset(preset: MetronomePreset) {
    void stop()
    setBpm(preset.bpm)
    setBeats(preset.beats)
    setBeatUnit(preset.beatUnit)
    setSubdivision(preset.subdivision)
    setAccents([...preset.accents])
  }

  async function handleSavePreset() {
    const name = presetName.trim()
    if (name === '') return
    setPresetStatus('saving')
    try {
      await onSavePreset({ name, bpm, beats, beatUnit, subdivision, accents })
      setPresetName('')
      setPresetStatus('saved')
    } catch {
      setPresetStatus('error')
    }
  }

  async function handleDeletePreset(id: number) {
    try {
      await onDeletePreset(id)
    } catch {
      // The list re-renders from the server on success; failures stay visible.
    }
  }

  const ticksPerBeat = subdivisionOffsets(subdivision).length

  return (
    <div data-metronome-panel="true" data-bpm={bpm} className="flex flex-col gap-4">
      <Card title="Metronome" description={`${beats}/${beatUnit} at ${bpm} BPM`}>
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Field label="Tempo (BPM)" htmlFor="bpm-input" hint={`Supported 1–${BPM_MAX}; practical range ${PRACTICAL_BPM_MIN}–${PRACTICAL_BPM_MAX}`}>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  aria-label="Decrease tempo by 1 BPM"
                  onClick={() => setBpm((previous) => clampBpm(previous - 1))}
                >
                  −
                </Button>
                <input
                  id="bpm-input"
                  type="number"
                  inputMode="numeric"
                  min={BPM_MIN}
                  max={BPM_MAX}
                  value={bpm}
                  onChange={(event) => setBpm(clampBpm(Number(event.target.value)))}
                  className={`${controlClass} max-w-24 text-center font-mono text-lg`}
                />
                <Button
                  variant="secondary"
                  aria-label="Increase tempo by 1 BPM"
                  onClick={() => setBpm((previous) => clampBpm(previous + 1))}
                >
                  +
                </Button>
              </div>
            </Field>

            <Field label="Fine tune" htmlFor="bpm-slider">
              <input
                id="bpm-slider"
                type="range"
                min={PRACTICAL_BPM_MIN}
                max={PRACTICAL_BPM_MAX}
                step={1}
                value={Math.min(Math.max(bpm, PRACTICAL_BPM_MIN), PRACTICAL_BPM_MAX)}
                onChange={(event) => setBpm(Number(event.target.value))}
                className="w-full accent-[var(--color-accent)]"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Beats per bar" htmlFor="beats-input">
              <input
                id="beats-input"
                type="number"
                inputMode="numeric"
                min={1}
                max={16}
                value={beats}
                onChange={(event) => handleBeatsChange(Number(event.target.value))}
                className={controlClass}
              />
            </Field>
            <Field label="Beat unit" htmlFor="beat-unit">
              <select
                id="beat-unit"
                value={beatUnit}
                onChange={(event) => setBeatUnit(Number(event.target.value) as BeatUnit)}
                className={controlClass}
              >
                {BEAT_UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    /{unit}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Subdivision"
              htmlFor="subdivision"
              hint={`≈ ${effectiveClicksPerMinute(bpm, subdivision)} clicks/min`}
            >
              <select
                id="subdivision"
                value={subdivision}
                onChange={(event) => setSubdivision(event.target.value as Subdivision)}
                className={controlClass}
              >
                {SUBDIVISIONS.map((option) => (
                  <option key={option} value={option}>
                    {SUBDIVISION_LABELS[option]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-muted">
              Accent pattern (tap a beat to cycle normal → accent → dominant)
            </legend>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8" data-accent-grid="true">
              {Array.from({ length: beats }, (_, index) => {
                const level = accents[index] ?? 0
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      setAccents((previous) =>
                        resizeAccents(
                          previous.map((value, i) =>
                            i === index ? cycleAccent(value) : value,
                          ),
                          beats,
                        ),
                      )
                    }
                    aria-label={`Beat ${index + 1}: ${ACCENT_LABELS[level]}. Press to change accent.`}
                    className={`min-h-12 rounded-lg border text-sm font-semibold transition ${
                      level === 2
                        ? 'border-accent bg-accent text-accent-ink'
                        : level === 1
                          ? 'border-teal bg-teal/20 text-teal'
                          : 'border-line bg-raised text-muted'
                    }`}
                  >
                    {index + 1}
                    <span className="ml-1 text-xs font-normal">
                      {ACCENT_LABELS[level]}
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <BeatDisplay
            beats={beats}
            ticksPerBeat={ticksPerBeat}
            accents={accents}
            getVisual={getVisual}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="xl"
              onClick={() => (isPlaying ? void stop() : void start())}
              data-metronome-toggle="true"
            >
              {isPlaying ? (
                <>
                  <Pause className="size-5" aria-hidden="true" /> Stop
                </>
              ) : (
                <>
                  <Play className="size-5" aria-hidden="true" /> Start
                </>
              )}
            </Button>
            <Button variant="secondary" size="lg" onClick={handleTap}>
              Tap tempo
              {tapsRef.current.length > 0 ? (
                <Badge variant="teal">{tapsRef.current.length}</Badge>
              ) : null}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Sound" description="Click character and per-level volume.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Click sound" htmlFor="click-sound">
            <select
              id="click-sound"
              value={sound}
              onChange={(event) => setSound(event.target.value as ClickSound)}
              className={controlClass}
            >
              {CLICK_SOUNDS.map((option) => (
                <option key={option} value={option}>
                  {CLICK_SOUND_LABELS[option]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Count-in" htmlFor="count-in">
            <select
              id="count-in"
              value={countInBars}
              onChange={(event) => setCountInBars(Number(event.target.value))}
              className={controlClass}
            >
              <option value={0}>Off</option>
              <option value={1}>1 bar</option>
              <option value={2}>2 bars</option>
            </select>
          </Field>

          {(
            [
              ['Dominant', volumeDominant, setVolumeDominant, 'volume-dominant'],
              ['Accent', volumeAccent, setVolumeAccent, 'volume-accent'],
              ['Normal beat', volumeNormal, setVolumeNormal, 'volume-normal'],
              ['Subdivision', volumeSubdivision, setVolumeSubdivision, 'volume-subdivision'],
            ] as const
          ).map(([label, value, setValue, id]) => (
            <Field key={id} label={`${label} volume`} htmlFor={id}>
              <div className="flex items-center gap-3">
                <Volume2 className="size-4 shrink-0 text-muted" aria-hidden="true" />
                <input
                  id={id}
                  type="range"
                  min={0}
                  max={100}
                  value={value}
                  onChange={(event) => setValue(Number(event.target.value))}
                  className="w-full accent-[var(--color-accent)]"
                />
                <span className="w-8 text-right font-mono text-xs text-muted">
                  {value}
                </span>
              </div>
            </Field>
          ))}

          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-raised px-3 text-sm">
            <input
              type="checkbox"
              checked={gapClick}
              onChange={(event) => setGapClick(event.target.checked)}
              className="size-5 accent-[var(--color-accent)]"
            />
            Gap click (mute every other bar)
          </label>
          <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-line bg-raised px-3 text-sm">
            <input
              type="checkbox"
              checked={haptics}
              onChange={(event) => setHaptics(event.target.checked)}
              className="size-5 accent-[var(--color-accent)]"
            />
            Haptic pulse on beat (mobile)
          </label>
        </div>
      </Card>

      <div data-preset-status={presetStatus}>
      <Card
        title="Presets"
        description="Saved metronome settings."
      >
        <div className="flex flex-col gap-4">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              void handleSavePreset()
            }}
          >
            <Field label="New preset name" htmlFor="preset-name">
              <input
                id="preset-name"
                type="text"
                maxLength={40}
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                placeholder="e.g. 7/8 practice"
                className={`${controlClass} max-w-56`}
              />
            </Field>
            <Button type="submit" disabled={presetStatus === 'saving' || presetName.trim() === ''}>
              Save current settings
            </Button>
          </form>

          {presetStatus === 'saved' ? (
            <p className="text-sm text-success">Preset saved.</p>
          ) : null}
          {presetStatus === 'error' ? (
            <p className="text-sm text-danger" role="alert">
              Could not save the preset.
            </p>
          ) : null}

          <ul className="flex flex-col gap-2">
            {presets.map((preset) => (
              <li
                key={preset.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-raised px-3 py-2"
              >
                <div className="min-w-0">
                  <span className="font-medium">{preset.name}</span>
                  <span className="ml-2 text-xs text-muted">
                    {preset.bpm} BPM · {preset.beats}/{preset.beatUnit} ·{' '}
                    {SUBDIVISION_LABELS[preset.subdivision]}
                  </span>
                  {preset.isBuiltin ? (
                    <Badge variant="teal">Built-in</Badge>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => handleLoadPreset(preset)}>
                    Load
                  </Button>
                  {!preset.isBuiltin ? (
                    <Button
                      variant="danger"
                      size="sm"
                      aria-label={`Delete preset ${preset.name}`}
                      onClick={() => void handleDeletePreset(preset.id)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Card>
      </div>
    </div>
  )
}
