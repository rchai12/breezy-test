# Spec 09: Signup Flow, Phase 5 (Confirmation and Signed-in Homepage)

## Context
The signup flow is plans → register → payment → **confirmation**. Phases 1–4 are done (`specs/02`–`07`). Spec 08 (plans page mobile fixes) should be done first. By the time the user reaches `confirmation.html`, flow state holds:
- `planId`
- `account`: `{ accountId, firstName, lastName, email }`
- `subscription`: `{ subscriptionId, planId, status, startedAt, firstChargeAt, amountCents, card: { brand, last4 } }`

**Prerequisite:** `npm test` passes with 0 skipped before you start. If it doesn't, stop and report.

This phase builds:
1. The **confirmation page**: a summary of the new subscription, a "what happens next" list, a Back to Breezy button, a joke "Cancel subscription" dialog, and a one-time **breathing animation** around the edges of the screen.
2. A **"one month later" date function** in `billing.js`, for Casual's next charge.
3. A **signed-in indicator on the homepage** showing the user's name and plan tier.
4. An **end-to-end journey test** covering the whole flow.

## Hard constraints (unchanged)
- No build step, frameworks or ES modules. Everything works from `file://`.
- One responsibility per file.
- No `innerHTML`. **Names and emails typed by users are displayed only with `textContent`.**
- Code style as before. `npm test` passes at the end with 0 skipped.

## Files
| File | Change |
|---|---|
| `js/billing.js` | Add `addMonths(date, n)` |
| `js/pages/confirmation.js` | Rewrite: summary, cancel dialog, animation |
| `js/components/breath-overlay.js` | **New.** The one-time breathing animation |
| `signup/confirmation.html` | Page markup; script tags |
| `js/home-account.js` | **New.** Signed-in indicator on the homepage |
| `breezy-intern-test.html` | Script tags; one empty container in the mid-bar and one in the mobile menu |
| `css/signup.css` | Confirmation layout, dialog, overlay |
| `css/home.css` | Account indicator |
| Tests | See "Tests" below |

---

## 1. `js/billing.js`: `addMonths(date, n)`
```js
/** Returns a new Date n calendar months after `date`, clamped to the last day of the target month
 *  (Jan 31 + 1 → Feb 28, or Feb 29 in a leap year). Never mutates `date`. Keeps the time of day. */
addMonths(date, n)
```
Implementation: copy the date, remember the day of the month, set the day to 1, add `n` months, then set the day to `min(originalDay, daysInTargetMonth)`. Days in a month: `new Date(year, month + 1, 0).getDate()`.

**Next charge rule** (used by the confirmation page):
- `status === 'trialing'` → the next charge is `firstChargeAt`
- `status === 'active'` → the next charge is `addMonths(new Date(startedAt), 1)`

## 2. Confirmation page

### Content
```
            (breathing animation plays once around the screen edges)

  You're all set. Inhale.
  Welcome to Breezy, Ada.

  ┌──────────────────────────────────────────────────────────────┐
  │ Plan            Power Inhaler                                │
  │ Status          Free trial                                   │
  │ Billing         Your 7-day free trial has started. We'll     │
  │                 charge $29 to [VISA] •••• 4242 on Oct 7.     │
  │ Account         Ada Breath · ada@example.com                 │
  │ Reference       sub_3f9a1c2b7d4e                             │
  └──────────────────────────────────────────────────────────────┘

  What happens next
  1. Enjoy a breath of air with every breath.
  2. Please do not email us.
  3. Thank you for your donation.

  [ Back to Breezy ]          Cancel subscription
```

**Billing sentence** (dates via `Breezy.billing.formatDate`):
- **trialing:** "Your {trialDays}-day free trial has started. We'll charge **{price}** to {logo} •••• {last4} on **{firstChargeAt}**."
- **active:** "We charged **{price}** to {logo} •••• {last4} {today | on {startedAt date}}. Next charge: **{price} on {addMonths(startedAt, 1)}**."
  - Use "today" when `startedAt` is on the same local date as now; otherwise "on Sep 30".

`{price}` is `formatPrice(subscription.amountCents)`. `{logo}` is the Phase 4 brand image (`../assets/card-brands/<brand>.svg`, height 20, `alt` from `Breezy.cardFormat.BRAND_NAMES`), with the brand name also available to screen readers through the `alt`. Status labels: `trialing` → "Free trial", `active` → "Active".

