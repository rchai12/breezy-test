# Spec 04: Signup Flow, Phase 2 (Plan Comparison and Selection)

## Context
The signup flow has four pages in `signup/`: plans → register → payment → confirmation. Phase 1 (`specs/02-signup-phase1-foundation.md`) built the shells, shared data, flow state and guards. The test setup (`specs/03-test-harness.md`) added unit tests (`node --test`) and Chromium browser tests (Playwright).

**Prerequisite:** spec 03 must be fully implemented and `npm test` passing before you start. Run it first. If it fails, stop and report.

This phase builds:
1. The **plans page**: a row of selectable plan cards (radio choices), a plain feature comparison table below them, and a summary bar that confirms the choice and continues to registration.
2. **Homepage pricing cards rendered from `js/plans-data.js`,** so the homepage and the plans page share one source of plan data.
3. A **billing date helper** shared by this page now and by the mock API and confirmation page later.
4. An **"already subscribed" state:** once a subscription exists, the flow can't be entered again.

## Hard constraints (unchanged from earlier specs)
- No build step, no frameworks, no ES modules. Classic `<script defer>` tags attaching to `window.Breezy`. Everything works from `file://`.
- One responsibility per file.
- **Build DOM with `document.createElement` and `textContent` only. No `innerHTML`, `insertAdjacentHTML` or template strings of markup.** Plan data is trusted today, but this habit stays safe if the data ever comes from a server.
- Code style: 2-space indentation, `const`/`let`, arrow functions, semicolons, JSDoc on public functions of shared modules only.
- `npm test` must pass at the end, including the new and updated tests below.

## Files
| File | Change |
|---|---|
| `js/plans-data.js` | Remove `bestFor`; add `highlights`; update two comparison values; add `ctaLabel(plan)` and `tableRows()` |
| `js/billing.js` | **New.** Trial and first-charge date logic |
| `js/flow-state.js` | Guards: block register/payment once subscribed |
| `js/home-pricing.js` | **New.** Renders the homepage pricing cards |
| `breezy-intern-test.html` | Replace the three hard-coded `.price-card`s with an empty container; add script tags |
| `js/components/plan-picker.js` | **New.** The selectable plan cards |
| `js/components/compare-table.js` | **New.** The read-only comparison table |
| `js/pages/plans.js` | Rewrite: page orchestration (preselection, selection, summary, continue, subscribed notice) |
| `signup/plans.html` | New page markup; add script tags |
| `css/signup.css` | Plan cards, table, summary bar, notices, swipe hint |
| Tests | See "Tests" below |

---

## 1. `js/plans-data.js` changes

### Remove `bestFor`
Delete the `bestFor` field from all three plans. It is no longer shown anywhere.

### Comparison values: use the full phrases
The table now has plain headers and more room, so the three-word limit from spec 02 no longer applies. Update:
- `blends.enterprise`: `'Premium + custom scents'` → `'3 premium + custom scent profiles'`
- `support.enterprise`: `'Dedicated manager'` → `'Dedicated Air Account Manager'`

### `highlights`
Add a `highlights` array to each plan: the bullet list shown on the **homepage** card. Copy the text exactly from the current homepage markup:
- casual: `['Up to 23,000 breaths/day', 'Standard atmospheric blend', 'Email support (we may reply)', '1 nostril optimization']`
- power: `['Unlimited breaths', '3 premium altitude blends', 'Priority support (we will reply)', 'Dual-nostril optimization', 'Monthly Air Report™']`
- enterprise: `['Everything in Power Inhaler', 'Dedicated Air Account Manager', 'Custom scent profiles', 'SSO (Single Sniff-On)', 'SLA: 99.9% oxygen uptime']`

Freeze each array. **Why both `highlights` and `comparison`?** A marketing card and a comparison table need different wording ("Everything in Power Inhaler" works on a card but means nothing in a table row). Both live in this one file, and everything that must agree (name, price, trial, popular) is stored once on the plan object.

### `ctaLabel(plan)`
Returns the call-to-action label, derived so it can't drift from the plan data:
- `!plan.selfServe` → `'Contact Sales'`
- `plan.trialDays > 0` → `'Start Free Trial'`
- otherwise → `'Get Started'`

