# Font Licensing Deep Dive — Building Patens's License Picker

> Research basis for the Patens license-picker UI. Patens itself is MIT-licensed code; this document is about the licenses **designers attach to the fonts they create** with it. Audience: implementation, not lawyers.
>
> **Last reviewed:** May 2026 · **OFL version covered:** 1.1 (26 Feb 2007) · **OFL-FAQ version:** 1.1-update7 (Nov 2023, latest released)

---

## TL;DR for the product team

1. **Default the picker to OFL 1.1 with *no* Reserved Font Name.** That matches Google Fonts' current preferred submission policy and removes the single most-misunderstood landmine in open-font licensing. (confirmed — Google Fonts docs)
2. **Offer four presets**, in this order on the UI: *Google Fonts–ready* (OFL, no RFN), *Foundry release* (OFL, with RFN), *Public domain* (CC0), *Commercial / paid* (custom EULA stub). Anything else is an "Advanced" disclosure.
3. **Auto-fill `name` table IDs 0, 13, 14** (and optionally 7) from the picker. Most beginner mistakes happen because designers forget these fields exist — Patens should treat them as required UI, not an afterthought.
4. **Mark AI-generated derivatives explicitly as a "still-evolving area"** in the help copy. The OFL-FAQ 1.25 (Nov 2023) says output from systems trained on OFL fonts is a derivative work, but enforcement is untested. Flag it; don't pretend it's settled. (confirmed — OFL-FAQ 1.25; uncertain — case law)
5. **Validate against Fontbakery rules** before export. Most Google Fonts submission rejections are caught by a small set of name-table / OFL.txt checks; running them locally saves designers a round-trip.

---

## Part 1 — The OFL itself

### 1.1 Versions

- **OFL 1.0** — released 22 November 2005. Defined the basic copyleft-for-fonts model. The big quirk: under 1.0 the font name effectively *was* reserved by default, because "Reserved Font Name" referred to "the Font Software name as seen by users." This caused practical chaos when third parties wanted to subset or rebuild. (confirmed — SIL release notes, Linux.com 2007)
- **OFL 1.1** — released 26 February 2007. **Current version. Unchanged since.** Three operational changes from 1.0:
  1. RFNs are now **opt-in and explicitly listed** after the copyright statement. No names are reserved by default.
  2. Definition of "Font Software" tightened to "the set of files released by the Copyright Holder(s) under this license and clearly marked as such."
  3. Added the document-doesn't-need-to-be-OFL clarification: *"The requirement for fonts to remain under this license does not apply to any document created using the fonts or their derivatives."*

The OFL is OSI-approved (2007), FSF Free-Software-compatible, and SPDX ID `OFL-1.1`. (confirmed — opensource.org, spdx.org)

### 1.2 Clause-by-clause

The license has five numbered permission/condition clauses plus PREAMBLE, DEFINITIONS, TERMINATION, DISCLAIMER. Plain-English summary:

| # | Clause | What it actually means for a designer |
|---|---|---|
| **1** | Neither the Font Software nor any of its individual components, in Original or Modified Versions, may be sold by itself. | You can't put `MyFont.otf` on Gumroad as a standalone product. You **can** bundle it with software (an app, a template kit, a tutorial) and charge for that. |
| **2** | Original or Modified Versions may be bundled, redistributed and/or sold with any software, provided each copy contains the above copyright notice and this license. | The OFL.txt must travel with the font. Inside an app binary counts. |
| **3** | No Modified Version may use the Reserved Font Name(s) unless explicit written permission is granted by the corresponding Copyright Holder. | If you reserved "Plex", nobody can ship a modified Plex called "Plex". They must rename. |
| **4** | The name(s) of the Copyright Holder(s) or the Author(s) of the Font Software shall not be used to promote, endorse or advertise any Modified Version, except to acknowledge the contribution(s) of the Copyright Holder(s) and the Author(s) or with their explicit written permission. | A fork can credit "Originally based on Plex by IBM" but cannot market itself as "Plex Pro by Acme — endorsed by IBM." |
| **5** | The Font Software, modified or unmodified, in part or in whole, must be distributed entirely under this license, and must not be distributed under any other license. The requirement for fonts to remain under this license does not apply to any document created using the fonts or their derivatives. | **This is the copyleft.** Derivatives must remain OFL. PDFs, images, and product designs made *with* the font are not derivatives. |