The "What happens next" text is exactly the three lines shown (the user's copy).

### `signup/confirmation.html`
Keep the Phase 1 shell. Content:
```html
<section class="signup-card confirmation" aria-labelledby="step-title">
  <h1 id="step-title">You're all set. Inhale.</h1>
  <p class="welcome-line"><!-- "Welcome to Breezy, {firstName}." --></p>
  <dl class="subscription-summary">
    <!-- rows built by confirmation.js: <div class="summary-row"><dt>Plan</dt><dd>…</dd></div> -->
  </dl>
  <h2 class="next-title">What happens next</h2>
  <ol class="next-steps">
    <li>Enjoy a breath of air with every breath.</li>
    <li>Please do not email us.</li>
    <li>Thank you for your donation.</li>
  </ol>
  <div class="confirmation-actions">
    <a class="btn btn-primary" href="../breezy-intern-test.html">Back to Breezy</a>
    <button type="button" class="link-button" id="cancelBtn">Cancel subscription</button>
  </div>
</section>

<dialog class="cancel-dialog" id="cancelDialog" aria-labelledby="cancel-title">
  <h2 id="cancel-title">Cancel your subscription</h2>
  <p>We're sorry to see you exhale. To cancel, please complete these steps:</p>
  <ol>
    <li>Fill out our 23-page cancellation form.</li>
    <li>Attend an exit interview with our Air Retention Specialist.</li>
    <li>Solve a CAPTCHA that is actually a lung capacity test.</li>
  </ol>
  <p class="dialog-note">Your subscription has not been changed.</p>
  <button type="button" class="btn btn-primary" id="cancelContinue">Continue</button>
</dialog>
```
The cancel steps echo the site's existing FAQ answer ("Can I cancel anytime?").

### `js/pages/confirmation.js` (rewrite)
On `DOMContentLoaded`:
1. `if (!Breezy.flow.guard('confirmation')) return;` and the storage warning (as before).
2. `Breezy.breathOverlay.play()` (section 3).
3. Fill the welcome line and the summary rows from `state.subscription`, `state.account` and `Breezy.plans.get(subscription.planId)`, using DOM methods and `textContent` only.
4. **Cancel dialog:**
   - `#cancelBtn` opens it with `dialog.showModal()`. That gives native focus trapping, Escape to close, and a backdrop.
   - `#cancelContinue` just closes it (`dialog.close()`). **It doesn't navigate, cancel or change any state**, as the user decided.
   - On the dialog's `close` event (Continue or Escape), move focus back to `#cancelBtn`.
5. Don't modify flow state anywhere on this page.

## 3. Breathing animation: `js/components/breath-overlay.js`
A soft blue glow that comes in from the edges of the screen toward the center and goes back out, **once, over 2 seconds**, when the confirmation page loads. The center stays clear, so the page is readable throughout.

`Breezy.breathOverlay.play()`:
- If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, do nothing.
- Otherwise, append `<div class="breath-overlay" aria-hidden="true"></div>` to `<body>`, and remove it on its `animationend` event.

CSS (`css/signup.css`):
```css
/* Registered so the browser can animate the gradient's clear radius smoothly. */
@property --breath-clear {
  syntax: '<percentage>';
  inherits: false;
  initial-value: 100%;
}

.breath-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  pointer-events: none;            /* never blocks clicks */
  background: radial-gradient(
    ellipse farthest-corner at center,
    rgba(56, 189, 248, 0) var(--breath-clear),
    rgba(56, 189, 248, 0.28) calc(var(--breath-clear) + 25%),
    rgba(14, 165, 233, 0.5) calc(var(--breath-clear) + 50%)
  );
  animation: breathe 2s ease-in-out 1 forwards;
}

@keyframes breathe {
  0%, 100% { --breath-clear: 100%; }   /* clear to the corners: invisible */
  50%      { --breath-clear: 45%; }    /* inhale: blue reaches in from the edges */
}
```
**How it works:** the overlay is a radial gradient shaped like the screen (an ellipse reaching the corners). Everything inside `--breath-clear` is transparent, and beyond it the blue deepens toward the edges. Animating `--breath-clear` from 100% down to 45% and back makes the blue ring close in (inhale) and retreat (exhale), while the center always stays clear. `@property` is what makes a custom property animatable. Without it the value would jump instead of glide.

The architect previewed this at its midpoint in Chromium at 1280px and 390px. The page content stays readable, and the edges glow a soft sky blue with no hard lines. (An inset `box-shadow` version was tried first and rejected: it left a visible rectangular edge.) If you tune it, change only the three alpha values and the `45%`, and report what you changed.

**Browser support:** `@property` is supported in current Chrome, Edge, Safari (16.4+) and Firefox (128+). In an older browser without it, the value can't glide, so the glow would snap on for about a second instead of breathing. That's acceptable, and the page stays usable either way.

The page must be fully usable during the animation: clicks go straight through the overlay.

## 4. Signed-in indicator on the homepage

### What it shows
Read-only. It uses the flow state from this browser tab.

| State | Indicator |
|---|---|
| no `account` | nothing (the container stays empty and takes no space) |
| `account`, no `subscription` | **Ada Breath** · "Finish signing up →", linking to `signup/payment.html` |
| `account` and `subscription` | **Ada Breath** · a plan-tier badge "Power Inhaler", linking to `signup/confirmation.html` |

### Markup (`breezy-intern-test.html`)
- In `.mid-links`, as the **first** child: `<div class="account-slot" id="accountSlot"></div>`.
- In `#mobileMenu`, as the **first** child: `<div class="account-slot account-slot--mobile" id="accountSlotMobile"></div>`.
- Scripts at the end of `<body>`, in this order: `js/plans-data.js`, `js/flow-state.js`, `js/home-pricing.js`, `js/home-account.js`, `js/home.js`. `flow-state.js` runs no guard on the homepage; it's only read.

### `js/home-account.js` (new)
In an IIFE: read `Breezy.flow.get()`. If there's an account, build the indicator with DOM methods and `textContent` into **both** slots:
```html
<a class="account-chip" href="signup/confirmation.html">
  <span class="account-chip-name">Ada Breath</span>
  <span class="plan-tier-badge">Power Inhaler</span>     <!-- or: <span class="account-chip-action">Finish signing up →</span> -->
</a>
```
Give the link an `aria-label`: "Signed in as Ada Breath, Power Inhaler plan" or "Signed in as Ada Breath, finish signing up".

### CSS (`css/home.css`)
- `.account-slot:empty { display: none; }`
- `.account-chip`: inline-flex, gap 8px, white text at 0.8rem, no text transform (names keep their case), a subtle `rgba(255,255,255,0.08)` pill background, padding 6px 12px. Hover: slightly brighter.
- `.account-chip-name`: truncate beyond 16ch with an ellipsis.
- `.plan-tier-badge`: the sky→violet gradient pill used for "Most popular", 0.7rem.
- `.account-slot--mobile`: centered, margin-bottom 16px, full-width chip up to 400px.
- The mid-bar is hidden below 1024px (existing CSS), so phones see the indicator in the mobile menu only.

## 5. Notes for the Phase 6 README
Phase 6 must include:
- **Resetting the demo:**
  1. Open DevTools on any signup page.
  2. Run `Breezy.api.resetDb(); sessionStorage.clear();` in the console.
  3. Reload.

  Signup progress is per browser tab (`sessionStorage`), so closing the tab also clears it, but the simulated accounts in `localStorage` stay until `resetDb()`.
- Opening `confirmation.html` in a new tab redirects to the plans page, because each tab has its own signup progress.

---

## Tests
Follow spec 03's conventions. Install the clock at `2026-09-30T12:00:00` in all tests below.

### Unit: `tests/unit/billing.test.js` (additions)
Use local-time dates:
- `addMonths(Sep 30 2026, 1)` → Oct 30 2026.
- `addMonths(Jan 31 2027, 1)` → Feb 28 2027; `addMonths(Jan 31 2028, 1)` → Feb 29 2028 (leap year).
- `addMonths(Dec 15 2026, 1)` → Jan 15 2027; `addMonths(Mar 31 2026, -1)` → Feb 28 2026.
- The time of day is kept, and the input isn't mutated.

### Browser: `tests/e2e/confirmation.spec.js` (new)
Seed `{ planId, account: SAMPLE.account, subscription }`, using `SAMPLE.subscription` (Power, trialing) or a Casual variant `{ …, planId: 'casual', status: 'active', startedAt: '2026-09-30T12:00:00.000Z', firstChargeAt: <same>, amountCents: 900 }`.
- **Power:** the heading is "You're all set. Inhale.", with "Welcome to Breezy, Ada." Summary: "Power Inhaler", "Free trial", "Your 7-day free trial has started. We'll charge $29 to", an image with alt "Visa", "•••• 4242 on Oct 7", "Ada Breath · ada@example.com", and "sub_test".
- **Casual:** "Active", "We charged $9 to", "today", "Next charge: $9 on Oct 30".
- **Next steps:** the three list items, with exact text.
- **User text is not interpreted as HTML:** seed `firstName: '<b>Ada</b>'` → the welcome line shows the literal text `<b>Ada</b>`, and there's no `<b>` element inside it.
- **Back to Breezy** → the homepage.
- **Cancel dialog:**
  - clicking "Cancel subscription" opens a dialog with the accessible name "Cancel your subscription" and the three steps
  - clicking Continue closes it, focus returns to "Cancel subscription", the URL is unchanged, and `Breezy.flow.get().subscription` is unchanged
  - pressing Escape also closes it
  - while it's open, the page behind can't be clicked (clicking "Back to Breezy" doesn't navigate; use `force: true` and assert the URL is unchanged)
- **Animation:**
  - `.breath-overlay` exists right after load, with `aria-hidden="true"`, computed `pointer-events: none` and `animation-duration: 2s`
  - clicking "Back to Breezy" immediately after load works, with no wait
  - dispatching `animationend` on the overlay removes it
  - with `page.emulateMedia({ reducedMotion: 'reduce' })` before `goto`, no overlay is ever added
- **Guard:** no subscription → redirects (to `payment.html` when there's a plan and account).

### Browser: `tests/e2e/home-account.spec.js` (new)
- No state → both slots are empty, and the layout is unchanged (the "Locations" link is the first visible item in `.mid-links`).
- Account only → the chip shows "Ada Breath" and "Finish signing up →", links to `signup/payment.html`, and has the right `aria-label`.
- Subscribed → the chip shows "Ada Breath" and "Power Inhaler" and links to `signup/confirmation.html`.
- Mobile (390×844): open the hamburger → the chip is the first item in the menu.
- A long name (`'Bartholomew-Maximilian'`) is truncated with an ellipsis, and the mid-bar doesn't overflow at 1280px.
- A name seeded as `<img src=x onerror=alert(1)>` renders as text: no `img` element inside the chip, and no dialog event fires.

### Browser: `tests/e2e/journey.spec.js` (new, the whole flow)
One test through the real pages. No seeding, and the clock is installed; advance it after each API call.
1. Homepage → "Start Free Trial" → the plans page with Power selected → Continue.
2. Register with first `Journey`, last `Tester`, email `journey@example.com`, password `breathe123` (both fields), and the waiver checked → submit.
3. Payment → "Use test card" → "Start free trial".
4. Confirmation shows "Power Inhaler", "Free trial", "$29" and "•••• 4242 on Oct 7".
5. "Back to Breezy" → the homepage chip shows "Journey Tester" and "Power Inhaler".
6. Clicking "Get Started" on the homepage → the plans page shows "You're already subscribed to Power Inhaler".
7. No console errors along the way (covered by the shared fixture).

### `layout.spec.js` (additions)
- The confirmation page has no horizontal overflow at 360/768/1280, with the dialog both closed and open.
- The homepage with the signed-in chip has no overflow at 360/1280.

### Regression checks (don't commit)
- In `billing.js`, drop the clamping in `addMonths` → the Jan 31 tests fail.
- In `confirmation.js`, set the welcome line with `innerHTML` → the `<b>Ada</b>` test fails.
- In `css/signup.css`, remove `pointer-events: none` from the overlay → the "click immediately after load" test fails.
- In `breath-overlay.js`, skip the reduced-motion check → the reduced-motion test fails.
- In `confirmation.js`, make Continue navigate home → the dialog test fails.

## Out of scope
- Real cancellation, a sign-out control and printable receipts. The demo reset is documented in the README (section 5).
- Changing the homepage pricing buttons for subscribed users. The plans page already shows the "already subscribed" notice.

## Deliverable
The changes above with `npm test` passing (0 skipped). Report the files changed, the test summary, the regression-check results, and any tuning of the animation values. Include a screenshot of the animation at its midpoint (pause the animation with `page.evaluate` by setting `animation-play-state: paused` and a negative `animation-delay` of `-1s`).
