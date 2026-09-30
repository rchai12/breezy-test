# Spec 06: Signup Flow, Phase 3 (Account Creation)

## Context
The signup flow is plans → **register** → payment → confirmation, in `signup/`. Phases 1–2 and the test harness are done (`specs/02`–`04`). Spec 05 (the Watch the Story fix) should be done first so the suite starts with 0 skipped tests.

**Prerequisite:** `npm test` passes before you start. If it doesn't, stop and report.

This phase builds the registration page:
- a form with first name, last name, email, password, confirm password, and a joke waiver checkbox
- field validation that waits for the user to pause or leave the field before showing errors
- a live password checklist
- the simulated backend's `createAccount`, with salted password hashing
- a "signed in as…" view for users who come back to this page after registering

## Hard constraints (unchanged)
- No build step, frameworks or ES modules. Classic `<script defer>` tags attaching to `window.Breezy`. Everything works from `file://`.
- One responsibility per file. Validation rules, form-field behavior and page logic are three separate files.
- DOM is built with `createElement`/`textContent`, or written as static HTML in the page. No `innerHTML`.
- **Passwords never leave the register page's memory:** not in flow state (already enforced), not in `localStorage` or `sessionStorage` in plain text, not in the console, not in the URL. The simulated database stores only a salted hash.
- Code style as before. `npm test` passes at the end with 0 skipped.

## Files
| File | Change |
|---|---|
| `js/validation.js` | **New.** Pure validation rules and clean-up for account fields (Phase 4 adds card rules) |
| `js/components/form-field.js` | **New.** Wires one input to its rule: timing, error display, ARIA |
| `js/mock-api.js` | Implement `createAccount`; seed a demo account; use `validation.js` |
| `js/pages/register.js` | Rewrite: form orchestration, submit, signed-in view |
| `signup/register.html` | Form markup; script tags |
| `css/signup.css` | Form, errors, checklist, waiver, signed-in panel, plan reminder |
| Tests | See "Tests" below |

**Account shape change:** the account now has `firstName` and `lastName` instead of `name`, everywhere: `{ accountId, firstName, lastName, email }`. Update `SAMPLE.account` in `tests/e2e/helpers.js` to `{ accountId: 'acc_test', firstName: 'Ada', lastName: 'Breath', email: 'ada@example.com' }`, and update the JSDoc in `mock-api.js`.

---

## 1. `js/validation.js` (new)
Pure functions with no DOM, storage or timers. Loaded by the register page **and** by `mock-api.js`, which checks everything again like a real server. Exposes `Breezy.validation`:

```js
/** Each returns { value, error }: `value` is the cleaned input, `error` a message string or null. */
firstName(raw)
lastName(raw)
email(raw)
password(raw)
passwordConfirm(password, confirmRaw)
waiver(checked)            // boolean in, { value: checked, error }

/** For the live checklist. */
passwordChecks(raw)        // → { length: bool, letter: bool, number: bool }

/** Runs every account rule at once. */
account({ firstName, lastName, email, password, passwordConfirm, waiver })
  // → { values: { firstName, lastName, email, password }, errors: { field: message } }  (errors is {} when valid)
```

### Rules and messages
Use these messages exactly. They're plain and clear on purpose; the jokes live elsewhere on the page.

| Field | Clean-up | Rule | Message |
|---|---|---|---|
| First name | trim; collapse runs of whitespace to one space | required | `Enter your first name.` |
| | | max 50 characters | `Keep it under 50 characters.` |
| | | must match `/^\p{L}[\p{L}\p{M}'’ .-]*$/u`: starts with a letter; then only letters (including accented), apostrophes (straight `'` and curly `’`, which phone keyboards type by default), spaces, periods and hyphens. **No digits.** | `Use letters only. Spaces, hyphens, apostrophes and periods are fine.` |
| Last name | same as first name | same rules | `Enter your last name.` / same length and character messages |
| Email | trim; lowercase | required | `Enter your email address.` |
| | | max 254 characters | `Email addresses can't be longer than 254 characters.` |
| | | matches `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/` | `Enter an email like name@example.com.` |
| Password | **none**; spaces are allowed and significant | required | `Create a password.` |
| | | max 128 characters | `Keep it under 128 characters.` |
| | | at least 8 characters, and at least one letter (`\p{L}`) and one digit | `Use at least 8 characters, including a letter and a number.` |
| Confirm password | none | required | `Re-enter your password.` |
| | | equals `password` exactly | `Passwords don't match.` |
| Waiver | none | checked | `Please accept the Nostril Waiver to continue.` |

Rules are checked in the table's order, and only the first failing rule's message is returned.

