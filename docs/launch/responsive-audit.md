# Responsive audit — pre-launch findings

A code-level pass over the responsive surface, plus the
device-level test list that *requires* real iPhone + iPad
hardware (the part I can't do from here).

> **Posture.** Patens is a **desktop tool** — the editor needs a
> precise cursor, a real keyboard, and enough viewport to show
> the canvas + sidebars + toolbar. Mobile is a *marketing
> surface*: the home page, /learn, /about, /press, /privacy,
> /security, /press, /changelog, /compare must read well on a
> phone so that someone browsing on the train can decide to
> revisit on a laptop. The editor itself is graceful-degrade,
> not responsive.

---

## Findings I can confirm from code

### 1. ✅ Marketing pages are already responsive

Home (`/`), `/learn/**`, `/about`, `/compare`, `/press`,
`/privacy`, `/security`, `/changelog` all use the standard
`sm: md: lg: xl:` Tailwind breakpoint discipline. The
comparison table on `/compare` even has two presentations —
a wide 9-column table at `lg:` and a stacked card layout under.
That's the right pattern.

### 2. ⚠️ iOS Safari input auto-zoom risk (Input.svelte density `sm`)

`src/lib/ui/Input.svelte:17` renders the `sm` density input at
`text-[13px]`. iOS Safari **auto-zooms the viewport whenever a
text input under 16px is focused**, which on a phone produces
a jarring "the page just zoomed" interrupt. The 16px-or-larger
rule is well known but easy to miss.

The `lg` density is fine (`text-sm` → 14px in Tailwind v4 — still
below 16px). The `Field.svelte` helper text + label sizes (`13px`,
`12px`) are non-interactive so the zoom isn't triggered.

**Where it matters**: any phone-reachable form. Email signup
(none yet, but planned for Buttondown integration); the BYOK
Anthropic key entry (under `/project/[id]/ai`, editor surface —
desktop-only, low risk); the share-link delete-token entry
(under `/share/[id]`, mobile-reachable).

**Fix**: either bump the `sm` density to `text-[16px]` on mobile
specifically (`text-[16px] sm:text-[13px]`), or accept the zoom
on the editor-only surfaces and add the mobile-size override
only on inputs that are mobile-reachable. Surgical fix > global.

### 3. ⚠️ Hover-only "pin" button on project cards (touch fallback)

`src/routes/+page.svelte` — the per-card pin button uses
`opacity-0 group-hover:opacity-100`, so the affordance is
invisible until hover. On touch devices, hover is emulated by
first-tap-shows / second-tap-activates on iOS Safari and most
Android browsers — usable but not discoverable. A first-time
phone visitor wouldn't know the pin exists.

The pin is a low-stakes affordance (organising favorites is
something you'd do on a laptop anyway), but the better pattern
for the marketing-stage user is `opacity-60 sm:opacity-0
sm:group-hover:opacity-100` — visible on phone, hover-revealed
on desktop.

### 4. ✅ Tables that need horizontal scroll already have it

`/share` font preview, `/preview` font preview, `/export` CSS
snippet — all use `overflow-x-auto` on the `<pre>` wrapper. The
`<pre>` blocks under `/features` (OpenType feature examples)
don't, but `/features` is the editor surface (desktop-only).
Not a launch blocker.

### 5. ✅ Viewport meta tag is correct

`src/app.html:5`:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

No `maximum-scale=1` lock, no `user-scalable=no` — accessibility
is preserved.

### 6. 🚫 Editor has no mobile-gate

If a mobile user lands on `/project/demo/edit` (via a share link
in a tweet, say), they get the desktop editor crammed into a
375px viewport. Nothing tells them "this needs a desktop." The
toolbar overflows, the sidebars overlap the canvas, the
keyboard shortcuts don't fire.

This is the only **real launch risk** in this audit. Two
possible fixes:

- **Hard gate** (under 768px): show a centred page with "Patens
  needs a desktop or tablet — bookmark this and come back on a
  larger screen." Sends the visitor away with a positive
  takeaway instead of a frustrated one.
- **Soft banner** (under 1024px): dismissible strip at the top
  of the editor saying "Patens works best on a 1024px+ screen.
  Some controls may not fit." Lets the determined try it
  anyway.

**My recommendation**: soft banner. Better for accessibility
(low-vision users sometimes zoom their viewport down
effectively), better for tablet (iPads in landscape are
1024×768 — usable). The hard gate is patronising at the price
point of "free, open-source, MIT."

---

## What I cannot confirm without real devices

These are the items that need an actual iPhone + iPad in hand.
Run through them as the device tester; document anything that
breaks. The list is sorted by likelihood-of-breaking.

### iPhone (iOS Safari, current stable)

1. **Home page** — does the project list scroll naturally? Are
   the per-card touch targets at least 44×44? Does the
   create-project pill button respond to tap without delay?
2. **`/learn/first-font`** — is the long-form tutorial readable
   in portrait? Code blocks horizontally scrollable without
   forcing the whole page to scroll?
3. **`/compare`** — does the per-tool card layout under
   `lg:hidden` actually render? Check that all 8 tools appear
   in order.
4. **`/about`** — does the timeline section render? Does the
   stats grid wrap to a single column?
5. **`/press` factsheet** — does the inline screenshot scale to
   viewport? Do the brand-asset download links work?
6. **`/privacy` + `/security` + `/changelog`** — long-form
   readability, no horizontal scroll on the body.
7. **Footer** — does it wrap to a single column? Are the social
   icons tappable (44×44 minimum)?
8. **Share page (`/share/[id]`)** — if a Patens link is shared
   to a phone, does it render the font specimen? Does the
   glyph grid scroll?
9. **iOS Safari address bar collapse** — verify `100vh`-based
   layouts (we use `min-h-screen` in one place: error page,
   layout wrapper) don't break when the address bar collapses
   on scroll. iOS Safari sets viewport height including the
   address bar in some modes; modern fix is `100dvh` which
   Tailwind v4 supports.

### iPad (iPadOS Safari, current stable, both orientations)

1. **Portrait (820×1180 on iPad Air)** — does the editor at
   least render readably? Most controls visible? At this size
   it's between the "phone" and "laptop" experience.
2. **Landscape (1180×820)** — the editor should work
   reasonably here. Toolbar fits? Canvas + one sidebar
   visible?
3. **Touch on canvas** — does drawing with Apple Pencil work?
   `perfect-freehand` is the renderer, pressure-aware. Does
   the trace-to-Bézier path complete the same as on desktop?
4. **Sketchbook surface** — same as canvas. The DrawingCanvas
   should accept touch input identically to mouse.
5. **Apple Pencil hover** (iPadOS 16+) — does the cursor track
   ahead of the pencil without contact? Bonus, not required.
6. **Multitasking split view** — half-width iPad gives you a
   ~600px viewport. Does the editor degrade gracefully or hard-
   break?

### Cross-device

- **First-paint timing** — record cold-load on iPhone over LTE.
  Lighthouse Mobile from a real device > Lighthouse on
  desktop-emulated-mobile.
- **Touch-target audit** — open in iOS Safari developer →
  Inspect → Audit → Accessibility. Should report 0 touch
  targets under 44×44 on marketing pages.
- **Rotation** — every marketing page should re-layout when the
  device rotates without breaking. The two `min-h-screen`
  layouts are the candidates to break here.

---

## Recommended fix order (if anything's found)

1. **Editor mobile-gate** (1h) — even if device testing says
   "nothing else is broken," a mobile user landing on the
   editor needs the soft banner. This is the only finding
   above that *guarantees* a bad first impression.
2. **Input zoom** (30m) — only if device testing confirms the
   zoom is annoying on the actually-mobile-reachable forms
   (BYOK key entry on the editor surface is rare; the delete-
   token entry on /share is the main risk).
3. **Pin-button visibility** (15m) — `opacity-60 sm:opacity-0`
   pattern on mobile so the pin affordance is discoverable.
4. Anything device testing surfaces in the lists above.

---

## What I'm explicitly *not* recommending

- **Making the editor truly responsive.** Multi-day work. Wrong
  audience. The editor is desktop-or-better by design —
  acknowledge that in the mobile-gate copy and move on.
- **A mobile-only marketing site.** The same pages work for
  both audiences when the responsive discipline is in place.
- **A native iOS / iPadOS wrapper.** Way out of scope until
  there's traction. Tag for `v3+` if ever.

---

## Sign-off criteria

Patens is "responsive-ready for launch" when:

- [ ] All marketing pages (`/`, `/learn/**`, `/about`, `/compare`, `/press`, `/privacy`, `/security`, `/changelog`, `/share/[id]` read-only) tested on iPhone 14+ (iOS Safari current stable).
- [ ] Same set tested on iPad Air (iPadOS current, both orientations).
- [ ] iPad landscape can at least *load* the editor — toolbar, canvas, sidebar visible. Not "fully usable," but "doesn't hard-crash."
- [ ] iPhone hitting the editor URL sees the mobile-gate banner.
- [ ] Lighthouse Mobile on home + /learn/first-font scores ≥85 Perf, ≥95 A11y on a real device (not emulated).
- [ ] Bug-list of device-specific findings is empty or down to "not launch-blocking."
