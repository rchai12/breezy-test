# Spec 02: Signup Flow, Phase 1 (Foundation)

## Context
We are adding a multi-page signup flow to the Breezy site (`breezy-intern-test.html`), a satirical "premium air" subscription landing page. The full flow is:

1. **Plans** (`signup/plans.html`): a feature comparison table of the tiers (✓ / — / short value per cell); the user selects and confirms a plan.
2. **Register** (`signup/register.html`): account creation.
3. **Payment** (`signup/payment.html`): card details (simulated, never real).
4. **Confirmation** (`signup/confirmation.html`): subscription summary.

There is no real backend. A mock API module simulates one.

**This phase builds only the foundation:** shared styles, file structure, plan data, flow state, mock API scaffolding, the site's entry-point links, and four page shells with placeholder content. Later phases fill in each page. Do not build page features (plan cards, forms, validation) in this phase.

If `specs/01-faq-accordion-fix.md` has not been implemented yet, implement it first, as its own change. Both specs edit `breezy-intern-test.html`.

## Hard constraints
- **No server, no build step, no frameworks, no npm.** Every page must work when opened by double-clicking the file (`file://` URL).
- **No ES modules.** Chrome blocks `import`/`export` over `file://`. Use classic `<script defer src="...">` tags. Each shared script attaches to a single global namespace:
  ```js
  (function () {
    'use strict';
    const Breezy = (window.Breezy = window.Breezy || {});
    // ...
    Breezy.flow = { /* public API */ };
  })();
  ```
- **One responsibility per file.** No page script may contain logic that another page needs. Shared logic goes in the shared scripts below.
- **Code style:** match the existing file: 2-space indentation, `const`/`let`, arrow functions for callbacks, semicolons, sparse comments. JSDoc comments on the public functions of shared modules only.
- **Never store passwords or card numbers** in flow state. (Later phases enforce this for the mock API too.)

## File layout to create
```
css/
  tokens.css
  signup.css
js/
  plans-data.js
  flow-state.js
  mock-api.js
  pages/
    plans.js
    register.js
    payment.js
    confirmation.js
signup/
  plans.html
  register.html
  payment.html
  confirmation.html
```
Do not create `js/validation.js` yet. Phase 3 creates it.

---

## 1. `css/tokens.css`
- Move the entire `:root { ... }` block out of the `<style>` in `breezy-intern-test.html` into this file, unchanged, **plus two missing tokens** that the existing CSS already uses but never defines (this is a real bug: it makes footer text dark-on-dark):
  ```css
  --slate-400: #94a3b8;
  --sky-300: #7dd3fc;
  ```
  Place each next to its neighbors (`--slate-400` after `--slate-300`, `--sky-300` after `--sky-200`).
- In `breezy-intern-test.html`: delete the `:root` block from the inline `<style>` and add `<link rel="stylesheet" href="css/tokens.css">` **before** the `<style>` tag. Leave the Google Fonts `@import` and all other inline CSS where they are.

