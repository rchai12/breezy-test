# Spec 05: Fix the "Watch the Story" Button

## The bug
The homepage hero button is broken in the original file:
```html
<button class="btn btn-secondary" onclick="showToast('📺 Playing: \"The Art of Nothing\" (3 min)')">▶ Watch the Story</button>
```
HTML attributes don't treat `\` as an escape character. The attribute value ends at the first `"`, after `Playing: \`, so the browser gets the broken JavaScript `showToast('📺 Playing: \` and clicking the button does nothing. The test harness caught this and marked it `test.fixme` in `tests/e2e/routing.spec.js`.

## Decision
There is no story video yet. For now the button keeps its original intent: it shows the "Playing" toast and goes nowhere. Structure the fix so a video link can be added later by changing one value.

## Changes
**`js/home.js`**: add, next to the other homepage functions:
```js
// Set to a video URL once the story video exists; until then the button only shows a toast.
const STORY_VIDEO_URL = null;

function playStory() {
  if (STORY_VIDEO_URL) {
    window.open(STORY_VIDEO_URL, '_blank', 'noopener');
    return;
  }
  showToast('📺 Playing: "The Art of Nothing" (3 min)');
}
```
The message now lives in JavaScript, where the inner double quotes are fine inside a single-quoted string.

**`breezy-intern-test.html`**:
```html
<button class="btn btn-secondary" onclick="playStory()">▶ Watch the Story</button>
```
Change nothing else.

## Tests
- In `tests/e2e/routing.spec.js`, change the `test.fixme` for "Watch the Story shows its toast and stays on the homepage" back to `test` and remove the bug comment. It must pass: `#toast` gets class `show`, its text is exactly `📺 Playing: "The Art of Nothing" (3 min)`, and the URL is unchanged.
- Add one test: after clicking, no new page or popup opened. Listen for the context's `page` event and assert it didn't fire.
- **Regression check (don't commit):** restore the original `onclick` → the test fails.
- `npm test` passes with **0 skipped**.

## Deliverable
The two edits, the updated tests, and the `npm test` summary.