**Termination (single sentence):** "This license becomes null and void if any of the above conditions are not met." There's no grace period, no notice requirement. (confirmed — OFL official text)

**"Must not be used to promote":** Practically narrow. SIL's FAQ 4.4 makes clear it doesn't ban factual attribution; it bans implied endorsement. Designers reserve the right to disassociate from poor-quality forks. (confirmed — OFL-FAQ 4.4)

### 1.3 What the OFL is *not*

- Not a trademark license. RFN is a contractual proxy, not a trademark. Trademark protection (where it exists, e.g. IBM Plex) is a separate legal layer.
- Not a CLA. Contributors retain copyright; the license travels with the file.
- Not a guarantee. The DISCLAIMER is sweeping — "AS IS, WITHOUT WARRANTY OF ANY KIND."

---

## Part 2 — How OFL is used in production

Concrete case studies of OFL-released families and the choices their authors made.

### Google Fonts (the de-facto OFL gatekeeper)

- **Submission rule:** All new families must be wholly OFL 1.1. No dual-licensing, no proprietary paid variants. (confirmed — googlefonts.github.io/gf-guide)
- **RFN policy:** *Google Fonts asks new submissions to ship without an RFN.* Reason: GF distributes subsetted versions through its API. A subset is technically a Modified Version, so RFN would prohibit GF itself from serving the font under its original name. Result: Google would have to rename it, or sign a bilateral agreement with the copyright holder. (confirmed — gf-guide license-file docs)
- **Exceptions list:** Pre-existing RFN'd families (Source, Plex, Inter, Recursive, etc.) are explicitly whitelisted in Fontbakery's exception table. New entries require contacting `fonts@google.com` with a written grant. (confirmed — gf-guide)
- **Copyright line format (mandatory):** `Copyright {year} The {family} Project Authors ({git_url})`. The AUTHORS.txt file lists actual humans. (confirmed — gf-guide)
- **Open issue #9894 (google/fonts):** active community proposal to *prohibit RFNs entirely* on new submissions, to remove vendor lock-in vs. Bunny Fonts / Fontsource. Not yet adopted. (likely — single GitHub thread)

### Adobe Source family (Source Sans, Source Serif, Source Code Pro, Source Han)

- **RFN:** `"Source"`. Single, short, distinctive.
- **Rationale:** Allows Adobe to credibly point any fork to a non-Source-branded identity, protecting both the trademark conversation and the family's identity in font-menu lists.
- **Notable:** Source was the first major Adobe OSS font release and set the template most foundries copied. (confirmed — github.com/adobe-fonts/source-sans LICENSE.md)

### Inter (Rasmus Andersson)

- **History:** Originally distributed as **OFL for original glyphs + Apache 2.0 for Roboto fallbacks**, because Roboto was Apache then. When Google relicensed Roboto to OFL in 2020, Inter became uniformly OFL 1.1. (confirmed — Wikipedia, rsms/inter)
- **RFN:** Inter ships with no Reserved Font Name in current releases, in line with Google Fonts preferred submission policy. (likely — confirmed in Fontbakery exception list & repo OFL.txt)
- **Fork policy:** community-friendly; Rasmus has not pursued forkers. Several major derivatives exist (Inter Tight, etc.).

### IBM Plex

- **RFN:** `"Plex"` — plus IBM separately **trademarked** "Plex" in December 2017.
- **Why both:** RFN handles in-font-menu confusion; trademark handles marketing collateral, packaging, app store listings. Belt and suspenders.
- **Lesson for Patens:** When a brand is at stake, RFN alone isn't enough. Patens should remind users that trademarks are a separate registration process, not something the license picker handles. (confirmed — IBM/plex repo, Wikipedia)

