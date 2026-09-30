const { test, expect, fileUrl } = require('./helpers');

test('signup state survives opening the next page from a local file', async ({ page }) => {
  await page.goto(fileUrl('signup/plans.html'));
  await page.evaluate(() => Breezy.flow.update({ planId: 'power' }));
  await page.goto(fileUrl('signup/register.html'));
  await expect(page).toHaveURL(/signup\/register\.html$/);
  const planId = await page.evaluate(() => Breezy.flow.get().planId);
  expect(planId).toBe('power');
  await expect(page.locator('.storage-warning')).toBeHidden();
});

test('blocked storage shows the warning without a console error', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError');
      },
    });
  });
  await page.goto(fileUrl('signup/plans.html'));
  await expect(page.locator('.storage-warning')).toBeVisible();
});

test('update rejects a password on the real page', async ({ page }) => {
  await page.goto(fileUrl('signup/plans.html'));
  const message = await page.evaluate(() => {
    try {
      Breezy.flow.update({ password: 'x' });
      return '';
    } catch (err) {
      return err.message;
    }
  });
  expect(message).toContain('password');
});