### `tableRows()`
Returns the full list of table rows: two rows **built from plan fields**, followed by the `comparison` rows, all in the same `{ id, label, values }` shape:
```js
{ id: 'price', label: 'Price',      values: { casual: '$9/mo', power: '$29/mo', enterprise: '$99/mo' } }  // formatPrice(priceCents) + '/mo'
{ id: 'trial', label: 'Free trial', values: { casual: false,   power: '7 days', enterprise: false } }     // trialDays > 0 ? `${n} days` : false
...comparison
```
Build the two rows from `list` (never hard-code the prices), and freeze the result. Price and trial stay stored once, on the plan objects.

Expose `Breezy.plans.ctaLabel` and `Breezy.plans.tableRows`.

## 2. `js/billing.js` (new)
Exposes `Breezy.billing`:
```js
/** Date of the first charge: start + plan.trialDays calendar days (same day if no trial). Returns a new Date. */
firstChargeDate(plan, start = new Date())

/** 'Oct 7' if the date is in the same year as `relativeTo`, else 'Jan 4, 2027'. Uses 'en-US'. */
formatDate(date, relativeTo = new Date())
```
- Add days with `setDate(getDate() + n)` on a copy, so month and year rollover are handled by `Date`. Never mutate `start`.
- `formatDate` uses `toLocaleDateString('en-US', { month: 'short', day: 'numeric' })`, adding `year: 'numeric'` when the years differ.
- Load order everywhere it's used: `plans-data.js`, then `billing.js`.

Phase 4's `createSubscription` and Phase 5's confirmation page must use this module, so the date the user is promised here is the date they see at the end.

## 3. Flow-state guard change (`js/flow-state.js`)
Once `subscription` is set, the user can't enter the signup steps again:
- `guard('register')` and `guard('payment')`: if `subscription` is set → redirect to `plans.html` (which shows the "already subscribed" notice). Check this **before** the existing checks.
- `guard('plans')` still returns `true`. The plans page handles that state itself.
- `guard('confirmation')`: unchanged.

---

## 4. Homepage pricing cards from data

### `breezy-intern-test.html`
- Replace the three `<div class="price-card">…</div>` blocks inside `.pricing-grid` with nothing. Keep the empty `<div class="pricing-grid" id="pricingGrid"></div>`.
- Inside the grid, add a fallback for no-JavaScript visitors:
  ```html
  <noscript><p>Plans and prices need JavaScript. Call 1-888-AIR-GOOD and we'll breathe you through it.</p></noscript>
  ```
- Before `<script src="js/home.js"></script>`, add:
  ```html
  <script src="js/plans-data.js"></script>
  <script src="js/home-pricing.js"></script>
  ```
  (No `defer`. These run at the end of `<body>`, like `home.js`.)

### `js/home-pricing.js` (new)
In an IIFE, for each plan in `Breezy.plans.list`, build **exactly** the markup the page had before, so `css/home.css` applies unchanged:
```html
<div class="price-card [popular]">
  [<div class="popular-tag">Most Popular</div>]      <!-- only if plan.popular -->
  <h3>{name}</h3>
  <p class="desc">{tagline}</p>
  <div class="price"><sup>$</sup>{amount}<sub>/mo</sub></div>
  <ul><li>{highlight}</li>…</ul>
  {cta}
</div>
```
- `{amount}` = `Breezy.plans.formatPrice(plan.priceCents)` without the leading `$`.
- `{cta}` for self-serve plans: `<a class="btn {btn-primary if popular, else btn-secondary}" href="signup/plans.html?plan={id}">{ctaLabel}</a>`.
- `{cta}` for Enterprise: `<button type="button" class="btn btn-secondary">Contact Sales</button>` with a click listener calling `showToast(plan.contactMessage)`. `showToast` is the global from `home.js`. It's called at click time, so script order doesn't matter, but check that it exists (`typeof showToast === 'function'`) before calling.
- Append the cards into `#pricingGrid` (after the `<noscript>`).

**Visual check:** the pricing section must look identical to before. Compare it by eye at 1280px and 360px, and say so in your report.

---

## 5. Plans page

