// ─────────────────────────────────────────────────────────────
//  USTAWIENIA SYNCHRONIZACJI
//  Jeśli struktura Twojej bazy Realtime Database jest inna,
//  zmień tylko ten plik – reszta aplikacji dostosuje się sama.
// ─────────────────────────────────────────────────────────────

// Ścieżka w Realtime Database, z której kopiujemy dane ('/' = cała baza).
// Przykład: 'karaoke/history'
export const SOURCE_PATH = '/'

// Kolekcja w Firestore, do której zapisujemy dane.
export const COLLECTION = 'songs'

// Możliwe nazwy pól w rekordzie (wielkość liter nie ma znaczenia).
// Pierwsze znalezione pole zostanie użyte.
export const FIELD_ALIASES = {
  song: ['song', 'songTitle', 'song_title', 'title', 'track', 'trackName', 'piosenka', 'pesnya', 'песня'],
  artist: ['artist', 'author', 'singerBand', 'performer', 'wykonawca', 'исполнитель'],
  nick: ['nick', 'nickname', 'nik', 'user', 'userName', 'username', 'singer', 'name', 'player', 'ник'],
  time: ['timestamp', 'createdAt', 'created_at', 'date', 'time', 'sungAt', 'playedAt', 'ts'],
}

// Klucze „kontenerowe” – nie są nickami. Jeśli rekord nie ma pola z nickiem,
// nick zostanie wzięty z najbliższego klucza nadrzędnego spoza tej listy.
export const GENERIC_KEYS = [
  'songs', 'song', 'history', 'plays', 'queue', 'sessions', 'users', 'players',
  'karaoke', 'data', 'items', 'records', 'list', 'performances',
]