## 2. `css/signup.css`
Styles shared by the four signup pages only. Reuse the tokens (`var(--sky-500)` etc.), the fonts (`'DM Sans'` for body text, `'Playfair Display'` for headings) and the site's look: rounded cards (`--radius-lg`), soft shadows, sky/violet gradient accents. Phase 1 needs only:
- Base: `* { box-sizing: border-box; margin: 0; padding: 0; }`, body font, color `var(--slate-800)`, background `var(--sky-50)`, line-height 1.6.
- `.signup-header`: dark bar (`var(--slate-800)`) with the brand on the left. Copy the look of `.nav-brand` from the main page: "Breezy" in the gradient `em` style plus `™`. The brand is an `<a>` linking to `../breezy-intern-test.html`.
- `.steps-indicator`: a horizontal ordered list of the 4 steps (Plan, Account, Payment, Done). Style three states: default, `.is-complete` (check mark or filled dot), and current (`[aria-current="step"]`, highlighted in `var(--sky-500)`). It must fit at 360px width. Labels may shrink or hide below 480px, but the numbers stay visible.
- `.signup-main`: centered content column, `max-width: 880px`, padding `48px 16px`.
- `.signup-card`: white card, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-md)`, padding 32px (20px on mobile).
- `.btn`, `.btn-primary`, `.btn-secondary`: same look as the main page's buttons (copy those rules). They must work on both `<a>` and `<button>`, and include a `:disabled` / `[aria-disabled="true"]` state (opacity 0.5, `cursor: not-allowed`, no hover lift).
- `.storage-warning`: an amber notice banner (hidden by default via the `hidden` attribute).
- `.visually-hidden` utility class for screen-reader-only text.

## 3. `js/plans-data.js`
The single source of truth for plan data used by the signup pages. It exposes `Breezy.plans`:

```js
Breezy.plans = {
  list,               // Array of plan objects, in display order (casual, power, enterprise)
  comparison,         // Array of comparison-table rows (see below), in display order
  get(id),            // returns the plan object or null
  formatPrice(cents), // 900 -> "$9"; 2950 -> "$29.50"
};
```
Freeze every plan object, every row, and both arrays with `Object.freeze`.

### Plan objects
| Field | casual | power | enterprise |
|---|---|---|---|
| `id` | `'casual'` | `'power'` | `'enterprise'` |
| `name` | `'Casual Breather'` | `'Power Inhaler'` | `'Enterprise Lung'` |
| `tagline` | `'For the air-curious'` | `'For serious oxygen enthusiasts'` | `'For teams that breathe together'` |
| `priceCents` | `900` | `2900` | `9900` |
| `interval` | `'month'` | `'month'` | `'month'` |
| `trialDays` | `0` | `7` | `0` |
| `selfServe` | `true` | `true` | `false` |
| `popular` | `false` | `true` | `false` |
| `bestFor` | `'People who breathe recreationally'` | `'Committed, full-time breathers'` | `'Open-plan offices with shared lungs'` |
| `contactMessage` | `null` | `null` | `'📞 Our Air Sales team will reach out within 1 business breath.'` |

`selfServe: false` means the plan cannot be selected in the flow (it shows "Contact Sales" instead, in Phase 2). `bestFor` is a one-line summary shown under the plan's column header. The copy above is a draft; the user may replace it.

### Comparison rows
Phase 2 renders these as a feature comparison table: one row per feature, one column per plan. Row shape:
```js
{ id: 'breaths', label: 'Daily breaths', values: { casual: '23,000', power: 'Unlimited', enterprise: 'Unlimited' } }
```
Each value in `values` is exactly one of:
- `true`: included (rendered as ✓)
- `false`: not included (rendered as —)
- a short string of **three words or fewer**: the plan's level of that feature

Every row must have a value for all three plan ids. Price and free trial are **not** rows. Phase 2 renders them in the column headers from `priceCents` and `trialDays`, so each fact lives in only one place.

Rows, in this order (text rows first, then check rows, so the ✓/— cells line up in one block):
| `id` | `label` | casual | power | enterprise |
|---|---|---|---|---|
| `breaths` | Daily breaths | `'23,000'` | `'Unlimited'` | `'Unlimited'` |
| `blends` | Atmospheric blends | `'Standard'` | `'3 premium altitude'` | `'Premium + custom scents'` |
| `nostrils` | Nostril optimization | `'1 nostril'` | `'Dual'` | `'Dual'` |
| `support` | Support | `'Email (we may reply)'` | `'Priority (we will reply)'` | `'Dedicated manager'` |
| `airReport` | Monthly Air Report™ | `false` | `true` | `true` |
| `sso` | SSO (Single Sniff-On) | `false` | `false` | `true` |
| `sla` | 99.9% oxygen uptime SLA | `false` | `false` | `true` |

The two support strings are over three words. They're the site's existing jokes, so keep them as an explicit exception.

Add a development-time check at the bottom of the file: loop over `comparison` and `console.error` any row that is missing a plan id or has a value that isn't `true`, `false` or a string. It must not throw, so a data mistake can't break the page.

## 4. `js/flow-state.js`
Holds the in-progress signup for the current browser tab, and guards pages against skipped steps. It exposes `Breezy.flow`.

**Storage:** `sessionStorage` key `'breezy.signup'`, JSON. Wrap every read and write in `try/catch`. If storage throws or is unavailable, fall back to an in-memory object and set `Breezy.flow.storageAvailable = false` (otherwise `true`).

**State shape (version it):**
```js
{
  version: 1,
  planId: null,        // 'casual' | 'power' once confirmed on the plans page
  account: null,       // { accountId, name, email } after registration. NEVER a password.
  subscription: null   // { subscriptionId, planId, status, startedAt, firstChargeAt, amountCents,
                       //   card: { brand, last4 } } after payment. NEVER a card number or CVC.
}
```
If the stored JSON can't be parsed or its `version` doesn't match, discard it and start fresh.

**Public API:**
```js
Breezy.flow = {
  storageAvailable,              // boolean
  get(),                         // returns a copy of the current state
  update(partial),               // shallow-merges partial into state, saves, returns new state
  clear(),                       // resets to the empty state
  readPlanParam(),               // reads ?plan= from location.search; returns the id only if
                                 //   Breezy.plans.get(id) exists AND is selfServe, else null
  guard(step),                   // see below
  STEPS: ['plans', 'register', 'payment', 'confirmation'],
};
```
`update` must reject any key not in the state shape (throw an `Error` naming the key). This stops later phases from accidentally storing sensitive fields.

**`guard(step)`** runs at the top of each page script. It checks prerequisites and, if one isn't met, redirects with `location.replace()` (so the skipped page doesn't enter browser history) to the earliest page whose prerequisites are met:
| step | requires |
|---|---|
| `'plans'` | nothing |
| `'register'` | `planId` refers to a self-serve plan |
| `'payment'` | the above + `account` is set |
| `'confirmation'` | `subscription` is set |

Pages are siblings in `signup/`, so redirect targets are `'plans.html'`, `'register.html'` etc. `guard` returns `true` if the page may render, `false` if it redirected (the page script must then stop).

Also, going back to an earlier step is always allowed, and an existing subscription is not cleared automatically. Phase 5 decides what happens then.

## 5. `js/mock-api.js`
Simulated backend. It exposes `Breezy.api`. Phase 1 builds the infrastructure and the function signatures. Business logic comes in later phases.

**Database:** `localStorage` key `'breezy.db'`, JSON shape `{ version: 1, accounts: [], paymentMethods: [], subscriptions: [] }`. Wrap every access in `try/catch`, with the same in-memory fallback as flow state. Internal helpers: `loadDb()`, `saveDb(db)`.

**Latency:** every public function `await`s an internal `delay()` of a random 400–900 ms before doing anything, to simulate network time.

**Response contract.** Every public function returns a Promise that **resolves** (never rejects for expected failures) to one of:
```js
{ ok: true, data: { ... } }
{ ok: false, error: { code, message, fields } }   // fields: { fieldName: 'message' } or {}
```
Error codes (export as `Breezy.api.ERRORS`): `VALIDATION_ERROR`, `EMAIL_TAKEN`, `CARD_DECLINED`, `NOT_FOUND`, `NOT_IMPLEMENTED`. Only unexpected bugs may reject.

**Public functions for Phase 1.** Stubs that `await delay()` then return `{ ok: false, error: { code: 'NOT_IMPLEMENTED', message: '<fn> is not implemented yet', fields: {} } }`:
```js
/** Phase 3. @param {{name: string, email: string, password: string}} input
 *  @returns data: { accountId, name, email, createdAt } */
