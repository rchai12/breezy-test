# Spec 10: Phase 6 (Back Button, Polish, README, Deployment)

## Context
The site and the full signup flow are done (`specs/01`–`09`). This last phase:
- adds a Back button on the registration page
- applies seven polish items
- writes the README for the take-home reviewers
- prepares the repo for **GitHub Pages**

The user will enable Pages and make the repo public themselves. **Do not push, and do not change repository settings.**

**Prerequisite:** `npm test` passes with 0 skipped before you start. If it doesn't, stop and report.

## Hard constraints (unchanged)
No build step, frameworks or ES modules; everything works from `file://` **and** from `https://`. One responsibility per file. No `innerHTML`. Code style as before. `npm test` passes at the end with 0 skipped.

---

## 1. Back button on the registration page
The user's rules:
- **Register → Plans:** a Back button (this section).
- **Payment → Register:** no Back button. The payment page's order summary already has a **Change** link to plans.
- **Confirmation:** no Back button. The signup is finished.

### `signup/register.html`
Wrap the submit button in an actions row:
```html
<div class="form-actions">
  <a class="btn btn-secondary back-to-plans" href="plans.html">← Back to plans</a>
  <button type="submit" class="btn btn-primary" id="submitBtn">Create account</button>
</div>
```
In the signed-in panel, put the same link next to "Continue to payment →", also inside a `.form-actions` row. Both links have class `back-to-plans`.

### `js/pages/register.js`
- Set the `href` of every `.back-to-plans` to `plans.html?plan=<state.planId>`, so the user's plan is still selected when they arrive.
- **While account creation is in progress,** set `aria-disabled="true"` and class `is-disabled` on the Back link, and ignore clicks on it (`preventDefault` if the in-progress flag is set). Restore it afterwards. This stops a half-finished request from being abandoned mid-way.
- Going back **doesn't change flow state.** An existing `account` stays, so the user comes back to the signed-in view. Typed form values are **not** saved (the password must never be stored), so they're lost on Back. The README says so.

### CSS (`css/signup.css`)
- `.form-actions`: flex row, `justify-content: space-between`, gap 12px, margin-top 8px.
- Below 480px: `flex-direction: column-reverse`, with both buttons full width, so the primary button is on top and Back is below it.
- `.btn.is-disabled`: the same look as the existing disabled style, plus `pointer-events: none`.

---

## 2. Polish

### 2.1 Automated accessibility checks
- Install `@axe-core/playwright` as an exact-pinned dev dependency.
- New `tests/e2e/a11y.spec.js`: run `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()` on each state below. **Fail on any violation with impact `serious` or `critical`**, and print the rule id and target selectors in the failure message. Log `moderate` and `minor` violations with `console.log`; they don't fail the test, but list them in your report.
- States:
  - the homepage
  - the homepage with the mobile menu open (390×844)
  - plans with no selection, and with `?plan=power`
  - register: the form view, the form with errors after an empty submit, and the signed-in view
  - payment: empty, and after an empty submit
  - confirmation, with reduced motion so the overlay isn't present, and with the cancel dialog open
  - `index.html`, before its redirect (disable navigation by aborting the request to `breezy-intern-test.html`)
- **Fixing what it finds:**
  - **Signup pages (our code):** fix every serious or critical violation.
  - **Homepage (original content):** fix it if the fix is a small CSS or attribute change. Two known likely issues:
    - the newsletter's "No spam…" line (`--slate-500` on `--slate-900`): change it to `var(--slate-400)`
    - the "Trusted by" logo row (`opacity: 0.35`): raise it to `0.6`. The logo names are 1.3rem bold, so they count as large text, which needs a 3:1 contrast ratio.
  - If a homepage violation needs a redesign, exclude only that rule and that selector with `.exclude()`, add a code comment explaining why, and list it in your report.

### 2.2 The homepage logo links home
Change the mid-bar brand (line ~25 of `breezy-intern-test.html`) from a `div` to:
```html
<a class="nav-brand" href="#hero" aria-label="Breezy, back to top"><em>Breezy</em>&thinsp;™</a>
```
The existing smooth-scroll handler already covers `a[href^="#"]`. Add `text-decoration: none` to `.nav-brand` in `css/home.css` if needed. Leave the footer brand as it is.

### 2.3 Remove the leftover WordPress markup
Replace the wrapper that starts at the `<article id="post-2" …>` line with a plain `<main id="main">`. Remove, all together:
- the `<article …>` opening tag
- `<header class="header"><h1 class="entry-title" itemprop="name">Home</h1> </header>`
- `<div class="entry-content" itemprop="mainContentOfPage">`
- the empty `<p></p>` and `<div class="entry-links"></div>` near the end
- the matching closing `</div>` and `</article>`, replaced by `</main>`

