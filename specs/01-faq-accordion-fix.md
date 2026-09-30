# Spec 01: FAQ Accordion Fix (Part 1)

## Goal
Make the FAQ accordion in `breezy-intern-test.html` behave as a standard single-open accordion:
- Clicking a closed question opens it and closes any other open question.
- Clicking an open question closes it.
- At most one question is open at any time.

## Current behavior (the bug)
`toggleFaq(btn)` (in the `<script>` block near the bottom of the file, currently lines ~872-876) only calls `classList.add('open')` on the clicked button and its answer. Nothing ever removes `open`, so:
- Clicking an open question does not close it.
- Opening a question does not close the previous one.

## Relevant structure (do not change)
```html
<div class="faq-list">
  <div class="faq-item">
    <button class="faq-q" onclick="toggleFaq(this)">Question</button>
    <div class="faq-a">Answer</div>
  </div>
  ... (5 items total)
</div>
```
Each question has two stateful elements:
- `.faq-q.open`: rotates the `+` icon into an `×` (CSS `::after`).
- `.faq-a.open`: expands the answer (`max-height` and `padding-top` transition).

These two elements must always have the same open/closed state.

## Required change
Rewrite the body of `toggleFaq(btn)`. Keep its name and signature and keep the inline `onclick` handlers. Do not add new event listeners.

Logic, in this order:
1. Read the clicked item's current state once and store it: `const isOpen = btn.classList.contains('open');`
   This must happen **before** step 2. Step 2 also closes the clicked item, so checking afterward would always report "closed" and the item could never be closed by clicking it.
2. Close every item in the same accordion. Scope the query to `btn.closest('.faq-list')` rather than `document`, so a second accordion added to the page later would stay independent. Remove `open` from every `.faq-q` and every `.faq-a` inside that list.
3. If `isOpen` was `false`, add `open` to `btn` and to `btn.nextElementSibling` (its answer).

Rules:
- Both elements' states must come from the single `isOpen` value. Do **not** call `classList.toggle` on the button and answer separately, because that lets them drift out of sync.
- Match the surrounding code style: 2-space indentation inside `<script>`, `const`, arrow functions where used, no semicolon-free style, and no comments beyond a short one if needed.
- Change nothing outside `toggleFaq`. No CSS or HTML changes.

## Acceptance tests (manual, in a browser)
Open the file directly in a browser (no server) and scroll to the FAQ section.
1. Click Q1: Q1 opens and its icon shows `×`.
2. Click Q1 again: Q1 closes and its icon returns to `+`.
3. Click Q1, then Q3: Q1 closes and Q3 opens. Only one answer is visible.
4. Click Q3 again: all items are closed.
5. Click through all 5 questions quickly in order: each time exactly one item is open, and each open item's button and answer both have the `open` class (check in DevTools Elements panel).
6. Regression: the MORE dropdown, the mobile hamburger menu, the newsletter toast, and the nav smooth-scroll still work.
7. The DevTools console shows no errors.

## Out of scope (possible later specs)
- `aria-expanded` on `.faq-q` buttons for screen readers.
- The `.faq-a.open { max-height: 200px; }` cap, which can clip long answers on narrow screens.
- Undefined CSS variables `--slate-400` and `--sky-300`, which cause low-contrast footer text.
- Logo not linking home, and leftover WordPress `<article>`/`<h1>Home</h1>` markup.

## Deliverable
The modified `breezy-intern-test.html` with only `toggleFaq` changed. The implementer should report the final function body and the result of each acceptance test.
