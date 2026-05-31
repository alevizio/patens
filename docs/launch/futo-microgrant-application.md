# FUTO Microgrants — Application Copy

**Program:** [FUTO Microgrants](https://futo.tech/grants)
**Target ask:** $5,000 (top of the $1K–$5K microgrant range)
**Deadline:** Rolling
**Maintainer:** Alejandro Vizio · `hi@patens.design`

Drop-in copy for the FUTO microgrant form. Short by design — FUTO rewards small, authentic, early-stage OSS, not VC-positioned startups. The pitch leads with what Patens *refuses to do*.

---

## Pitch (≈250 words)

Patens is a browser-native, MIT-licensed type design editor. Every project lives in the browser's IndexedDB on the user's own machine; nothing leaves unless the user explicitly chooses to export an OTF. There is no telemetry. No analytics SDK. No tracking cookies. No account is required to open the app, draw a glyph, run the 97-code audit module, or ship an OpenType file.

It exists because the working tools of type design are gated. FontLab is $499 with an Autodesk-style annual subscription model. Glyphs is $300, macOS-only, with paid major upgrades. RoboFont is $400, macOS-only. A design student on a Chromebook, a Linux desktop, or a hand-me-down Windows laptop has no path into the craft today. Patens runs in any modern browser and will never paywall. That commitment is written into `DESIGN_PHILOSOPHY.md` in the repo, not just on a marketing page.

The AI features (audit explanations, kerning suggestions, consistency checks) are BYOK — users supply their own Anthropic API key. Patens does not broker, does not see, does not store, and does not monetize anyone's AI usage. The proxy forwards the user's key verbatim and discards it on response. There is no shared-key surface that mines users for behavior data, no "free tier" that's actually a data-collection funnel.

Solo-maintained. MIT-licensed. Shipping toward public launch at TypeCon Portland, August 6–8, 2026.

---

## What we'd use the $5K for

One month of full-time runway (currently nights + weekends) to close two audit-flagged TODOs and ship the launch:

| Line | Estimate | What it buys |
|---|---|---|
| **Full-time month** | ~$3,500 | Land the bespoke Cyrillic shapes (Я, Ж, Ф) and complete Greek lowercase coverage — both currently audit-flagged TODOs in the demo project. These are the two script gaps that block the foundry-grade "ships a usable multi-script demo OTF" launch story. |
| **TypeCon Portland (Aug 6–8, 2026)** | ~$900 | Conference pass + transit. Patens launches there; the maintainer has to be in the room. |
| **Foundry-grade demo recording** | ~$500 | Camera + mic + editing time for a 30-second Show HN launch-day video. The current README placeholder (`docs/launch/demo-gif-storyboard.md`) is a storyboard; the real recording needs gear that doesn't currently exist. |
| **Domain + Vercel Pro (6 mo)** | ~$120 | `patens.design` renewal + Vercel Pro tier through the launch-traffic ramp. Vercel OSS credits cover most of the year but Pro features (longer function timeouts for the Pyodide TTF export path) sit outside the OSS allowance. |
| **Total** | **~$5,020** | |

The rounding is honest: about five thousand dollars, mostly the month of focused work.

---

## Why Patens fits FUTO's mission

- **Anti-platform-lock-in.** Patens runs in any modern browser — Chrome, Firefox, Safari, Brave, Arc, Vivaldi, Edge, Chromium on a Raspberry Pi. Glyphs is macOS-only. RoboFont is macOS-only. FontLab is macOS+Windows-only. A student on a Chromebook or a Linux desktop has *no path* to type design today. Patens changes that. The PWA installs offline; the editor works without an internet connection once the static bundle is cached. No app store, no installer, no platform gatekeeper between a person and the craft.
- **Anti-surveillance by design.** Every project lives in IndexedDB on the user's own machine. The marketing surface (`patens.design`) ships no analytics SDK — no Google Analytics, no Plausible, no Vercel Analytics, no PostHog, no Sentry. The Anthropic proxy is a thin pass-through: it forwards the user's API key verbatim to Anthropic and discards it on response. Patens never sees, stores, logs, or monetizes user AI usage. There is no "free tier" that's actually a data-collection funnel. The MIT license + the `DESIGN_PHILOSOPHY.md` no-paywall commitment together mean the project cannot pivot into one later without forking against its own published values.

---

## Maintainer

**Alejandro Vizio** — solo maintainer, product designer who programs. Patens is the whole show: the repo, the marketing surface, the 97-code audit module, the OG card renderer, the test suite (722 unit + 66 e2e + axe-core a11y across 31 routes), the CLI, and the launch plan are all one person's work, by intention.

Currently building Patens toward the public launch at **TypeCon Portland, August 6–8, 2026**.

- Email: `hi@patens.design`
- GitHub: [github.com/alevizio](https://github.com/alevizio)
- Bluesky: [@patens.design](https://bsky.app/profile/patens.design)
- X: [@patenstype](https://x.com/patenstype)

---

## Links to send the reviewer

- **Marketing site:** [patens.design](https://patens.design)
- **Repo:** [github.com/alevizio/patens](https://github.com/alevizio/patens)
- **License:** [MIT](https://github.com/alevizio/patens/blob/main/LICENSE)
- **Changelog:** [patens.design/changelog](https://patens.design/changelog) · [RSS](https://patens.design/changelog/rss.xml)
- **Security policy:** [`SECURITY.md`](https://github.com/alevizio/patens/blob/main/SECURITY.md) — disclosure to `security@patens.design`
- **The 97-code audit module:** [patens.design/audit](https://patens.design/audit)
- **Comparison vs the proprietary field:** [patens.design/compare](https://patens.design/compare)

---

## After submission

- Save the submission reference ID + timestamp in this file.
- Expected response window: **2–4 weeks** (FUTO microgrants are fast by program design).
- If accepted: the $5K covers the bespoke Cyrillic + Greek lowercase work pre-launch — that's the strongest possible narrative for the Show HN post ("the demo OTF actually sets a Bulgarian legal footer because a FUTO microgrant paid for the month it took to draw Я, Ж, Ф and the Greek lowercase").
- If declined: ask for a one-line reason if possible; FUTO has historically been candid. Re-evaluate after launch with traction data if the gap was "too early."
