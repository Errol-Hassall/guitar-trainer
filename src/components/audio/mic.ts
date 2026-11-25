/** Human-readable reason for a getUserMedia failure. */
export function describeMicError(error: unknown): string {
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Microphone access needs a secure context — open the app via http://localhost or https (plain http from another device is blocked by the browser).'
  }
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone permission was denied. Allow the mic for this site in your browser settings, then try again.'
  }
  return 'Microphone unavailable. Check browser permissions and try again.'
}
