import { useCallback, useEffect, useRef, useState } from 'react'
import { dispatchHandsFree, type HandsFreeAction } from '#/lib/hands-free'

/**
 * Foot-pedal key bindings. USB/Bluetooth pedals are sold as keyboard
 * emulators, so any pedal that sends these keys works with the app.
 */
const KEY_ACTIONS: Record<string, HandsFreeAction> = {
  ' ': 'start-stop',
  n: 'next-section',
  t: 'tap-tempo',
}

const VOICE_COMMANDS: [string, HandsFreeAction][] = [
  ['next', 'next-section'],
  ['repeat', 'repeat-section'],
  ['slower', 'slower'],
]

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const candidate = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null
}

/**
 * Installs the foot-pedal key bindings and an opt-in voice-command listener
 * ("next", "repeat", "slower") while `enabled` is true. Voice needs a
 * Chromium-based browser; everything else degrades to keys only.
 */
export function useHandsFree(enabled: boolean) {
  const [voiceSupported] = useState(() => getRecognitionCtor() !== null)
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [lastCommand, setLastCommand] = useState('')
  const [voiceError, setVoiceError] = useState('')

  useEffect(() => {
    if (!enabled) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return
      const action = KEY_ACTIONS[event.key.length === 1 ? event.key.toLowerCase() : event.key]
      if (!action) return
      // Cancels the default button activation so a focused button is not
      // double-triggered by the same key press.
      event.preventDefault()
      dispatchHandsFree(action)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled])

  const voiceEnabledRef = useRef(false)
  voiceEnabledRef.current = voiceEnabled

  useEffect(() => {
    if (!voiceEnabled) return
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setVoiceError('Speech recognition is not available in this browser.')
      setVoiceEnabled(false)
      return
    }
    const recognition = new Ctor()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = navigator.language || 'en'
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      const transcript = last?.[0]?.transcript.toLowerCase() ?? ''
      for (const [word, action] of VOICE_COMMANDS) {
        if (new RegExp(`\\b${word}\\b`).test(transcript)) {
          dispatchHandsFree(action)
          setLastCommand(word)
          break
        }
      }
    }
    recognition.onerror = (event) => {
      voiceEnabledRef.current = false
      setVoiceError(
        event.error === 'not-allowed'
          ? 'Microphone access was denied — voice control is off.'
          : `Voice control stopped: ${event.error}.`,
      )
      setVoiceEnabled(false)
    }
    // Browsers end continuous listening after a pause; re-arm while enabled.
    recognition.onend = () => {
      if (voiceEnabledRef.current) recognition.start()
    }
    try {
      recognition.start()
    } catch {
      voiceEnabledRef.current = false
      setVoiceError('Could not start speech recognition.')
      setVoiceEnabled(false)
    }
    return () => {
      voiceEnabledRef.current = false
      recognition.onend = null
      recognition.onerror = null
      recognition.stop()
    }
  }, [voiceEnabled])

  const toggleVoice = useCallback(() => {
    setLastCommand('')
    setVoiceError('')
    setVoiceEnabled((current) => !current)
  }, [])

  return { voiceSupported, voiceEnabled, lastCommand, voiceError, toggleVoice }
}
