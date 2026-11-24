# Einstieg

Diese Seite zeigt, welche Markdown-Elemente dargestellt werden können.

## Textformatierung

Text kann **fett**, *kursiv* oder `als Code` formatiert werden.
Links funktionieren natürlich auch: [zurück zur Übersicht](index.md).

## Listen

Aufzählungen:

- Erster Punkt
- Zweiter Punkt
  - Verschachtelter Punkt

Nummerierte Listen:

1. Ordner anlegen
2. Markdown-Datei hineinlegen
3. `build.py` ausführen

## Code-Blöcke

```python
# Der Inhalt eines Ordners wird automatisch zur Navigation
for ordner in unterordner:
    navigation.hinzufuegen(ordner)
```

## Zitate

> Jeder neue Ordner erscheint automatisch als neuer Punkt in der Navigation.

## Tabellen

| Befehl | Bedeutung |
| ------ | --------- |
| `python3 build.py` | Navigation neu erzeugen |
| `python3 build.py --watch` | Bei Änderungen automatisch neu erzeugen |

## Trennlinien

---

Das war eine Trennlinie. Einzelheiten zur Arbeitsweise stehen in der
`README.md` im Projektordner.
