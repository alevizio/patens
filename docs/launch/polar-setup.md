# Polar creator account — setup checklist + product list

Polar is the **2026 winner** for solo OSS devs who want paid extras
(templates, courses, custom orders, priority support) layered on top
of MIT core. Compared to GitHub Sponsors:

- **EU VAT handled automatically** — Sponsors doesn't.
- **One-time + subscription** — Sponsors does both but the UX is
  rougher.
- **Issue-funding mechanic** — Patens-specific use: a sponsor can
  "fund" a particular GitHub issue and Polar tracks it.
- **Stripe-backed payouts** — same plumbing as Sponsors.

Sign up at <https://polar.sh/>. Approval is automatic (no review
waiting period like Sponsors).

---

## Account creation

1. Sign in with GitHub OAuth at <https://polar.sh/>.
2. Choose "Creator" account type.
3. Connect Stripe (need a bank account in a supported country —
   US, EU, UK, AU, CA are the canonical set).
4. Configure tax settings — Polar auto-collects EU VAT on EU sales
   if you tick the "I sell to EU customers" box. Recommended yes;
   the alternative is registering for OSS yourself.
5. Verify your identity (Stripe KYC — typically driver's license
   photo + selfie). Approval is usually instant.

---

## Creator profile copy

### Display name

> Patens by Alejandro Vizio

### Tagline (max 100 chars)

> Browser-native, open-source type design. MIT licensed. patens.design

### Bio