createAccount(input)

/** Phase 4. Simulates a payment provider turning a card into a token.
 *  @param {{number, expMonth, expYear, cvc, name, postalCode}} card
 *  @returns data: { token, brand, last4, expMonth, expYear } */
tokenizeCard(card)

/** Phase 4. @param {{accountId, planId, paymentToken}} input
 *  @returns data: { subscriptionId, planId, status, startedAt, firstChargeAt, amountCents, card: { brand, last4 } } */
createSubscription(input)
```
Also add `Breezy.api.resetDb()` (clears `'breezy.db'`, no delay). It's for manual testing only. Document it in a one-line comment.

## 6. Page shells: `signup/*.html` + `js/pages/*.js`
All four pages share this skeleton. Only the title, the current step, and the page script differ.

```html
<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{Title}} · Breezy</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700&family=Playfair+Display:wght@400;700;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../css/tokens.css">
<link rel="stylesheet" href="../css/signup.css">
<script defer src="../js/plans-data.js"></script>
<script defer src="../js/flow-state.js"></script>
<script defer src="../js/mock-api.js"></script>
<script defer src="../js/pages/{{page}}.js"></script>
</head>
<body>
  <header class="signup-header">
    <a class="nav-brand" href="../breezy-intern-test.html"><em>Breezy</em>&thinsp;™</a>
  </header>
  <nav aria-label="Signup progress">
    <ol class="steps-indicator">
      <li>Plan</li><li>Account</li><li>Payment</li><li>Done</li>
    </ol>
  </nav>
  <main class="signup-main">
    <div class="storage-warning" role="status" hidden>
      Your browser is blocking storage for local files, so progress won't carry between pages.
      See the README for how to run the site with a local server.
    </div>
    <section class="signup-card" aria-labelledby="step-title">
      <h1 id="step-title">{{Heading}}</h1>
      <p>{{Placeholder text}}</p>
    </section>
  </main>
</body>
</html>
```
| File | Title / Heading | Current step | Placeholder text |
|---|---|---|---|
| `plans.html` | Choose your plan | 1 (Plan) | "Plan comparison coming in Phase 2." |
| `register.html` | Create your account | 2 (Account) | "Account form coming in Phase 3." |
| `payment.html` | Payment details | 3 (Payment) | "Payment form coming in Phase 4." |
| `confirmation.html` | You're all set | 4 (Done) | "Confirmation coming in Phase 5." |

- Mark the current step with `aria-current="step"` and earlier steps with `class="is-complete"`, directly in each page's HTML. The indicator is static in this phase.
- Each `js/pages/<page>.js` runs on `DOMContentLoaded` and does only this:
  1. `if (!Breezy.flow.guard('<step>')) return;`
  2. If `!Breezy.flow.storageAvailable`, un-hide `.storage-warning`.
  3. **`plans.js` only:** if `Breezy.flow.readPlanParam()` returns an id, append a line to the card: `Preselected: <plan name>` (temporary; Phase 2 replaces it).

## 7. Entry-point changes in `breezy-intern-test.html`
Replace these elements. Change nothing else in the markup.

| Element | Currently | Change to |
|---|---|---|
| Hero "Start Breathing Better →" | `<button class="btn btn-primary" onclick="window.location.href='#'">` | `<a class="btn btn-primary" href="signup/plans.html">Start Breathing Better →</a>` |
| Casual "Get Started" | `<button class="btn btn-secondary" onclick="showToast(...)">` | `<a class="btn btn-secondary" href="signup/plans.html?plan=casual">Get Started</a>` |
| Power "Start Free Trial" | `<button class="btn btn-primary" onclick="showToast(...)">` | `<a class="btn btn-primary" href="signup/plans.html?plan=power">Start Free Trial</a>` |
| Mid-bar "Book Air ▾" | `<a href="#signup" class="book-btn">` | same element, `href="signup/plans.html"` |
| Mobile menu "Book Air" | `<a href="#signup" onclick="closeMobile()">` | `<a href="signup/plans.html">` (remove the `onclick`; the page navigates away) |

**Leave unchanged:** "Contact Sales" (Enterprise card), "Subscribe Free →" (newsletter), "▶ Watch the Story".

Check afterwards: the `.btn` / `.price-card .btn` styles must render identically on `<a>` as on `<button>` (full width in price cards, centered text, no underline). Adjust the main page's CSS only if they don't.

---

## Acceptance tests
Run in **Chrome or Edge** by opening files directly (`file://`). Where noted, repeat in **Firefox** if it's installed.

**Main page**
1. The page looks the same as before, **except** that footer text, footer links, the "Trusted by" label and the testimonial author titles are now light gray (the `--slate-400` fix).
2. Each entry button goes to the right URL: hero → `signup/plans.html`; Get Started → `?plan=casual`; Start Free Trial → `?plan=power`; Book Air (desktop and mobile) → `signup/plans.html`.
3. Contact Sales, Subscribe Free and Watch the Story still show their toasts. The FAQ, the MORE dropdown, the mobile menu and smooth scrolling still work.

**Signup shells**
4. `plans.html?plan=power` shows "Preselected: Power Inhaler". `?plan=enterprise`, `?plan=bogus` and no parameter show no preselected line.
5. Opening `register.html`, `payment.html` or `confirmation.html` directly with an empty state redirects to `plans.html`. Browser Back does not return to the page that redirected.
6. In the DevTools console on `plans.html`, run `Breezy.flow.update({ planId: 'power' })`, then open `register.html`: it renders. Open `payment.html`: it redirects to `register.html`.
7. `Breezy.flow.update({ password: 'x' })` throws an error naming `password`.
7a. `Breezy.plans.comparison.length` is `7`, the data check logs nothing, and `Breezy.plans.comparison[0].values.casual = 'x'` has no effect (the data is frozen). Temporarily deleting a plan's value from one row makes the check log a `console.error` without breaking the page; restore it afterwards.
8. `await Breezy.api.createAccount({})` resolves (does not reject) after roughly 0.4–0.9 s to `{ ok: false, error: { code: 'NOT_IMPLEMENTED', ... } }`.
9. **Cross-page storage check:** set state on `plans.html` (test 6), then navigate to `register.html` and run `Breezy.flow.get()`: `planId` is still `'power'`. Report the result for Chrome/Edge **and** Firefox. If Firefox loses the state, the `.storage-warning` banner should appear there. Don't try to work around it. Report it so the README can document the `python -m http.server` fallback.
10. Each shell looks right at 360px, 768px and 1280px widths: step indicator readable, no horizontal scrolling.
11. The console shows no errors on any page.

## Out of scope for Phase 1
Rendering the comparison table and plan selection (Phase 2); form fields, `validation.js` and account logic (Phase 3); payment form, tokenization and subscription logic (Phase 4); confirmation content (Phase 5); clickable step indicator, focus management, README (Phase 6).

## Deliverable
The files above, plus the five entry-point edits and the tokens move in `breezy-intern-test.html`. Report: the list of files created and changed, the result of each acceptance test (especially test 9 in each browser), and any place where you had to deviate from this spec, with the reason.