### Layout
Desktop (≥ 640px):
```
Choose your plan
Pick a plan, then compare what's included below.

┌─────────────────────┐ ┌──────────────────────┐ ┌─────────────────────┐
│ ( ) Casual Breather │ │ (●) Power Inhaler    │ │ Enterprise Lung     │
│     $9/mo           │ │     $29/mo           │ │ $99/mo              │
│                     │ │ ★ Most popular       │ │ [Contact Sales]     │
│                     │ │   7-day free trial   │ │                     │
└─────────────────────┘ └──────────────────────┘ └─────────────────────┘
                          (selected: sky outline + tint)

Feature                  │ Casual Breather │ Power Inhaler │ Enterprise Lung
Price                    │ $9/mo           │ $29/mo        │ $99/mo
Free trial               │ —               │ 7 days        │ —
Daily breaths            │ 23,000          │ Unlimited     │ Unlimited
Atmospheric blends       │ Standard        │ 3 premium …   │ 3 premium + custom scent profiles
Nostril optimization     │ 1 nostril       │ Dual          │ Dual
Support                  │ Email (we …)    │ Priority (…)  │ Dedicated Air Account Manager
Monthly Air Report™      │ —               │ ✓             │ ✓
SSO (Single Sniff-On)    │ —               │ —             │ ✓
99.9% oxygen uptime SLA  │ —               │ —             │ ✓
                           (Power column tinted to match the selected card)

Power Inhaler: free for 7 days, then $29/month starting Oct 7.
                                          [ Continue with Power Inhaler → ]
```
Phone (< 640px): the three cards stack vertically as compact full-width rows (radio and name on the left, price on the right, badges underneath), so every choice, including Contact Sales, is visible without sideways scrolling. The table below scrolls sideways inside its own box, with the feature column fixed. The summary bar stays pinned to the bottom of the screen.

### `signup/plans.html`
Keep the Phase 1 shell (header, step indicator, storage warning). Add class `signup-main--wide` to `<main>`. Replace the card content:
```html
<section class="signup-card" aria-labelledby="step-title">
  <h1 id="step-title">Choose your plan</h1>
  <p class="step-intro">Pick a plan, then compare what's included below.</p>
  <div class="subscribed-notice" role="status" hidden></div>
  <fieldset class="plan-picker">
    <legend class="visually-hidden">Choose a plan</legend>
    <!-- cards inserted here by plan-picker.js -->
  </fieldset>
  <h2 class="compare-title">Compare plans</h2>
  <div class="compare-scroll" role="region" aria-label="Plan comparison" tabindex="0">
    <!-- table inserted here by compare-table.js -->
  </div>
  <p class="swipe-hint" aria-hidden="true">Swipe to compare →</p>
  <div class="plan-summary">
    <p class="plan-summary-text" aria-live="polite">Select a plan to continue.</p>
    <button type="button" class="btn btn-primary" id="continueBtn" disabled>Continue</button>
  </div>
</section>
```
Scripts, in order: `plans-data.js`, `billing.js`, `flow-state.js`, `mock-api.js`, `components/plan-picker.js`, `components/compare-table.js`, `pages/plans.js`. There is no "Back to Breezy" link; the header brand already goes home.

### `js/components/plan-picker.js`
Exposes `Breezy.planPicker.render(fieldset, { plans, onSelect })`. It returns a controller:
```js
{ setSelected(planId | null), setDisabled(boolean) }
```
It doesn't read or write flow state, the URL or storage. It only renders cards and reports choices through `onSelect(planId)`.

**Self-serve card**: the whole card is the `<label>`, so clicking anywhere on it selects:
```html
<label class="plan-card" data-plan="power">
  <input type="radio" name="plan" value="power" class="plan-card-input">
  <span class="plan-card-radio" aria-hidden="true"></span>
  <span class="plan-card-name">Power Inhaler</span>
  <span class="plan-card-price">$29<span class="plan-card-interval">/mo</span></span>
  <span class="popular-badge">Most popular</span>            <!-- only if plan.popular -->
  <span class="trial-badge">7-day free trial</span>          <!-- only if trialDays > 0 -->
</label>
```
- `.plan-card-input` is visually hidden but **stays focusable and operable**: clip-based hiding, not `display: none`. `.plan-card-radio` is the drawn circle: an empty ring normally, a filled sky dot when checked.
- A visible focus ring appears on the card when its radio has keyboard focus (`.plan-card:has(.plan-card-input:focus-visible)`). Chromium supports `:has`.
- Arrow keys move between the Casual and Power radios natively, because they share `name="plan"` inside one `fieldset`.

**Enterprise card**: not a choice, so it's a `<div>`, not a `<label>`:
```html
<div class="plan-card plan-card--contact" data-plan="enterprise">
  <span class="plan-card-name">Enterprise Lung</span>
  <span class="plan-card-price">$99<span class="plan-card-interval">/mo</span></span>
  <button type="button" class="btn btn-secondary contact-sales">Contact Sales</button>
  <p class="contact-note" role="status"></p>
</div>
```
The `contact-note` starts empty. Clicking the button sets its text to `plan.contactMessage`. Screen readers announce it because the `role="status"` element already exists before its text changes.