The hero's "Premium Artisanal Air…" heading then becomes the page's **only** `h1`. Nothing should move visually. Compare at 1280px and 360px, and say so in your report.

### 2.4 `index.html` for hosting
Web hosts serve `index.html` by default. Create one at the repo root:
```html
<!DOCTYPE html>
<html lang="en-US">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Breezy</title>
<meta http-equiv="refresh" content="0; url=breezy-intern-test.html">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
</head>
<body>
<p><a href="breezy-intern-test.html">Continue to Breezy</a></p>
</body>
</html>
```
Also add an empty **`.nojekyll`** file at the root, so GitHub Pages serves every file as-is instead of processing it with Jekyll.

### 2.5 Newsletter email validation
Replace the "must contain `@`" check and its pop-up with the signup's email rule and an inline error. **Subscribing still goes nowhere,** as before; only the validation changes.

Markup (`breezy-intern-test.html`): turn `.nl-form` into a real form, so Enter submits:
```html
<form class="nl-form" id="newsletterForm" novalidate>
  <div class="nl-field">
    <label for="emailInput" class="visually-hidden">Email address</label>
    <input type="email" placeholder="you@breathe.io" id="emailInput" autocomplete="email" inputmode="email">
    <p class="nl-error" id="emailInput-error" aria-live="polite"></p>
  </div>
  <button type="submit" class="btn btn-primary">Subscribe Free →</button>
</form>
```
Add a `.visually-hidden` utility to `css/home.css` (same rules as in `signup.css`) if it isn't there.

Scripts: load `js/card-format.js`, `js/validation.js` and `js/components/form-field.js` on the homepage, before `home.js`.

`js/home.js`: replace `handleSignup()` with a submit handler on `#newsletterForm`:
- Attach `Breezy.formField` to `#emailInput` with `validate: () => Breezy.validation.email(input.value).error` and `debounceMs: 1000`. That's the same timing as signup: after a 1-second pause, on blur if typed in, and on submit.
- On submit: `preventDefault()`, then `validateNow()`. If it's invalid, focus the input. If it's valid, show the existing toast `🎉 Welcome to Breezy! Check your inbox (or just inhale).`, clear the input, and `field.clear()`.
- Remove the old "⚠️ Please enter a valid email…" toast. The inline message replaces it.

