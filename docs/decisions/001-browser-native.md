# ADR-001 — Browser-native, no installs

**Status**: Accepted (2026-01)

## Context

Type design tools in 2026 split into two camps:

- **Desktop**: FontLab ($499 lifetime), Glyphs 3 ($300), RoboFont
  ($400). Professional-grade, deep, fast — and gated behind a price
  + macOS-only (Glyphs, RoboFont) or Windows-only-ish (FontLab) +
  multi-GB installer.
- **Browser**: Glyphr Studio, Fontra, typlr.app, FontStruct. Free,
  cross-platform, varying depth.

Patens targets the in-between: the designer who drew a logo and
wants a font from it, the student learning, the foundry sharing a
specimen with a client. For that audience, "install this 2GB tool
and pay for a license" is the wrong starting point.

We also need to credibly compete with Glyphr Studio + Fontra +
typlr.app in browser-tier capability, while differentiating on the
teaching-first audit-module angle.

## Decision

Patens is browser-native. Every project lives in the user's IndexedDB.
Nothing leaves their machine unless they choose to export
(.font.json / OTF / WOFF2 / TTF / UFO / bundle) or upload to the
optional cloud-share path.

No installs. No accounts. No required dependencies beyond a modern
browser.

## Consequences

**Positive**:
- Zero install friction. A type designer can click a link in a tweet
  and be drawing in 5 seconds.
- Cross-platform by construction. Linux + ChromeOS + iPad users get
  the same tool macOS users get.
- Offline support via Service Worker is achievable + already shipped.
- Privacy-by-default: no telemetry, no server-side rendering of the
  user's font, no third-party SDKs that can leak the design.
- Cheap to host: Vercel free tier + Vercel Blob covers the
  canonical deployment.

**Negative / constraint**:
- Performance constraints are tighter than desktop. The 5MB bundle
  budget, the WASM size budgets for Pyodide + HarfBuzz, the
  IndexedDB quotas — all real constraints we navigate around.
- Some operations are genuinely heavier in-browser than on-desktop
  (TTF + ttfautohint via Pyodide is a 7MB Pyodide cold-load + a
  multi-second autohint run; desktop tools do this natively in
  milliseconds).
- We can't do anything that requires native FS access without the
  user clicking through file pickers each time.
- The "save automatically to my Documents folder" desktop UX is
  not available.

**Commits us to**:
- No native installer (even via Electron / Tauri). If you want to
  install Patens, install a browser.
- No real-time multi-user collaboration (a server would change the
  shape). Single-designer-single-machine.
- No account system in the default deployment. Self-hosters can opt
  into OAuth via env vars; that's their call.
- "Keep it cheap" infra constraint. No paid third-party SDKs without
  a free fallback.

## Related

- ADR-002 (MIT license) — together these define the product shape.
- ADR-007 (storage namespace) — consequence of "everything lives in
  the user's browser."
