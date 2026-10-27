export const fmtNum = (n) => new Intl.NumberFormat('pl-PL').format(n)

export const fmtDate = (t) =>
  t
    ? new Date(t).toLocaleString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—'

const dayKey = (t) => new Date(t).toLocaleDateString('sv-SE')

export function buildStats(songs) {
  const singers = new Map()
  const tracks = new Map()
  const days = new Map()

  for (const s of songs) {
    const t = s.ts ?? s.syncedAt ?? 0

    let sg = singers.get(s.nickKey)
    if (!sg) {
      sg = { key: s.nickKey, nick: s.nick, plays: 0, songs: new Map(), last: 0 }
      singers.set(s.nickKey, sg)
    }
    sg.plays++
    if (t >= sg.last) { sg.last = t; sg.nick = s.nick }

    let e = sg.songs.get(s.songKey)
    if (!e) {
      e = { key: s.songKey, song: s.song, artist: s.artist, count: 0, last: 0 }
      sg.songs.set(s.songKey, e)
    }
    e.count++
    e.last = Math.max(e.last, t)

    let tr = tracks.get(s.songKey)
    if (!tr) {
      tr = { key: s.songKey, song: s.song, artist: s.artist, count: 0, singers: new Map(), last: 0 }
      tracks.set(s.songKey, tr)
    }
    tr.count++
    tr.singers.set(s.nickKey, (tr.singers.get(s.nickKey) || 0) + 1)
    tr.last = Math.max(tr.last, t)

    if (t) days.set(dayKey(t), (days.get(dayKey(t)) || 0) + 1)
  }

  let repeats = 0
  for (const sg of singers.values()) {
    sg.repeats = 0
    for (const e of sg.songs.values()) sg.repeats += e.count - 1
    repeats += sg.repeats
  }
  for (const tr of tracks.values()) tr.repeats = tr.count - tr.singers.size

  const last30 = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const k = d.toLocaleDateString('sv-SE')
    last30.push({ day: k, count: days.get(k) || 0 })
  }

  return {
    total: songs.length,
    repeats,
    singers: [...singers.values()].sort((a, b) => b.plays - a.plays),
    tracks: [...tracks.values()].sort((a, b) => b.count - a.count),
    last30,
  }
}