CSS (`css/home.css`):
- `.nl-field`: `flex: 1`, and the input inside it takes full width.
- `.nl-error`: 0.85rem, color `#fda4af` (a light rose that's readable on the dark box), left-aligned, margin-top 6px; `:empty { display: none; }`.
- `.nl-form input[aria-invalid="true"]`: border color `#fda4af`.
- Keep the existing column layout below 768px.

### 2.6 Browser-tab icon and no-JavaScript notice
- Create `assets/favicon.svg`:
  ```xml
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🌬️</text></svg>
  ```
  Link it with `<link rel="icon" href="…/assets/favicon.svg" type="image/svg+xml">` from `index.html`, `breezy-intern-test.html` and all four signup pages (paths relative to each page).
- On each signup page, add as the first child of `<main>`:
  ```html
  <noscript><p class="storage-warning">This signup needs JavaScript. Please turn it on, or call 1-888-AIR-GOOD.</p></noscript>
  ```
  This reuses the warning style. It must be visible without JavaScript, so the `hidden` attribute doesn't apply here.

### 2.7 Escape closes the mobile menu and the MORE dropdown
`js/home.js`: add one `keydown` listener on `document`. When `event.key === 'Escape'`:
- If `#mobileMenu` is open: call `closeMobile()` and focus `#hamburgerBtn`.
- Else if `#moreDropdown` is open: remove `open` from it and from `.more-btn`, and focus `.more-btn`.

Also set `aria-expanded` on `#hamburgerBtn` and `.more-btn` whenever they open or close (in `toggleMobileMenu`, `closeMobile`, `toggleMore` and the outside-click handler), with `aria-controls` pointing at `mobileMenu` / `moreDropdown` in the HTML. Give the hamburger `aria-label="Menu"`. It currently has no accessible name, which axe will flag.

---

## 3. README.md
**Audience:** Click Here Labs reviewers evaluating an intern take-home. They'll skim first, then check the details. Write in plain, direct language. Use tables where they're denser than prose. Keep the existing "Running the tests" content, now as section 8.

**Sections 1 and 9 are written by the user.** Create those headings with an HTML comment placeholder only, and don't write their content:
```md
## 1. Overview
<!-- Written by Richard: what I built for Part 1 and Part 2, and why I chose the signup flow. -->
```
```md
## 9. Process
<!-- Written by Richard: how I worked (architect/implementer specs, manual testing, bugs found). Links: specs/, Coding_Agents/, notes.md, problem-solution.md -->
```

Under the title, before section 1, add the CI badge and the live link:
```md
# Breezy: Take-Home Submission
[![Tests](https://github.com/rchai12/breezy-test/actions/workflows/test.yml/badge.svg)](https://github.com/rchai12/breezy-test/actions/workflows/test.yml)

**Live site:** https://rchai12.github.io/breezy-test/
```

### Section contents
**2. Quick start:** open `breezy-intern-test.html` by double-clicking, or visit the live site. No install. Note that the signup flow is best experienced on the live site or in Chrome/Edge (see Limitations).

**3. Deploying (GitHub Pages)**
1. Make the repository public. Free GitHub Pages only serves public repos. **Everything in the repo becomes visible, including `Coding_Agents/` transcripts and `notes.md`.**
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.**
3. Wait for the "pages build and deployment" workflow to finish, then open `https://rchai12.github.io/breezy-test/`. `index.html` redirects to the homepage.

Also mention:
- `.nojekyll` makes Pages serve the files as-is.
- Nothing needs building.
- Hosted over `https`, the signup works in every modern browser, because storage and `crypto.subtle` are fully available there.

**4. Walkthrough.** One subsection per step, each with **What's required** and **What won't work**:
- **Plans:**
  - Required: choose Casual or Power, then Continue.
  - Won't work: Enterprise is contact-only ("Contact Sales" shows a message).
  - Note: the choice is only saved on Continue.
- **Register:**
  - Required: a table of the rules for first name, last name, email, password, confirm password and waiver. Summarize the rules from spec 06 in plain words, not the regexes.
  - Won't work: `taken@breezy.io` (a demo account that already exists); names with digits; logging in to an existing account (not supported).
  - Note: **← Back to plans** keeps your plan, but anything typed is cleared on purpose, so the password is never stored.
- **Payment:**
  - Required: the name on the card (prefilled), the card number, expiry `MM/YY`, the security code (3 digits, or 4 for Amex) and the postal code.
  - A **test cards table:**

    | Card | Number | Result |
    |---|---|---|
    | Visa | 4242 4242 4242 4242 | Succeeds |
    | American Express | 3782 822463 10005 | Succeeds (4-digit security code) |
    | Visa | 4000 0000 0000 0002 | Declined |

    Any future expiry works. Or press **Use test card**.
  - **Won't work: real card numbers.** Only the test numbers above are accepted, **on purpose, to discourage anyone from typing a real card.** Also: expired dates, the wrong code length, and unsupported brands.
  - Note: no money moves; the full card number and code are never stored.
- **Confirmation:**
  - What it shows.
  - "Cancel subscription" is a joke dialog; nothing is cancelled.
  - The breathing animation plays once, and is skipped if the system's "reduce motion" setting is on.
- **Homepage when signed in:** the name and plan badge in the header (on phones, in the menu); "Finish signing up" when there's no subscription yet.

**5. Resetting the demo:** the steps from spec 09, section 5. Open DevTools on any signup page, run `Breezy.api.resetDb(); sessionStorage.clear();`, then reload. Explain what each part clears.

**6. Limitations (what won't work, by design):**
- no real backend
- data lives only in your browser: accounts in `localStorage`, signup progress per tab in `sessionStorage`
- a new tab starts a fresh signup
- no login, password reset or real cancellation
- no real payments
- **Firefox with local files:** progress may not carry between pages when opened from disk. Use the live site, Chrome/Edge, or `python -m http.server` in the repo folder, then `http://localhost:8000`
- Watch the Story shows a message until a video exists (`STORY_VIDEO_URL` in `js/home.js`)

**7. How it works technically:**
- **File map:** a short table of the `css/`, `js/`, `js/components/`, `js/pages/`, `signup/`, `assets/` and `tests/` folders, with one line each.
- **Why plain scripts and a `window.Breezy` namespace instead of ES modules:** Chrome blocks module imports from `file://`, and the site must open by double-clicking.
- **Single source of plan data** (`js/plans-data.js`) feeding both the homepage cards and the plans page.
- **The simulated API** (`js/mock-api.js`): artificial delay, the `{ ok, data }` / `{ ok, error: { code, message, fields } }` contract, re-validation with the same rules as the pages, and how to swap it for real `fetch` calls.
- **Security choices:**
  - user text is only ever rendered with `textContent`
  - flow state rejects unknown keys, so a password can't be stored
  - passwords are hashed with salted PBKDF2 (and a real server would hash, not the browser)
  - card data is tokenized; only brand and last 4 are stored
  - only test cards are accepted
- **Accessibility:**
  - labelled fields with linked errors
  - error timing (after a 1-second pause, or on leaving the field)
  - keyboard support, including Escape
  - reduced motion respected
  - axe checks in CI

**8. Testing:** the existing "Running the tests" content, plus:
- the current counts (unit and browser) from your final `npm test` run
- what's covered (a one-line list)
- that CI runs on every push
- Chromium only, by choice

**10. What I'd improve with more time:**
- a real backend with login and server-side password hashing
- Firefox and Safari in the test suite
- saving non-sensitive form drafts across Back
- annual billing
- a clickable step indicator
- currency and postal formats for other countries
- screenshot-comparison tests
- the real story video
- homepage pricing buttons that recognize existing subscribers
- a login page/service, existing users don't have a way to "retrieve" their account
- account management, ie. email, password, subscription management
- more jokes

**Accuracy:** every command, path, rule and number in the README must match the code. Run each command you document.

---

## Tests
Follow spec 03's conventions.

**`tests/unit/readme-links.test.js`** (new): parse `README.md` for relative Markdown links and image paths (not `http…` or `#…`), and assert each file or folder exists. The live-site and badge URLs are skipped.

**`tests/e2e/register.spec.js`** (additions):
- **Back link:**
  - with `{ planId: 'power' }`, the Back link's href ends with `plans.html?plan=power`
  - clicking it → the plans page with Power selected, and flow state unchanged
  - it's present in the signed-in view too
  - while a submit is pending (before the clock advances), the Back link has `aria-disabled="true"` and clicking it doesn't navigate
- At 360px, the Back button is below "Create account", and both are full width.

**`tests/e2e/home-polish.spec.js`** (new):
- The homepage has exactly **one** `h1`, and it contains "Artisanal Air". There's no element with class `entry-title`.
- The mid-bar logo is a link to `#hero` with an accessible name. Clicking it scrolls to the top (from a scrolled position, `window.scrollY` ends at the hero's offset or less).
- **Escape:**
  - at 390×844, open the mobile menu, press Escape → the menu is closed, the hamburger is focused, and `aria-expanded="false"`
  - at 1280, open MORE, press Escape → it's closed and `.more-btn` is focused
- **Newsletter:**
  - submitting empty with Enter shows "Enter your email address." under the input, with `aria-invalid="true"` and focus on the input, and **no** toast
  - `ada@` then Tab → "Enter an email like name@example.com."
  - `ada@example.com` then Enter → the welcome toast, the input is cleared, and the error is gone
- Every page (`index.html`, the homepage and the 4 signup pages) has a `link[rel="icon"]` whose target file exists.
- `index.html` ends up at `breezy-intern-test.html`.
- **No-JavaScript notice:** with a context created with `javaScriptEnabled: false`, `signup/plans.html` shows "This signup needs JavaScript".

**`tests/e2e/routing.spec.js`:** update the old newsletter test to the new inline behavior, or remove it in favor of the one above. Don't leave both.

**`tests/e2e/a11y.spec.js`** (new): section 2.1.

**`layout.spec.js`:** the homepage with a newsletter error, and the register page with the new actions row, have no overflow at 360/768/1280.

### Regression checks (don't commit)
- Remove the Back link's `?plan=` handling → the Back href test fails.
- Put the WordPress `<h1>Home</h1>` back → the single-`h1` test fails.
- Remove `aria-label` from the hamburger → the a11y test fails with a serious violation.
- Remove `.nojekyll` or `index.html` → the index redirect test fails (and README link check, if linked).
- Break a README link path → the readme-links test fails.

## Out of scope
- Pushing, making the repo public, or enabling Pages (the user does these).
- Writing README sections 1 and 9.
- Any feature beyond this list.

## Deliverable
The changes above with `npm test` passing (0 skipped). Report:
- the files changed
- the test summary
- the regression-check results
- the axe findings: fixed, excluded with reasons, and moderate/minor logged
- visual confirmation that the homepage looks unchanged after 2.3
- the exact steps the user must do to publish (from README section 3)
