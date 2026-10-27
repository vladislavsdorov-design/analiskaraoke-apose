import { useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { fdb } from "./firebase";
import { COLLECTION } from "./config";
import { startSync } from "./sync";
import { buildStats, fmtDate, fmtNum } from "./analytics";

const TABS = [
  { id: "overview", label: "Przegląd" },
  { id: "singers", label: "Śpiewacy" },
  { id: "songs", label: "Piosenki" },
  { id: "history", label: "Historia" },
];

function useSongs() {
  const [songs, setSongs] = useState([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  useEffect(
    () =>
      onSnapshot(
        collection(fdb, COLLECTION),
        (snap) => {
          setSongs(snap.docs.map((d) => ({ ...d.data(), id: d.id })));
          setReady(true);
        },
        (e) => setError(e.message)
      ),
    []
  );
  return { songs, ready, error };
}

export default function App() {
  const { songs, ready, error } = useSongs();
  const [tab, setTab] = useState("overview");
  const [sync, setSync] = useState({
    state: "connecting",
    written: 0,
    seen: 0,
  });
  const [picked, setPicked] = useState(null);

  const ids = useRef(new Set());
  ids.current = useMemo(() => new Set(songs.map((s) => s.id)), [songs]);

  useEffect(() => {
    if (!ready) return;
    return startSync({
      isKnown: (id) => ids.current.has(id),
      onStatus: setSync,
    });
  }, [ready]);

  const stats = useMemo(() => buildStats(songs), [songs]);

  const openSinger = (key) => {
    setPicked(key);
    setTab("singers");
  };

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">
          <img className="logopngana" src="./logana.png" alt="" />
          {/* <span className="brand-mark" aria-hidden="true" /> */}
          <div>
            <strong>Karaoke</strong>
            <span>Analytics</span>
          </div>
        </div>
        <nav>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? "nav on" : "nav"}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <SyncCard sync={sync} error={error} />
      </aside>

      <main className="main">
        {error && (
          <div className="alert">
            Błąd odczytu Firestore: {error}. Sprawdź reguły bazy (patrz README).
          </div>
        )}
        {!ready && !error && <div className="empty">Ładowanie danych…</div>}
        {ready && songs.length === 0 && <Empty sync={sync} />}
        {ready && songs.length > 0 && (
          <>
            {tab === "overview" && (
              <Overview stats={stats} openSinger={openSinger} />
            )}
            {tab === "singers" && (
              <Singers stats={stats} picked={picked} setPicked={setPicked} />
            )}
            {tab === "songs" && (
              <Tracks stats={stats} openSinger={openSinger} />
            )}
            {tab === "history" && <History songs={songs} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ───────── Synchronizacja ───────── */

function SyncCard({ sync, error }) {
  const label =
    sync.state === "live"
      ? "Synchronizacja na żywo"
      : sync.state === "error"
      ? "Błąd synchronizacji"
      : "Łączenie ze źródłem…";
  return (
    <div className="sync">
      <div className="sync-head">
        <span className={`dot ${error ? "error" : sync.state}`} />
        <strong>{label}</strong>
      </div>
      <dl>
        <div>
          <dt>Odczytane ze źródła</dt>
          <dd>{fmtNum(sync.seen || 0)}</dd>
        </div>
        <div>
          <dt>Zapisane w tej sesji</dt>
          <dd>{fmtNum(sync.written || 0)}</dd>
        </div>
        <div>
          <dt>Ostatni zapis</dt>
          <dd>
            {sync.lastWriteAt
              ? new Date(sync.lastWriteAt).toLocaleTimeString("pl-PL")
              : "—"}
          </dd>
        </div>
      </dl>
      {sync.message && <p className="sync-err">{sync.message}</p>}
      <p className="sync-note">
        Nowe dane są kopiowane, dopóki aplikacja jest otwarta.
      </p>
    </div>
  );
}

function Empty({ sync }) {
  return (
    <div className="empty">
      <h2>Brak danych w Firestore</h2>
      {sync.state === "error" ? (
        <p>
          Nie udało się odczytać bazy źródłowej: {sync.message}. Sprawdź reguły
          Realtime Database.
        </p>
      ) : sync.seen === 0 ? (
        <p>
          Źródło nie zwróciło jeszcze żadnych rekordów. Jeśli baza nie jest
          pusta, dopasuj nazwy pól w <code>src/config.js</code>.
        </p>
      ) : (
        <p>Trwa kopiowanie danych…</p>
      )}
    </div>
  );
}

/* ───────── Widoki ───────── */

function Overview({ stats, openSinger }) {
  const max = Math.max(1, ...stats.last30.map((d) => d.count));
  const maxSinger = stats.singers[0]?.plays || 1;
  const maxTrack = stats.tracks[0]?.count || 1;
  const repeatedTracks = stats.tracks.filter((t) => t.repeats > 0).slice(0, 8);

  return (
    <>
      <header className="page-head">
        <h1>Przegląd</h1>
        <p>Podsumowanie wszystkich wykonań zapisanych w Firestore.</p>
      </header>

      <section className="hero">
        <div className="hero-num">
          <span className="big">{fmtNum(stats.total)}</span>
          <span className="cap">zaśpiewanych piosenek</span>
        </div>
        <div className="hero-chart">
          <div className="chart-title">Wykonania w ostatnich 30 dniach</div>
          <svg
            viewBox="0 0 300 80"
            preserveAspectRatio="none"
            role="img"
            aria-label="Wykres aktywności"
          >
            {stats.last30.map((d, i) => {
              const h = (d.count / max) * 72;
              return (
                <rect
                  key={d.day}
                  x={i * 10 + 1}
                  y={78 - h}
                  width="7.5"
                  height={Math.max(h, d.count ? 2 : 0.8)}
                  rx="1.5"
                  className={d.count ? "bar" : "bar zero"}
                >
                  <title>{`${d.day}: ${d.count}`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="chart-axis">
            <span>{stats.last30[0].day}</span>
            <span>{stats.last30[29].day}</span>
          </div>
        </div>
      </section>

      <section className="kpis">
        <Kpi label="Śpiewacy" value={stats.singers.length} />
        <Kpi label="Unikalne piosenki" value={stats.tracks.length} />
        <Kpi
          label="Powtórzone wykonania"
          value={stats.repeats}
          hint="ten sam śpiewak, ta sama piosenka"
          warm
        />
        <Kpi
          label="Średnio na śpiewaka"
          value={(stats.total / stats.singers.length)
            .toFixed(1)
            .replace(".", ",")}
        />
      </section>

      <section className="cols">
        <Panel title="Najaktywniejsi śpiewacy">
          {stats.singers.slice(0, 8).map((s) => (
            <BarRow
              key={s.key}
              label={s.nick}
              value={s.plays}
              max={maxSinger}
              onClick={() => openSinger(s.key)}
            />
          ))}
        </Panel>
        <Panel title="Najczęściej śpiewane piosenki">
          {stats.tracks.slice(0, 8).map((t) => (
            <BarRow
              key={t.key}
              label={t.song}
              sub={t.artist}
              value={t.count}
              max={maxTrack}
            />
          ))}
        </Panel>
      </section>

      {repeatedTracks.length > 0 && (
        <Panel title="Piosenki, które wracają">
          <table className="tbl">
            <thead>
              <tr>
                <th>Piosenka</th>
                <th>Wykonawca</th>
                <th className="r">Wykonań</th>
                <th className="r">Śpiewaków</th>
                <th className="r">Powtórzeń</th>
              </tr>
            </thead>
            <tbody>
              {repeatedTracks.map((t) => (
                <tr key={t.key}>
                  <td>{t.song}</td>
                  <td className="muted">{t.artist || "—"}</td>
                  <td className="r num">{t.count}</td>
                  <td className="r num">{t.singers.size}</td>
                  <td className="r">
                    <span className="pill warm">{t.repeats}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}

function Singers({ stats, picked, setPicked }) {
  const [q, setQ] = useState("");
  const [onlyRepeated, setOnlyRepeated] = useState(false);

  const list = useMemo(
    () =>
      stats.singers.filter((s) =>
        s.nick.toLowerCase().includes(q.toLowerCase().trim())
      ),
    [stats, q]
  );
  const current = stats.singers.find((s) => s.key === picked) || list[0];
  const songs = current
    ? [...current.songs.values()]
        .filter((e) => !onlyRepeated || e.count > 1)
        .sort((a, b) => b.count - a.count || b.last - a.last)
    : [];

  return (
    <>
      <header className="page-head">
        <h1>Śpiewacy</h1>
        <p>Wyszukaj nick, aby zobaczyć, co śpiewał i co powtarzał.</p>
      </header>
      <div className="split">
        <div className="list">
          <input
            className="search"
            placeholder="Szukaj po nicku…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="list-scroll">
            {list.map((s) => (
              <button
                key={s.key}
                className={current?.key === s.key ? "item on" : "item"}
                onClick={() => setPicked(s.key)}
              >
                <span className="avatar">
                  {s.nick.slice(0, 1).toUpperCase()}
                </span>
                <span className="item-name">{s.nick}</span>
                <span className="item-count">{s.plays}</span>
              </button>
            ))}
            {list.length === 0 && (
              <p className="muted pad">Nie znaleziono nicku.</p>
            )}
          </div>
        </div>

        {current && (
          <div className="detail">
            <div className="detail-head">
              <span className="avatar lg">
                {current.nick.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <h2>{current.nick}</h2>
                <p className="muted">Ostatnio: {fmtDate(current.last)}</p>
              </div>
            </div>
            <div className="kpis three">
              <Kpi label="Wykonania" value={current.plays} />
              <Kpi label="Unikalne piosenki" value={current.songs.size} />
              <Kpi label="Powtórzenia" value={current.repeats} warm />
            </div>
            <label className="check">
              <input
                type="checkbox"
                checked={onlyRepeated}
                onChange={(e) => setOnlyRepeated(e.target.checked)}
              />
              Tylko powtarzane piosenki
            </label>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Piosenka</th>
                  <th>Wykonawca</th>
                  <th className="r">Razy</th>
                  <th className="r">Ostatnio</th>
                </tr>
              </thead>
              <tbody>
                {songs.map((e) => (
                  <tr key={e.key}>
                    <td>{e.song}</td>
                    <td className="muted">{e.artist || "—"}</td>
                    <td className="r">
                      {e.count > 1 ? (
                        <span className="pill warm">×{e.count}</span>
                      ) : (
                        <span className="num">1</span>
                      )}
                    </td>
                    <td className="r muted">{fmtDate(e.last)}</td>
                  </tr>
                ))}
                {songs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="muted pad">
                      Brak powtórzeń.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

function Tracks({ stats, openSinger }) {
  const [q, setQ] = useState("");
  const [onlyRepeated, setOnlyRepeated] = useState(false);
  const [open, setOpen] = useState(null);
  const nickOf = useMemo(
    () => Object.fromEntries(stats.singers.map((s) => [s.key, s.nick])),
    [stats]
  );

  const rows = stats.tracks.filter(
    (t) =>
      (!onlyRepeated || t.repeats > 0) &&
      `${t.song} ${t.artist || ""}`
        .toLowerCase()
        .includes(q.toLowerCase().trim())
  );

  return (
    <>
      <header className="page-head">
        <h1>Piosenki</h1>
        <p>Ile razy każda piosenka została zaśpiewana i przez kogo.</p>
      </header>
      <div className="toolbar">
        <input
          className="search"
          placeholder="Szukaj piosenki lub wykonawcy…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="check">
          <input
            type="checkbox"
            checked={onlyRepeated}
            onChange={(e) => setOnlyRepeated(e.target.checked)}
          />
          Tylko powtarzane
        </label>
      </div>
      <Panel>
        <table className="tbl">
          <thead>
            <tr>
              <th>Piosenka</th>
              <th>Wykonawca</th>
              <th className="r">Wykonań</th>
              <th className="r">Śpiewaków</th>
              <th className="r">Powtórzeń</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 300).map((t) => (
              <>
                <tr
                  key={t.key}
                  className="click"
                  onClick={() => setOpen(open === t.key ? null : t.key)}
                >
                  <td>{t.song}</td>
                  <td className="muted">{t.artist || "—"}</td>
                  <td className="r num">{t.count}</td>
                  <td className="r num">{t.singers.size}</td>
                  <td className="r">
                    {t.repeats > 0 ? (
                      <span className="pill warm">{t.repeats}</span>
                    ) : (
                      <span className="muted">0</span>
                    )}
                  </td>
                </tr>
                {open === t.key && (
                  <tr key={t.key + "-d"} className="expand">
                    <td colSpan="5">
                      {[...t.singers.entries()]
                        .sort((a, b) => b[1] - a[1])
                        .map(([k, n]) => (
                          <button
                            key={k}
                            className="chip"
                            onClick={() => openSinger(k)}
                          >
                            {nickOf[k]} <b>×{n}</b>
                          </button>
                        ))}
                    </td>
                  </tr>
                )}
              </>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="5" className="muted pad">
                  Brak wyników.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}

function History({ songs }) {
  const [q, setQ] = useState("");
  const [limit, setLimit] = useState(100);
  const rows = useMemo(
    () =>
      [...songs]
        .sort((a, b) => (b.ts ?? b.syncedAt ?? 0) - (a.ts ?? a.syncedAt ?? 0))
        .filter((s) =>
          `${s.nick} ${s.song} ${s.artist || ""}`
            .toLowerCase()
            .includes(q.toLowerCase().trim())
        ),
    [songs, q]
  );
  return (
    <>
      <header className="page-head">
        <h1>Historia</h1>
        <p>Wszystkie wykonania od najnowszych.</p>
      </header>
      <div className="toolbar">
        <input
          className="search"
          placeholder="Szukaj po nicku, piosence lub wykonawcy…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <span className="muted">{fmtNum(rows.length)} wpisów</span>
      </div>
      <Panel>
        <table className="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Nick</th>
              <th>Piosenka</th>
              <th>Wykonawca</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, limit).map((s) => (
              <tr key={s.id}>
                <td className="muted nowrap">{fmtDate(s.ts ?? s.syncedAt)}</td>
                <td>{s.nick}</td>
                <td>{s.song}</td>
                <td className="muted">{s.artist || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > limit && (
          <button className="more" onClick={() => setLimit(limit + 200)}>
            Pokaż więcej
          </button>
        )}
      </Panel>
    </>
  );
}

/* ───────── Elementy ───────── */

const Kpi = ({ label, value, hint, warm }) => (
  <div className={warm ? "kpi warm" : "kpi"}>
    <span className="kpi-val">
      {typeof value === "number" ? fmtNum(value) : value}
    </span>
    <span className="kpi-label">{label}</span>
    {hint && <span className="kpi-hint">{hint}</span>}
  </div>
);

const Panel = ({ title, children }) => (
  <section className="panel">
    {title && <h3>{title}</h3>}
    {children}
  </section>
);

function BarRow({ label, sub, value, max, onClick }) {
  return (
    <div className={onClick ? "brow click" : "brow"} onClick={onClick}>
      <div className="brow-top">
        <span className="brow-label">
          {label}
          {sub && <em>{sub}</em>}
        </span>
        <span className="num">{value}</span>
      </div>
      <div className="track">
        <div className="fill" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}
