(function (global) {
  "use strict";

  const COLORS = {
    Renewed: "#6cc04a",
    Committed: "#049fd9",
    Quoted: "#7b67ee",
    "In negotiation": "#00bceb",
    "Not started": "#9e9e9e",
    "At risk": "#f5a623",
    Lapsed: "#e2231a",
  };

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function moneyShort(n) {
    const abs = Math.abs(n);
    const sign = n < 0 ? "-" : "";
    if (abs >= 1e6) return sign + "$" + (abs / 1e6).toFixed(1) + "M";
    if (abs >= 1e3) return sign + "$" + Math.round(abs / 1e3) + "K";
    return sign + "$" + abs;
  }

  function stackedHorizontal(el, seriesOrder, groups) {
    el.textContent = "";
    const max = Math.max.apply(
      null,
      groups
        .map(function (g) {
          return seriesOrder.reduce(function (s, k) {
            return s + (g.values[k] || 0);
          }, 0);
        })
        .concat([1])
    );
    groups.forEach(function (g) {
      const row = document.createElement("div");
      row.className = "bar-row";
      const lab = document.createElement("div");
      lab.textContent = g.label;
      const track = document.createElement("div");
      track.className = "bar-track";
      let total = 0;
      seriesOrder.forEach(function (k) {
        const v = g.values[k] || 0;
        total += v;
        if (!v) return;
        const seg = document.createElement("div");
        seg.className = "bar-seg";
        seg.style.width = (v / max) * 100 + "%";
        seg.style.background = COLORS[k] || "#ccc";
        seg.title = k + ": " + moneyShort(v);
        track.appendChild(seg);
      });
      const tot = document.createElement("div");
      tot.className = "num";
      tot.textContent = moneyShort(total);
      row.appendChild(lab);
      row.appendChild(track);
      row.appendChild(tot);
      el.appendChild(row);
    });
  }

  function stackedVertical(svg, seriesOrder, groups) {
    const w = 640;
    const h = 220;
    const pad = { t: 8, r: 8, b: 28, l: 42 };
    const innerW = w - pad.l - pad.r;
    const innerH = h - pad.t - pad.b;
    const max = Math.max.apply(
      null,
      groups
        .map(function (g) {
          return seriesOrder.reduce(function (s, k) {
            return s + (g.values[k] || 0);
          }, 0);
        })
        .concat([1])
    );
    const gap = 8;
    const bw = groups.length ? (innerW - gap * groups.length) / groups.length : 0;
    let html = '<svg class="chart" viewBox="0 0 ' + w + " " + h + '" role="img">';
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.t + innerH - (innerH * i) / ticks;
      const val = (max * i) / ticks;
      html +=
        '<line x1="' +
        pad.l +
        '" x2="' +
        (w - pad.r) +
        '" y1="' +
        y +
        '" y2="' +
        y +
        '" stroke="#ececec"/>';
      html +=
        '<text x="' +
        (pad.l - 6) +
        '" y="' +
        (y + 3) +
        '" text-anchor="end" font-size="10" fill="#585858">' +
        escapeHtml(moneyShort(val)) +
        "</text>";
    }
    groups.forEach(function (g, i) {
      const x = pad.l + gap + i * (bw + gap);
      let y = pad.t + innerH;
      seriesOrder.forEach(function (k) {
        const v = g.values[k] || 0;
        if (!v) return;
        const bh = (v / max) * innerH;
        y -= bh;
        html +=
          '<rect x="' +
          x +
          '" y="' +
          y +
          '" width="' +
          bw +
          '" height="' +
          bh +
          '" fill="' +
          (COLORS[k] || "#ccc") +
          '"><title>' +
          escapeHtml(g.label) +
          " · " +
          escapeHtml(k) +
          " · " +
          escapeHtml(moneyShort(v)) +
          "</title></rect>";
      });
      html +=
        '<text x="' +
        (x + bw / 2) +
        '" y="' +
        (h - 8) +
        '" text-anchor="middle" font-size="10" fill="#585858">' +
        escapeHtml(g.label) +
        "</text>";
    });
    html += "</svg>";
    svg.innerHTML = html;
  }

  function donut(el, parts) {
    const total =
      parts.reduce(function (s, p) {
        return s + p.value;
      }, 0) || 1;
    const r = 54;
    const c = 2 * Math.PI * r;
    let off = 0;
    let html =
      '<svg class="chart" viewBox="0 0 280 180" role="img"><g transform="translate(80,90)">';
    parts.forEach(function (p) {
      const frac = p.value / total;
      const dash = frac * c;
      html +=
        '<circle r="' +
        r +
        '" fill="none" stroke="' +
        (COLORS[p.label] || "#ccc") +
        '" stroke-width="22" stroke-dasharray="' +
        dash +
        " " +
        (c - dash) +
        '" stroke-dashoffset="' +
        -off +
        '" transform="rotate(-90)"><title>' +
        escapeHtml(p.label) +
        " · " +
        escapeHtml(moneyShort(p.value)) +
        "</title></circle>";
      off += dash;
    });
    html += '<text text-anchor="middle" y="-4" font-size="12" fill="#585858">ACV</text>';
    html +=
      '<text text-anchor="middle" y="14" font-size="16" font-weight="600" fill="#0d274d">' +
      escapeHtml(moneyShort(total)) +
      "</text></g>";
    let ly = 24;
    parts.forEach(function (p) {
      html +=
        '<rect x="168" y="' +
        (ly - 8) +
        '" width="8" height="8" fill="' +
        (COLORS[p.label] || "#ccc") +
        '"/>';
      html +=
        '<text x="182" y="' +
        ly +
        '" font-size="11" fill="#1a1a1a">' +
        escapeHtml(p.label) +
        " " +
        Math.round((p.value / total) * 100) +
        "%</text>";
      ly += 18;
    });
    html += "</svg>";
    el.innerHTML = html;
  }

  function legendHtml(keys) {
    const wrap = document.createElement("div");
    keys.forEach(function (k) {
      const span = document.createElement("span");
      const sw = document.createElement("span");
      sw.className = "swatch";
      sw.style.background = COLORS[k] || "#ccc";
      span.appendChild(sw);
      span.appendChild(document.createTextNode(k));
      wrap.appendChild(span);
    });
    return wrap;
  }

  global.RenewalCharts = {
    colors: COLORS,
    moneyShort: moneyShort,
    stackedHorizontal: stackedHorizontal,
    stackedVertical: stackedVertical,
    donut: donut,
    legendHtml: legendHtml,
  };
})(window);
