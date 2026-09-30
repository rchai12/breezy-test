# Spec 07: Signup Flow, Phase 4 (Payment Details)

## Context
The signup flow is plans → register → **payment** → confirmation. Phases 1–3, the test harness and the Watch the Story fix are done (`specs/02`–`06`). The shared pieces this phase builds on:
- `js/validation.js`: pure rules returning `{ value, error }`
- `js/components/form-field.js`: error timing (1 s pause or blur) and ARIA
- `js/billing.js`: `firstChargeDate`, `formatDate`
- `js/mock-api.js`: `createAccount` is implemented; `tokenizeCard` and `createSubscription` are stubs

**Prerequisite:** `npm test` passes with 0 skipped before you start. If it doesn't, stop and report.

This phase builds the payment page and implements the simulated payment backend. It mirrors how real payment providers work: the card is turned into a **token**, and only the token is used to create the subscription. **The site never stores a full card number or security code, anywhere.**

## Hard constraints (unchanged, plus payment safety)
- No build step, frameworks or ES modules. Everything works from `file://`.
- One responsibility per file. Pure rules, pure formatting, DOM input masking, and page logic are separate files.
- No `innerHTML`. Build DOM with `createElement`/`textContent`, or static HTML.
- **Card safety:**
  - The full card number and CVC exist only in the payment form's inputs and in the `tokenizeCard` call.
  - They are never written to `sessionStorage`, `localStorage`, the URL or the console, and never passed to `createSubscription`.
  - **Only the listed test cards are accepted.** Any other card, even a valid one, gets "This demo only accepts test cards."
- Code style as before. `npm test` passes at the end with 0 skipped.

## Files
| File | Change |
|---|---|
| `assets/card-brands/visa.svg`, `mastercard.svg`, `amex.svg`, `discover.svg` | **New.** Brand logos (see section 1) |
| `assets/card-brands/ATTRIBUTION.md` | **New.** Source, version and license of the logos |
| `js/card-format.js` | **New.** Pure: brand detection, Luhn check, digit stripping, display formatting |
| `js/validation.js` | Add payment rules |
| `js/components/masked-input.js` | **New.** Live formatting of an input with cursor preservation |
| `js/mock-api.js` | Implement `tokenizeCard` and `createSubscription`; add `TEST_CARDS` and `ALREADY_SUBSCRIBED` |
| `js/pages/payment.js` | Rewrite: form, order summary, test-card fill, submit |
| `signup/payment.html` | Form markup; script tags |
| `css/signup.css` | Payment layout, logos row, banner, order summary |
| Other signup pages | Add `card-format.js` to their script tags, before `validation.js` |
| Tests | See "Tests" below |

Script order on every signup page from now on: `plans-data.js`, `billing.js`, `card-format.js`, `validation.js`, `flow-state.js`, `mock-api.js`, then components, then the page script.

---

