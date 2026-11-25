/**
 * Windowed Sine-weighted Overlap-Add (WSOLA) time stretching. Pure DSP, no I/O.
 * `factor` is output length ÷ input length and preserves pitch: 0.5 makes the
 * signal half as long (play it at 1× for double speed), 2 doubles its length.
 */

const GRAIN_SECONDS = 0.02
const HOP_RATIO = 4

function hannWindow(size: number): Float32Array {
  const window = new Float32Array(size)
  for (let i = 0; i < size; i += 1) {
    window[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)))
  }
  return window
}

/** Coarse-then-fine lag search: correlate the input grain against the output so far. */
function searchLag(
  input: Float32Array,
  inLen: number,
  idealIn: number,
  output: Float32Array,
  outPos: number,
  grain: number,
): number {
  const maxLag = Math.max(8, Math.floor(grain / 4))
  const coarseStep = 8

  let bestOffset = 0
  let bestScore = -Infinity
  for (let offset = -maxLag; offset <= maxLag; offset += coarseStep) {
    const start = idealIn + offset
    if (start < 0 || start + grain > inLen) continue
    let score = 0
    for (let j = 0; j < grain; j += 1) {
      score += input[start + j] * output[outPos + j]
    }
    if (score > bestScore) {
      bestScore = score
      bestOffset = offset
    }
  }

  let fineBest = bestOffset
  let fineScore = -Infinity
  for (let offset = bestOffset - coarseStep; offset <= bestOffset + coarseStep; offset += 1) {
    const start = idealIn + offset
    if (start < 0 || start + grain > inLen) continue
    let score = 0
    for (let j = 0; j < grain; j += 1) {
      score += input[start + j] * output[outPos + j]
    }
    if (score > fineScore) {
      fineScore = score
      fineBest = offset
    }
  }
  return idealIn + fineBest
}

export function timeStretch(
  samples: Float32Array,
  sampleRate: number,
  factor: number,
): Float32Array {
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('factor must be positive')
  const inLen = samples.length
  const outLen = Math.max(1, Math.round(inLen * factor))
  const grain = Math.min(inLen, Math.max(64, Math.floor(GRAIN_SECONDS * sampleRate)))
  if (grain < 32) return new Float32Array(outLen)

  const hopIn = Math.max(1, Math.floor(grain / HOP_RATIO))
  const hopOut = Math.max(1, Math.round(hopIn / factor))
  const window = hannWindow(grain)
  const output = new Float32Array(outLen)

  for (let outPos = 0; outPos < outLen; outPos += hopOut) {
    const idealIn = Math.min(inLen - grain, Math.round((outPos / hopOut) * hopIn))
    const start = searchLag(samples, inLen, idealIn, output, outPos, grain)
    for (let j = 0; j < grain && outPos + j < outLen; j += 1) {
      output[outPos + j] += samples[start + j] * window[j]
    }
  }
  return output
}

/** Playback rate that shifts pitch by `semitones` (12 = one octave up). */
export function playbackRateFor(semitones: number): number {
  return 2 ** (semitones / 12)
}

/**
 * Stretch factor that keeps tempo and pitch independent: stretch by P/T, then
 * play at rate P. Net duration = input ÷ tempo, pitch shifted by semitones.
 */
export function stretchFactorFor(tempo: number, semitones: number): number {
  if (tempo <= 0) throw new Error('tempo must be positive')
  return playbackRateFor(semitones) / tempo
}