### Recursive (Stephen Nixon / ArrowType, commissioned by Google)

- **RFN:** `"Recursive"`.
- **Notable:** Released under OFL 1.1 despite Google funding, demonstrating OFL works for paid commissions where the output is open. (confirmed — github.com/arrowtype/recursive OFL.txt)

### Public Sans (US Web Design System)

- **RFN:** `"Public Sans"`.
- **Notable:** US government work is normally public-domain under 17 USC §105, but USWDS chose OFL anyway so contributors outside government could hold copyright on their additions. Pragmatic, not ideological. (confirmed — uswds/public-sans LICENSE.md)

### Cooper Hewitt (Smithsonian)

- **RFN:** `"Cooper Hewitt"` (a museum-branded RFN — multi-word).
- **Risk to flag:** Multi-word RFNs like this *technically* prohibit derivatives from using either word entirely. The OFL FAQ allows partial-word use but discourages it. A fork called "Hewitt Sans" would be non-compliant. (confirmed — OFL-FAQ 5.4)

---

## Part 3 — OFL vs. the alternatives

| License | Standalone sale | Derivatives | Copyleft? | Attribution? | Best when… | Gotcha |
|---|---|---|---|---|---|---|
| **OFL 1.1** | Banned (bundled OK) | Allowed; must stay OFL; RFN rename if applicable | Yes (font scope only) | Embedded copyright + license file | Open release, foundry brand-protect via RFN | RFN confuses 80% of newcomers |
| **Apache 2.0** | Allowed | Allowed; can be relicensed in combination | No | NOTICE file + license header | Maximum permissiveness, corporate-friendly | No font-name protection at all; lawyers love it because it has patent terms, designers don't need that |
| **MIT** | Allowed | Allowed under any license | No | Copyright line + license | Tiny utility fonts, icon fonts where you genuinely don't care | Designed for software, says nothing about embedding |
| **GPL + Font Exception** | Allowed | Must stay GPL | Yes | Source must be offered | You also ship FontForge or another GPL pipeline | Without the exception clause, any PDF using the font would be GPL'd — historical mess |
| **LGPL + Font Exception** | Allowed | Modifications must stay LGPL | Weak copyleft | Source must be offered | Rare; some GUST TeX fonts | Same exception-needed problem as GPL |
| **CC0 / Public Domain** | Allowed | Anything | No | None | "Throw it over the wall" releases, icon sets, system-fallback experiments | No moral-rights waiver in some jurisdictions (Germany, France); no trademark protection |
| **Custom EULA (all-rights-reserved)** | At your terms | At your terms | Per terms | Per terms | Commercial release; type-foundry monetization | You're now a legal-document author; ship a template, recommend a lawyer review |

**Why OFL won the open-font race:** It's the only license in this list designed *for fonts*, not retrofitted from software. The "bundled-with-software" carve-out, the RFN mechanism, and the document-output clarification all address font-specific ambiguities that Apache/MIT leave open. (confirmed — fossa.com, fontalternatives.com)

---

## Part 4 — License-picker UX

### 4.1 Decision tree (the questions to ask)

Order matters — start with the most decisive question.

```
Q1. Will you charge money for this font on its own?
├── Yes ─────────────────────► Custom EULA preset (commercial)
└── No  ─────────────────────► Q2

Q2. Do you want others to be able to modify and redistribute it?
├── No  ─────────────────────► Custom EULA preset (free, restricted)
└── Yes ─────────────────────► Q3

Q3. Should derivatives also remain open?
├── No  ─────────────────────► Q4 (permissive open)
└── Yes ─────────────────────► Q5 (copyleft open)

Q4. (Permissive open)
    Pick: Apache 2.0 if corporate, MIT if minimal, CC0 if no copyright at all.
    Default → Apache 2.0.

Q5. (Copyleft open — OFL)
    Q5a. Do you want to protect the font name against modified copies using it?
    ├── Yes ─► OFL 1.1 WITH Reserved Font Name = [their family name, unique word only]
    └── No  ─► OFL 1.1 (no RFN) — Google Fonts–ready preset (RECOMMENDED DEFAULT)
```

