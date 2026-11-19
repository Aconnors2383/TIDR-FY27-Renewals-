# XDR, ETD & Secure Endpoint Renewal Status

Static replica of the Foundry De-Risk 2026 **Secure Access Renewal Status** report, recast for:

- Cisco XDR
- Cisco ETD (Email Threat Detection / Defense)
- Cisco Secure Endpoint

The original report is served from Cisco Foundry at
`http://foundry.ai.ciscolabs.com:30955/reports/security/derisk-2026/Secure Access Renewal Status.html`.
That host is not reachable from the environment that built this page, so the UI ships with a
**labeled sample book**. Load a CSV from Foundry, CCW, or sales ops to replace it for the session.

## Run locally

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/`.

## CSV columns

`customer`, `end_date`, `acv` are required. Optional: `product`, `sku_family`, `subscription_id`,
`seats`, `status`, `auto_renew`, `theater`, `area`, `segment`, `owner`, `quote_id`, `cr_party_id`.

Product strings containing `xdr` / `extended` map to **XDR**; `etd`, `email`, `ces`, or `esa` map
to **ETD**; everything else maps to **Secure Endpoint**.
