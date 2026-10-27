import { ref, onChildAdded, onChildChanged } from 'firebase/database'
import { collection, doc, writeBatch } from 'firebase/firestore'
import { rtdb, fdb } from './firebase'
import { COLLECTION, SOURCE_PATH } from './config'
import { flatten } from './normalize'

/**
 * Nasłuchuje Realtime Database i zapisuje w Firestore każdy rekord,
 * którego tam jeszcze nie ma. Dokument ma stałe ID (ścieżka w źródle),
 * więc ten sam rekord nigdy nie zostanie zapisany dwa razy.
 */
export function startSync({ isKnown, onStatus }) {
  const written = new Set()
  const queue = new Map()
  const stats = { seen: 0, written: 0, errors: 0 }
  let timer = null
  let stopped = false

  const emit = (extra = {}) => onStatus?.({ ...stats, ...extra })

  async function flush() {
    timer = null
    const items = [...queue.values()]
    queue.clear()
    for (let i = 0; i < items.length; i += 400) {
      const chunk = items.slice(i, i + 400)
      try {
        const batch = writeBatch(fdb)
        chunk.forEach((r) => batch.set(doc(collection(fdb, COLLECTION), r.id), { ...r, syncedAt: Date.now() }))
        await batch.commit()
        stats.written += chunk.length
        emit({ state: 'live', lastWriteAt: Date.now() })
      } catch (e) {
        chunk.forEach((r) => written.delete(r.id))
        stats.errors += chunk.length
        emit({ state: 'error', message: e.message })
      }
    }
  }

  function handle(snap) {
    if (stopped) return
    const records = flatten(snap.val(), SOURCE_PATH === '/' ? [snap.key] : [snap.key])
    for (const r of records) {
      stats.seen++
      if (isKnown(r.id) || written.has(r.id)) continue
      written.add(r.id)
      queue.set(r.id, r)
    }
    if (queue.size && !timer) timer = setTimeout(flush, 400)
    emit({ state: 'live' })
  }

  const src = ref(rtdb, SOURCE_PATH)
  const onErr = (e) => emit({ state: 'error', message: e.message })
  const offAdded = onChildAdded(src, handle, onErr)
  const offChanged = onChildChanged(src, handle, onErr)
  emit({ state: 'connecting' })

  return () => {
    stopped = true
    offAdded()
    offChanged()
    if (timer) clearTimeout(timer)
  }
}
