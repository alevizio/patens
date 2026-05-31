# GitHub Sponsors profile — copy + tier structure

Paste this into the GitHub Sponsors onboarding at
<https://github.com/sponsors/dashboard>.

Approval typically takes 1–2 weeks. The application asks for:
- Eligibility (open-source, public benefit) — easy yes
- Bio + photo
- Sponsorship tiers + descriptions
- Payout info (Stripe Connect — bank or debit card)

---

## Bio (max 300 characters)

> Patens — browser-native, open-source type design. MIT licensed.
> Maintained by Alejandro Vizio. patens.design

## Short bio (alt — 150 chars for some surfaces)

> Building Patens, a browser-native open-source type design tool.
> MIT. patens.design

## Long description (the main pitch — what shows above the tier list)

> # Hi, I'm Alejandro.
>
> I build **Patens** — a browser-native, open-source type design
> environment. It runs entirely in your browser, never asks for an
> account, and ships a real OpenType font at the end.
>
> The differentiator is teaching. Patens's 102-code audit module
> explains every warning in plain English and offers one-click
> fixes for ~30 of them. It's the editor I wish I'd had when I was
> learning the craft — and it's free under the MIT License, forever.
>
> ## What your sponsorship funds
>
> Sponsorship lets me commit more weekly hours to Patens. The
> direct beneficiaries of your support:
>
> - **Free + open access** to a professional-grade type design tool
>   for designers in regions where €300–500 desktop software isn't
>   accessible.
> - **Accessibility work** — including the v2 milestone of making
>   the drawing surface usable by screen-reader users.
> - **Multi-script depth** — bespoke Cyrillic shapes (Я Ж Ф), full
>   Greek lowercase, and the cultural-literacy work that no AI tool
>   can replicate.
> - **The audit module** as a living teaching reference — every
>   warning is also an explanation, and the explanations get
>   sharper with use.
>
> ## What it doesn't fund
>
> - The core editor will never be paywalled. MIT-licensed core,
>   forever.
> - I won't accept sponsored-feature-priority above 20% of the
>   roadmap. The community + my own design judgement set scope.
> - Patens doesn't have an analytics SDK; I don't sell user data.
>
> ## Thank you
>
> Every sponsor lets me spend an evening on Patens instead of
> something else. That's the real currency.
>
> — Alejandro
> hi@patens.design · patens.design · github.com/alevizio/patens

---

## Sponsorship tiers

Three tiers, intentionally modest. The 2026 GitHub Sponsors data
shows solo-dev projects average **3 active sponsors at the $5/mo
level** within 6 months of launch; the $25 + $100 tiers fill more
slowly. Don't over-design tier benefits — community sees through
artificial scarcity.

### Tier 1 — Coffee ($5/month)

> **For**: anyone who's used Patens and wants to say thanks.
>
> **What you get**:
> - My genuine appreciation. (Solo-dev side projects run on these.)
> - Recognition in CONTRIBUTORS.md (opt-in)
> - The warm feeling of supporting open-source type design.
>
> **Time cost to me**: zero. I won't tax sponsors with extra work.

### Tier 2 — Founding supporter ($25/month)

> **For**: type designers, foundries, and educators who use Patens
> at work or in teaching.
>
> **What you get**:
> - Everything in Coffee tier.
> - Your name (or your foundry's name) in a "Founding supporters"
>   section in README + on the /about page.
> - Early access to roadmap planning — you'll be CC'd on the
>   monthly roadmap email + can reply with priorities.
> - Sticker pack (mailed once after 3 months of sponsorship,
>   while supplies last — the print-on-demand limit is real).
>
> **Time cost to me**: low. The roadmap email already exists; you
> just get cc'd.

### Tier 3 — Production user ($100/month)

> **For**: foundries / studios shipping commercial work using
> Patens. Or anyone who wants to materially support the project.
>
> **What you get**:
> - Everything in lower tiers.
> - A monthly 30-min Zoom with me. Bring questions about your
>   workflow, your projects, or the codebase. (Cancel anytime;
>   I won't chase if you skip.)
> - First look at unreleased features in a private Discord channel
>   (set up once 5+ sponsors are at this tier).
> - Acknowledgement in every release's notes.
>
> **Time cost to me**: ~30 min/month per Tier-3 sponsor. Cap at 10
> sponsors (5h/month max).

---

## One-time sponsorship tiers

Some sponsors prefer a one-time gift over a subscription. Two tiers:

### One-time $50

> Same benefits as Coffee tier (recognition in CONTRIBUTORS.md,
> opt-in).

### One-time $500

> Same benefits as Founding supporter tier, for a year.
> Sticker pack included.

---

## FUNDING.yml content

Save as `.github/FUNDING.yml` in the repo:

```yaml
# https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository

github: alevizio

# Add Polar once the account is live (see polar-setup.md):
# polar: alevizio

# Optional one-off platforms:
# ko_fi: alevizio
# buymeacoffee: alevizio

# Custom URL — point at Patens's own /sponsor or /about page if you
# want to control the messaging. Not needed initially.
# custom: ['https://patens.design/sponsor']
```

This file adds a "Sponsor" button at the top of the repo + every
PR + every issue. Zero-friction discovery.

---

## What I won't do (transparency)

State explicitly so sponsors set realistic expectations:

- I won't gate any current editor feature behind sponsorship.
- I won't add a "Sponsored by..." watermark on exported fonts.
- I won't share sponsor lists with anyone — your sponsorship is
  visible publicly on your own GitHub profile, but I won't email
  / call / DM beyond what your tier explicitly includes.
- I won't accept sponsorship from companies whose business is
  hostile to open source (no need to name names; you know who).
- I'll publish quarterly transparency reports listing sponsor
  count + total income (not individual amounts) so the community
  can see the model is working.

---

## Quick action list

- [ ] Apply at <https://github.com/sponsors/dashboard>
- [ ] Wait 1–2 weeks for approval
- [ ] Paste bio + long description from above
- [ ] Configure the three tiers from above
- [ ] Configure Stripe Connect (bank or debit card payout)
- [ ] Commit `.github/FUNDING.yml` (see content above)
- [ ] Once approved, update README badge to active Sponsors link
- [ ] Mention in `/press` page that Sponsors is live
- [ ] First quarterly transparency post at the 90-day mark

---

Last updated: 2026-05-25.
