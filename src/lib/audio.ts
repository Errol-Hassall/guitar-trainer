/** Pure audio utilities: transfer-encoding helpers, waveform peaks, YIN pitch detection, note names. */

const B64_CHUNK = 0x8000

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i += B64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + B64_CHUNK))
  }
  return btoa(binary)
}

export function base64ToBytes(encoded: string): Uint8Array<ArrayBuffer> {
  const binary = atob(encoded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes
}

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const

const C4_HZ = 261.6256
/** Tuner range: low E string to comfortably above the high E. */
export const PITCH_MIN_HZ = 70
export const PITCH_MAX_HZ = 1300

/** Max absolute value per bucket, normalised so the loudest bucket is 1. */
export function computePeaks(channel: Float32Array, buckets: number): Float32Array {
  const peaks = new Float32Array(buckets)
  if (buckets <= 0 || channel.length === 0) return peaks

  let max = 0
  for (let bucket = 0; bucket < buckets; bucket += 1) {
    const start = Math.floor((bucket * channel.length) / buckets)
    const end = Math.min(channel.length, Math.floor(((bucket + 1) * channel.length) / buckets))
    let peak = 0
    for (let i = start; i < end; i += 1) {
      const value = Math.abs(channel[i])
      if (value > peak) peak = value
    }
    peaks[bucket] = peak
    if (peak > max) max = peak
  }
  if (max > 0) {
    for (let bucket = 0; bucket < buckets; bucket += 1) peaks[bucket] /= max
  }
  return peaks
}

/**
 * Fundamental frequency in Hz via YIN (cumulative-mean normalised difference),
 * or null when the window is silent, non-periodic, or below the guitar range.
 */
export function detectPitch(samples: Float32Array, sampleRate: number): number | null {
  const n = samples.length
  if (n < 128) return null

  let energy = 0
  for (let i = 0; i < n; i += 1) energy += samples[i] * samples[i]
  if (Math.sqrt(energy / n) < 0.008) return null

  const minLag = Math.max(2, Math.floor(sampleRate / PITCH_MAX_HZ))
  const maxLag = Math.min(n - 2, Math.ceil(sampleRate / PITCH_MIN_HZ))
  if (maxLag <= minLag) return null

  const windowSize = Math.min(2048, n - maxLag)
  const cmnd = new Float64Array(maxLag + 1)
  let cumulative = 0
  for (let tau = 1; tau <= maxLag; tau += 1) {
    let diff = 0
    for (let i = 0; i < windowSize; i += 1) {
      const delta = samples[i] - samples[i + tau]
      diff += delta * delta
    }
    cumulative += diff
    cmnd[tau] = cumulative > 0 ? (diff * tau) / cumulative : 1
  }

  // First lag that dips below the threshold, then descend to its local minimum.
  const threshold = 0.15
  let candidate = -1
  for (let tau = minLag; tau <= maxLag; tau += 1) {
    if (cmnd[tau] < threshold) {
      candidate = tau
      break
    }
  }
  if (candidate === -1) return null

  let bestLag = candidate
  while (bestLag < maxLag && cmnd[bestLag + 1] < cmnd[bestLag]) bestLag += 1

  // Parabolic interpolation for sub-sample accuracy.
  let peakLag = bestLag
  const left = bestLag > minLag ? cmnd[bestLag - 1] : cmnd[bestLag]
  const value = cmnd[bestLag]
  const right = bestLag < maxLag ? cmnd[bestLag + 1] : cmnd[bestLag]
  const denom = left - 2 * value + right
  if (denom !== 0) {
    peakLag += (0.5 * (left - right)) / denom
  }
  return sampleRate / peakLag
}

/** Nearest chromatic note for a frequency, with cents deviation from it. */
export function frequencyToNote(
  frequency: number,
): { name: string; octave: number; cents: number } | null {
  if (!Number.isFinite(frequency) || frequency <= 0) return null
  const step = Math.round(12 * Math.log2(frequency / C4_HZ))
  const nearest = C4_HZ * 2 ** (step / 12)
  return {
    name: NOTE_NAMES[((step % 12) + 12) % 12],
    octave: 4 + Math.floor(step / 12),
    cents: Math.round(1200 * Math.log2(frequency / nearest)),
  }
}
