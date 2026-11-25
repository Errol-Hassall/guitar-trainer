import { base64ToBytes } from '#/lib/audio'
import { getAudioContext } from '../metronome/audio'

/** Decode a base64 blob (from the server) into an AudioBuffer. */
export async function decodeBase64Audio(dataB64: string, mime: string): Promise<AudioBuffer> {
  const bytes = base64ToBytes(dataB64)
  const blob = new Blob([bytes], { type: mime })
  return getAudioContext().decodeAudioData(await blob.arrayBuffer())
}

/** Download and decode a remote track. Throws on CORS or HTTP failures. */
export async function fetchUrlAudio(url: string): Promise<AudioBuffer> {
  const response = await fetch(url, { mode: 'cors' })
  if (!response.ok) {
    throw new Error(`Could not download the track (HTTP ${response.status}).`)
  }
  return getAudioContext().decodeAudioData(await response.arrayBuffer())
}