> Hi, I'm Alejandro. I build **Patens** — a browser-native, open-source
> type design environment, MIT-licensed, at <https://patens.design>.
>
> The MIT core is free, forever. This Polar page is for paid extras:
> commissioned glyph sets, type-design tuition, foundry consulting,
> sticker packs, and named foundry support.
>
> Find me elsewhere:
> - GitHub: [alevizio](https://github.com/alevizio)
> - Bluesky: [@patens.design](https://bsky.app/profile/patens.design)
> - X: [@patenstype](https://x.com/patenstype)
> - Email: hi@patens.design

### Profile photo

Same image as your GitHub profile. Polar resizes; 400x400 PNG is fine.

### Cover image

If you have one: the OG image at `https://patens.design/og/brand`
(1200x630). Polar accepts it directly via URL.

---

## Products to list

Polar supports both **subscriptions** (recurring) + **one-time
products** + **commissions** (open-ended commission requests).

Start with five products covering the meaningful price points + use
cases. Don't list dozens — Polar's discovery surface rewards focus.

### Product 1 — "Patens sticker pack" ($15 one-time)

> **What**: Five vinyl stickers — Patens wordmark, "Hn" mark,
> "audit-fixable" pill, the lowercase n, the audit-code pattern.
> Print-on-demand via Sticker Mule or similar.
>
> **Photo**: Mock-up of the sticker sheet on a desk. (Generate one
> with a sticker preview tool; doesn't need to be physical yet.)
>
> **Description**: A vinyl sticker pack for your laptop, notebook,
> or print bin. Supports the project. Ships within 2 weeks
> world-wide. Free for sponsors at the $25+ tier.
>
> **Time cost**: order via Sticker Mule (~$1.50/pack at 100-pack
> minimum); ship 1–2x per month as orders accumulate. Fold the
> ~$13.50 margin back into print cycles + sponsor stickers.

### Product 2 — "Founding supporter" ($25/month subscription)

Mirror the Tier-2 description from sponsors-profile.md.

> **What you get**:
> - Name (or foundry name) in /about Founding Supporters section
> - Cc'd on monthly roadmap email
> - Sticker pack mailed at 3 months
> - "Founding supporter" badge in the Patens Discord (when live)
>
> **Time cost**: low. Roadmap email is one bulk send.

### Product 3 — "Production user" ($100/month subscription)

Mirror the Tier-3 description from sponsors-profile.md, with the
30-min monthly Zoom call.

> **Cap**: 10 active subscribers (5h/month commitment).
> Polar lets you set inventory; cap to 10.

### Product 4 — "Type design consultation" (commission, $200/hour)

> **What**: Open-ended commission request — designers / foundries
> commission specific work.
>
> **Examples of work I'll take**:
> - "Help me set up my project for a multi-script font"
> - "Walk me through the audit module + interpret the warnings on my font"
> - "Help me ship my first variable font end-to-end"
> - "Review the kerning on this typeface"
> - "Set up Patens for use in a type-design class I'm teaching"
>
> **Examples I won't take**:
> - "Build my whole typeface for me" (not what I do)
> - "Reverse-engineer this proprietary font" (license-flavored)
> - "Implement feature X in your codebase for me" (open a GitHub
>   issue instead)
>
> **Time cost**: per-commission; price each at $200/hour. Initial
> 15-min scoping call free.

### Product 5 — "Custom glyph set" (commission, starts at $500)

> **What**: Bespoke glyph design — a logo wordmark, a small Latin
> set, a script extension, multi-script extension.
>
> **Process**: Initial 30-min scoping call (free); written
> proposal with timeline + price; 50% upfront, 50% on delivery.
>
> **Pricing range**: $500 for a 5-glyph logo; $2000 for a 30-glyph
> Latin set; $5000+ for a full multi-script extension. Custom
> quote per request.
>
> **Time cost**: per-commission; can be high. Take 1-2/quarter
> max while solo.

---

## Issue funding setup (Polar-specific feature)

Polar lets sponsors **fund specific GitHub issues**. Setup:

1. In Polar dashboard, connect to GitHub.
2. Authorize Polar's GitHub App on the alevizio/patens repo.
3. Polar auto-detects issues + lets sponsors pledge any USD amount
   to specific ones.
4. When you close the issue, Polar releases the funds to you
   minus a small platform fee (~5%).

This is the most powerful Polar feature for OSS — sponsors can
prioritize specific work. Recommended: enable, but set expectations:

- Pledges are voluntary suggestions, not contracts.
- I'll work on what makes sense for the project regardless of
  pledges. Bigger pledges are signal, not direction.
- I won't accept pledges that pull the project away from its
  philosophy (see DESIGN_PHILOSOPHY.md).

---

## What I won't do via Polar

- White-label / rebrand-and-sell the codebase
- Build features that gate the MIT core behind a paywall
- Develop features that conflict with the design philosophy
- Take a commission that requires me to keep the work proprietary
  (everything I ship for / via Patens stays in the repo)

---

## Tax + admin setup

- **VAT**: tick "I sell to EU customers" in Polar tax settings.
  Polar handles the VAT-OSS registration + remittance automatically.
- **US sales tax**: Polar collects via Stripe Tax. Set your nexus
  state (where you live) once.
- **Form 1099 / W-9**: Polar issues a 1099 at year-end if you're
  US-based. Treat as self-employment income; the schedule-C is the
  default tax form.

---

## FUNDING.yml update

Once Polar is live, add to `.github/FUNDING.yml`:

```yaml
github: alevizio
polar: alevizio  # ← uncomment this line
```

This adds Polar to the "Sponsor" dropdown at the top of the repo
alongside GitHub Sponsors.

---

## Quick action list

- [ ] Sign in to <https://polar.sh/> with GitHub
- [ ] Choose "Creator" account type
- [ ] Connect Stripe Connect (~10 min KYC)
- [ ] Configure tax settings (VAT-OSS, Stripe Tax for US)
- [ ] Set profile photo + cover image
- [ ] Paste bio (above)
- [ ] Add the 5 products above (sticker, $25 sub, $100 sub, consultation, custom glyph)
- [ ] Authorize Polar GitHub App for issue-funding feature
- [ ] Test with a $5 pledge to a real issue from a different account
- [ ] Update `.github/FUNDING.yml` with the `polar: alevizio` line
- [ ] Mention Polar in the /press page + /about page

---

Last updated: 2026-05-25.