## 1. Card brand logos
- **Source:** [Simple Icons](https://simpleicons.org), licensed CC0. Download the SVGs for the slugs `visa`, `mastercard`, `americanexpress` and `discover` from the npm package at a pinned version, e.g. `https://cdn.jsdelivr.net/npm/simple-icons@<version>/icons/visa.svg`, and save them locally as `visa.svg`, `mastercard.svg`, `amex.svg` and `discover.svg`. **Don't link to the CDN at runtime.** The page must work offline and from `file://`.
- Simple Icons SVGs are single-color. Add `fill="#<brand hex>"` to each `<svg>`, using the hex from Simple Icons' data for that brand.
- **If a slug doesn't exist** in the current Simple Icons release (brands are sometimes removed), don't substitute an unofficial logo. Instead render a text badge for that brand (a small rounded box with the brand name), and note it in your report.
- `ATTRIBUTION.md`: the source URL, the package version, the CC0 license, and one line stating that the marks are trademarks of their owners, shown only to indicate accepted payment methods.
- Render each as `<img src="../assets/card-brands/visa.svg" alt="Visa" width="40" height="26">`. Accessible names: "Visa", "Mastercard", "American Express", "Discover".

## 2. `js/card-format.js` (new, pure)
Exposes `Breezy.cardFormat`:
```js
digitsOnly(raw)                 // '42a4 2-4' → '4242'
detectBrand(digits)             // 'visa' | 'mastercard' | 'amex' | 'discover' | null
luhnValid(digits)               // boolean
expectedLength(brand)           // amex 15; visa, mastercard, discover 16; null → 16
cvcLength(brand)                // amex 4; others 3
formatCardNumber(digits, brand) // amex groups 4-6-5; others groups of 4. Never a trailing space.
formatExpiry(digits)            // '1' → '1', '12' → '12', '122' → '12/2', '1227' → '12/27'. The slash appears only once a 3rd digit exists.
BRAND_NAMES                     // { visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express', discover: 'Discover' }
```
**Brand prefixes:**
- `visa`: starts with `4`
- `mastercard`: `51`–`55`, or `2221`–`2720`
- `amex`: `34` or `37`
- `discover`: `6011`, `65`, or `644`–`649`

Anything else is `null`.

Separators appear only *between* digits, never after the last one. That's what makes deleting feel natural (see section 4).

## 3. `js/validation.js`: payment rules
Same `{ value, error }` contract. Messages exactly as listed. Only the first failing rule's message is returned.

| Rule (`Breezy.validation.<name>`) | `value` | Checks in order → message |
|---|---|---|
| `cardName(raw)` | trimmed, whitespace collapsed | empty → `Enter the name on your card.` · under 2 characters → `Enter the full name on your card.` · over 100 → `Keep it under 100 characters.` · same character pattern as names → `Use letters only. Spaces, hyphens, apostrophes and periods are fine.` |
| `cardNumber(raw)` | `{ digits, brand }` | empty → `Enter your card number.` · brand `null` → `We accept Visa, Mastercard, American Express and Discover.` · wrong length for the brand → `Enter the full 16-digit card number.` (Amex: `15-digit`) · fails Luhn → `Check your card number. It doesn't look right.` |
| `cardExpiry(raw, now = new Date())` | `{ month, year }` (numbers, 4-digit year) | empty → `Enter the expiry date.` · not exactly 4 digits → `Use the format MM/YY.` · month not 01–12 → `Enter a month from 01 to 12.` · before the current month → `This card has expired.` · more than 20 years after `now`'s year → `Check the expiry year.` |
| `cardCvc(raw, brand)` | digits | empty → `Enter the security code.` · wrong length → `Enter the 3-digit security code.` (Amex: `Enter the 4-digit security code on the front of your card.`) |
| `postalCode(raw)` | trimmed, uppercased | empty → `Enter your postal code.` · not `/^[A-Z0-9][A-Z0-9 -]{1,8}[A-Z0-9]$/` → `Use 3–10 letters, numbers, spaces or hyphens.` |
| `payment({ cardName, cardNumber, cardExpiry, cardCvc, postalCode }, now)` | aggregate | `{ values, errors }` like `account()`. `cardCvc` is checked against the detected brand |

Expiry: the card is valid through the **end** of its month, so `09/26` is valid on 2026-09-30. `YY` means `2000 + YY`.

## 4. `js/components/masked-input.js` (new)
`Breezy.maskedInput.attach(input, { format })`. `format(raw)` returns the display string, e.g. `raw => Breezy.cardFormat.formatExpiry(Breezy.cardFormat.digitsOnly(raw).slice(0, 4))`.

On every `input` event:
1. Count the digits before the cursor in the raw value.
2. **Backspace over a separator:** if `event.inputType === 'deleteContentBackward'` and the digit count didn't change (only a space or `/` was removed), also remove the digit before the cursor. Otherwise backspace would appear to do nothing.
3. Set `input.value = format(raw)`, then put the cursor right after the same number of digits in the new value.

This handles typing, pasting (`'4242 4242-4242 4242'` becomes `4242 4242 4242 4242`) and letters, which simply don't appear. It dispatches no extra events. `form-field.js` keeps listening to the same `input` events for error timing.

Attach it to card number (max 19 digits), expiry (max 4 digits) and CVC (max 4 digits). Set `inputmode="numeric"` on all three.

## 5. `js/mock-api.js`

### Test cards
```js
Breezy.api.TEST_CARDS = Object.freeze({
  visa: '4242424242424242',     // succeeds
  amex: '378282246310005',      // succeeds (4-digit CVC)
  declined: '4000000000000002', // "Your card was declined."
});
```
All three pass Luhn. This plays the role of the payment provider's test-mode documentation, so the page may read it for its "Use test card" button.

Add `ALREADY_SUBSCRIBED` to `ERRORS`, which now has six codes.

### `tokenizeCard({ cardName, cardNumber, cardExpiry, cardCvc, postalCode })`
The raw field strings, as typed. Update the JSDoc from spec 02, which listed different parameter names. After `await delay()`:
1. `Breezy.validation.payment(input)`. If there are errors → `VALIDATION_ERROR`, message `Please fix the highlighted fields.`, with `fields`.
2. The card digits aren't in `TEST_CARDS` → `VALIDATION_ERROR`, with `fields: { cardNumber: 'This demo only accepts test cards. Try 4242 4242 4242 4242.' }`.
3. The card is `TEST_CARDS.declined` → `CARD_DECLINED`, message `Your card was declined.`, with `fields: { cardNumber: 'Your card was declined. Try a different card.' }`.
4. Create `token = 'tok_' + 16 random hex characters`. Save to `db.paymentMethods` **exactly** `{ token, brand, last4, expMonth, expYear, used: false, createdAt }`. No number, no CVC, no name, no postal code.
5. Return `{ ok: true, data: { token, brand, last4, expMonth, expYear } }`.

### `createSubscription({ accountId, planId, paymentToken })`
After `await delay()`:
1. No account with `accountId` → `NOT_FOUND`, message `We couldn't find your account. Please start over.`
2. The plan is missing or not self-serve → `VALIDATION_ERROR`, message `That plan can't be purchased online.`
3. The token is missing or `used` → `VALIDATION_ERROR`, message `This payment method can't be used. Please re-enter your card.`, with `fields: { cardNumber: <same> }`.
4. The account already has a subscription → `ALREADY_SUBSCRIBED`, message `This account already has a subscription.`
5. Mark the token `used: true`. Then build the subscription with `now = new Date()`:
   - `subscriptionId`: `'sub_'` + 12 hex characters
   - `status`: `'trialing'` if `trialDays > 0`, else `'active'`
   - `startedAt`: `now.toISOString()`
   - `firstChargeAt`: `Breezy.billing.firstChargeDate(plan, now).toISOString()`
   - `amountCents`: `plan.priceCents`
   - `card`: `{ brand, last4 }` from the token

   Save it together with its `accountId`.
6. Return `{ ok: true, data: { subscriptionId, planId, status, startedAt, firstChargeAt, amountCents, card } }`. This is the `subscription` shape from spec 02, without `accountId`.

---

## 6. Payment page

### Layout
```
Desktop (≥ 880px)                                    Phone
┌──────────────────────────────────┬───────────────┐ ┌───────────────────┐
│ ⚠ Demo only. No real payment is  │ ORDER SUMMARY │ │ ⚠ Demo banner     │
│   taken. Use a test card.        │ Power Inhaler │ │ Order summary     │
│   [Use test card]                │  Change       │ │ Paying as …       │
│ Paying as Ada Breath (ada@…)     │ $29/month     │ │ Name on card      │
│                                  │───────────────│ │ Card number       │
│ Name on card    [Ada Breath    ] │ Due today  $0 │ │ [logos]           │
│ Card number     [4242 4242 …   ] │ First charge  │ │ Expiry | CVC      │
│ [VISA][MC][AMEX][DISC]           │ $29 on Oct 7  │ │ Postal code       │
│ Expiry [MM/YY] CVC [123] Postal  │               │ │ [Start free trial]│
│ [ Start free trial ]             │               │ └───────────────────┘
└──────────────────────────────────┴───────────────┘
```

### `signup/payment.html`
Keep the Phase 1 shell, with `signup-main--wide` on `<main>`. Content:
```html
<section class="signup-card payment-layout" aria-labelledby="step-title">
  <div class="payment-main">
    <h1 id="step-title">Payment details</h1>
    <div class="demo-banner" role="note">
      <p><strong>Demo only.</strong> No real payment is taken. Use a test card.</p>
      <button type="button" class="btn btn-secondary btn-small" id="fillTestCard">Use test card</button>
    </div>
    <p class="paying-as"><!-- register-style reminder, filled by payment.js --></p>
    <form class="payment-form" novalidate>
      <div class="form-field">
        <label for="cardName">Name on card</label>
        <input id="cardName" name="cardName" autocomplete="cc-name" required>
        <p class="field-error" id="cardName-error" aria-live="polite"></p>
      </div>
      <div class="form-field">
        <label for="cardNumber">Card number</label>
        <input id="cardNumber" name="cardNumber" inputmode="numeric" autocomplete="cc-number" required aria-describedby="card-brands">
        <div class="card-brands" id="card-brands">
          <span class="visually-hidden">We accept</span>
          <!-- four <img> logos, each with data-brand -->
          <span class="visually-hidden card-brand-status" aria-live="polite"></span>
        </div>
        <p class="field-error" id="cardNumber-error" aria-live="polite"></p>
      </div>
      <div class="form-row form-row--three">
        <div class="form-field">
          <label for="cardExpiry">Expiry <span class="label-hint">(MM/YY)</span></label>
          <input id="cardExpiry" name="cardExpiry" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/YY" required>
          <p class="field-error" id="cardExpiry-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label for="cardCvc">Security code</label>
          <input id="cardCvc" name="cardCvc" inputmode="numeric" autocomplete="cc-csc" required>
          <p class="field-error" id="cardCvc-error" aria-live="polite"></p>
        </div>
        <div class="form-field">
          <label for="postalCode">Postal code</label>
          <input id="postalCode" name="postalCode" autocomplete="postal-code" required>
          <p class="field-error" id="postalCode-error" aria-live="polite"></p>
        </div>
      </div>
      <p class="form-error" role="alert" hidden></p>
      <button type="submit" class="btn btn-primary" id="submitBtn"><!-- label set by payment.js --></button>
    </form>
  </div>
  <aside class="order-summary" aria-labelledby="summary-title">
    <h2 id="summary-title">Order summary</h2>
    <!-- filled by payment.js -->
  </aside>
</section>
```

### `js/pages/payment.js` (rewrite)
On `DOMContentLoaded`:
1. `if (!Breezy.flow.guard('payment')) return;` and the storage warning (as before).
2. **Paying as:** "Paying as **Ada Breath** (ada@example.com)", from `state.account`.
3. **Prefill** `#cardName` with `firstName + ' ' + lastName`. It stays editable, and prefilling doesn't make it "dirty."
4. **Order summary** (DOM methods), for `plan = Breezy.plans.get(state.planId)`:
   - the plan name, a **Change** link to `plans.html?plan=<id>`, and `$29/month`
   - trial plan: "Due today **$0**" and "First charge **$29** on **Oct 7**" (from `Breezy.billing`); submit label **"Start free trial"**
   - no trial: "Due today **$9**" and "Then $9 every month"; submit label **"Pay $9 and subscribe"**
5. **Masks:** attach `maskedInput` to number (formatted by detected brand, max 19 digits), expiry and CVC (max 4 digits).
6. **Brand logos:** on each number `input`, detect the brand from the digits typed so far. The matching logo gets `is-active` and the others `is-dimmed`; with no brand, none are dimmed. Set `.card-brand-status` to "Visa card" etc. (empty when no brand), announced politely.
7. **Fields:** attach `formField` to all five inputs with their rules and `debounceMs: 1000`. The CVC rule uses the brand currently detected from the number field. When the brand changes, call `cvcField.revalidate()`.
8. **Use test card:** fills number `4242 4242 4242 4242`, expiry `12/` + (current two-digit year + 2), CVC `123`, and postal code `10001` if it's empty. It doesn't touch the name. It updates the logos and clears any errors on those fields, then focuses the submit button.
9. **Submit:**
   1. `preventDefault()`. `validateNow()` on all fields. On failure, focus the first invalid control and stop.
   2. Guard against double submit with an in-progress flag. Disable the button, set its text to "Processing…", and set `aria-busy="true"` on the form.
   3. `tokenizeCard` with the raw field values. On failure: `showError` each field in `fields` (focus the first), and put `error.message` in `.form-error` if `fields` is empty or the code is `CARD_DECLINED`.
   4. `createSubscription({ accountId: state.account.accountId, planId: state.planId, paymentToken: token })`. On failure: map `fields` as above; otherwise show `error.message` in `.form-error`.
   5. On any failure or rejected promise (`try/catch`; the fallback message is "Something went wrong. Please try again."): restore the button label, re-enable it, and clear the flag and `aria-busy`.
   6. **Success:** `Breezy.flow.update({ subscription: res.data })`, then `window.location.replace('confirmation.html')`. Using `replace` means Back can't return to this form.
10. Never log field values.

### CSS (`css/signup.css`)
- `.payment-layout`: at ≥ 880px, a grid with `1fr 300px` columns and a 40px gap. Below that, a single column with `.order-summary` **first** (`order: -1`).
- `.demo-banner`: amber (like `.storage-warning`), flex row with the text left and the button right; stacks below 480px. `.btn-small`: padding 8px 16px, 0.85rem.
- `.paying-as`: styled like `.plan-reminder`.
- `.card-brands`: flex row, gap 8px, margin-top 8px. Logos are 40×26 inside a 1px `var(--slate-200)` rounded box with a white background and 2px padding. `.is-dimmed`: opacity 0.3. `.is-active`: border `var(--sky-400)`. Opacity transitions over 0.15s.
- `.form-row--three`: three columns (expiry, CVC, postal code) with a 16px gap. Below 480px, expiry and CVC share a row and postal code takes the full width.
- `.order-summary`: `var(--slate-50)` background, `border-radius: var(--radius-lg)`, padding 24px. At ≥ 880px it's `position: sticky; top: 24px`. The plan name uses Playfair Display. Rows are label left, amount right. "Due today" is bold with a top border.
- Reuse the Phase 3 form styles (`.form-field`, `.field-error`, `.has-error`, `.form-error`). Submit is full width below 480px.

---

## Tests
Follow spec 03's conventions. The mock API's `ERRORS` test now expects six codes.

### Unit
**`tests/unit/card-format.test.js`** (new):
- `digitsOnly`: letters, spaces and dashes are removed.
- `detectBrand`:
  - `4` → visa; `51` and `55` → mastercard; `2221` and `2720` → mastercard
  - `2220` and `56` → null
  - `34` and `37` → amex; `6011`, `65` and `644` → discover
  - `1234` and `''` → null
- `luhnValid`: all three `TEST_CARDS` → true; `4242424242424241` → false.
- `formatCardNumber`: Visa → `4242 4242 4242 4242`; Amex → `3782 822463 10005`; partial `42424` → `4242 4`, with no trailing space.
- `formatExpiry`: `'1'`, `'12'`, `'122'` and `'1227'` give the outputs in section 2.
- `cvcLength` and `expectedLength` for every brand and `null`.

**`tests/unit/validation.test.js`** (additions). Pass `now = new Date(2026, 8, 30)` explicitly:
- `cardExpiry`: `'0926'` valid (current month); `'0826'` → expired; `'1326'` → month message; `'1246'` valid (20 years); `'0147'` → year message; `'12'` → format message; `''` → required.
- `cardNumber`: each message in the table, including `1234567890123456` → brand message, and a 15-digit Visa → the 16-digit message.
- `cardCvc`: `'123'` valid for Visa and invalid for Amex (with the Amex message); `'1234'` valid for Amex.
- `cardName`: `'A'` → full-name message; `'Ada Breath'` valid; `'R2D2'` → characters message.
- `postalCode`: `'10001'`, `'SW1A 1AA'` and `'k1a-0b1'` (value `K1A-0B1`) valid; `'12'`, `'1234567890A'` and `'@@@'` invalid.
- `payment(...)`: all valid → `{}` errors; an Amex number with a 3-digit CVC → only a `cardCvc` error.

**`tests/unit/mock-api.test.js`** (update; replace the stub tests). Use `mock.timers.enable({ apis: ['setTimeout', 'Date'], now: new Date(2026, 8, 30, 12) })`:
- `tokenizeCard` with `TEST_CARDS.visa`: `ok`, with `brand: 'visa'`, `last4: '4242'`, and a token matching `/^tok_[0-9a-f]{16}$/`. The stored payment method has **exactly** the keys `token, brand, last4, expMonth, expYear, used, createdAt`, and the raw database JSON doesn't contain `4242424242424242`.
- `4111111111111111` (valid Luhn, not a test card) → `VALIDATION_ERROR` with the test-cards message on `cardNumber`.
- `TEST_CARDS.declined` → `CARD_DECLINED` with `fields.cardNumber`; nothing is saved.
- Invalid fields → `VALIDATION_ERROR` naming them.
- `createSubscription`:
  - Power → `status: 'trialing'`, `firstChargeAt` is 2026-10-07 (compare the local date), `amountCents: 2900`, `card: { brand: 'visa', last4: '4242' }`, and no `accountId` in the returned data.
  - Casual → `'active'`, and `firstChargeAt` equals `startedAt`'s date.
- Re-using a token → the "can't be used" error. A second subscription for the same account with a fresh token → `ALREADY_SUBSCRIBED`. An unknown account → `NOT_FOUND`. Enterprise → the "can't be purchased" error.

### Browser: `tests/e2e/payment.spec.js` (new)
Seed `{ planId: 'power', account }`, where the account is created for real through the API in the test setup (`page.evaluate(() => Breezy.api.createAccount(...))` on the plans page) so `createSubscription` can find it. Install the clock at `2026-09-30T12:00:00`. After each submit, `runFor(1000)` twice, once per API call.
- **Guards:** no account → `register.html`; subscribed → `plans.html`.
- **Summary:** Power shows "Due today $0" and "$29 on Oct 7", with the button "Start free trial". Casual shows "Due today $9", "Then $9 every month", and "Pay $9 and subscribe". Change links to `plans.html?plan=…`.
- **Paying as / prefill:** "Ada Breath (ada@example.com)"; Name on card is `Ada Breath` with no error showing.
- **Letters blocked:** typing `ab12cd` into number → `12`; into expiry → `12`; into CVC → `12`.
- **Formatting:** typing `4242424242424242` → `4242 4242 4242 4242`. Pasting `3782-822463-10005` → `3782 822463 10005`. Typing `1227` into expiry → `12/27`.
- **Backspace at the end:** with `4242 4` and the cursor at the end, Backspace → `4242` (no trailing space left behind), and Backspace again → `424`.
- **Backspace over a separator:** in `4242 4242`, put the cursor right after the space (position 5) and press Backspace → `4244 242`. The digit before the space was removed, because deleting only the space would appear to do nothing.
- **Cursor:** in `4242 4242 4242 4242`, put the cursor after the 6th digit and type `9` → the digit lands there and the cursor stays right after it.
- **Logos:** typing `4` activates the Visa logo and dims the others, and `.card-brand-status` says "Visa card". `37` activates Amex. Clearing the field removes all dimming. The four logos have alt texts "Visa", "Mastercard", "American Express", "Discover".
- **Amex CVC:** Amex number plus CVC `123`, then Tab → the 4-digit Amex message.
- **Expired:** expiry `0826`, then Tab → "This card has expired."
- **Error timing** reuses `form-field.js`: one check that no expiry error shows before 1000ms.
- **Use test card:** fills the number, expiry `12/28` (with the clock in 2026), CVC `123` and postal code, and focuses the submit button.
- **Not a test card:** `4111 1111 1111 1111` → submit → the test-cards message under Card number, the button re-enabled, and the URL unchanged.
- **Declined:** `4000 0000 0000 0002` → "Your card was declined. Try a different card." under Card number plus `.form-error` text; the button is re-enabled.
- **Success:** use the test card → submit → while pending, "Processing…" and disabled → URL ends with `confirmation.html`. `Breezy.flow.get().subscription.card` equals `{ brand: 'visa', last4: '4242' }`. Neither the `sessionStorage` nor the `localStorage` raw strings contain `4242424242424242`, and no stored payment method has a `cvc` key. `page.goBack()` doesn't land on `payment.html`.
- **Double submit:** clicking twice creates exactly one subscription and one used token.
- **Autofill attributes:** `cc-name`, `cc-number`, `cc-exp`, `cc-csc`, `postal-code`; `inputmode="numeric"` on number, expiry and CVC.

**`layout.spec.js`:** the payment page has no overflow at 360/768/1280. At 1280, `.order-summary` is to the right of the form; at 360, it's above the form.

### Regression checks (don't commit)
- In `mock-api.js`, save the full number in the payment method → the "no full number stored" tests fail (unit and browser).
- In `mock-api.js`, accept any Luhn-valid card → the `4111…` tests fail.
- In `masked-input.js`, remove the separator-backspace handling → the backspace test fails.
- In `masked-input.js`, set the cursor to the end after formatting → the cursor test fails.
- In `payment.js`, use `location.href` instead of `replace` on success → the Back test fails.
- In `card-format.js`, drop the `2221`–`2720` Mastercard range → the brand unit test fails.

## Out of scope
Saving cards, discount codes, taxes, charging on the first-charge date, and the confirmation page content (Phase 5).

## Deliverable
The changes above with `npm test` passing (0 skipped). Report:
- the files changed,
- the test summary,
- the regression-check results,
- which logos came from Simple Icons and which (if any) fell back to text badges,
- any deviation from this spec, with the reason.
