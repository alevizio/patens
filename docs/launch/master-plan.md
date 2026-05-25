# Patens launch master plan — SEO + AIO + distribution + content

> Combines the distribution research in `strategy.md` with deep research on GEO/AIO (May 2026). The thesis: search is bifurcating — traditional Google SEO still matters, but **AIO (AI-optimization for ChatGPT / Claude / Perplexity citations) is the bigger 2026 lever for a niche tool like Patens.** Gartner predicts a 25% drop in traditional search volume by 2026 as users move to answer engines. This plan optimizes for both, with weighting toward AIO because Patens's audience (designers, indie devs) over-indexes on AI-assistant usage.

> This is a long doc. Section 1 is the executive read. Sections 2-6 are the depth.

---

## Section 1 — The 30-second read

**The single highest-leverage move:** get Patens cited by ChatGPT, Claude, and Perplexity when designers ask "what's a good browser-based font editor?" or "how do I make my own typeface without installing software?"

This requires three things, in order:
1. **Technical foundation** — `llms.txt`, `WebApplication` schema markup, AI-crawler-explicit `robots.txt`. All shipped in this commit.
2. **Multi-source consensus** — Patens needs to be mentioned in 3-5 independent places (TypeDrawers, GitHub README, Reddit, a comparison page, a personal blog post) before AI engines confidently cite it.
3. **Definition-first content** — the first 80 words of every page must establish what Patens IS, what makes it unique, what it isn't. AI extraction windows are short.

**The single highest-leverage human-side action:** post the Show HN draft on a Tuesday or Wednesday at 9:30 AM Pacific. The thread that follows (engaged replies, GitHub stars, Twitter/Bluesky echoes) becomes the multi-source consensus AI engines need.

---

## Section 2 — SEO + AIO technical foundation (what's now shipped)

### 2.1 — llms.txt

Created at `static/llms.txt`. This is the AI-equivalent of `robots.txt` — a community convention adopted by a growing fraction of AI crawlers through 2026. **Current adoption is ~0.1% of AI crawler traffic by file fetches, but trending up.** No standards body has formally adopted it, but Anthropic, OpenAI, and Perplexity have all referenced llms.txt in their crawler documentation.

The file gives AI systems a curated, structured view of:
- What Patens is (one-paragraph authoritative summary)
- Core resources (canonical URLs for editor / specimen / docs / GitHub)
- Capabilities (bullet list extractable as features)
- Positioning vs competitors (comparison table)
- Pronunciation note (PAH-tens, not PAT-ens)
- Tech stack
- Contact

**Why this matters:** when a user asks ChatGPT "is there an open-source browser font editor?", the model retrieves training-time knowledge + recent context. If our llms.txt has been crawled, the model has high-confidence structured facts about Patens to cite. Without it, the model leans on whatever Reddit posts and blog mentions exist (initially nothing).

### 2.2 — `WebApplication` schema markup on home page

Added to `src/routes/+page.svelte`. `WebApplication` is a subtype of `SoftwareApplication` specifically for browser-based apps (the key differentiator is the `browserRequirements` attribute). Includes:

- `@type: WebApplication`
- `applicationCategory: DesignApplication`, `applicationSubCategory: Font Editor`
- `operatingSystem: Any (browser-based)`
- `offers.price: 0`, `isAccessibleForFree: true`
- `license: MIT`
- `softwareVersion: 1.5.2`
- `featureList`: 13 capabilities extracted as discrete strings
- `codeRepository`, `sameAs` (GitHub, X, Bluesky) for entity linking

**Why this matters:** Google Rich Results test will now recognize Patens as a software product. AI engines (Gemini especially) treat schema.org markup as ground truth — they extract directly from `featureList`, `description`, `offers`. The `sameAs` entries link Patens-the-entity across GitHub, X, and Bluesky so AI engines understand they're the same project.

