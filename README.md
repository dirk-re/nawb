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

## Website-Titel ändern

Zwei Stellen:

1. In `build.py` der Wert `SITE_TITLE` (erscheint in der Kopfzeile).
2. In `index.html` der Eintrag im `<title>`-Tag (Startwert im Browser-Tab).

Danach `python3 build.py` ausführen.

## Links in der Kopfzeile (GitHub, Codeberg, Mastodon)

Die drei Logos in der Kopfzeile verlinken standardmäßig auf die
Platzhalter-Adressen `https://github.com/dein-nutzer`,
`https://codeberg.org/dein-nutzer` und `https://mastodon.social/@dein-nutzer`.
In `index.html` im Abschnitt `<!-- Links: bitte die Platzhalter-URLs ... -->`
die `href`-Attribute durch die eigenen Profil-Adressen ersetzen.

Soll ein Link entfernt werden, genügt es, das zugehörige `<a>`-Element zu
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