**Should pass:** `Zoë`, `O'Brien`, `O’Brien`, `Jean-Luc`, `St. John`, `José María`, `Ng`, `Ó`.
**Should fail:** `R2D2`, `123`, `-Bob`, `'Ann`, `Ada!`, an empty string, spaces only.

## 2. `js/components/form-field.js` (new)
Connects one form control to its rule and handles *when* errors appear. It exposes `Breezy.formField.attach(control, options)`. Phase 4's payment form reuses it.

```js
const field = Breezy.formField.attach(inputEl, {
  validate: () => Breezy.validation.email(inputEl.value).error,   // returns message or null
  errorEl,              // the element under the input that shows the message
  debounceMs: 1000,
});
field.validateNow();    // validate and show the result immediately; returns true if valid
field.showError(msg);   // show a message from elsewhere (e.g. the backend)
field.clear();          // remove any error
field.revalidate();     // re-check only if the field has been interacted with (used for confirm password)
```

### Timing rules (the user's decision: errors appear after 1 second of no typing, or on leaving the field)
- **While typing:** each `input` event restarts a 1-second timer. When it fires, the field is validated and any error is shown.
- **An error that's already showing disappears immediately** once the input becomes valid. Re-check on every `input` while an error is visible. New errors only ever appear after the pause or on blur, but fixes are acknowledged at once.
- **On blur:** validate immediately and cancel the timer, but **only if the user has typed in the field** (it's "dirty"). Tabbing through an untouched empty field shows nothing.
- **Checkboxes:** validate on `change` (no delay).
- **`validateNow()`** ignores the dirty rule. It's used on submit.

### Accessibility
- Give `errorEl` a stable `id` and add it to the input's `aria-describedby` (keep any existing ids, such as the password checklist's).
- While an error shows: `aria-invalid="true"` on the input, text in `errorEl`, and class `has-error` on the field's wrapper (`control.closest('.form-field')`). When cleared: remove all three.
- `errorEl` gets `aria-live="polite"` in the HTML, so screen readers announce errors once they appear.

## 3. `js/mock-api.js`: implement `createAccount`
Script load order wherever `mock-api.js` is used: `plans-data.js`, `billing.js`, `validation.js`, `flow-state.js`, `mock-api.js`. Update the other signup pages' script tags too, so `mock-api.js` can always find `Breezy.validation`.

```js
createAccount({ firstName, lastName, email, password, passwordConfirm, waiver })
```
In order, after `await delay()`:
1. `Breezy.validation.account(input)`. If there are errors → `{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'Please fix the highlighted fields.', fields: errors } }`.
2. If an account with the same cleaned (lowercased) email exists → `{ ok: false, error: { code: 'EMAIL_TAKEN', message: 'An account with this email already exists.', fields: { email: 'An account with this email already exists.' } } }`.
3. Hash the password:
   - PBKDF2 with SHA-256, 100,000 iterations and a random 16-byte salt from `crypto.getRandomValues`, via `crypto.subtle.importKey` + `deriveBits` (256 bits).
   - Store the hash and salt as hex strings.
   - Put this in an internal `hashPassword(password, saltBytes)` helper.
4. Save `{ accountId, firstName, lastName, email, passwordHash, salt, createdAt }` to `db.accounts`:
   - `accountId` = `'acc_'` + 12 random hex characters
   - `createdAt` = ISO string
5. Return `{ ok: true, data: { accountId, firstName, lastName, email, createdAt } }`. **Never return `passwordHash` or `salt`.**

**Seeded demo account:** `emptyDb()` includes one account, so a reviewer can see the "already registered" error:
```js
{ accountId: 'acc_demo', firstName: 'Tay', lastName: 'Ken', email: 'taken@breezy.io', passwordHash: null, salt: null, createdAt: '2026-01-01T00:00:00.000Z' }
```
`resetDb()` therefore brings it back too.

Add a comment above `hashPassword`: a real system hashes on the server with a slow algorithm (bcrypt, scrypt or Argon2); PBKDF2 in the browser is here only to show the principle of storing a salted hash, never the password.

`crypto.subtle` requires a secure context. Chromium treats `file://` pages as secure, and `window.isSecureContext` is `true` there. If `crypto.subtle` is missing, `createAccount` resolves to `{ ok: false, error: { code: 'VALIDATION_ERROR', message: 'This browser can't create accounts securely.', fields: {} } }` instead of throwing.

## 4. Register page