**Behavior:**
- A `change` event on a radio calls `onSelect(value)`.
- `setSelected(id)` checks that radio and toggles class `is-selected` on that card only. `setSelected(null)` unchecks all.
- `setDisabled(true)` disables both radios and adds `is-disabled` to their cards (opacity 0.6, `cursor: not-allowed`). The Contact Sales button stays enabled.

### `js/components/compare-table.js`
Exposes `Breezy.compareTable.render(container, { plans, rows })`. It returns `{ setHighlighted(planId | null) }`. The table is **read-only**: nothing in it is clickable.

```html
<table class="compare-table">
  <caption class="visually-hidden">Breezy plans compared feature by feature</caption>
  <thead>
    <tr>
      <th scope="col" class="feature-col">Feature</th>
      <th scope="col" data-plan="casual">Casual Breather</th> …
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Price</th>
      <td data-plan="casual">$9/mo</td> …
    </tr>
    …
  </tbody>
</table>
```
- `rows` is `Breezy.plans.tableRows()` (9 rows: Price, Free trial, then the 7 comparison rows).
- Cells: `true` → `<span aria-hidden="true">✓</span><span class="visually-hidden">Included</span>` (✓ in `var(--emerald-500)`); `false` → `<span aria-hidden="true">—</span><span class="visually-hidden">Not included</span>` (— in `var(--slate-300)`); string → the text.
- `setHighlighted(id)` toggles class `is-highlighted` on every `th`/`td` with that `data-plan` and clears all others. The page calls it whenever the selection changes, so the table follows the chosen card.

### `js/pages/plans.js` (rewrite)
On `DOMContentLoaded`:
1. `if (!Breezy.flow.guard('plans')) return;` then show `.storage-warning` if `!Breezy.flow.storageAvailable` (as in Phase 1).
2. Render the picker into `.plan-picker` and the table into `.compare-scroll`.
3. **Already subscribed?** If `state.subscription` is set:
   - show `.subscribed-notice`: "You're already subscribed to **{plan name}**. [View your subscription](confirmation.html)". Build the bold text and link with DOM methods.
   - `picker.setSelected(subscription.planId)`, `picker.setDisabled(true)`, `table.setHighlighted(subscription.planId)`; keep Continue disabled, set the summary text to "You're already subscribed.", ignore `?plan=`, and **stop here**.
4. **Initial selection**, in priority order:
   1. `Breezy.flow.readPlanParam()` (a valid self-serve plan in the URL)
   2. `state.planId`, if it's a self-serve plan
   3. none
