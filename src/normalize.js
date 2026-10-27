import { FIELD_ALIASES, GENERIC_KEYS } from './config'

export const norm = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

const lowerKeys = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]))

function pick(obj, aliases) {
  const l = lowerKeys(obj)
  for (const a of aliases) {
    const v = l[a.toLowerCase()]
    if (v !== undefined && v !== null && v !== '' && typeof v !== 'object') return v
  }
  return null
}

function toMs(v) {
  if (v === null || v === undefined || v === '') return null
  if (typeof v === 'number') return v < 1e12 ? v * 1000 : v
  const n = Number(v)
  if (!Number.isNaN(n)) return toMs(n)
  const d = Date.parse(v)
  return Number.isNaN(d) ? null : d
}

function inferNick(path) {
  const parents = path.slice(0, -1).reverse()
  const generic = new Set(GENERIC_KEYS.map((k) => k.toLowerCase()))
  return parents.find((p) => !generic.has(String(p).toLowerCase())) ?? null
}

/**
 * Rekurencyjnie przechodzi po drzewie z Realtime Database i zwraca
 * płaską listę rekordów „wykonanie piosenki”.
 */
export function flatten(value, path = [], out = []) {
  if (value === null || typeof value !== 'object') return out

  const song = pick(value, FIELD_ALIASES.song)
  if (song !== null) {
    const artist = pick(value, FIELD_ALIASES.artist)
    const nick = pick(value, FIELD_ALIASES.nick) ?? inferNick(path) ?? 'Nieznany'
    const id = path.join('__').replace(/\//g, '_') || `root_${norm(song)}`
    out.push({
      id,
      nick: String(nick).trim(),
      nickKey: norm(nick),
      song: String(song).trim(),
      artist: artist ? String(artist).trim() : null,
      songKey: norm(song) + (artist ? ` | ${norm(artist)}` : ''),
      ts: toMs(pick(value, FIELD_ALIASES.time)),
      srcPath: path.join('/'),
      raw: JSON.stringify(value).slice(0, 4000),
    })
    return out
  }

  for (const [k, v] of Object.entries(value)) flatten(v, [...path, k], out)
  return out
}
