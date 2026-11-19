(function () {
  "use strict";

  const book = window.RenewalBook;
  const charts = window.RenewalCharts;
  let rows = book.rows.slice();
  let usingImport = false;
  let sortKey = "daysToExpire";
  let sortDir = 1;
  let productTab = "All";

  const $ = function (id) {
    return document.getElementById(id);
  };

  function money(n) {
    return "$" + Math.round(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  }

  function pct(n) {
    return (n * 100).toFixed(0) + "%";
  }

  function agingBucket(days) {
    if (days < 0) return "Expired";
    if (days <= 30) return "0–30d";
    if (days <= 60) return "31–60d";
    if (days <= 90) return "61–90d";
    if (days <= 180) return "91–180d";
    return "180d+";
  }

  function quarter(endDate) {
    const d = new Date(endDate + "T00:00:00");
    const y = d.getUTCFullYear();
    const q = Math.floor(d.getUTCMonth() / 3) + 1;
    return "CY" + String(y).slice(2) + " Q" + q;
  }

  function normalizeProduct(raw) {
    const p = String(raw || "").trim();
    if (book.products.indexOf(p) !== -1) return p;
    const s = p.toLowerCase();
    if (/\bxdr\b/.test(s) || s.indexOf("extended") !== -1) return "XDR";
    if (
      /\betd\b/.test(s) ||
      s.indexOf("email") !== -1 ||
      s.indexOf("threat defen") !== -1 ||
      /\bces\b/.test(s) ||
      /\besa\b/.test(s)
    ) {
      return "ETD";
    }
    return "Secure Endpoint";
  }

  function currentFilters() {
    return {
      product: productTab,
      theater: $("f-theater").value,
      segment: $("f-segment").value,
      status: $("f-status").value,
      aging: $("f-aging").value,
      search: $("f-search").value.trim().toLowerCase(),
    };
  }

  function applyFilters(ignoreProductTab) {
    const f = currentFilters();
    return rows.filter(function (r) {
      if (!ignoreProductTab && f.product !== "All" && r.product !== f.product) return false;
      if (f.theater !== "All" && r.theater !== f.theater) return false;
      if (f.segment !== "All" && r.segment !== f.segment) return false;
      if (f.status !== "All" && r.status !== f.status) return false;
      if (f.aging !== "All" && agingBucket(r.daysToExpire) !== f.aging) return false;
      if (f.search) {
        const blob = (r.customer + " " + r.id + " " + r.owner + " " + r.skuFamily).toLowerCase();
        if (blob.indexOf(f.search) === -1) return false;
      }
      return true;
    });
  }

  function sum(list, key) {
    return list.reduce(function (s, r) {
      return s + (r[key] || 0);
    }, 0);
  }

  function groupAcv(list, keyFn, series) {
    const map = {};
    list.forEach(function (r) {
      const k = keyFn(r);
      if (!map[k]) {
        map[k] = { label: k, values: {} };
        series.forEach(function (st) {
          map[k].values[st] = 0;
        });
      }
      map[k].values[r.status] = (map[k].values[r.status] || 0) + r.acv;
    });
    return Object.keys(map).map(function (k) {
      return map[k];
    });
  }

  function metrics(list) {
    const total = sum(list, "acv");
    const renewed = sum(
      list.filter(function (r) {
        return r.status === "Renewed";
      }),
      "acv"
    );
    const committed = sum(
      list.filter(function (r) {
        return r.status === "Committed";
      }),
      "acv"
    );
    const open = sum(
      list.filter(function (r) {
        return ["Quoted", "In negotiation", "Not started"].indexOf(r.status) !== -1;
      }),
      "acv"
    );
    const risk = sum(
      list.filter(function (r) {
        return r.status === "At risk";
      }),
      "acv"
    );
    const lapsed = sum(
      list.filter(function (r) {
        return r.status === "Lapsed";
      }),
      "acv"
    );
    return {
      n: list.length,
      total: total,
      renewed: renewed,
      committed: committed,
      won: renewed + committed,
      open: open,
      risk: risk,
      lapsed: lapsed,
      rate: total ? renewed / total : 0,
    };
  }

  function renderKpis(list) {
    const m = metrics(list);
    $("k-total").textContent = money(m.total);
    $("k-total-n").textContent = m.n + " subscriptions";
    $("k-won").textContent = money(m.won);
    $("k-won-h").textContent = m.total ? pct(m.won / m.total) + " of book" : "—";
    $("k-open").textContent = money(m.open);
    $("k-open-h").textContent = m.total ? pct(m.open / m.total) + " still live" : "—";
    $("k-risk").textContent = money(m.risk);
    $("k-risk-h").textContent =
      list.filter(function (r) {
        return r.status === "At risk";
      }).length + " deals";
    $("k-lapsed").textContent = money(m.lapsed);
    $("k-rate").textContent = m.total ? pct(m.rate) : "—";
    $("k-rate-h").textContent = "closed renewed (ex-committed)";
  }

  function renderCharts(list) {
    const series = book.statuses;
    const legendQ = $("legend-q");
    const legendT = $("legend-t");
    legendQ.textContent = "";
    legendT.textContent = "";
    legendQ.appendChild(charts.legendHtml(series));
    legendT.appendChild(charts.legendHtml(series));

    const qOrder = [];
    const qSeen = {};
    list
      .slice()
      .sort(function (a, b) {
        return a.endDate.localeCompare(b.endDate);
      })
      .forEach(function (r) {
        const q = quarter(r.endDate);
        if (!qSeen[q]) {
          qSeen[q] = true;
          qOrder.push(q);
        }
      });
    const qGroups = groupAcv(
      list,
      function (r) {
        return quarter(r.endDate);
      },
      series
    );
    qGroups.sort(function (a, b) {
      return qOrder.indexOf(a.label) - qOrder.indexOf(b.label);
    });
    charts.stackedVertical($("chart-quarter"), series, qGroups);

    const tGroups = groupAcv(
      list,
      function (r) {
        return r.theater;
      },
      series
    );
    tGroups.sort(function (a, b) {
      return book.theaters.indexOf(a.label) - book.theaters.indexOf(b.label);
    });
    charts.stackedHorizontal($("chart-theater"), series, tGroups);

    const parts = series
      .map(function (st) {
        return {
          label: st,
          value: sum(
            list.filter(function (r) {
              return r.status === st;
            }),
            "acv"
          ),
        };
      })
      .filter(function (p) {
        return p.value > 0;
      });
    charts.donut($("chart-status"), parts);
  }

  function mixBar(m) {
    const wrap = document.createElement("div");
    wrap.className = "mix";
    const parts = [
      ["Renewed", m.renewed],
      ["Committed", m.committed],
      ["Quoted", m.open],
      ["At risk", m.risk],
      ["Lapsed", m.lapsed],
    ];
    const total = m.total || 1;
    parts.forEach(function (p) {
      if (!p[1]) return;
      const span = document.createElement("span");
      span.style.width = (p[1] / total) * 100 + "%";
      span.style.background = charts.colors[p[0]] || "#ccc";
      span.title = p[0] + " " + money(p[1]);
      wrap.appendChild(span);
    });
    return wrap;
  }

  function addCells(tr, values, numericIdx) {
    values.forEach(function (val, i) {
      const td = document.createElement("td");
      if (numericIdx.indexOf(i) !== -1) td.className = "num";
      if (val instanceof Node) td.appendChild(val);
      else td.textContent = val;
      tr.appendChild(td);
    });
  }

  function renderProducts() {
    const list = applyFilters(true);
    const body = $("tbody-products");
    body.textContent = "";
    const totals = metrics(list);
    book.products.forEach(function (product) {
      const subset = list.filter(function (r) {
        return r.product === product;
      });
      const m = metrics(subset);
      const tr = document.createElement("tr");
      if (productTab === product) tr.className = "selected";
      addCells(
        tr,
        [
          product,
          String(m.n),
          money(m.total),
          money(m.won),
          money(m.open),
          money(m.risk),
          money(m.lapsed),
          m.total ? pct(m.rate) : "—",
          mixBar(m),
        ],
        [1, 2, 3, 4, 5, 6, 7]
      );
      body.appendChild(tr);
    });
    const totalRow = document.createElement("tr");
    totalRow.className = "total";
    addCells(
      totalRow,
      [
        "All three offers",
        String(totals.n),
        money(totals.total),
        money(totals.won),
        money(totals.open),
        money(totals.risk),
        money(totals.lapsed),
        totals.total ? pct(totals.rate) : "—",
        mixBar(totals),
      ],
      [1, 2, 3, 4, 5, 6, 7]
    );
    body.appendChild(totalRow);
  }

  function renderTable(list) {
    const sorted = list.slice().sort(function (a, b) {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * sortDir;
      return String(av).localeCompare(String(bv)) * sortDir;
    });
    const body = $("tbody");
    body.textContent = "";
    const frag = document.createDocumentFragment();
    sorted.forEach(function (r) {
      const tr = document.createElement("tr");
      const pillClass = "pill st-" + String(r.status).replace(/\s+/g, "-");
      const cells = [
        r.customer,
        r.product,
        r.skuFamily,
        r.id,
        r.endDate,
        String(r.daysToExpire),
        money(r.acv),
        String(r.seats),
        r.status,
        r.autoRenew ? "Yes" : "No",
        r.theater,
        r.area,
        r.segment,
        r.owner,
        r.quoteId || "—",
      ];
      cells.forEach(function (val, i) {
        const td = document.createElement("td");
        if (i === 5 || i === 6 || i === 7) td.className = "num";
        if (i === 8) {
          const span = document.createElement("span");
          span.className = pillClass;
          span.textContent = val;
          td.appendChild(span);
        } else {
          td.textContent = val;
        }
        tr.appendChild(td);
      });
      frag.appendChild(tr);
    });
    body.appendChild(frag);
    $("table-count").textContent = sorted.length + " rows";
  }

  function render() {
    const list = applyFilters(false);
    renderKpis(list);
    renderCharts(list);
    renderProducts();
    renderTable(list);
  }

  function fillSelect(id, values) {
    const el = $(id);
    values.forEach(function (v) {
      const o = document.createElement("option");
      o.value = v;
      o.textContent = v;
      el.appendChild(o);
    });
  }

  function parseCsv(text) {
    const lines = text.replace(/\r/g, "").split("\n").filter(function (l) {
      return l.trim();
    });
    if (!lines.length) throw new Error("Empty file");
    const headers = splitCsvLine(lines[0]).map(function (h) {
      return h.trim().toLowerCase();
    });
    const idx = function (names) {
      for (let i = 0; i < names.length; i++) {
        const n = headers.indexOf(names[i]);
        if (n !== -1) return n;
      }
      return -1;
    };
    const map = {
      customer: idx(["customer", "customer_name", "account"]),
      product: idx(["product", "offer"]),
      skuFamily: idx(["sku_family", "sku", "pid"]),
      id: idx(["subscription_id", "sub_id", "id"]),
      endDate: idx(["end_date", "expiration", "enddate"]),
      acv: idx(["acv", "arr", "renewal_acv"]),
      seats: idx(["seats", "quantity"]),
      status: idx(["status", "renewal_status"]),
      autoRenew: idx(["auto_renew", "autorenew"]),
      theater: idx(["theater", "theatre"]),
      area: idx(["area", "geo", "region"]),
      segment: idx(["segment"]),
      owner: idx(["owner", "renewal_owner", "am"]),
      quoteId: idx(["quote_id", "quote"]),
      crPartyId: idx(["cr_party_id", "crid"]),
    };
    if (map.customer < 0 || map.acv < 0 || map.endDate < 0) {
      throw new Error("CSV needs at least customer, end_date, and acv columns");
    }
    const allowedStatus = book.statuses;
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = splitCsvLine(lines[i]);
      const cell = function (k, fallback) {
        const n = map[k];
        if (n < 0) return fallback;
        return (cols[n] || "").trim() || fallback;
      };
      const endDate = cell("endDate", book.asOf);
      const acv = Number(String(cell("acv", "0")).replace(/[$,]/g, "")) || 0;
      const days = Math.round((Date.parse(endDate) - Date.parse(book.asOf)) / 86400000);
      let status = cell("status", "Not started");
      if (allowedStatus.indexOf(status) === -1) status = "Not started";
      out.push({
        id: cell("id", "SUB-IMP-" + i),
        crPartyId: cell("crPartyId", ""),
        customer: cell("customer", "Unknown"),
        product: normalizeProduct(cell("product", "Secure Endpoint")),
        skuFamily: cell("skuFamily", ""),
        seats: Number(cell("seats", "0")) || 0,
        endDate: endDate,
        daysToExpire: isNaN(days) ? 0 : days,
        acv: acv,
        status: status,
        autoRenew: /^(y|yes|true|1)$/i.test(cell("autoRenew", "no")),
        theater: cell("theater", "AMER"),
        area: cell("area", ""),
        segment: cell("segment", "Enterprise"),
        owner: cell("owner", ""),
        quoteId: cell("quoteId", ""),
      });
    }
    return out;
  }

  function splitCsvLine(line) {
    const out = [];
    let cur = "";
    let q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) {
        if (ch === '"' && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else if (ch === '"') {
          q = false;
        } else {
          cur += ch;
        }
      } else if (ch === '"') {
        q = true;
      } else if (ch === ",") {
        out.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur);
    return out;
  }

  function exportCsv(list) {
    const headers = [
      "customer",
      "product",
      "sku_family",
      "subscription_id",
      "end_date",
      "days_to_expire",
      "acv",
      "seats",
      "status",
      "auto_renew",
      "theater",
      "area",
      "segment",
      "owner",
      "quote_id",
    ];
    const lines = [headers.join(",")];
    list.forEach(function (r) {
      const vals = [
        r.customer,
        r.product,
        r.skuFamily,
        r.id,
        r.endDate,
        r.daysToExpire,
        r.acv,
        r.seats,
        r.status,
        r.autoRenew ? "Yes" : "No",
        r.theater,
        r.area,
        r.segment,
        r.owner,
        r.quoteId,
      ].map(function (v) {
        const s = String(v == null ? "" : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      });
      lines.push(vals.join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "xdr-etd-endpoint-renewal-book.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function setSourceLabel() {
    $("source-label").textContent = usingImport
      ? "Imported CSV (replaces sample book for this session)"
      : book.sourceLabel;
  }

  document.querySelectorAll(".tabs button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tabs button").forEach(function (b) {
        b.classList.remove("active");
      });
      btn.classList.add("active");
      productTab = btn.getAttribute("data-product");
      render();
    });
  });

  ["f-theater", "f-segment", "f-status", "f-aging", "f-search"].forEach(function (id) {
    $(id).addEventListener("input", render);
    $(id).addEventListener("change", render);
  });

  $("btn-reset").addEventListener("click", function () {
    $("f-theater").value = "All";
    $("f-segment").value = "All";
    $("f-status").value = "All";
    $("f-aging").value = "All";
    $("f-search").value = "";
    render();
  });

  $("btn-export").addEventListener("click", function () {
    exportCsv(applyFilters(false));
  });

  $("f-csv").addEventListener("change", function (ev) {
    const file = ev.target.files && ev.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function () {
      try {
        rows = parseCsv(String(reader.result));
        usingImport = true;
        $("csv-name").textContent = file.name + " (" + rows.length + " rows)";
        setSourceLabel();
        render();
      } catch (err) {
        $("csv-name").textContent = String(err.message || err);
      }
    };
    reader.readAsText(file);
  });

  document.querySelectorAll("th[data-key]").forEach(function (th) {
    th.addEventListener("click", function () {
      const key = th.getAttribute("data-key");
      if (sortKey === key) sortDir *= -1;
      else {
        sortKey = key;
        sortDir = 1;
      }
      document.querySelectorAll("th[data-key]").forEach(function (h) {
        h.classList.toggle("sorted", h.getAttribute("data-key") === sortKey);
      });
      render();
    });
  });

  $("as-of").textContent = book.asOf;
  setSourceLabel();
  fillSelect("f-theater", book.theaters);
  fillSelect("f-segment", book.segments);
  fillSelect("f-status", book.statuses);
  render();
})();
