# Breezy: Take-Home Submission
[![Tests](https://github.com/rchai12/breezy-test/actions/workflows/test.yml/badge.svg)](https://github.com/rchai12/breezy-test/actions/workflows/test.yml)

**Live site:** https://rchai12.github.io/breezy-test/

## 1. Overview
The problem was the toggleFaq function fails because it strictly only opens the answer. No functionality for closing or toggling. Changing from .add('open') to .toggle('open') could fix issue for closing expanded toggles. But it doesn't fix the issue where previously expanded questions do not close when expanding new questions. A listener could be put in place, so the faq is aware when a question is open. An easier way was to use the querySelectorAll to check which questions were open, and then close them all, before expanding for the new question. It also works for existing opened questions, to close them on click, because it captures the state of the question, closes all open questions, then checks that the state was open, so it doesn't reopen the question.

My proposed feature was simulating the sign up process. This meant, areas from the homepage meant for purchasing the subscription, navigated to the sign up areas. It also meant creating pages and functionalities forthe different steps of the process. Such as a comparison page, that lists the different subscription tiers and their features, while allowing the user to select the tier they wish to subscribe to. A registration page, for new users to submit for name, email and password, so their is an account tied to their subscription. A payment page for simulating payment details, and verifying transactions. And finally a confirmation page, so user subscriptions are finalized.

## 2. Quick start
Open [breezy-intern-test.html](breezy-intern-test.html) by double-clicking it, or visit the live site. Nothing to install for the site itself.

The signup flow is best on the live site, or in Chrome or Edge. Firefox can drop progress between pages when the files are opened from disk. See Limitations.

## 3. Deploying (GitHub Pages)
1. Make the repository public. Free GitHub Pages only serves public repos. **Everything in the repo becomes visible, including `Coding_Agents/` transcripts and `notes.md`.**
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch → Branch: `main`, folder `/ (root)` → Save.**
3. Wait for the "pages build and deployment" workflow to finish, then open `https://rchai12.github.io/breezy-test/`. [index.html](index.html) redirects to the homepage.

[.nojekyll](.nojekyll) makes Pages serve the files as-is. Nothing needs building. Hosted over `https`, the signup works in every modern browser, because storage and `crypto.subtle` are fully available there.

## 4. Walkthrough

### Plans
**What's required:** choose Casual or Power, then Continue.

**What won't work:** Enterprise is contact-only. Contact Sales shows a message.

The choice is only saved when you press Continue.

### Register
**What's required:**

| Field | Rule |
|---|---|
| First name | Required. Letters, including accents. Spaces, hyphens, apostrophes and periods are fine. Digits are rejected. Extra whitespace is collapsed. Under 50 characters. |
| Last name | Same rules as the first name. |
| Email | Required. Trimmed and lowercased. Must look like name@example.com. Under 254 characters. |
| Password | Required. At least 8 characters, with a letter and a number. Spaces are kept. Under 128 characters. |
| Confirm password | Must match the password. |
| Nostril Waiver | Must be checked. |

**What won't work:** `taken@breezy.io` already exists. Names with digits are rejected. There is no way to log in to an existing account.

**← Back to plans** keeps your plan, but anything typed is cleared on purpose, so the password is never stored.

### Payment
**What's required:** the name on the card (prefilled from the account), the card number, expiry as MM/YY, the security code (3 digits, or 4 for American Express) and the postal code (3 to 10 letters, numbers, spaces or hyphens).

| Card | Number | Result |
|---|---|---|
| Visa | 4242 4242 4242 4242 | Succeeds |
| American Express | 3782 822463 10005 | Succeeds (4-digit security code) |
| Visa | 4000 0000 0000 0002 | Declined |

Any future expiry works, as long as it is not more than 20 years ahead. Or press **Use test card**.

**What won't work:** real card numbers. Only the test numbers above are accepted, on purpose, to discourage anyone from typing a real card. Expired dates, the wrong code length and unsupported brands are also refused.

No money moves. The full card number and the security code are never stored.

### Confirmation
The page shows the plan, status (Free trial or Active), when the card will be charged, the account name and email, and a reference id.

Cancel subscription opens a joke dialog. Nothing is cancelled. Continue and Escape only close it.

A breathing animation plays once. It is skipped when the system's reduce-motion setting is on.

### Homepage when signed in
The header shows your name. With a subscription it shows the plan badge and links to the confirmation page. Without one it says Finish signing up and links to payment. On a phone, the same chip is the first item in the menu.

## 5. Resetting the demo
Open DevTools on any signup page and run:

```js
Breezy.api.resetDb();
sessionStorage.clear();
```

Then reload.

`Breezy.api.resetDb()` clears the demo accounts, payment methods and subscriptions in `localStorage`. `sessionStorage.clear()` clears this tab's signup progress (the chosen plan, the account and the subscription). A new tab of the confirmation page starts fresh and is sent back to plans. Accounts stay in `localStorage` until `resetDb` runs. `sessionStorage` is per tab.

## 6. Limitations (what won't work, by design)
- No real backend.
- Data lives only in your browser: accounts in `localStorage`, signup progress per tab in `sessionStorage`.
- A new tab starts a fresh signup.
- No login, password reset or real cancellation.
- No real payments.
- **Firefox with local files:** progress may not carry between pages when opened from disk. Use the live site, Chrome or Edge, or run `python -m http.server` in the repo folder, then open `http://localhost:8000`.
- Watch the Story shows a message until a video exists (`STORY_VIDEO_URL` in [js/home.js](js/home.js)).

## 7. How it works technically

| Folder | What it holds |
|---|---|
| [css/](css/) | Shared colors, homepage styles and signup styles |
| [js/](js/) | Shared logic: plans, billing, card formatting, validation, flow state, the mock API and homepage behavior |
| [js/components/](js/components/) | Reusable UI: plan picker, comparison table, form fields, masked card inputs and the breath overlay |
| [js/pages/](js/pages/) | One script per signup step |
| [signup/](signup/) | The four signup pages |
| [assets/](assets/) | Card logos and the tab icon |
| [tests/](tests/) | Unit tests and Chromium browser tests |

Plain scripts share a `window.Breezy` namespace instead of ES modules. Chrome blocks module imports from `file://`, and the site must open by double-clicking.

[js/plans-data.js](js/plans-data.js) is the only list of plans. The homepage cards and the plans page both read it.

[js/mock-api.js](js/mock-api.js) stands in for a server. Each call waits 400 to 900 milliseconds, then returns `{ ok, data }` or `{ ok: false, error: { code, message, fields } }`. It checks the same rules as the pages. A real server would replace those functions with `fetch` calls that return the same shape.

Security choices:

- User text is only ever rendered with `textContent`.
- Flow state rejects unknown keys, so a password cannot be stored there.
- Passwords are hashed with salted PBKDF2. A real server would hash them, not the browser.
- Card data is tokenized. Only the brand and the last 4 digits are stored.
- Only the test cards are accepted.

Accessibility:

- Fields have labels, and errors are linked to those fields.
- An error appears after a 1-second pause, or when you leave the field. It clears as soon as the value is valid.
- The pages work from the keyboard, including Escape for the mobile menu, the MORE menu and the cancel dialog.
- Reduced motion is respected.
- axe checks for WCAG A and AA run in CI.

## 8. Testing
The site itself needs no install: open `breezy-intern-test.html` in a browser.
The tests need Node 22 or newer:

    npm install
    npx playwright install chromium
    npm test              # unit + browser tests
    npm run test:unit     # logic only, runs in under a second
    npm run test:e2e      # Chromium browser tests against the local files

The latest full run is 70 unit tests and 176 browser tests, with 0 skipped. They cover plan math, validation, the mock API, card formatting, guards, each signup step, the homepage and layout, and automated accessibility checks.

Tests also run on GitHub Actions on every push. The suite uses Chromium only, by choice.

## 9. Process
Please see notes.md, /Coding_agents/claude and /Coding_Agents/cursor for transcripts as well as my thought process breakdown along the way.

## 10. What I'd improve with more time
- A real backend with login and server-side password hashing.
- Firefox and Safari in the test suite.
- Saving non-sensitive form drafts across Back.
- Annual billing.
- A clickable step indicator.
- Currency and postal formats for other countries.
- Screenshot-comparison tests.
- The real story video.
- Homepage pricing buttons that recognize existing subscribers.
- Account management, meaning email, password and subscription management.
- UI/UX could use some work. It's "fine", but it doesn't have much draw. Some stuff could be better aligned/fit, like Create your account page.