### `signup/register.html`
Keep the Phase 1 shell. Card content:
```html
<section class="signup-card" aria-labelledby="step-title">
  <h1 id="step-title">Create your account</h1>
  <p class="plan-reminder"><!-- filled by register.js --></p>

  <div class="signed-in-panel" hidden>
    <p>Signed in as <strong class="signed-in-name"></strong> (<span class="signed-in-email"></span>).</p>
    <a class="btn btn-primary" href="payment.html">Continue to payment →</a>
    <p class="start-over">Not you? <button type="button" class="link-button" id="startOverBtn">Start over</button></p>
  </div>

  <form class="register-form" novalidate>
    <p class="step-intro">It takes 30 seconds, or about 6 breaths.</p>
    <div class="form-row">
      <div class="form-field">
        <label for="firstName">First name</label>
        <input id="firstName" name="firstName" autocomplete="given-name" required>
        <p class="field-error" id="firstName-error" aria-live="polite"></p>
      </div>
      <div class="form-field">
        <label for="lastName">Last name</label>
        <input id="lastName" name="lastName" autocomplete="family-name" required>
        <p class="field-error" id="lastName-error" aria-live="polite"></p>
      </div>
    </div>
    <div class="form-field">
      <label for="email">Email</label>
      <input id="email" name="email" type="email" inputmode="email" autocomplete="email" required>
      <p class="field-error" id="email-error" aria-live="polite"></p>
    </div>
    <div class="form-field">
      <label for="password">Password</label>
      <div class="password-wrap">
        <input id="password" name="password" type="password" autocomplete="new-password" required aria-describedby="password-checks">
        <button type="button" class="toggle-password" aria-controls="password" aria-pressed="false">Show</button>
      </div>
      <ul class="password-checks" id="password-checks">
        <li data-check="length">At least 8 characters</li>
        <li data-check="letter">A letter</li>
        <li data-check="number">A number</li>
      </ul>
      <p class="field-error" id="password-error" aria-live="polite"></p>
    </div>
    <div class="form-field">
      <label for="passwordConfirm">Confirm password</label>
      <div class="password-wrap">
        <input id="passwordConfirm" name="passwordConfirm" type="password" autocomplete="new-password" required>
        <button type="button" class="toggle-password" aria-controls="passwordConfirm" aria-pressed="false">Show</button>
      </div>
      <p class="field-error" id="passwordConfirm-error" aria-live="polite"></p>
    </div>
    <div class="form-field form-field--checkbox">
      <input id="waiver" name="waiver" type="checkbox" required>
      <label for="waiver">I've read the <strong>Nostril Waiver</strong> and I get the joke.</label>
      <details class="waiver-text">
        <summary>Read the Nostril Waiver</summary>
        <!-- waiver copy, see below -->
      </details>
      <p class="field-error" id="waiver-error" aria-live="polite"></p>
    </div>
    <p class="form-error" role="alert" hidden></p>
    <button type="submit" class="btn btn-primary" id="submitBtn">Create account</button>
  </form>
</section>
```
`novalidate` turns off the browser's own pop-up messages so ours are the only ones. `required` stays for its meaning to assistive technology.

### Waiver copy
Put these paragraphs inside `<details class="waiver-text">` after the `<summary>`. The user may reword it later.

> **The Nostril Waiver** (v1.0, legally binding in zero jurisdictions)
>
> By checking this box, I, the Breather, acknowledge that Breezy sells air, and that I already have air. It is all around me. I am, in fact, using some right now.
>
> I understand that any money I pay Breezy buys me nothing I couldn't get by opening a window. It is best described as a donation to a company whose main expenses are glass jars and a lab coat.
>
> I agree that Breezy is not responsible for breathing I would have done anyway, sneezes of any size, or the sudden realization that I paid for this.
>
> *No real payment is taken on this site. Your wallet can exhale.*

### `js/pages/register.js` (rewrite)
On `DOMContentLoaded`:
1. `if (!Breezy.flow.guard('register')) return;` then show `.storage-warning` if needed (as before).
2. **Plan reminder:** built from `state.planId` with DOM methods: "**Power Inhaler** · free for 7 days, then $29/mo · [Change](plans.html?plan=power)" (trial plans), or "**Casual Breather** · $9/mo · [Change](plans.html?plan=casual)".
3. **Already registered?** If `state.account` is set: fill `.signed-in-name` with first and last name and `.signed-in-email` with the email, show `.signed-in-panel`, hide the form, and stop. **Start over** runs `Breezy.flow.update({ account: null })`, hides the panel, shows the form with all fields empty, and focuses First name. (The earlier account stays in the simulated database. Re-using its email correctly gives the "already exists" error.)
4. **Attach `formField`** to each input with its rule and `debounceMs: 1000`, and to the waiver checkbox.
   - When `password` changes, call `confirmField.revalidate()`, so a now-mismatched confirmation updates after the same pause.
