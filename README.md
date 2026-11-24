# nawb
not another website builder

Eine statische Website, deren Navigation sich automatisch aus der
Ordnerstruktur ergibt. Kein Server, keine Datenbank, keine Abhängigkeiten.

## Funktionsweise

- Jeder Unterordner des Projektverzeichnisses wird zu einem Punkt in der Navigation.
- Unterordner werden zu ausklappbaren Unterpunkten.
- Markdown-Dateien (`*.md`) werden zu Seiten; der Seitentitel ist die erste
  `# Überschrift` der Datei ( alternativ der Dateiname ).
- Eine Datei `index.md` in einem Ordner ist die Übersichtsseite des Ordners.
  Klickt man auf den Ordnernamen, öffnet sich diese Seite.
- Die Inhalte werden beim Build in `site-data.js` eingebettet. Die Website
  läuft danach komplett statisch: per Doppelklick direkt vom Laufwerk,
  über einen lokalen Server oder bei einem beliebigen Hoster.

## Workflow

1. Einen Ordner neben der `index.html` anlegen, z. B. `anleitungen`.
2. Markdown-Dateien hineinlegen, z. B. `anleitungen/erste-schritte.md`.
3. Navigationsdaten erzeugen:

   ```
   python3 build.py
   ```

4. `index.html` im Browser öffnen bzw. neu laden. Fertig.

Für die dauerhafte Beobachtung während der Arbeit:

```
python3 build.py --watch
```

Jetzt wird die Navigation bei jeder Ordner- oder Dateiänderung automatisch
neu erzeugt. Beenden mit Strg+C. (Auf Windows genügt meist ein Doppelklick
auf `build.py`, bzw. `py -3 build.py`.)

## Projektstruktur

```
projekt/
├── index.html        Die Website (eine Seite)
├── assets/           CSS und JavaScript (manuell gepflegt)
├── build.py          Erzeugt site-data.js aus der Ordnerstruktur
├── site-data.js       Generierte Navigationsdaten (nicht von Hand ändern)
├── site-config.json   Lokale Angaben: Titel und Links (nicht committet)
├── site-config.example.json	Vorlage für site-config.json
├── dokumente/        BeispielOrdner -> Navigationspunkt
│   ├── index.md      Übersichtsseite des Ordners
│   └── einstieg.md   Weitere Seite
└── blog/             Ein weiterer Navigationspunkt
    └── hallo-welt.md
```

## Was wird ignoriert?

Versteckte Dateien und Ordner (beginnend mit `.`), `assets`, `node_modules`,
`README.md` sowie die technischen Dateien (`index.html`, `build.py`,
`site-data.js`). Die Liste steht oben in `build.py` unter `IGNORED_DIRS`
und `IGNORED_FILES` und kann angepasst werden.

## Website-Titel und Kopfzeilen-Links

Titel (Kopfzeile und Browser-Tab) sowie die Profil-Links der Kopfzeile
(GitHub, Codeberg, Mastodon) stehen in der lokalen Datei
`site-config.json`:

```json
{
  "title": "Meine Website",
  "links": {
    "github": "https://github.com/dein-nutzer",
    "codeberg": "https://codeberg.org/dein-nutzer",
    "mastodon": "https://mastodon.social/@dein-nutzer"
  }
}
```

Als Vorlage dient `site-config.example.json`: einfach kopieren, Werte
eintragen und danach `python3 build.py` ausführen. Beim Build werden die
Werte in `site-data.js` eingebaut; Titel und Link-Adressen übernimmt die
Seite von dort.

`site-config.json` enthält persönliche Angaben und steht in `.gitignore` –
sie wird nicht mit committet. Ohne diese Datei baut `build.py` mit den
Platzhalter-Standardwerten.

Soll ein Link ganz verschwinden, den Eintrag auf eine Leerzeichen-freie
leere Angabe setzen bzw. das zugehörige `<a>`-Element in `index.html`
löschen. Neue Logos lassen sich als weiteres `<a>` mit eigenem Inline-SVG
ergänzen.

## Farben anpassen

Das Farbschema (schwarzer Hintergrund, sehr helles Grau für die Schrift,
grüne Umrandungen, dunkles Lila für Highlights) liegt zentral im oberen
Teil von `assets/style.css` in den CSS-Variablen:

```css
:root {
  --bg: #000000;           /* Seitenhintergrund */
  --text: #e8e8e8;        /* Schriftfarbe */
  --border: #2f9e44;       /* Umrandungen (gruen) */
  --accent-deep: #2b1a4d; /* Highlights: dunkles Lila */
  ...
}
```

Wer nur eine Farbe ändern möchte, passt diesen Block an und braucht den
Rest der Datei nicht anzufassen.

## Markdown-Unterstützung

Der eingebaute Renderer unterstützt: Überschriften, Absätze, fett, kursiv,
inline-Code, Code-Blöcke, Zitate, Listen (aufzählend und nummeriert),
Tabellen, Links, Bilder und Trennlinien.

## Lokal ansehen

Im einfachsten Fall reicht ein Doppelklick auf `index.html`, da alle Inhalte
in `site-data.js` eingebettet sind. Bei großen Projekten oder zur Bearbeitung
empfiehlt sich ein lokaler Server:

```
python3 -m http.server
```

Dann öffnen: `http://localhost:8000`.
