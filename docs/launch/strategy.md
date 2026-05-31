# Patens launch strategy

> Deep research from May 2026 covering distribution, competitive positioning, and monetization. Sources at the bottom. This is a working document — revise as we learn.

---

## Executive summary — top 5 actions this week

1. **Submit to Show HN on a Tuesday or Wednesday between 9–11 AM Pacific.** Wednesday peaks for traffic; first 90 min of replies determine front-page survival. Title: `Show HN: Patens – browser-native, open-source type design`.
2. **Post on TypeDrawers in "Type Design" category** with the etymology hook and a specific call for community feedback. Real-name account required. Norms are strict; tool-promotion is tolerated when framed as discussion.
3. **Skip the "press launch" entirely for v1.** *It's Nice That* / *Sidebar* / *Typewolf* are tools, not type-editor-tool press. Pitch them in 6 months if Patens has a fonts-in-the-wild story.
4. **Claim `@patens.design` on Bluesky** (custom-domain handle, free) before X. Bluesky is where typography Twitter has migrated; X engagement is lower for niche design tools in 2026.
5. **Add GitHub Sponsors immediately** with one $5 tier. Don't add Pro features until 100+ weekly users provide real signal about what's worth paying for. Vercel Blob + Anthropic costs are <$10/mo at small scale; you don't need revenue yet.

---

## Part 1 — Distribution strategy

### The launch sequence (sequenced, ~3 weeks)

The trap most indie launches fall into: blast every channel on day 1, then have nothing left for week 2. Stagger.

**Week 1 — Soft validation (low-stakes feedback)**
- Day 1: Post to **TypeDrawers** with the etymology hook + specific feedback ask
- Day 2-3: DM 5-10 type designers you respect, ask for 10 minutes of their eyes (use the `docs/launch/copy.md` DM template)
- Day 4: **Reddit r/typography** (text post, lead with the work not the tool — the launch copy nails this)
- Throughout: respond to every comment within 4 hours

**Week 2 — Hacker News + broader dev community**
- **Tuesday or Wednesday, 9-11 AM Pacific** (16:00–18:00 UTC): Show HN
  - Title: `Show HN: Patens – browser-native, open-source type design`
  - Body: full Show HN draft from `docs/launch/copy.md`
  - Clear inbox for 4 hours of replies — comments matter more than upvotes for ranking
- Day 2: **r/programming** if Show HN does well (front page or close to)
- Day 3: Post to **Lobste.rs** if you have an invite (smaller, more critical, often more constructive than HN)

**Week 3 — Designer-Twitter / Bluesky / signal amplification**
- **Bluesky thread** (5 posts from `docs/launch/copy.md`)
- Mirror on X with the same thread structure
- Tag people who have engaged (DM-first not @-first to avoid looking thirsty)
- Post a follow-up "what we learned in week 1" thread with real numbers