### 4.2 Presets — what to actually ship in the UI

| Preset | License + config | Audience | Default? |
|---|---|---|---|
| **"Share openly" (default)** | OFL 1.1, no RFN | Designers releasing on Google Fonts, GitHub, or anywhere open. Maximum freedom for the ecosystem. | ✅ Yes |
| **"Protect the name"** | OFL 1.1 with RFN = unique part of family name | Foundries / brand identities (think IBM Plex, Adobe Source) | No |
| **"No strings"** | CC0 1.0 | Icon fonts, experimental work, designers who want zero friction | No |
| **"Commercial release"** | Custom EULA template (stub: desktop + web + app addenda) | Commercial foundry releases | No |

### 4.3 Default for first-time users

**OFL 1.1, no RFN.** Reasons:
1. Aligns with Google Fonts' current preferred submission policy → fewer broken paths to distribution.
2. Avoids the RFN-rename trap when subsetting for web.
3. Still copyleft, so derivatives can't be re-closed.
4. Aligns with the open-source-by-default ethos that fits Patens's MIT-code brand.

### 4.4 What the UI should *not* do

- **Don't show "GPL with font exception" in the main picker.** Almost no modern font uses it. Put it in an Advanced disclosure.
- **Don't let users select OFL + RFN without showing the consequences.** Show a live preview: "Modified copies of your font cannot be named *Foobar*, *Foobar Pro*, or *Foobar Display*. Subsetting your font for web counts as modification."
- **Don't auto-fill RFN with the family name.** That's the FontForge mistake (see fontforge/fontforge#4434) — designers click "OFL" and unknowingly reserve everything. Patens should require an *explicit* RFN choice, defaulting to none.

---

## Part 5 — Embedding license text in the font binary

The OpenType `name` table is where this happens. Four IDs matter for licensing:

| nameID | Field | Length | Patens behavior |
|---|---|---|---|
| **0** | Copyright notice | Short, single line preferred | Auto-fill: `Copyright {year} {author}. This Font Software is licensed under the SIL Open Font License, Version 1.1.` Plus RFN suffix if applicable. |
| **7** | Trademark | Short | Optional. Only populate if the user has registered or claims a TM. UI hint: "Have you registered a trademark? Most personal projects skip this field." |
| **13** | License Description | Long; full license body acceptable | **Auto-fill from preset.** See standard texts below. |
| **14** | License Info URL | Single URL | Auto-fill from preset. OFL → `https://openfontlicense.org`. |

All `name` strings encoded UTF-16BE on Windows platform (3,1) and ideally also Mac platform (1,0) for compatibility. Most modern tooling writes Windows-only. (confirmed — Microsoft OpenType spec)

### 5.1 Standard `nameID 13` content per license

**OFL 1.1 with RFN:**
```
This Font Software is licensed under the SIL Open Font License, Version 1.1.
This license is copied below, and is also available with a FAQ at:
https://openfontlicense.org

-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------
[full license text]
```
Note the OFL.txt file itself must use this *exact* preamble structure — Fontbakery's `com.google.fonts/check/family/license` enforces it.

**OFL 1.1, no RFN:** Same template, but the copyright line at the top has no `with Reserved Font Name` suffix.

**Apache 2.0:**
```
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

**MIT:** Standard MIT text, with copyright line populated from project metadata.

**CC0:** A short notice + URL is sufficient: `This font is dedicated to the public domain under CC0 1.0 Universal. https://creativecommons.org/publicdomain/zero/1.0/`

**Custom EULA:** Patens should ship a *stub* with placeholders, plus a clear warning: "Patens generated this stub. Have it reviewed by a lawyer before release." Stub clauses to include: scope (desktop / web / app), seat count, embedding rules, modification rules, reverse-engineering, termination, governing law.

### 5.2 `nameID 14` URLs

| License | URL |
|---|---|
| OFL 1.1 | `https://openfontlicense.org` |
| Apache 2.0 | `https://www.apache.org/licenses/LICENSE-2.0` |
| MIT | `https://opensource.org/licenses/MIT` |
| CC0 | `https://creativecommons.org/publicdomain/zero/1.0/` |
| Custom EULA | User-provided foundry URL |

### 5.3 OS/2 `fsType` (embedding bits) — adjacent, not license-defined

`fsType` is a bitfield separate from the license, but Patens's license picker should set it sensibly:

- For **OFL / Apache / MIT / CC0** fonts: set `fsType = 0` (Installable Embedding). Anything else contradicts the freedom granted by the license.
- For **Custom EULA — commercial**: let the user choose. Default to `0x0008` (Editable Embedding) for sane behavior in InDesign/Word, but expose `0x0004` (Preview & Print) and `0x0002` (Restricted) for foundries who want hard limits.

Browsers ignore `fsType` entirely; this only affects Adobe / Microsoft desktop apps. (confirmed — w3.org EOT spec, typedrawers discussion)

---

## Part 6 — Reserved Font Names, in depth

This is the section to read carefully — RFN is the single biggest source of OFL confusion.

### 6.1 What RFN protects

- Prevents **font-menu confusion**: if you reserved "Plex", users can never see "Plex" referring to a third-party fork's binary.
- Protects **authorial reputation**: a broken fork can't claim to be the original.
- Reduces **support burden**: bug reports for "Plex" only come for actual IBM-shipped binaries.

What RFN does *not* protect:
- Trademark in marketing or product listings (separate registration).
- The visual design itself (in most jurisdictions, type designs are not copyrightable — only the software is).
- Use of the original font under its original name. Anyone can ship the *unmodified* original under its RFN'd name.

### 6.2 The naming-rename mechanic

If you fork an RFN'd font and modify any glyph, build script, or even just rebuild from source with a different compiler version, you must:

1. Change **all** internal name-table strings that contain the RFN. `nameID 1, 4, 6, 16, 17`, sometimes more.
2. File system filename is not enough. The strings are baked into the binary. (confirmed — OFL how-to-modify-ofl-fonts)
3. Document the rename in the AUTHORS or FONTLOG.

### 6.3 How RFN interacts with foundry names

A foundry can use a multi-tier identity:
- Foundry name (e.g. "Adobe") — usually trademarked separately.
- Family / RFN (e.g. "Source") — the reserved word.
- Style (e.g. "Sans", "Serif", "Code Pro") — *not* reserved; these are generic.

Designers should reserve **only the unique distinctive word**. Reserving generic words like "Sans" or "Mono" is overreach and Google Fonts will reject the submission. (confirmed — gf-guide)

### 6.4 Common RFN mistakes (in roughly descending frequency)

1. **Reserving the full family name** when only the unique word is needed. *Wrong:* RFN = "My Cool Sans". *Right:* RFN = "MyCool".
2. **Forgetting to update OFL.txt when changing the family name.** Mismatch between OFL.txt RFN line and the in-file family name → Fontbakery error.
3. **Forking an RFN'd font and keeping the original family name** because file rename happened but `name` table didn't.
4. **Reserving a name you don't have trademark rights to.** RFN doesn't confer trademark rights; if a third party already owns the trademark, your RFN can't override that.
5. **Web subsetting the original without renaming.** A subsetter that strips glyphs has produced a modified version. Strictly speaking, every CDN serving a subsetted RFN'd font is non-compliant — which is *exactly* why Google Fonts asks new submissions to drop RFNs. (confirmed — OFL-FAQ webfonts page)

### 6.5 The no-RFN alternative

Valid, increasingly common, recommended for new submissions to Google Fonts. The trade-off: anyone can publish a modified fork under your original name. For most independent designers, that's an acceptable risk — and aligns with the open-source spirit. For corporate / brand-identity fonts, RFN is still the right call.

---

## Part 7 — Edge cases & landmines

| Scenario | OFL status | Confidence |
|---|---|---|
| Subsetting an OFL font for web delivery | **Technically a Modified Version.** Allowed by license. If RFN is set, the subset must be renamed — which breaks practical use, hence the Google Fonts policy. | Confirmed (OFL-FAQ webfonts page) |
| Bundling an OFL font inside an iOS / Android / desktop app binary | **Allowed.** This is exactly what clause 2 was written for. Include the OFL.txt in app's legal/notices screen. | Confirmed |
| Selling a font pack on Gumroad where one font is OFL'd | **Allowed**, because the OFL font isn't sold *by itself*. Must include OFL.txt. | Confirmed (OFL-FAQ 1.5) |
| Selling a modified version (RFN renamed) | **Allowed**, with the same bundle-not-standalone rule. You can build a commercial business on OFL forks. | Confirmed |
| Using an AI tool to generate glyphs trained on OFL fonts | **OFL-FAQ 1.25 (Nov 2023): output should be considered a derivative work; output must remain under OFL.** Enforcement and edge cases untested. Position Patens as compliant by default but warn users that this is an active area of legal debate. | Confirmed (FAQ); Uncertain (enforcement) |
| Using an AI tool that *uses* OFL fonts for visual output (rendering, layout) but doesn't generate new fonts | Treated as standard font usage. Not a derivative. | Confirmed (OFL-FAQ 1.26) |
| Multi-script extension (adding Cyrillic to a Latin OFL font) | Modified Version, allowed. Rename if RFN'd. Strongly encouraged contribution-back. | Confirmed (OFL-FAQ 7.2) |
| Generating named instances from a variable OFL font | Allowed. Each instance is still a Modified Version technically; if no RFN, no renaming concern. | Confirmed |
| Embedding an OFL font in a PDF / image / video | **Not a derivative.** Clause 5's "does not apply to any document created using the fonts" carve-out covers this. | Confirmed |
| Hosting OFL fonts on a third-party CDN (Bunny Fonts, Fontsource) | Allowed if no RFN OR if the original family name is preserved. If RFN'd and subset, technically non-compliant — the unresolved tension behind google/fonts#9894. | Likely |
| Format conversion (TTF → WOFF2) | Modified Version technically, since binary differs. Rename if RFN'd; in practice every web tool produces WOFF2 without renaming, and this is universally tolerated for unmodified-glyph conversions. | Likely (FAQ guidance silent on this exact case) |
| Re-licensing your own OFL font as proprietary | **You can dual-license your own work** if you're the sole copyright holder. You cannot remove the OFL grant already given. Once a version is out, that version stays OFL forever. | Confirmed |

---

## Part 8 — Patens documentation: ready-to-use content

The following sections are drafts intended for `/learn/licensing` or `/help/licensing` in the Patens app.

### 8.1 Two-paragraph OFL explainer (plain English)

> **The Open Font License is the most widely used license for free, open fonts.** Google Fonts, Adobe's Source family, Inter, IBM Plex, and most contemporary open typefaces use it. The license lets anyone use, study, modify, and redistribute your font — for free, for commercial work, anywhere — as long as they don't sell your font file by itself. They can absolutely sell apps, kits, or services that include your font, just not the font alone.
>
> If you want to protect your font's name from being attached to modified versions, you can declare a *Reserved Font Name*. Anyone who modifies your font must then rename their version. Reserved Font Names are useful for brand-identity fonts but are increasingly **avoided** for general open releases — Google Fonts now asks new submissions to ship without them. Patens defaults to no Reserved Font Name; turn it on only if your font is part of a brand identity you actively maintain.

### 8.2 Decision tree (UI-ready)

See Part 4.1 above. Render as a one-screen wizard with progressive disclosure.

### 8.3 Sample license texts for the four scenarios

(See Part 5.1 for the full nameID 13 strings.)

### 8.4 FAQ entries

**Q: Can I sell my font?**
A: You can sell anything *containing* your font — an app, a template kit, a course, a print book — as long as you include the license file. Under OFL you can't sell the bare font file by itself. If you want to sell the bare file, use the Commercial preset (custom EULA).

**Q: Can I include my name in the copyright?**
A: Yes. Patens auto-fills the copyright line with your name. You can also list a project URL — Google Fonts requires this format.

**Q: What if Google Fonts adopts my font?**
A: If you used the "Share openly" preset (OFL, no RFN), your font is ready for Google Fonts submission. If you used "Protect the name" (OFL with RFN), Google will either ask you to remove the RFN or sign a per-family agreement.

**Q: Can someone fork my font and sell their version?**
A: Yes, if they include other software with it (it's the same OFL bundle-don't-sell-alone rule). They must include credit to you, rename if you set an RFN, and keep their version OFL.

**Q: What about AI-generated derivatives?**
A: The current OFL FAQ (Nov 2023, item 1.25) says fonts produced by AI systems trained on OFL fonts should be considered derivative works — meaning they must remain OFL. This is an active legal area; enforcement hasn't been tested in court. Patens treats this as "comply with current guidance, watch the space."

**Q: Will my font work everywhere?**
A: Patens writes the license info into the font's `name` table (IDs 0, 13, 14) and sets safe embedding bits. Your font will work in Figma, Adobe apps, browsers, and OS-level installation. No additional configuration needed.

**Q: Can I change my license later?**
A: For new versions, yes — you're the copyright holder. For versions already released, no — those stay under the license you shipped them with. Pick deliberately.

---

## Open questions & active debates (be honest with users)

1. **AI-trained-on-OFL outputs.** SIL says derivative; no case law tests this. Patens recommends OFL compliance for AI-generated work but flags the uncertainty in copy.
2. **Subset-as-derivative + RFN.** Google's policy effectively resolves this for new submissions (no RFN). Older RFN'd families exist in a gray zone for third-party CDNs.
3. **Format conversion (TTF↔WOFF2) renaming.** Technically required under strict reading of RFN; universally ignored in practice. Patens follows practice and does not require renaming on format conversion.
4. **Trademark vs RFN confusion.** Many designers think RFN gives them trademark rights. It doesn't. Patens's UI should make this explicit.

---

## Sources

### SIL & OFL primary

- [SIL Open Font License — official site](https://openfontlicense.org/)
- [OFL 1.1 official text](https://openfontlicense.org/open-font-license-official-text/)
- [OFL FAQ (v1.1-update7, Nov 2023)](https://openfontlicense.org/ofl-faq/)
- [Reserved Font Names guidance](https://openfontlicense.org/ofl-reserved-font-names/)
- [Modifying and redistributing OFL fonts](https://openfontlicense.org/how-to-modify-ofl-fonts/)
- [Webfonts and Reserved Font Names](https://openfontlicense.org/webfonts-and-reserved-font-names/)
- [Promoting the OFL](https://openfontlicense.org/promotion/)
- [SIL OFL legacy page](https://scripts.sil.org/OFL)
- [Linux.com — SIL Open Font License Revised (2007 changelog)](https://www.linux.com/news/sil-open-font-license-revised/)

### License clearing-houses

- [SPDX OFL-1.1 entry](https://spdx.org/licenses/OFL-1.1.html)
- [OSI OFL approval](https://opensource.org/license/OFL-1.1)
- [Choose a License — OFL 1.1](https://choosealicense.com/licenses/ofl-1.1/)
- [SPDX GPL-2.0 with font exception](https://spdx.org/licenses/GPL-2.0-with-font-exception.html)
- [SPDX Font-exception-2.0](https://spdx.org/licenses/Font-exception-2.0.html)
- [Wikipedia — GPL font exception](https://en.wikipedia.org/wiki/GPL_font_exception)

### Case studies (the foundries)

- [Adobe Source Sans LICENSE.md](https://github.com/adobe-fonts/source-sans/blob/release/LICENSE.md)
- [Adobe Source Serif LICENSE.md](https://github.com/adobe-fonts/source-serif/blob/release/LICENSE.md)
- [IBM Plex LICENSE.txt](https://github.com/IBM/plex/blob/master/LICENSE.txt)
- [IBM Plex Wikipedia](https://en.wikipedia.org/wiki/IBM_Plex)
- [Inter font repo](https://github.com/rsms/inter)
- [Inter (typeface) — Wikipedia](https://en.wikipedia.org/wiki/Inter_(typeface))
- [Inter — legal terms discussion #694](https://github.com/rsms/inter/discussions/694)
- [Recursive OFL.txt](https://github.com/arrowtype/recursive/blob/main/OFL.txt)
- [Public Sans LICENSE.md (USWDS)](https://github.com/uswds/public-sans/blob/develop/LICENSE.md)
- [Public Sans landing page (digital.gov)](https://public-sans.digital.gov/)
- [Cooper Hewitt typeface page](https://www.cooperhewitt.org/open-source-at-cooper-hewitt/cooper-hewitt-the-typeface-by-chester-jenkins/)
- [Cooper Hewitt repo](https://github.com/cooperhewitt/cooperhewitt-typeface)

### Google Fonts policy & tooling

- [Google Fonts License File guide](https://googlefonts.github.io/gf-guide/license-file.html)
- [Google Fonts FAQ](https://developers.google.com/fonts/faq)
- [google/fonts issue #9894 — RFN prohibition proposal](https://github.com/google/fonts/issues/9894)
- [google/fonts issue #1797 — Subsetting + RFN legal analysis](https://github.com/google/fonts/issues/1797)
- [Fontbakery (OS validator)](https://github.com/fonttools/fontbakery)

### OpenType `name` table specification

- [Microsoft OpenType `name` table spec](https://learn.microsoft.com/en-us/typography/opentype/spec/name)
- [Adobe Tech Note 5149 — name table tutorial](https://adobe-type-tools.github.io/font-tech-notes/pdfs/5149.OTFname_Tutorial.pdf)
- [W3C EOT submission (fsType detail)](https://www.w3.org/submissions/EOT/)
- [TypeDrawers — fsType discussion](https://typedrawers.com/discussion/3374/embedding-of-ttf-opentype-fstype)

### Comparative analysis & commentary

- [FOSSA — Open Source Licenses 101: OFL](https://fossa.com/blog/open-source-licenses-101-sil-open-font-license-ofl/)
- [TLDRLegal — OFL 1.1 explained](https://www.tldrlegal.com/license/open-font-license-ofl-explained)
- [FontsArena — Font licenses explained](https://fontsarena.com/licenses-explained/)
- [LWN.net — The Open Font License and Reserved Font Names](https://lwn.net/Articles/552178/)
- [TypeDrawers — modifying existing fonts](https://typedrawers.com/discussion/4536/is-it-lawful-for-me-to-edit-existing-fonts)
- [FontAlternatives — OFL vs Apache vs MIT decision tree](https://fontalternatives.com/blog/font-license-decision-tree-ofl-apache-mit/)
- [fontforge/fontforge#4434 — RFN default sanity issue](https://github.com/fontforge/fontforge/issues/4434)

### Commercial EULA references

- [Hoefler & Co. EULA (industry-standard structure)](https://www.typography.com/policies/eula)
- [Commercial Type EULA](https://commercialtype.com/eula)
- [Typespec EULA](https://typespec.co.uk/font-eula/)
- [Alex John Lucas — exploring font EULAs](https://alexjohnlucas.com/type/eula)
