#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
site-navigator: Erzeugt die Navigation fuer die statische Website.

Funktionsweise:
- Jeder Unterordner des Projektverzeichnisses (neben dieser Datei und index.html)
  wird zu einem Punkt in der Navigation.
- Unterordner werden zu ausklappbaren Unterpunkten.
- Markdown-Dateien (.md) in den Ornern werden zu verlinkten Seiten;
  eine Datei index.md ist die Uebersichtsseite des jeweiligen Ordners.
- Das Skript schreibt die komplette Struktur und alle Seiteninhalte
  in die Datei site-data.js, die von index.html geladen wird.
- Den Website-Titel und die Profil-Links der Kopfzeile liest das
  Skript aus site-config.json (siehe site-config.example.json).

Aufruf:
    python3 build.py            Navigation einmalig neu erzeugen
    python3 build.py --watch    automatisch neu erzeugen, sobald sich
                                Ordner oder Markdown-Dateien aendern
"""

import json
import os
import re
import sys
import time

BASE = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE, "site-data.js")
CONFIG_FILE = os.path.join(BASE, "site-config.json")

# Standardwerte, falls site-config.json fehlt (Vorlage: site-config.example.json)
DEFAULT_CONFIG = {
    "title": "Meine Website",
    "links": {
        "github": "https://github.com/dein-nutzer",
        "codeberg": "https://codeberg.org/dein-nutzer",
        "mastodon": "https://mastodon.social/@dein-nutzer",
    },
}

# Ordner, die NICHT in die Navigation aufgenommen werden
IGNORED_DIRS = {".git", ".github", ".idea", ".vscode", "node_modules",
                "__pycache__", "assets"}

# Markdown-Dateien, die NICHT in die Navigation aufgenommen werden
IGNORED_FILES = {"README.md"}

WATCH_INTERVAL = 0.5  # Sekunden (nur fuer --watch)


def load_config():
    """Liest site-config.json (lokal, nicht im Repository) fuer Titel und Links."""
    try:
        with open(CONFIG_FILE, encoding="utf-8") as f:
            cfg = json.load(f)
    except FileNotFoundError:
        return DEFAULT_CONFIG, False
    except (OSError, ValueError) as e:
        print("WARNUNG: site-config.json ungueltig (%s), Standardwerte verwendet." % e)
        return DEFAULT_CONFIG, False

    if not isinstance(cfg, dict):
        return DEFAULT_CONFIG, False
    config = dict(DEFAULT_CONFIG)
    config.update({k: v for k, v in cfg.items() if k != "links"})
    config["links"] = dict(DEFAULT_CONFIG["links"])
    if isinstance(cfg.get("links"), dict):
        config["links"].update(cfg["links"])
    return config, True


def prettify(name):
    """Aus 'meine-anleitung' bzw. 'meine_anleitung.md' wird 'Meine Anleitung'."""
    cleaned = name[:-3] if name.endswith(".md") else name
    cleaned = cleaned.replace("-", " ").replace("_", " ")
    words = [w if w.isupper() else w[:1].upper() + w[1:] for w in cleaned.split()]
    return " ".join(words) or name


def first_heading(fs_path):
    """Liefert die erste '# Ueberschrift' einer Markdown-Datei, son le None."""
    try:
        with open(fs_path, encoding="utf-8") as f:
            seen = 0
            for line in f:
                if line.strip():
                    seen += 1
                m = re.match(r"^#\s+(.+?)\s*$", line)
                if m:
                    return m.group(1).strip()
                if seen >= 10:
                    break
    except OSError:
        pass
    return None


def page_node(fs_path, rel_path):
    return {
        "title": first_heading(fs_path) or prettify(os.path.basename(rel_path)),
        "file": rel_path,
    }


def scan_folder(fs_dir, rel_dir):
    """Scannt einen Ordner rekursiv und liefert einen Navigationsknoten."""
    folders, pages = [], []
    index_rel = (rel_dir + "/index.md") if rel_dir else "index.md"
    index_fs = os.path.join(BASE, *index_rel.split("/"))

    try:
        entries = sorted(os.listdir(fs_dir))
    except OSError:
        entries = []

    for name in entries:
        if name.startswith("."):
            continue
        fs_path = os.path.join(fs_dir, name)
        rel_path = (rel_dir + "/" + name) if rel_dir else name

        if os.path.isdir(fs_path):
            if name in IGNORED_DIRS:
                continue
            node = scan_folder(fs_path, rel_path)
            if node["folders"] or node["pages"] or node["index"]:
                folders.append(node)
        elif name.lower().endswith(".md"):
            if name in IGNORED_FILES or name.lower() == "index.md":
                continue
            pages.append(page_node(fs_path, rel_path))

    folders.sort(key=lambda n: n["title"].lower())
    pages.sort(key=lambda n: n["title"].lower())
    return {
        "title": prettify(os.path.basename(rel_dir)),
        "path": rel_dir,
        "index": index_rel if os.path.isfile(index_fs) else None,
        "folders": folders,
        "pages": pages,
    }


def collect_files(node, acc):
    if node["index"]:
        acc.append(node["index"])
    acc.extend(p["file"] for p in node["pages"])
    for sub in node["folders"]:
        collect_files(sub, acc)


def count_folders(nodes):
    return sum(1 + count_folders(n["folders"]) for n in nodes)


def build():
    config, has_config = load_config()
    if not has_config:
        print("Hinweis: site-config.json nicht vorhanden, Standardwerte werden verwendet.")

    # Unterordner des Projektverzeichnisses -> Hauptpunkte der Navigation
    tree = []
    for name in sorted(os.listdir(BASE)):
        if name.startswith(".") or name in IGNORED_DIRS:
            continue
        fs_path = os.path.join(BASE, name)
        if not os.path.isdir(fs_path):
            continue
        node = scan_folder(fs_path, name)
        if node["folders"] or node["pages"] or node["index"]:
            tree.append(node)

    # Markdown-Dateien direkt im Projektverzeichnis -> eigene Seiten (z. B. index.md)
    root_pages = []
    for name in sorted(os.listdir(BASE)):
        fs_path = os.path.join(BASE, name)
        if (os.path.isfile(fs_path) and name.lower().endswith(".md")
                and not name.startswith(".") and name not in IGNORED_FILES):
            root_pages.append(page_node(fs_path, name))
    root_pages.sort(key=lambda n: n["title"].lower())

    # Alle gefundenen Markdown-Dateien einlesen
    files = [p["file"] for p in root_pages]
    for node in tree:
        collect_files(node, files)

    content = {}
    for rel in files:
        fs_path = os.path.join(BASE, *rel.split("/"))
        try:
            with open(fs_path, encoding="utf-8") as f:
                content[rel] = f.read()
        except OSError as e:
            print("WARNUNG: %s konnte nicht gelesen werden: %s" % (rel, e))

    data = {
        "title": config["title"],
        "links": config["links"],
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "tree": tree,
        "rootPages": root_pages,
        "content": content,
    }

    payload = "window.SITE_DATA = " + json.dumps(
        data, ensure_ascii=False, separators=(",", ":")) + ";\n"
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        f.write(payload)

    print("Navigation aktualisiert: %d Ordner, %d Seiten -> site-data.js"
          % (count_folders(tree), len(content)))
    if not content:
        print("Hinweis: Noch keine Markdown-Dateien gefunden.")
        print("Lege .md-Dateien in Unterordnern ab und fuehre build.py erneut aus.")


def signature():
    """Momentaufnahme aller relevanten Dateien (fuer den --watch-Modus)."""
    sig = []
    for root, dirs, files in os.walk(BASE):
        dirs[:] = [d for d in dirs
                   if not d.startswith(".") and d not in IGNORED_DIRS]
        for name in dirs + files:
            fs_path = os.path.join(root, name)
            try:
                sig.append((fs_path, os.path.getmtime(fs_path)))
            except OSError:
                pass
    return sorted(sig)


def watch():
    print("Beobachte Projektordner (Beenden mit Strg+C) ...")
    prev = signature()
    build()
    try:
        while True:
            time.sleep(WATCH_INTERVAL)
            current = signature()
            if current != prev:
                prev = current
                print("Aenderung erkannt, baue neu ...")
                build()
    except KeyboardInterrupt:
        print("\nBeendet.")


def main():
    if "--watch" in sys.argv[1:]:
        watch()
    else:
        build()


if __name__ == "__main__":
    main()