5. `select(id)` does all of the following (it's also the `onSelect` callback):
   - `picker.setSelected(id)` and `table.setHighlighted(id)`
   - `history.replaceState(null, '', '?plan=' + id)`, so the URL always matches the choice without adding a history entry
   - update the summary text and the Continue button (below)

   It does **not** write to flow state. That happens only on Continue.
6. **Summary text** (`.plan-summary-text`):
   - none: "Select a plan to continue." (Continue disabled, label "Continue")
   - plan with trial: "**Power Inhaler**: free for 7 days, then $29/month starting Oct 7." The date is `Breezy.billing.formatDate(Breezy.billing.firstChargeDate(plan))`.
   - plan without trial: "**Casual Breather**: $9/month, first charge today."
   - Continue label: "Continue with {plan name} →", enabled.
7. **Continue click:** `Breezy.flow.update({ planId })`, then `window.location.href = 'register.html'`. Use `href` (not `replace`) so Back returns to this page with the selection intact via the URL.

### CSS (`css/signup.css`)
- `.signup-main--wide`: `max-width: 1040px`.
- **`.plan-picker`:** no fieldset border or padding. A 3-column grid, gap 16px, margin-bottom 40px.
- **`.plan-card`:** white, `1.5px solid var(--slate-200)` border, `border-radius: var(--radius-lg)`, padding 20px, `cursor: pointer`, and a flex column with gap 6px. Hover: border `var(--sky-300)`. **`.is-selected`:** border `var(--sky-400)`, background `var(--sky-50)`, `box-shadow: 0 0 0 1px var(--sky-400)`. `.plan-card--contact` has a default cursor and no hover change.
- `.plan-card-name`: Playfair Display, 1.15rem, weight 700. `.plan-card-price`: Playfair Display, 1.8rem, weight 900; `.plan-card-interval` 0.85rem, weight 400, `var(--slate-500)`.
- `.popular-badge`, `.trial-badge`: small rounded pills, aligned to the card's start (`align-self: flex-start`). Popular uses the sky→violet gradient with white text (like the homepage's `.popular-tag`); trial uses `var(--emerald-500)` text on a light emerald tint.
- **Below 640px:** `.plan-picker` is a single column. Each card uses a two-column grid (radio + name on the left, price on the right) with the badges on a second line, padding 14px 16px.
- `.compare-title`: 1.4rem, margin-bottom 12px.
- `.compare-scroll`: `overflow-x: auto`; focus ring when focused (it's keyboard-scrollable).
- `.compare-table`: `border-collapse: separate; border-spacing: 0; width: 100%; min-width: 620px`. Feature column min 170px; plan columns min 150px. Cells: padding 12px 16px, row separators `1px solid var(--slate-100)`, text centered; row headers and the Feature header left-aligned. Header row: 0.8rem uppercase, letter-spacing 1px, `var(--slate-500)`. Long text wraps.
- `.is-highlighted` table cells: `background: var(--sky-50)`. The header cell also gets `color: var(--sky-700)`.
- **Sticky feature column:** `.feature-col` and `tbody th[scope="row"]` get `position: sticky; left: 0; background: #fff; z-index: 1`, plus a subtle right shadow so it reads as floating over the scrolled columns.
- `.swipe-hint`: hidden by default; `display: block` below 640px, small `var(--slate-500)` text, right-aligned.
- `.plan-summary`: flex row, text left and button right, top border, padding 20px 0 0, margin-top 24px. **Below 640px:** stacks vertically, the button goes full width, and it becomes `position: sticky; bottom: 0; background: #fff; padding: 16px; box-shadow: 0 -4px 16px rgba(0,0,0,0.06)` so Continue stays on screen while scrolling.
- `.subscribed-notice`: same shape as `.storage-warning` but sky-colored (`var(--sky-50)` background, `var(--sky-700)` text, `var(--sky-200)` border), with the link underlined.
- Don't change existing Phase 1 rules except where needed for the above.

---

## Tests
Follow the conventions in spec 03. Remove the Phase 1 **"Preselected: …" placeholder tests**, which no longer apply.

### Unit
**`tests/unit/billing.test.js`** (new; pass explicit dates, never rely on today):
- `firstChargeDate(power, 2026-09-30)` → 2026-10-07; `firstChargeDate(casual, 2026-09-30)` → 2026-09-30.
- Month rollover: Sep 28 + 7 → Oct 5. Year rollover: Dec 28, 2026 + 7 → Jan 4, 2027.
- `start` is not mutated.
- `formatDate(Oct 7 2026, relativeTo Sep 30 2026)` → `'Oct 7'`; `formatDate(Jan 4 2027, relativeTo Dec 28 2026)` → `'Jan 4, 2027'`.

Construct dates with `new Date(2026, 8, 30)` (local time), so the tests don't depend on the machine's time zone.

**`plans-data.test.js`** (updates):
- No plan has a `bestFor` property.
- `blends.enterprise` and `support.enterprise` have the new full phrases.
- Every plan has a non-empty, frozen `highlights` array of strings, and the power highlights equal the list in section 1.
- `ctaLabel`: casual → "Get Started", power → "Start Free Trial", enterprise → "Contact Sales".
- `tableRows()`: 9 rows; the first two are `price` (`'$9/mo'`, `'$29/mo'`, `'$99/mo'`) and `trial` (`false`, `'7 days'`, `false`); the remaining 7 are exactly `comparison`; `_findDataErrors(tableRows())` returns `[]`; the result is frozen.

**`flow-state.test.js`** (additions):
- With `subscription` set (and a plan and account): `guard('register')` and `guard('payment')` → `false`, redirect `plans.html`; `guard('plans')` and `guard('confirmation')` → `true`.

### Browser
**`tests/e2e/home-pricing.spec.js`** (new):
- Three `.price-card`s render in the order Casual, Power, Enterprise. Only Power has class `popular` and a `.popular-tag`.
- Each card's name, tagline, price text (`$9/mo`, `$29/mo`, `$99/mo`) and `li` texts match `Breezy.plans` (read it with `page.evaluate`, so the test itself doesn't duplicate the data).
- CTA labels and hrefs are as before. The existing `routing.spec.js` entry-point and Contact Sales toast tests must still pass unchanged.

