import { createContext, useContext, useMemo, useState } from 'react'
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import type { AccentLevel, BeatUnit, ClickSound, Subdivision } from '#/lib/types'
import { defaultAccents } from '#/lib/metronome'
import { useMetronome, type MetronomeSettings, type MetronomeVisual } from './use-metronome'

export interface GlobalMetronome {
  bpm: number
  setBpm: Dispatch<SetStateAction<number>>
  beats: number
  setBeats: Dispatch<SetStateAction<number>>
  beatUnit: BeatUnit
  setBeatUnit: Dispatch<SetStateAction<BeatUnit>>
  subdivision: Subdivision
  setSubdivision: Dispatch<SetStateAction<Subdivision>>
  accents: AccentLevel[]
  setAccents: Dispatch<SetStateAction<AccentLevel[]>>
  countInBars: number
  setCountInBars: Dispatch<SetStateAction<number>>
  stopAfterBars: number
  setStopAfterBars: Dispatch<SetStateAction<number>>
  gapClick: boolean
  setGapClick: Dispatch<SetStateAction<boolean>>
  sound: ClickSound
  setSound: Dispatch<SetStateAction<ClickSound>>
  haptics: boolean
  setHaptics: Dispatch<SetStateAction<boolean>>
  volumeDominant: number
  setVolumeDominant: Dispatch<SetStateAction<number>>
  volumeAccent: number
  setVolumeAccent: Dispatch<SetStateAction<number>>
  volumeNormal: number
  setVolumeNormal: Dispatch<SetStateAction<number>>
  volumeSubdivision: number
  setVolumeSubdivision: Dispatch<SetStateAction<number>>
  isPlaying: boolean
  start: () => Promise<void>
  stop: () => void
  getVisual: () => MetronomeVisual
}

const MetronomeContext = createContext<GlobalMetronome | null>(null)

/**
 * The app-wide metronome: the click keeps running while you navigate and the
 * nav bar shows a live indicator. /metronome and the session pages all control
 * this same instance.
 */
export function MetronomeProvider({ children }: { children: ReactNode }) {
  const [bpm, setBpm] = useState(90)
  const [beats, setBeats] = useState(4)
  const [beatUnit, setBeatUnit] = useState<BeatUnit>(4)
  const [subdivision, setSubdivision] = useState<Subdivision>('none')
  const [accents, setAccents] = useState<AccentLevel[]>(() => defaultAccents(4))
  const [countInBars, setCountInBars] = useState(1)
  const [stopAfterBars, setStopAfterBars] = useState(0)
  const [gapClick, setGapClick] = useState(false)
  const [sound, setSound] = useState<ClickSound>('woodblock')
  const [haptics, setHaptics] = useState(false)
  const [volumeDominant, setVolumeDominant] = useState(90)
  const [volumeAccent, setVolumeAccent] = useState(60)
  const [volumeNormal, setVolumeNormal] = useState(45)
  const [volumeSubdivision, setVolumeSubdivision] = useState(30)

  const settings = useMemo<MetronomeSettings>(
    () => ({
      bpm,
      beats,
      beatUnit,
      subdivision,
      accents,
      countInBars,
      stopAfterBars,
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
      stopAfterBars,
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

  const value = useMemo<GlobalMetronome>(
    () => ({
      bpm,
      setBpm,
      beats,
      setBeats,
      beatUnit,
      setBeatUnit,
      subdivision,
      setSubdivision,
      accents,
      setAccents,
      countInBars,
      setCountInBars,
      stopAfterBars,
      setStopAfterBars,
      gapClick,
      setGapClick,
      sound,
      setSound,
      haptics,
      setHaptics,
      volumeDominant,
      setVolumeDominant,
      volumeAccent,
      setVolumeAccent,
      volumeNormal,
      setVolumeNormal,
      volumeSubdivision,
      setVolumeSubdivision,
      isPlaying,
      start,
      stop,
      getVisual,
    }),
    [
      bpm,
      beats,
      beatUnit,
      subdivision,
      accents,
      countInBars,
      stopAfterBars,
      gapClick,
      sound,
      haptics,
      volumeDominant,
      volumeAccent,
      volumeNormal,
      volumeSubdivision,
      isPlaying,
      start,
      stop,
      getVisual,
    ],
  )

  return <MetronomeContext.Provider value={value}>{children}</MetronomeContext.Provider>
}

export function useGlobalMetronome(): GlobalMetronome {
  const context = useContext(MetronomeContext)
  if (!context) throw new Error('useGlobalMetronome must be used inside MetronomeProvider')
  return context
}
