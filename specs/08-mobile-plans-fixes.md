# Spec 08: Plans Page Mobile Fixes

Two bugs on `signup/plans.html` below 640px wide, found by the user in manual testing. Both are CSS-only, in `css/signup.css`. The browser tests missed them because they checked positions and overflow, not what is actually drawn on top.

## Bug 1: the selected plan card is covered by a blue oval
**Cause:** the checked dot is `.plan-card-input:checked + .plan-card-radio::after { position: absolute; inset: 2px; }`. It sizes itself against its nearest positioned ancestor. On desktop that's `.plan-card-radio` (`position: absolute`). The phone rule inside `@media (max-width: 639px)` sets `.plan-card-radio { position: static; }`, so the nearest positioned ancestor becomes `.plan-card` (`position: relative`). The dot then fills the whole card, and its `border-radius: 50%` makes it an oval.

**Fix:** in that media query, replace `position: static;` on `.plan-card-radio` with:
```css
position: relative;
top: auto;
left: auto;
```
`position: relative` contains the dot again. `top`/`left: auto` are needed too: without them, the desktop rule's `top: 24px; left: 20px` would shift the relatively positioned circle down and left, onto the badges. The circle stays a grid item in column 1. Change nothing else in that rule.

The architect checked this fix by injecting the CSS in Chromium at 390px and 1280px. The circle sits left of the plan name with the dot inside it, and the desktop layout is unchanged.

## Bug 2: the pinned summary bar is drawn under the table's feature column
**Cause:** on phones, `.plan-summary` is `position: sticky; bottom: 0` with no `z-index`. The table's sticky feature column (`.feature-col` and `tbody th[scope="row"]`) has `z-index: 1`, so those cells draw on top of the summary whenever they scroll underneath it. That hides the summary text and part of the Continue button.

**Fix:** add `z-index: 2;` to `.plan-summary` inside the `@media (max-width: 639px)` block. Leave the desktop `.plan-summary` rule alone; it isn't sticky there.

## Tests (add to `tests/e2e/layout.spec.js`)
At viewport 390×844 on `plans.html?plan=power`:
1. **The dot stays inside its circle:** read the bounding box of `.plan-card.is-selected .plan-card-radio`. It's 18×18, and its vertical center is within 4px of the vertical center of the card's `.plan-card-name` (the circle sits beside the name, not below it). Then check `getComputedStyle(radio, '::after')`: its `width` and `height` in px are both ≤ 18, and `position` of the radio is not `static`. Also check with `document.elementFromPoint` at the center of the selected card's **name text** that the element returned is the name span (or inside it), not the radio.
2. **The summary is on top:** scroll `.compare-title` into view (`scrollIntoView()`), so the pinned summary overlaps table rows. Then, for three points inside `.plan-summary` (the center of `.plan-summary-text`, the center of the Continue button, and 10px in from the summary's left edge at its vertical middle), `document.elementFromPoint` returns an element **inside** `.plan-summary`.
3. Clicking Continue in that scrolled position works: the URL ends with `register.html`. Playwright's click fails if another element covers the button, so this also proves nothing is on top of it.

Run them at 360×800 too.

## Regression checks (don't commit)
- Put `position: static` back on `.plan-card-radio` in the media query → test 1 fails.
- Keep `position: relative` but remove `top: auto; left: auto` → test 1 fails on the circle's vertical position.
- Remove the new `z-index` → tests 2 and 3 fail.

## Deliverable
The two CSS changes and the new tests, with `npm test` passing (0 skipped). Include before/after screenshots of the plans page at 390px (cards area, and the table scrolled under the summary) in your report.