**Note on FAQPage schema:** Google deprecated FAQ rich results in May 2026 (Search Console API removal in August 2026). The FAQPage schema on `/help` is now defunct for rich results, but **we leave it in place** — it still helps AI extraction (Perplexity, Claude, ChatGPT all parse FAQPage schema for direct answer extraction even when Google won't show rich results).

### 2.3 — `robots.txt` with explicit AI-crawler allow rules

Updated to explicitly Allow each major 2026 AI crawler:
- `GPTBot` (ChatGPT training)
- `ChatGPT-User` (real-time browse-the-web answers)
- `ClaudeBot` (Anthropic training)
- `Claude-Web` (real-time Claude searches)
- `PerplexityBot` (Perplexity)
- `Google-Extended` (Gemini training)
- `Applebot-Extended` (Apple Intelligence)
- `CCBot` (Common Crawl — feeds many open-source LLMs)

**Why explicit:** the most common reason a domain isn't cited by AI engines is an unintentional block. Many domains use a wildcard Disallow that blocks AI bots inadvertently. Our `robots.txt` is now defensively explicit.

### 2.4 — sitemap.xml updated

`/llms.txt` added to the sitemap so crawlers find it without guessing.

---

## Section 3 — Content gap analysis

What the search/AI world expects to find about a "browser font editor" in 2026, and whether Patens has it:

| Need | Patens has? | Action |
|---|---|---|
| Tool description (1 paragraph) | ✅ /about + llms.txt + home meta description |
| Feature list (extractable) | ✅ /about + WebApplication.featureList + README |
| Pricing | ✅ Free (open source) — in WebApplication.offers + /about |
| Screenshots / demo images | ⚠️ Hero image placeholder in README; needs real screenshot |
| Video walkthrough | ❌ None — biggest gap for AI citation (LLMs heavily weight YouTube) |
| How-to-make-a-font tutorial blog post | ❌ None — biggest gap for SEO long-tail |
| Comparison vs FontLab / Glyphs / Glyphr | ❌ Stated in llms.txt + strategy.md but no dedicated public page |
| Roadmap | ✅ ROADMAP.md (linked from /about) |
| Changelog | ✅ /changelog + RSS feed |
| Help / FAQ | ✅ /help with 17 questions + FAQPage schema |
| Setup / install docs | ✅ docs/setup.md |
| Security policy | ✅ SECURITY.md |
| License | ✅ MIT, stated in package.json + /about + llms.txt |
| Contact | ✅ hi@patens.design, security@patens.design, social handles |
| Wikipedia entry | ❌ Notability bar high; not eligible until 100+ external citations |
| Press / reviews | ❌ None yet — that's what launch is for |
| GitHub README | ✅ Patens-current with capabilities table |
| Reddit / forum mentions | ❌ Zero — that's what launch is for |

**The two biggest content gaps:** (1) a tutorial blog post like *"How to make your first font in the browser"* (SEO long-tail gold), and (2) a video walkthrough (LLMs over-weight video content for citation confidence). Both are post-launch projects.

---

## Section 4 — Positioning: the elevator pitch matrix

Because AI extraction windows are short, the first 80 words of every page must establish Patens unambiguously. Different surfaces need different angles of the same truth.

### 4.1 — The canonical one-sentence positioning

> **Patens is a browser-native, open-source type design environment with a 94-code teaching audit — for designers between sketching a logo and shipping a real font.**

This sentence:
- Names the category (type design environment)
- Names the differentiator (browser-native, open source)
- Names the unique angle (teaching audit)
- Names the audience (designers in the gap between sketch and ship)

Use this verbatim on the home page meta description, /about lead, and the Show HN body.

### 4.2 — Surface-specific framings

| Surface | Framing |
|---|---|
| Home page H1 / hero | "Design your own typeface, one glyph at a time" (emotional, evocative) |
| Meta description | The canonical sentence above |
| /about lead | "Patens is Latin for *lying open* — root of *patent*, used here for the opposite." (etymology hook) |
| llms.txt | Canonical sentence + capabilities list + comparison table (extractable structure) |
| Show HN title | `Show HN: Patens – browser-native, open-source type design` (HN convention) |
| Show HN body | The canonical sentence + demo URL + one paragraph of substance + tech stack footer |
| TypeDrawers post title | `Patens — open-source type design in the browser, looking for community feedback` (community-norm) |
| Reddit r/typography | "I built a type design environment that runs entirely in the browser — and made it open source" (lead with work) |
| X / Bluesky thread 1 | "Patens — open-source type design that lives in a browser tab." |
| README hero | "Browser-native, open-source type design. Draw glyphs, kern them, ship OpenType." |
| GitHub repo description | "Browser-native, open-source type design environment. Draw, kern, ship OpenType. Latin for 'lying open.'" |

### 4.3 — Anti-positioning (what to never say)

- **"FontLab replacement" / "Glyphs replacement"** — invites wrong comparison; you'll lose every feature-by-feature comparison head-to-head
- **"AI-powered type design"** — the AI features are user-key-gated side doors, not the marquee
- **"First browser-based type editor"** — false (Glyphr Studio predates by years)
- **"Drag-and-drop fonts"** — signals you don't know type design
- **"No code required"** — designers don't think they need code; the phrase implies otherwise
- **"For designers, by designers"** — circular
- **"Foundry-grade"** — meaningless until a foundry uses it

---

## Section 5 — Content roadmap (post-launch SEO + AIO play)

Three months of content to build the multi-source consensus AI engines need to cite Patens confidently. Each piece is also a long-tail SEO play targeting designers searching for type-design help.

### Month 1 — Foundation content

**Week 1 — Blog post 1**: *"How I built a browser-native type editor: lessons from 8 months of solo development"*
- Targets dev-tool / SvelteKit / indie-hacker audience
- Posts on personal blog (or dev.to / Hashnode if no personal blog)
- Links to patens.design
- AIO value: establishes you as the builder + a credible voice

**Week 2 — Blog post 2**: *"How to make your first font in the browser: a 30-minute walkthrough with Patens"*
- Targets the SEO long-tail search "how to make a font" (high intent)
- Step-by-step with screenshots
- Posts on patens.design/learn/first-font (new route, prerendered)
- AIO value: definition-first content, How-To structure, screenshots = high citation weight

**Week 3 — Comparison page**: `patens.design/compare`
- Honest comparison vs Glyphr Studio, Fontra, FontLab, Glyphs, typlr.app
- Each row in the comparison table is a citation hook for AI engines
- Don't disparage competitors — link to them, describe them accurately, position Patens by gap not by sneer
- AIO value: comparison content is gold for citation ("which type editor is best for X" → AI extracts from comparison tables)

**Week 4 — Tutorial blog post 3**: *"94 audit codes: how Patens teaches type design through its error messages"*
- Targets the "teaching-first" positioning angle
- Walks through 5 representative codes with examples
- Posts on patens.design/learn/audit-codes
- AIO value: deep content, specific data, technical authority

### Month 2 — Community + amplification

**Week 5 — YouTube channel**: *"Patens in 60 seconds"* short + *"Sketch to OTF in 15 minutes"* long
- LLMs over-weight YouTube; this is the single biggest AI-citation lift
- Embed videos on /learn pages
- Cross-post short to TikTok / Instagram Reels if you have those accounts

**Week 6 — Guest post / podcast**: pitch a podcast like *Type Cast*, *Letterform Archive Salons*, or a designer-tools-focused podcast
- One mention from a respected voice does more for AI citation than 50 indie blog posts

**Week 7 — Reddit AMA in r/typography or r/typedesign**: announce in advance, prep with the existing FAQ content
- AMAs are heavily indexed by Reddit and by Google + AI training pipelines

**Week 8 — Submit to Sidebar.io + Indiebase + designer-tool aggregators**: by now you have 2 months of content to point at

### Month 3 — Sustained signal

**Weekly**: one short blog post (300-500 words) on a specific type-design topic. Examples:
- "Why my g looks wrong: spine, ear, and the geometry of a double-storey g"
- "The 5 audit codes every beginner triggers (and why they matter)"
- "OFL vs MIT for self-distributed type designers"
- "How to space a typeface: my read on Frank Blokland's chapter"

Each post: under 800 words, definition-first, screenshots, link to Patens demo where relevant. Posted on patens.design/learn/* (new section).

**Monthly**: a "what shipped in v1.X" recap post linking the changelog. Doubles as an RSS-feed-friendly post.

---

## Section 6 — The combined 14-day launch sequence

Distribution + AIO + SEO coordinated.

| Day | Action | Lever |
|---|---|---|
| **0 (today)** | Ship llms.txt + WebApplication schema + robots.txt updates | **AIO foundation** |
| **0** | Add GitHub Sponsors button to repo | infra |
| **1** | Claim `@patens.design` on Bluesky (TXT record at `_atproto.patens.design`) | identity |
| **1** | Claim `@patenstype` on X | identity |
| **1** | Set up Google Workspace for `hi@patens.design` + `security@patens.design` | infra |
| **2** | Post on TypeDrawers, "Type Design" category, feedback-request framing | distribution (community) |
| **3** | Reddit r/typography (text post, lead with the work) | distribution + AI-training-signal |
| **3-4** | DM 5-10 designers / friends | distribution (warm) |
| **5-7** | Read feedback; iterate; don't post elsewhere | learning |
| **8 (Tue)** | **Show HN at 9:30 AM Pacific** | distribution (peak) |
| **8** | Bluesky launch thread + X mirror | distribution (social) |
| **9** | Submit Google Search Console + verify ownership | SEO infra |
| **9** | Submit to Bing Webmaster Tools (still routes to ChatGPT search) | SEO + AIO infra |
| **10** | r/programming + r/sveltejs if Show HN was strong | distribution (dev) |
| **10** | Submit URL to ChatGPT via the "browse with ChatGPT" feature (asks the model to look at your site, prompting indexing) | AIO |
| **11** | Write blog post 1 (lessons from 8 months) | content |
| **12** | "What we learned in week 1" recap thread on Bluesky | distribution |
| **13** | Publish blog post 1 | content |
| **14** | Submit to Sidebar.io + Indiebase + Awesome lists | distribution (long tail) |

---

## Section 7 — Specific changes needed in the UI (action items beyond this commit)

These are concrete things to add or update in the Patens app to fully realize the AIO + SEO posture:

### 7.1 — Already shipped in this commit
- ✅ `static/llms.txt`
- ✅ `WebApplication` JSON-LD on home page
- ✅ `robots.txt` with explicit AI-crawler allow rules
- ✅ `/llms.txt` added to sitemap.xml

### 7.2 — Short-term (this week)
- [ ] Add `BreadcrumbList` JSON-LD to /help, /changelog, /about (helps AI engines understand site hierarchy)
- [ ] Add an `Organization` or `Person` JSON-LD block to /about (entity linking)
- [ ] Add `sameAs` array (X, Bluesky, GitHub) to the home page's WebApplication block — **done in this commit**
- [ ] Deepen /about lead — current is too short for AI extraction; should be 80-150 words of definition-first content
- [ ] Add a `/compare` page (Patens vs Glyphr Studio / Fontra / typlr / FontLab / Glyphs)
- [ ] Add a `/pronunciation` URL or pronunciation guide on /about (small detail; LLMs answer pronunciation questions specifically)

### 7.3 — Medium-term (this month)
- [ ] Add `/learn/first-font` tutorial route
- [ ] Add `/learn/audit-codes` walkthrough route
- [ ] Take real screenshots; replace README hero placeholder
- [ ] YouTube channel: 60-second teaser + 15-min walkthrough
- [ ] Submit Google Search Console + Bing Webmaster Tools

### 7.4 — Long-term (3-6 months)
- [ ] Wikipedia entry (when notability threshold met — usually 3+ independent secondary-source citations like *Wired*, *Smashing Magazine*, *Creative Bloq*, *The Verge*)
- [ ] Press kit page with logo / hero shots / brand colors / pronunciation note
- [ ] Designer testimonials section
- [ ] /vs-fontlab, /vs-glyphs, /vs-glyphr-studio (one comparison page per competitor, each is its own SEO long-tail target)

---

## Section 8 — Tracking + iteration

You don't know what's working without measuring. Set up:

### 8.1 — SEO tracking (Day 9 task)
- **Google Search Console** — submit sitemap.xml, monitor index coverage, see queries that surface patens.design
- **Bing Webmaster Tools** — same but for Bing (also feeds ChatGPT browse-the-web)
- **Plausible** or **Fathom** — privacy-friendly analytics (Google Analytics is overkill and tracks too much)

### 8.2 — AIO tracking (the trickier part)
Direct citation tracking is still a developing discipline in 2026. Three free signals:
- **Manual queries**: every two weeks, ask ChatGPT / Claude / Perplexity / Gemini "what's a good browser-based font editor?" and note whether Patens is mentioned + how it's described
- **Brand mentions in your repo's traffic**: Vercel Analytics referrer column shows where visitors come from; ChatGPT links show up as `chatgpt.com` referrers
- **GitHub stars-over-time**: stars correlate weakly with AI mentions; sudden spikes often follow citation in a high-visibility AI response

### 8.3 — Community signal
- TypeDrawers thread replies + reply latency
- Reddit upvote-to-comment ratio (higher comments = stronger AI-training signal)
- Bluesky reposts + replies

---

## Section 9 — Things to deliberately NOT do

The temptation list. Each of these wastes time + can actively damage the launch.

- **❌ Don't buy backlinks.** Will get flagged + tank Google ranking.
- **❌ Don't write fake reviews.** Designers smell them instantly + AI engines now detect generated content.
- **❌ Don't pay for Product Hunt boosts.** Universally backfires for indie design tools.
- **❌ Don't run ads.** $0 ROI on niche design tools.
- **❌ Don't try to "trick" AI engines with keyword stuffing.** They actively penalize this in 2026.
- **❌ Don't submit to 100 SaaS directories.** 95% are SEO link farms that hurt more than help.
- **❌ Don't make a TikTok strategy unless you naturally already make TikToks.** Disingenuous content is more visible than authentic content.
- **❌ Don't compare to Glyphs / FontLab head-to-head.** Wrong frame.
- **❌ Don't auto-DM people on X / Bluesky.** Death in the design community.
- **❌ Don't paywall the core editor.** Open-source positioning dies.
- **❌ Don't add a press release.** Press releases are SEO noise in 2026.
- **❌ Don't pitch *It's Nice That* / *Sidebar* until 3+ designers have shipped fonts with Patens.** They cover work, not tools.

---

## Sources (May 2026)

### AIO / GEO
- [GEO 2026 Guide to AI Search Visibility — LLMrefs](https://llmrefs.com/generative-engine-optimization)
- [Generative Engine Optimization Best Practices 2026 — GenOptima](https://www.gen-optima.com/geo/generative-engine-optimization-best-practices-2026/)
- [Backlinko — GEO: How to Win in AI Search](https://backlinko.com/generative-engine-optimization-geo)
- [Sapt — AI Search Optimization 2026 Guide](https://sapt.ai/insights/ai-search-optimization-complete-guide-chatgpt-perplexity-citations)
- [Frase — GEO Playbook for AI Citations](https://www.frase.io/blog/how-to-get-cited-by-ai-search-engines-the-complete-geo-playbook)

### llms.txt
- [State of llms.txt 2026 — aeo.press](https://www.aeo.press/ai/the-state-of-llms-txt-in-2026)
- [Codersera — llms.txt complete guide May 2026](https://codersera.com/blog/llms-txt-complete-guide-2026/)
- [Bluehost — What is llms.txt](https://www.bluehost.com/blog/what-is-llms-txt/)

### Schema.org structured data
- [Google — SoftwareApplication structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Google — FAQPage structured data (deprecated for rich results May 2026)](https://developers.google.com/search/docs/appearance/structured-data/faqpage)
- [Schema Markup for SaaS — SALT.agency](https://salt.agency/blog/schema-for-saas-companies-salt-agency/)
- [SoftwareApplication Schema Guide — RankSight](https://ranksightai.com/blog/software-app-schema-guide-2025)

### SEO vs GEO
- [WordStream — GEO vs SEO 2026](https://www.wordstream.com/blog/generative-engine-optimization)
- [Pimberly — GEO vs SEO Comparison 2026](https://pimberly.com/blog/geo-vs-seo-a-comparison-for-2026/)
- [SEO.ai — Generative Engine Optimization vs SEO](https://seo.ai/blog/generative-engine-optimization-geo-vs-search-engine-optimization-seo)

### Wikipedia notability
- [Wikipedia:Notability (software)](https://en.wikipedia.org/wiki/Wikipedia:Notability_(software))
- [Wikipedia:Notability/RFC: Free OSS](https://en.wikipedia.org/wiki/Wikipedia:Notability/RFC:Notability_of_free_open_source_software)

### Distribution + community (cross-referenced from strategy.md)
See `docs/launch/strategy.md` for the full distribution research bibliography.
