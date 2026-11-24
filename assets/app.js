/* app.js - rendert Navigation und Seiteninhalte aus site-data.js */
(function () {
  "use strict";

  /* md-parser:start */
  function escapeHtml(s) {
    return s.replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
  }

  function inlineMarkdown(s) {
    s = s.replace(/`([^`]+)`/g, function (m, code) {
      return "<code>" + code + "</code>";
    });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
      '<img alt="$1" src="$2" loading="lazy">');
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      '<a href="$2">$1</a>');
    s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
    return s;
  }

  function splitRow(line) {
    var cells = line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|");
    return cells.map(function (c) { return inlineMarkdown(escapeHtml(c.trim())); });
  }

  function parseMarkdown(src) {
    var lines = src.replace(/\r\n?/g, "\n").split("\n");
    var out = [];
    var listStack = [];
    var i = 0;

    function closeLists() {
      while (listStack.length) { out.push("</" + listStack.pop() + ">"); }
    }

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { closeLists(); i++; continue; }

      if (/^\s*```/.test(line)) {
        closeLists();
        var buf = [];
        i++;
        while (i < lines.length && !/^\s*```/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push("<pre><code>" + escapeHtml(buf.join("\n")) + "</code></pre>");
        continue;
      }

      var h = line.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        closeLists();
        var lvl = h[1].length;
        out.push("<h" + lvl + ">" + inlineMarkdown(escapeHtml(h[2])) + "</h" + lvl + ">");
        i++;
        continue;
      }

      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { closeLists(); out.push("<hr>"); i++; continue; }

      if (/^\s*>/.test(line)) {
        closeLists();
        var quote = [];
        while (i < lines.length && /^\s*>/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ""));
          i++;
        }
        out.push("<blockquote>" + inlineMarkdown(escapeHtml(quote.join(" "))) + "</blockquote>");
        continue;
      }

      if (line.indexOf("|") !== -1 && i + 1 < lines.length &&
          /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) && lines[i + 1].indexOf("-") !== -1) {
        closeLists();
        var header = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && lines[i].indexOf("|") !== -1 && !/^\s*$/.test(lines[i])) {
          rows.push(splitRow(lines[i]));
          i++;
        }
        var tbl = "<table><thead><tr>" +
          header.map(function (c) { return "<th>" + c + "</th>"; }).join("") +
          "</tr></thead><tbody>";
        rows.forEach(function (r) {
          tbl += "<tr>" + r.map(function (c) { return "<td>" + c + "</td>"; }).join("") + "</tr>";
        });
        out.push(tbl + "</tbody></table>");
        continue;
      }

      var li = line.match(/^\s*[-*+]\s+(.*)$/);
      if (li) {
        if (listStack[listStack.length - 1] !== "ul") {
          closeLists();
          out.push("<ul>");
          listStack.push("ul");
        }
        out.push("<li>" + inlineMarkdown(escapeHtml(li[1])) + "</li>");
        i++;
        continue;
      }

      var oli = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (oli) {
        if (listStack[listStack.length - 1] !== "ol") {
          closeLists();
          out.push("<ol>");
          listStack.push("ol");
        }
        out.push("<li>" + inlineMarkdown(escapeHtml(oli[1])) + "</li>");
        i++;
        continue;
      }

      closeLists();
      var para = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^\s*(#{1,6}\s|```|>|\-\-\-|\*\*\*|[-*+]\s|\d+[.)]\s)/.test(lines[i])) {
        para.push(lines[i]);
        i++;
      }
      out.push("<p>" + inlineMarkdown(escapeHtml(para.join(" "))) + "</p>");
    }

    closeLists();
    return out.join("\n");
  }
  /* md-parser:end */

  var data = window.SITE_DATA || null;

  var navEl = document.getElementById("nav");
  var contentEl = document.getElementById("content");
  var crumbsEl = document.getElementById("breadcrumbs");
  var searchEl = document.getElementById("search");
  var menuBtn = document.getElementById("menu-btn");
  var sidebar = document.getElementById("sidebar");
  var sideFoot = document.getElementById("side-foot");
  var titleEl = document.getElementById("site-title");

  var crumbMap = {};    // datei -> Array { title, file? }
  var parentMap = {};   // datei -> Array uebergeordneter Ordner-Pfade
  var openFolders = {}; // ordnerPfad -> true (vom Benutzer geoeffnet)
  var active = null;

  function $(tag, cls, text) {
    var el = document.createElement(tag);
    if (cls) { el.className = cls; }
    if (text !== undefined) { el.textContent = text; }
    return el;
  }

  function buildMaps() {
    function walk(nodes, trail) {
      nodes.forEach(function (node) {
        var crumbTrail = trail.concat([{ title: node.title, file: node.index }]);
        var parents = trail.map(function (t) { return t.path; });
        if (node.index) {
          crumbMap[node.index] = crumbTrail;
          parentMap[node.index] = parents;
        }
        node.pages.forEach(function (p) {
          crumbMap[p.file] = crumbTrail.concat([{ title: p.title, file: p.file }]);
          parentMap[p.file] = parents.concat([node.path]);
        });
        walk(node.folders, crumbTrail);
      });
    }
    walk(data.tree || [], []);
    (data.rootPages || []).forEach(function (p) {
      crumbMap[p.file] = [{ title: p.title, file: p.file }];
    });
  }

  function firstFile() {
    var roots = data.rootPages || [];
    for (var r = 0; r < roots.length; r++) {
      if (roots[r].file === "index.md" && data.content[roots[r].file]) { return roots[r].file; }
    }
    function dfs(node) {
      if (node.index && data.content[node.index]) { return node.index; }
      for (var i = 0; i < node.folders.length; i++) {
        var found = dfs(node.folders[i]);
        if (found) { return found; }
      }
      for (var j = 0; j < node.pages.length; j++) {
        if (data.content[node.pages[j].file]) { return node.pages[j].file; }
      }
      return null;
    }
    for (var k = 0; k < (data.tree || []).length; k++) {
      var file = dfs(data.tree[k]);
      if (file) { return file; }
    }
    return roots.length ? roots[0].file : null;
  }

  function targetFile() {
    var raw = location.hash.replace(/^#/, "");
    var file = decodeURI(raw);
    if (file && data.content[file]) { return file; }
    return firstFile();
  }

  /* ---------- Navigation ---------- */

  function subtreeMatches(node, q) {
    if (node.title.toLowerCase().indexOf(q) !== -1) { return true; }
    for (var i = 0; i < node.pages.length; i++) {
      if (node.pages[i].title.toLowerCase().indexOf(q) !== -1) { return true; }
    }
    for (var j = 0; j < node.folders.length; j++) {
      if (subtreeMatches(node.folders[j], q)) { return true; }
    }
    return false;
  }

  function pageLi(page, q) {
    if (q && page.title.toLowerCase().indexOf(q) === -1) { return null; }
    var li = $("li");
    var a = $("a", "page" + (page.file === active ? " active" : ""), page.title);
    a.href = "#" + encodeURI(page.file);
    a.addEventListener("click", closeSidebarOnMobile);
    li.appendChild(a);
    return li;
  }

  function folderLi(node, q) {
    if (q && !subtreeMatches(node, q)) { return null; }

    var li = $("li", "folder" + (openFolders[node.path] || q ? " open" : ""));

    var head = $("div", "folder-head");
    var toggle = $("button", "toggle", "\u25B8");
    toggle.type = "button";
    toggle.setAttribute("aria-label", node.title + " ein- und ausklappen");

    var title;
    if (node.index) {
      title = $("a", "title link", node.title);
      title.href = "#" + encodeURI(node.index);
      title.addEventListener("click", closeSidebarOnMobile);
    } else {
      title = $("span", "title", node.title);
    }
    head.appendChild(title);
    head.appendChild(toggle);
    li.appendChild(head);

    var children = [];
    node.folders.forEach(function (f) {
      var child = folderLi(f, q);
      if (child) { children.push({ el: child, name: f.title }); }
    });
    node.pages.forEach(function (p) {
      var child = pageLi(p, q);
      if (child) { children.push({ el: child, name: p.title }); }
    });
    children.sort(function (a, b) {
      return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
    });

    if (children.length) {
      var ul = $("ul", "children");
      children.forEach(function (c) { ul.appendChild(c.el); });
      li.appendChild(ul);
    }

    function setOpen(open) {
      li.classList.toggle("open", open);
      openFolders[node.path] = open;
    }
    toggle.addEventListener("click", function () {
      setOpen(!li.classList.contains("open"));
    });
    if (!node.index) {
      title.addEventListener("click", function () {
        setOpen(!li.classList.contains("open"));
      });
    }

    return li;
  }

  function renderNav() {
    var q = (searchEl.value || "").trim().toLowerCase();
    navEl.textContent = "";

    if (!data || (data.tree.length === 0 && (data.rootPages || []).length === 0)) {
      var hint = $("p", "nav-empty",
        "Noch keine Inhalte. Lege Markdown-Dateien in Unterordnern ab " +
        "und f\u00FChre build.py erneut aus.");
      navEl.appendChild(hint);
      return;
    }

    var ul = $("ul");
    (data.rootPages || []).forEach(function (p) {
      var li = pageLi(p, q);
      if (li) { ul.appendChild(li); }
    });
    (data.tree || []).forEach(function (node) {
      var li = folderLi(node, q);
      if (li) { ul.appendChild(li); }
    });
    navEl.appendChild(ul);
  }

  /* ---------- Seiteninhalte ---------- */

  function renderBreadcrumbs(file) {
    var crumbs = crumbMap[file] || [];
    crumbsEl.textContent = "";
    crumbs.forEach(function (c, idx) {
      if (idx > 0) { crumbsEl.appendChild(document.createTextNode(" \u203A ")); }
      if (c.file && idx < crumbs.length - 1) {
        var a = $("a", null, c.title);
        a.href = "#" + encodeURI(c.file);
        crumbsEl.appendChild(a);
      } else {
        crumbsEl.appendChild($("span", idx === crumbs.length - 1 ? "current" : null, c.title));
      }
    });
  }

  function setAncestorsOpen(file) {
    (parentMap[file] || []).forEach(function (path) {
      openFolders[path] = true;
    });
  }

  function emptyStateRender() {
    crumbsEl.textContent = "";
    contentEl.innerHTML =
      "<h1>Willkommen</h1>" +
      "<p>Noch keine Inhalte gefunden. So geht es los:</p>" +
      "<ol>" +
      "<li>Erstelle einen Ordner neben dieser <code>index.html</code>.</li>" +
      "<li>Lege darin Markdown-Dateien (<code>.md</code>) ab, z. B. eine <code>index.md</code>.</li>" +
      "<li>F\u00FChre <code>python3 build.py</code> aus und lade diese Seite neu.</li>" +
      "</ol>";
    renderNav();
  }

  function render() {
    active = targetFile();

    if (!active) {
      emptyStateRender();
      return;
    }

    setAncestorsOpen(active);
    renderBreadcrumbs(active);
    contentEl.innerHTML = parseMarkdown(data.content[active]);

    var crumbs = crumbMap[active] || [];
    var last = crumbs[crumbs.length - 1];
    document.title = (last ? last.title + " \u2013 " : "") + data.title;

    renderNav();
  }

  /* ---------- Kleinigkeiten ---------- */

  function closeSidebarOnMobile() {
    sidebar.classList.remove("open");
  }

  function init() {
    if (!data) {
      contentEl.innerHTML =
        "<h1>Noch keine Daten</h1>" +
        "<p>Die Datei <code>site-data.js</code> wurde nicht gefunden. " +
        "Bitte f\u00FChre <code>python3 build.py</code> im Projektordner aus " +
        "und lade die Seite anschlie\u00DFend neu.</p>";
      return;
    }
    if (data.title) {
      titleEl.textContent = data.title;
      document.title = data.title;
    }
    buildMaps();

    menuBtn.addEventListener("click", function () {
      sidebar.classList.toggle("open");
    });
    searchEl.addEventListener("input", renderNav);
    window.addEventListener("hashchange", render);

    if (sideFoot && data.generatedAt) {
      sideFoot.textContent = "Stand: " + data.generatedAt;
    }

    render();
  }

  init();
})();