5. **Password checklist:** on every `input` event on `#password` (no delay; it's guidance, not an error), set class `is-met` on each `li` whose check passes, using `Breezy.validation.passwordChecks`.
6. **Show/Hide toggles:** switch the controlled input between `type="password"` and `type="text"`, toggle `aria-pressed`, and switch the button text between "Show" and "Hide". Keep focus where it was.
7. **Submit:**
   1. `preventDefault()`. Call `validateNow()` on every field. If any fail, focus the first invalid control in page order and stop.
   2. Hide `.form-error`. Disable the submit button and set its text to "Creating account…". Set `aria-busy="true"` on the form.
   3. `const res = await Breezy.api.createAccount({ ...values, passwordConfirm, waiver })`, sending the raw field values.
   4. **Success:** `Breezy.flow.update({ account: res.data })`, then `window.location.href = 'payment.html'`.
   5. **`VALIDATION_ERROR` or `EMAIL_TAKEN` with `fields`:** `showError` each field's message, and focus the first one. If `fields` is empty, show `res.error.message` in `.form-error`.
   6. **Any other failure, or a rejected promise** (`try/catch`): show "Something went wrong. Please try again." in `.form-error`.
   7. On anything except success: re-enable the button, restore "Create account", and remove `aria-busy`.
   8. A second submit while one is in progress does nothing (guard with a flag, not only the disabled button).
8. Never log field values.

### CSS (`css/signup.css`)
- `.plan-reminder`: small `var(--slate-600)` line under the heading, with the plan name bold and the Change link in `var(--sky-600)`.
- `.register-form`: `max-width: 520px`. `.form-row`: two columns with a 16px gap; one column below 480px.
- `.form-field`: margin-bottom 20px. Labels: 0.9rem, weight 600, `var(--slate-700)`. Inputs: full width, padding 12px 14px, `1.5px solid var(--slate-200)`, `border-radius: var(--radius)`, font inherit. Focus: border `var(--sky-400)` plus a 3px `rgba(14,165,233,0.2)` ring.
- `.has-error` input: border `var(--rose-500)`. `.field-error`: 0.85rem, `var(--rose-500)`, margin-top 6px; empty errors take no space (`:empty { display: none }`).
- `.password-wrap`: the input with the Show/Hide button inside its right edge (text button, `var(--sky-600)`, min 44px tap target).
- `.password-checks`: small list, each item prefixed with a gray `○`; `.is-met` items turn `var(--emerald-500)` with a `✓`.
- `.form-field--checkbox`: checkbox and label on one line (checkbox at least 20px). `details.waiver-text` below: `var(--slate-50)` background, padding 12px 16px, `border-radius: var(--radius)`, 0.85rem text.
- `.form-error`: rose-tinted box above the submit button.
- Submit button full width below 480px.
- `.signed-in-panel`: a padded `var(--sky-50)` box. `.link-button`: looks like a link (no background or border, underline, `var(--sky-600)`).

---

## Tests
Follow spec 03's conventions.

### Unit
**`tests/unit/validation.test.js`** (new):
- Every "should pass" and "should fail" name listed in section 1, for both `firstName` and `lastName`.
- Clean-up: `'  Ada   Mae  '` → value `'Ada Mae'`; a 51-character name fails with the length message.
- Email: `ADA@Example.COM ` → value `ada@example.com`, no error. Fails: `ada`, `ada@`, `ada@example`, `ada@example.c`, `a b@example.com`, a 255-character address. Each fails with the right message.
- Password: `'password'` (no digit) and `'12345678'` (no letter) fail; `'breathe123'` passes; `'  spaced 1'` passes and its value keeps the spaces; 129 characters fails with the length message.
- `passwordChecks('abc1')` → `{ length: false, letter: true, number: true }`.
- `passwordConfirm`: empty, mismatch and match cases.
- `waiver(false)` fails; `waiver(true)` passes.
- `account(...)` with everything valid → `errors` is `{}` and `values` are cleaned; with three bad fields → exactly those three keys in `errors`.
- Only the first failing rule's message is returned (e.g. an empty name gives "Enter your first name.", not the character message).

**`tests/unit/mock-api.test.js`** (update; replace the `createAccount` stub test). Add `crypto` (Node's `globalThis.crypto`) and `TextEncoder` to the vm context in `browser-env.js`, and load `validation.js` before `mock-api.js`. If Node rejects typed arrays created inside the vm context, create them through the provided `crypto` instead and note it in your report.
- A valid account resolves `ok: true` with `data` containing exactly `accountId, firstName, lastName, email, createdAt`. `accountId` matches `/^acc_[0-9a-f]{12}$/`.
- The stored account in `localStorage['breezy.db']` has a 64-hex-character `passwordHash` and a 32-hex-character `salt`, and the raw database JSON **does not contain the password string**.
- Two accounts with the same password get different salts and different hashes.
- Invalid input → `VALIDATION_ERROR` with `fields` naming the bad fields, and nothing is saved.
- `taken@breezy.io` and `TAKEN@Breezy.IO` → `EMAIL_TAKEN` with `fields.email`.
- Registering the same new email twice → the second call gets `EMAIL_TAKEN`.
- `resetDb()` restores the demo account.
- The latency test still passes. Advance mock timers, then `await` (hashing is real async work, not a timer).

### Browser: `tests/e2e/register.spec.js` (new)
Seed `{ planId: 'power' }` unless stated. For timing tests, install the clock (`page.clock.install()`) before `goto` and advance it with `page.clock.runFor(ms)`. **With the clock installed, the mock API's delay is also fake:** after submitting, call `await page.clock.runFor(1000)` so the request can finish. Clear `localStorage['breezy.db']` before each test (`addInitScript` with a once-marker, like `seedFlow`).

- **Plan reminder:** shows "Power Inhaler", "free for 7 days, then $29/mo", and a Change link to `plans.html?plan=power`. Seeded Casual shows "$9/mo".
- **Timing:**
  - Type `R2` in First name. After `runFor(999)` → no error. After `runFor(1)` more → "Use letters only…" is visible and the input has `aria-invalid="true"`.
  - Type `R2` then press Tab → the error shows immediately, with no clock advance.
  - With the error showing, change the value to `Ada` → the error disappears immediately, with no clock advance.
  - Focus and blur an untouched empty field → no error.
- **Password checklist:** typing `abc` marks only "A letter"; `abc12345` marks all three, with no clock advance.
- **Confirm password:** Password `breathe123`, Confirm `breathe124`, Tab → "Passwords don't match." Then change Password to `breathe124` and advance 1000ms → the confirm error clears.
- **Submit empty:** every field shows its "required" message (including the waiver), and focus is on First name.
- **Taken email:** fill valid values with `taken@breezy.io` → submit → while pending, the button reads "Creating account…" and is disabled → then "An account with this email already exists." under Email, focus on Email, and the URL is unchanged.
- **Success:** valid values → submit → URL ends with `payment.html`, and `Breezy.flow.get().account` has `firstName`, `lastName`, `email` and `accountId` and no other keys. The raw `sessionStorage['breezy.signup']` string and `localStorage['breezy.db']` string **do not contain the password**.
- **Double submit:** clicking submit twice quickly creates exactly one account in `breezy.db` (the demo account plus one).
- **Show/Hide:** clicking Show makes the password `type="text"` with `aria-pressed="true"` and the text "Hide"; clicking again reverses it.
- **Autofill attributes:** `given-name`, `family-name`, `email`, and `new-password` on both password fields.
- **Waiver:** the `<details>` opens and contains "No real payment is taken".
- **Returning user:** seed `{ planId: 'power', account: SAMPLE.account }` → the signed-in panel shows "Ada Breath (ada@example.com)", the form is hidden, and Continue links to `payment.html`. Start over → the form is visible and empty, First name is focused, and `Breezy.flow.get().account === null`.
- **Guards still apply:** no plan → redirects to `plans.html`; subscribed → redirects to `plans.html`.

**`layout.spec.js`:** the register page (form view and signed-in view) has no horizontal overflow at 360/768/1280. At 360px, First and Last name are stacked; at 768px they're side by side.

### Regression checks (don't commit)
- In `form-field.js`, set `debounceMs` to 0 behavior (show errors on every input) → the "no error after 999ms" test fails.
- In `form-field.js`, drop the dirty check on blur → the untouched-blur test fails.
- In `mock-api.js`, store the password instead of the hash → the "database doesn't contain the password" tests fail (unit and browser).
- In `validation.js`, allow digits in names → the `R2D2` and `R2` tests fail.
- In `register.js`, remove the in-progress flag and the button disabling → the double-submit test fails.

## Out of scope
- Logging in to an existing account, and password reset.
- Payment and the card rules in `validation.js` (Phase 4).
- The confirmation page (Phase 5).

## Deliverable
The changes above with `npm test` passing (0 skipped). Report the files changed, the test summary, the regression-check results, and any deviation from this spec with the reason.
