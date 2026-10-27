# Karaoke Analytics

Aplikacja React (Vite): kopiuje dane z Realtime Database (`lapose-d2a83`) do Firestore
(`analisappkaraoke`) i pokazuje statystyki po polsku.

## Uruchomienie
```
npm install
npm run dev
```
Otwórz adres z terminala (zwykle http://localhost:5173) i zostaw kartę otwartą —
nowe dane ze źródła są kopiowane na żywo.

## Struktura danych
Aplikacja sama szuka w bazie rekordów z polem piosenki (song / title / track …),
nicku (nick / user / name …), wykonawcy i daty. Jeśli Twoje pola nazywają się inaczej
albo dane nie są widoczne — edytuj `src/config.js`.

## Reguły Firebase (ważne!)
Realtime Database (projekt lapose) – odczyt:
```
{ "rules": { ".read": true, ".write": false } }
```
Firestore (projekt analisappkaraoke) – odczyt i zapis kolekcji `songs`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /songs/{id} { allow read, write: if true; }
  }
}
```
Są to reguły testowe. Przed publikacją zabezpiecz je (np. Firebase Auth).

## Jak działa deduplikacja
Każdy dokument w Firestore ma ID = ścieżka rekordu w źródle, więc ten sam wpis
nigdy nie zostanie zapisany dwa razy, nawet po odświeżeniu strony.
