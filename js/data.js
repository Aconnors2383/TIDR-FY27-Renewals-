/**
 * Sample renewal book for XDR, ETD, and Secure Endpoint.
 * Numbers are deterministic sample data for layout/demo only.
 * Replace RENEWAL_ROWS via CSV import or by swapping this module.
 */
(function (global) {
  "use strict";

  const AS_OF = "2026-11-19";
  const XDR = "XDR";
  const ETD = "ETD";
  const EP = "Secure Endpoint";
  const PRODUCTS = [XDR, ETD, EP];
  const THEATERS = ["AMER", "EMEA", "APJC"];
  const SEGMENTS = ["Enterprise", "Commercial", "Public Sector"];
  const STATUSES = [
    "Renewed",
    "Committed",
    "Quoted",
    "In negotiation",
    "Not started",
    "At risk",
    "Lapsed",
  ];

  const SKUS = {
    XDR: [
      { family: "XDR-ADVANTAGE", seats: [500, 2500, 10000] },
      { family: "XDR-ESSENTIALS", seats: [300, 1200, 4000] },
      { family: "XDR-PREMIER", seats: [1000, 5000, 20000] },
    ],
    ETD: [
      { family: "ETD-ADVANTAGE", seats: [250, 2000, 15000] },
      { family: "CES-CLOUD-SUB", seats: [500, 3000, 12000] },
      { family: "EMAIL-THREAT-DEF", seats: [200, 1500, 8000] },
    ],
    "Secure Endpoint": [
      { family: "SECURE-ENDPOINT-ADV", seats: [500, 2000, 8000, 25000] },
      { family: "SECURE-ENDPOINT-ESS", seats: [250, 1000, 5000] },
      { family: "AMP-BASE-SUB", seats: [200, 1500, 4000] },
    ],
  };

  const CUSTOMERS = [
    "Northwind Health System",
    "Blue Harbor Bank",
    "Cedar & Pine Manufacturing",
    "Helios Energy Cooperative",
    "Lumen Civic University",
    "Atlas Freight Lines",
    "Silverline Insurance",
    "Meridian City Council",
    "Oakridge Retail Group",
    "Pacific Grid Operators",
    "Summit County Schools",
    "Vesper Pharmaceuticals",
    "Ironclad Logistics",
    "Harborview Media",
    "Redwood Credit Union",
    "Kite & Anchor Shipping",
    "Aurora Municipal Power",
    "Brightpath Hospitals",
    "Stonegate Automotive",
    "Nimbus Software Ltd",
    "Faraday Industrial",
    "Willowbrook District",
    "Cinder Peak Mining",
    "Lakeside Telecom",
    "Pioneer Agritech",
    "Solstice Airlines",
    "Granite State Labs",
    "Horizon Water Authority",
    "Maplewood Clinics",
    "Beacon Port Authority",
  ];

  const OWNERS = [
    "A. Patel",
    "M. Chen",
    "J. Alvarez",
    "S. Okonkwo",
    "L. Bergstrom",
    "R. Nakamura",
    "C. Dubois",
    "K. Singh",
    "T. Rossi",
    "H. Walsh",
  ];

  const AREAS = {
    AMER: ["US West", "US East", "US Central", "Canada", "LATAM"],
    EMEA: ["UKI", "DACH", "Southern Europe", "Nordics", "MEA"],
    APJC: ["Japan", "ANZ", "ASEAN", "India", "Greater China"],
  };

  function mulberry32(a) {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(rng, list) {
    return list[Math.floor(rng() * list.length)];
  }

  function money(rng, low, high) {
    const n = low + rng() * (high - low);
    return Math.round(n / 1000) * 1000;
  }

  function isoDate(year, month, day) {
    const m = String(month).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    return year + "-" + m + "-" + d;
  }

  function daysBetween(a, b) {
    const ms = Date.parse(b) - Date.parse(a);
    return Math.round(ms / 86400000);
  }

  function statusFor(rng, endDate) {
    const days = daysBetween(AS_OF, endDate);
    const roll = rng();
    if (days < -14) return roll < 0.55 ? "Lapsed" : "Renewed";
    if (days < 0) return roll < 0.4 ? "Lapsed" : roll < 0.75 ? "Quoted" : "At risk";
    if (days <= 30) {
      if (roll < 0.22) return "Renewed";
      if (roll < 0.4) return "Committed";
      if (roll < 0.62) return "Quoted";
      if (roll < 0.8) return "In negotiation";
      return "At risk";
    }
    if (days <= 90) {
      if (roll < 0.18) return "Renewed";
      if (roll < 0.38) return "Committed";
      if (roll < 0.62) return "Quoted";
      if (roll < 0.82) return "In negotiation";
      if (roll < 0.92) return "Not started";
      return "At risk";
    }
    if (roll < 0.12) return "Renewed";
    if (roll < 0.28) return "Committed";
    if (roll < 0.48) return "Quoted";
    if (roll < 0.62) return "In negotiation";
    if (roll < 0.9) return "Not started";
    return "At risk";
  }

  function acvRange(product) {
    if (product === XDR) return [48000, 920000];
    if (product === ETD) return [48000, 680000];
    return [48000, 620000];
  }

  function buildRows() {
    const rng = mulberry32(20261119);
    const rows = [];
    let id = 1000;
    CUSTOMERS.forEach(function (customer, idx) {
      const theater = THEATERS[idx % 3];
      const segment = SEGMENTS[Math.floor(idx / 2) % 3];
      const productCount = 1 + Math.floor(rng() * 3);
      const used = {};
      for (let p = 0; p < productCount; p++) {
        let product = pick(rng, PRODUCTS);
        if (used[product]) product = PRODUCTS[(PRODUCTS.indexOf(product) + 1) % 3];
        used[product] = true;
        const sku = pick(rng, SKUS[product]);
        const seats = pick(rng, sku.seats);
        const year = rng() < 0.72 ? 2026 : rng() < 0.55 ? 2027 : 2025;
        const month = 1 + Math.floor(rng() * 12);
        const day = 1 + Math.floor(rng() * 27);
        const endDate = isoDate(year, month, day);
        const range = acvRange(product);
        const acv = money(rng, range[0], range[1]);
        const status = statusFor(rng, endDate);
        const autoRenew = rng() < 0.34 && status !== "Lapsed";
        rows.push({
          id: "SUB-" + id++,
          crPartyId: "CR" + String(800000 + idx * 17).padStart(8, "0"),
          customer: customer,
          product: product,
          skuFamily: sku.family,
          seats: seats,
          endDate: endDate,
          daysToExpire: daysBetween(AS_OF, endDate),
          acv: acv,
          status: status,
          autoRenew: autoRenew,
          theater: theater,
          area: pick(rng, AREAS[theater]),
          segment: segment,
          owner: pick(rng, OWNERS),
          quoteId: status === "Quoted" || status === "Committed" ? "Q-" + (44000 + id) : "",
        });
      }
    });
    return rows.sort(function (a, b) {
      return a.daysToExpire - b.daysToExpire;
    });
  }

  global.RenewalBook = {
    asOf: AS_OF,
    sourceLabel: "Sample book (Foundry source not reachable from this environment)",
    products: PRODUCTS,
    theaters: THEATERS,
    segments: SEGMENTS,
    statuses: STATUSES,
    rows: buildRows(),
  };
})(window);
