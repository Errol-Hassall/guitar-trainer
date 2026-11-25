/** Actions that can be triggered without touching the screen (foot-pedal keys, voice). */
export type HandsFreeAction =
  | 'start-stop'
  | 'next-section'
  | 'repeat-section'
  | 'tap-tempo'
  | 'slower'

type Handler = () => void

const handlers = new Map<HandsFreeAction, Set<Handler>>()

/** Subscribe to a hands-free action. Returns an unsubscribe function. */
export function onHandsFree(action: HandsFreeAction, handler: Handler): () => void {
  let set = handlers.get(action)
  if (!set) {
    set = new Set()
    handlers.set(action, set)
  }
  set.add(handler)
  return () => {
    set.delete(handler)
  }
}

export function dispatchHandsFree(action: HandsFreeAction): void {
  handlers.get(action)?.forEach((handler) => handler())
}