**`tests/e2e/plans.spec.js`** (new). Freeze the clock with `await page.clock.install({ time: new Date('2026-09-30T12:00:00') })` before `goto`, so dates are stable.
- **Cards:** the fieldset has the accessible name "Choose a plan". There are two radios (Casual, Power) and one Enterprise card with a "Contact Sales" button and no radio. Only Power shows "Most popular" and "7-day free trial".
- **Table:** 3 plan column headers (names only) plus the "Feature" header, and 9 body rows in order: Price, Free trial, Daily breaths, Atmospheric blends, Nostril optimization, Support, Monthly Air Report™, SSO (Single Sniff-On), 99.9% oxygen uptime SLA. The ✓ and — cells contain the hidden text "Included" / "Not included". The table contains no inputs or buttons.
- **Preselection:** `?plan=power` → the Power radio is checked, the Power card has `is-selected`, the Power table cells have `is-highlighted`, the summary says "free for 7 days, then $29/month starting Oct 7", and Continue is enabled with the label "Continue with Power Inhaler →".
- `?plan=casual` → the summary says "$9/month, first charge today".
- No param and no state → no radio checked, no highlighted column, the summary says "Select a plan to continue.", Continue disabled.
- Seeded `{ planId: 'casual' }` and no param → Casual is preselected. Seeded `{ planId: 'casual' }` with `?plan=power` → Power (the URL wins).
- `?plan=enterprise` → nothing selected.
- **Selecting:** click the Casual card's **price text** (not the radio) → Casual is selected. This proves the whole card is clickable. The URL's search becomes `?plan=casual`, `history.length` is unchanged (read it before and after with `page.evaluate`), and only the Casual card and column are marked.
- **Keyboard:** focus the Casual radio and press ArrowDown → Power is selected and highlighted.
- **Contact Sales:** clicking it shows the contact message in `.contact-note`; the URL and the selection don't change.
- **Continue:** select Power → Continue → URL ends with `register.html` and `Breezy.flow.get().planId === 'power'`. Then `page.goBack()` → back on `plans.html?plan=power` with Power still selected.
- **Selection alone doesn't save:** select Casual, then read `Breezy.flow.get().planId` → still `null`.
- **Already subscribed:** seed `{ planId: 'power', account: SAMPLE.account, subscription: SAMPLE.subscription }`, open `plans.html?plan=casual` → the notice says "You're already subscribed to Power Inhaler" with a link to `confirmation.html`, both radios are disabled, Power is shown selected and highlighted (the URL param is ignored), and Continue is disabled. Opening `register.html` or `payment.html` directly redirects to `plans.html`.

**`layout.spec.js`** (additions):
- `plans.html?plan=power` at 360px:
  - no horizontal page overflow
  - the three cards are stacked (each card's top is below the previous card's bottom), and each is fully within the viewport width, including the Contact Sales button
  - `.swipe-hint` is visible
  - after scrolling `.compare-scroll` right by 200px, the first row header's left position is unchanged (the sticky column works)
- At 1280px: the three cards sit in one row (same top position), `.swipe-hint` is hidden, and `.compare-scroll` doesn't overflow.
- At 360px, the Continue button stays inside the screen after scrolling the page to the table's top.

### Regression checks (don't commit)
Temporarily make each change, confirm the expected result, then revert:
- In `js/plans-data.js`, change Power's `priceCents` to `3900` → **both** the homepage card and the plans page (card and table Price row) show `$39`, and `home-pricing.spec` still passes because it reads the data. This proves one source feeds both pages.
- In `js/pages/plans.js`, make `select()` also call `Breezy.flow.update({ planId })` → the "selection alone doesn't save" test fails.
- In `js/pages/plans.js`, stop calling `table.setHighlighted` in `select()` → the preselection and selecting tests fail on the column highlight.
- In `js/flow-state.js`, remove the new subscription check → the subscribed-redirect tests fail (unit and browser).
- In `css/signup.css`, remove `position: sticky` from the row headers → the sticky-column layout test fails.

## Out of scope
- The registration form, validation and `createAccount` (Phase 3).
- Payment and subscription creation (Phase 4). Phase 4 must use `Breezy.billing.firstChargeDate` for `firstChargeAt`.
- Confirmation page content and letting a subscribed user start over (Phase 5).
- A clickable step indicator (Phase 6).

## Deliverable
The changes above with `npm test` passing. Report:
- the files changed and created,
- the `npm test` summary,
- the regression-check results,
- confirmation that the homepage pricing section looks identical to before at 1280px and 360px,
- any deviation from this spec, with the reason.