**Months 2–6 — Long tail (only after the tool is real)**
- Write a "how to make your first font" tutorial blog (best SEO play; 6-month payoff)
- Pitch *It's Nice That* / *Sidebar* / *Dense Discovery* when you have a font in the wild or a designer testimonial
- Submit to *Designer Tools* directories (Sidebar's tool index, Indiebase, Sidebar.io)
- Open a YouTube channel walking through the editor (1 short, 1 long, monthly cadence)

### Channel-by-channel guide

#### Hacker News (Show HN)

**Why:** Mid-week US morning is the highest-density of *technical readers who might rebuild your stack on a Sunday afternoon*. Patens's stack (SvelteKit + Svelte 5 + opentype.js + Pyodide + service worker + WCAG-enforced testing) is HN-bait.

**Timing:** Tuesday or Wednesday, 9-11 AM Pacific. Avoid weekends (less traffic + harder to engage), avoid Mondays (people are catching up), avoid Fridays (people are checked out).

**Title format:** `Show HN: Patens – browser-native, open-source type design`. Don't use "introducing", don't use emoji, don't superlative ("best", "amazing"). Front-load the noun.

**Body strategy:**
- Lead with the demo URL (`patens.design/project/demo/edit`)
- One paragraph of substance, NOT marketing
- Skip the etymology hook in the OP — save it for the inevitable "why 'Patens'?" comment (it's a much better second-touch)
- Honest about scope and limitations (don't compare to Glyphs; don't claim "future of type design")
- Tech stack as a footer paragraph for the technical readers

**Engagement rules:**
- Respond to every top-level comment in the first 4 hours
- Don't argue. If someone says "this is dumb", thank them for looking and ask one specific question
- If someone says "you should add X", say "good idea, what's the use case" — never "we already have that" or "we don't plan to"

**Realistic outcome:** ~30% of Show HN posts hit the front page for some duration; another 30% get 5-20 comments without front-page heat (still worth doing). Don't repost if it flops — wait 6 weeks for a v2 if there's substantive new content.

#### TypeDrawers

**Why:** This is where real type designers (Adam Twardoch, Tobias Frere-Jones, Just van Rossum) read each other and discuss craft. It's the closest thing typography has to a professional community. Posting here signals seriousness.

**Rules to know:**
- **Real first + last name required** as username (not "alevizio"; "Alejandro Vizio")
- **Category:** "Type Design" 
- **No font-ID requests** allowed (irrelevant for you but it's a culture signal)
- **Tool-promotion is tolerated when framed as discussion**, not when framed as launch. Lead with a question.

**Posting strategy:**
- Title format: `New browser-based editor for review: Patens (open source)` or `Patens — open-source type design in the browser, looking for community feedback`
- Body: Explain the design intent, link to demo, ask 2-3 specific questions ("Does the audit panel land for non-type designers?", "Does the bespoke Я Ж Ф read as a sketch?")
- Stay engaged in replies for several days — TypeDrawers moves slowly; thoughtful replies arrive over a week

**Existing community context (May 2026):** there's an active thread on zero-install editors that already mentions Glyphr Studio, FontStruct, Typograph Studio (private beta), FontBob (in development), and Counterpunch.space (recent). Patens has natural context to join.

#### Bluesky

**Why:** Type-design Twitter has materially migrated to Bluesky through 2025-2026. Custom-domain handles (you can be `@patens.design` directly) signal "domain-owned, not platform-owned" — values-aligned with the open-source positioning.

**Strategy:**
- 5-post thread from `docs/launch/copy.md`
- 256 char limit per post (vs X's 280) — same content fits
- Engagement is higher than X for design-community content — less ad-injected algorithm
- Add the OG card image (`patens.design/og/brand`) to post 1

**Realistic outcome:** 50-300 followers in the first month if the thread connects. Designer Bluesky is small (10-50K active) but high signal.

#### X (Twitter)

**Why:** Still the largest concentration of designers despite the migration. But engagement on niche tools has declined significantly through 2025-26.

**Strategy:** Same thread as Bluesky, posted same day. Pin the first tweet.

**Don't:**
- Don't run ads (terrible ROI for indie design tools)
- Don't @-mention famous designers asking for retweets
- Don't post 5x a day for "engagement"

#### Reddit

**r/typography** — moderately active (~50K subscribers), tolerates tool posts if framed as work, not promotion. Lead with what you made, link the source repo, don't link your domain in the body.

**r/typedesign** — smaller, more specialist. Same rules.

**r/programming** / **r/sveltejs** — only if Show HN does well; lead with the tech stack story (Svelte 5 + Pyodide + service worker + WCAG-enforced CI).

#### Sidebar.io

A curated daily newsletter that picks 5 design links/day. Submit via their submission form. **Realistic timeline:** if Patens picks up early traction elsewhere, it might get picked up organically. Don't expect submission alone to land it.

#### It's Nice That, Dense Discovery, Sidebar (newsletter)

**Skip for v1.** These publications cover *finished work* — fonts in use, design projects, identity work. A type-editor tool without fonts in the wild isn't their beat. Revisit when:
- Patens has 100+ active users
- 3+ designers have made fonts with it
- One of those fonts is being used somewhere visible

When you do pitch: short email (one sentence intro, one sentence summary, one sentence on the specific project), flag a specific story (not the tool itself, the *human story* — "designer in São Paulo used Patens to make their family-business logo font in two weeks"). Wait weeks-to-months, don't follow up more than once.

### What to never do

- **Don't pay for "launch services"** (Product Hunt boosters, paid Show HN exposure). Universally backfires for design tools.
- **Don't run ads.** Acquisition cost will exceed lifetime value for an indie tool.
- **Don't auto-DM Bluesky/X followers.** Death sentence in the design community.
- **Don't post to /r/Design** (huge, generic, low signal; you'll get downvoted as "promo").
- **Don't compare to FontLab / Glyphs.** Direct comparison frames you as wanting to replace them; you don't and can't. Position around the gap (browser-native, open source) not the overlap.

---

## Part 2 — Competitive positioning

### The actual landscape (May 2026)

| Tool | Audience | Platform | Price | Status |
|---|---|---|---|---|
| **FontLab 8** | Pro / industry | Mac + Windows | **$499 lifetime** | Active, perpetual license |
| **Glyphs 3** | Pro / Mac | macOS only | **$300 lifetime** | Active, perpetual |
| **RoboFont** | Pro / Python | macOS only | ~$400 | Active |
| **BirdFont** | Beginner | Cross-platform | Pay-what-you-want | Open source |
| **FontForge** | Pro / hardcore | Cross-platform | Free | Open source, dated UI |
| **Glyphr Studio** | Hobbyist | **Browser** | Free | Open source, hobbyist-focused |
| **Fontra** | Variable fonts | **Browser + desktop** | Free | Google-backed, monthly releases (v2026.5.1 May 12) |
| **typlr.app** | Modern UI | **Browser** | Free | Active |
| **FontStruct** | Geometric / hobbyist | **Browser** | Free | Old, dated |
| **Calligraphr** | Handwriting → font | **Browser** | Free + $8/mo Pro | Niche conversion tool |

### Where Patens genuinely wins (the positioning sentence)

> **"The only browser-native type editor designed as a teaching tool — every audit issue explains what's wrong, why it matters, and offers a one-click fix. Open source, foundry aesthetic, no installs."**

Components of the win:

1. **Teaching-first** — Glyphr Studio is hobby-focused but doesn't teach; Fontra is variable-first but expert-targeted; FontLab assumes you already know. Patens's 102-code audit + 5 teaching surfaces is a unique angle.
2. **Browser-native + offline** — none of the desktop tools work offline-after-install in a tab; service worker + IndexedDB lets Patens.
3. **Open source + zero install** — Fontra requires a Python install for full features; Glyphr Studio is JS-only but unfunded; Patens is the rare both-funded-attention-and-truly-zero-install.
4. **Editorial aesthetic** — every other tool uses a generic IDE aesthetic. Patens uses Hoefler Text headings, foundry-style typography. Signals craft.
5. **Multi-script starter** — most demo projects ship Latin-only; Patens ships Latin + 17 Cyrillic + 14 Greek + bespoke Я Ж Ф out of the box.

### What to never say

- **"FontLab/Glyphs replacement"** — you're not, even at 5× current scope, and the framing invites the wrong comparison.
- **"AI-powered type design"** — the AI features are user-key-gated side doors. Don't put them on the marquee.
- **"The first browser-based type editor"** — false (Glyphr Studio predates you by years). Use "browser-native, open-source, teaching-first."
- **"Drag and drop"** — type design is not drag-and-drop, never has been. Says you don't know type design.
- **"Powered by GPT/Claude"** — overstated and invites scrutiny on AI costs.

### The anti-positioning paragraph

For an FAQ or about page:

> "Patens isn't a FontLab or Glyphs replacement — those tools are deeper, faster, and built for professionals shipping commercial families. Patens is for the designer between sketches and shipping: when you've drawn a logo and want to make a full font from it, when you're learning type design and need an editor that explains its audit warnings, when you want to share a specimen with a client without making them install anything. If you're shipping retail typefaces, FontLab or Glyphs are still the right tools. Patens is for everyone else."

This is the single strongest argument for why Patens exists alongside (not competing with) the establishment.

---

## Part 3 — Monetization

### The horizon (18 months out)

The MVP is built and shipped. Three questions matter:

1. **What does it actually cost to run?** (so you know what break-even revenue looks like)
2. **What's the smallest revenue layer that maintains the open-source positioning?** (so you don't burn the trust you just built)
3. **When is the right time to add it?** (so you don't add it before there's signal it'd work)

### Cost model at three scales

Math based on May 2026 pricing.

**Scale 1 — Personal use only (~10 weekly visitors, you):**
- Vercel Hobby: **$0** (free, non-commercial)
- Vercel Blob: **$0** (1 GB storage + 10 GB transfer included free)
- Anthropic API: **$0** (user-provided keys, no shared surface)
- Domain: **$31/yr** (cloudflare `.design`)
- **Total: $31/year**

**Scale 2 — Modest indie traction (~1K weekly active users):**
- Vercel Pro: **$20/mo** (required for commercial use even if you don't monetize — controversial Vercel ToS)
- Vercel Blob storage (~50 GB shares + tokens): **~$1.15/mo**
- Vercel Blob transfer (~30 GB/mo): **~$1.50/mo**
- Domain: **$31/yr**
- **Total: ~$22/mo + $31/yr → ~$295/year**

**Scale 3 — Notable open-source tool (~10K weekly users):**
- Vercel Pro: **$20/mo** base + overages
- Bandwidth (~300 GB/mo above included): **~$15/mo**
- Vercel Blob (~500 GB storage + 300 GB transfer): **~$26.50/mo**
- Lighthouse/CI minutes: included
- Domain: **$31/yr**
- **Total: ~$62/mo + $31/yr → ~$775/year**

**Key insight:** at Scale 2 and below, hosting cost is **$0.25-0.30/week**. Revenue isn't needed to keep Patens alive. The "we're not begging for money" stance is sustainable indefinitely from your own pocket.

At Scale 3, cost is **~$15/week** — a real but not painful number for a project you care about.

The cost only becomes a problem at ~50K+ weekly users, which is "fully-built indie tool" territory, not v1.

### What other open-source design tools do for revenue

**Direct sponsorship (no Pro tier):**
- **Excalidraw** — accepts GitHub Sponsors, no paid tier. The team monetizes via the separate Excalidraw+ team product.
- **Penpot** — pure open source, monetized by company (Kaleidos) doing services.

**Open core (free + Pro):**
- **Supabase** — `$25/mo` Pro tier unchanged since 2021. Hit $70M ARR. Pricing-as-positioning case study.
- **Cal.com** — Free + `$15/mo` Pro. Open-core success.
- **Linear** — Free tier + paid team plans starting `$8/user`. Not open source but case study for pricing.
- **Raycast** — Free + `$8-16/mo` Pro. Open ecosystem (extensions), closed core.

**Sponsor-only (no commercial product):**
- **Tanner Linsley** (React Query): `$45K/mo` in GitHub Sponsors via enterprise tiers ($500-$2K/mo)
- **Evan You** (Vue): personal Sponsors + Vue Foundation
- **Pieter Levels** — model: build something, don't accept money, see what happens

### Recommended sequence

**Phase 1 — Right now (v1.5.x, no revenue needed):**
- Add **GitHub Sponsors button** to repo
- Tiers: `$5/mo Cheering`, `$25/mo Supporting`, `$100/mo Enabling`. Skip enterprise tiers until you have one.
- Add a `/sponsors` page on patens.design (or just link to GitHub Sponsors from /about footer)
- Explicitly say "Patens is free forever. Sponsoring keeps it shipping faster."
- **Don't add a Pro tier yet.** Wait for signal.

**Phase 2 — When you have 100+ weekly users (probably 3-6 months):**
- Reassess. Are sponsors at $50-200/mo? Are people asking to pay for something specific?
- Common asks at this stage: "can I pay you to host my shared fonts privately?", "is there a way to remove the watermark?" (you have no watermark), "can I get a custom OG image?"
- **If "yes" to private hosting**: this is the Pro tier seed. Charge **$5/mo** for a "share more than 3 projects at once" upgrade. Tiny tier. Tests willingness to pay.

**Phase 3 — When the Pro signal is clear (12+ months out, IF the project sustains):**
- Add a **Patens Studio** hosted offering: `$10/mo` for unlimited cloud shares + version history + extended retention
- Keep the editor free, open, and unbranded
- Single Pro page; no upsell pop-ups; no feature gating in the core editor
- Pattern: Cal.com / Supabase, not Notion / Figma

### The "never do this" list

- **Never paywall the core editor.** Open source positioning dies the moment you do.
- **Never gate audit features.** Audit is the teaching surface; the teaching surface is what differentiates Patens.
- **Never sell user data or analytics.** Trust evaporates instantly in the design community.
- **Never sponsor the project to a private equity firm.** The "Patens was great until X bought them" headline writes itself.
- **Never accept money to add specific features to the public editor.** Sponsor-driven roadmaps quietly kill open-source projects.

### Anthropic API cost (your separate concern)

If you ever add a *shared* AI tier (instead of user-provided keys):

- Claude Sonnet 4.6: $3 in / $15 out per million tokens (May 2026)
- "Explain audit issues" preset: ~2K input + 1.5K output = **~$0.03/call**
- 100 users × 5 calls/week × 4 weeks = 2000 calls = **~$60/month**
- With prompt caching (90% off cached input): **~$30/month**

**Recommendation:** never run a shared API budget. Keep user-provided keys forever. It's the most aligned with the open-source positioning AND it scales to zero cost. The 1% of users who want shared AI can use Claude.ai or run their own deployment.

---

## Part 4 — Combined 14-day execution plan

| Day | Task | Audience | Time |
|---|---|---|---|
| **1** | Add GitHub Sponsors button + `/about` link | repo | 15 min |
| **1** | Claim `@patens.design` on Bluesky (TXT record) | Bluesky | 5 min |
| **1** | Claim `@patenstype` on X | X | 2 min |
| **2** | Post on TypeDrawers — "Type Design" category, feedback request framing | type designers | 30 min + replies |
| **3** | Reddit r/typography (text post, lead with the work) | design community | 20 min + replies |
| **3-4** | DM 5-10 type designers + designers you know personally | warm circle | 30 min |
| **5-6** | Read everything that comes back. Don't post anywhere new. Iterate on real feedback. | self | 2-3 hr |
| **8** (Tue) or **9** (Wed) | **Show HN at 9:30 AM Pacific** | HN | 4 hours clear for replies |
| **8-9** | Bluesky launch thread + X mirror (same day) | designer-tech | 30 min + replies |
| **10** | If Show HN did well: r/programming + r/sveltejs | dev community | 20 min |
| **12** | Post a "what we learned in week 1" recap thread on Bluesky | community | 30 min |
| **14** | Submit to Sidebar.io | designer tools | 10 min |
| **14** | Write "what's next for Patens" blog post or GitHub Discussion | community | 1 hr |

What's NOT in the plan: It's Nice That, Dense Discovery, paid promotion, Product Hunt. All deferred until there's a fonts-in-use story to point at.

---

## Sources

**Show HN + Hacker News:**
- [How to launch a dev tool on Hacker News — markepear.dev](https://www.markepear.dev/blog/dev-tool-hacker-news-launch)
- [Hacker News Posting Guide — Syften](https://syften.com/blog/hacker-news-marketing/)
- [Best time to post on Hacker News — Lucas F. Costa](https://www.lucasfcosta.com/blog/hn-launch)
- [HN Show HN best practices — DEV](https://dev.to/dfarrell/how-to-crush-your-hacker-news-launch-10jk)

**TypeDrawers:**
- [TypeDrawers Rules](https://typedrawers.com/discussion/751/read-this-first-the-typedrawers-rules)
- [Zero-install font editors discussion](https://typedrawers.com/discussion/5520/mapping-zero-install-font-editors)

**Competitive landscape:**
- [Fontra v2026.5.1 changelog](https://fontra.xyz/changelog.html) — Google-backed, active monthly releases
- [Glyphr Studio](https://www.glyphrstudio.com/) — established browser-based
- [typlr.app](https://typlr.app/) — modern browser editor
- [FontLab 8 pricing](https://www.fontlab.com/font-editor/fontlab/) — $499 lifetime
- [Glyphs 3 pricing](https://glyphsapp.com/buy) — $299.90 lifetime
- [Alex John Lucas — FontLab vs Robofont vs GlyphsApp](https://alexjohnlucas.com/type/software)

**Monetization:**
- [Open Source Monetization Strategies — Markaicode](https://markaicode.com/monetize-open-source-github-income/)
- [Supabase Pricing History — SaaSPricePulse](https://www.saaspricepulse.com/blog/supabase-pricing-history) — $25/mo unchanged since 2021
- [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing) — $0.023/GB-month storage, $0.05/GB transfer
- [Anthropic API pricing 2026](https://platform.claude.com/docs/en/about-claude/pricing) — Sonnet 4.6 $3 in / $15 out per M tokens
- [Awesome OSS Monetization](https://github.com/PayDevs/awesome-oss-monetization) — curated playbook
- [Dodo Payments — Monetize OSS with a Pro Tier](https://dodopayments.com/blogs/monetize-open-source-pro-tier)

**Designer press / newsletters:**
- [It's Nice That — submission tips](https://creativelivesinprogress.com/articles/how-to-get-press)
- [Best design newsletters 2026 — Lummi](https://www.lummi.ai/blog/best-graphic-design-newsletters)
- [Sidebar.io](https://sidebar.io/) — daily 5-link design newsletter
- [Typewolf resources](https://www.typewolf.com/resources)
- [Fonts In Use](https://fontsinuse.com/) — when Patens has fonts shipping

**Type design community context:**
- [Creative Bloq — Typography trends 2026](https://www.creativebloq.com/design/fonts-typography/breaking-rules-and-bringing-joy-top-typography-trends-for-2026) — "Mutant Heritage" trend = high-character custom typefaces back in favor
- [It's Nice That — graphic trends 2026](https://www.itsnicethat.com/features/forward-thinking-graphic-trends-2026-graphic-design-120126)
