const { test, expect, fileUrl } = require('./helpers');

test('a new subscriber comes back to the homepage already signed in', async ({ page }) => {
  const frozen = new Date('2026-09-30T12:00:00');
  await page.clock.install({ time: frozen });
  await page.clock.pauseAt(frozen);
  await page.addInitScript(() => {
    const marker = 'breezy.db.cleared';
    if (sessionStorage.getItem(marker)) return;
    localStorage.removeItem('breezy.db');
    sessionStorage.setItem(marker, '1');
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.getByRole('link', { name: 'Start Free Trial' }).click();
  await expect(page).toHaveURL(/signup\/plans\.html\?plan=power$/);
  await page.locator('#continueBtn').click();
  await expect(page).toHaveURL(/signup\/register\.html$/);

  await page.locator('#firstName').fill('Journey');
  await page.locator('#lastName').fill('Tester');
  await page.locator('#email').fill('journey@example.com');
  await page.locator('#password').fill('breathe123');
  await page.locator('#passwordConfirm').fill('breathe123');
  await page.locator('#waiver').check();
  await page.locator('#submitBtn').click();
  await page.clock.runFor(1000);
  await expect(page).toHaveURL(/signup\/payment\.html$/);

  await page.locator('#fillTestCard').click();
  await page.locator('#submitBtn').click();
  await page.clock.runFor(1000);
  await page.clock.runFor(1000);
  await expect(page).toHaveURL(/signup\/confirmation\.html$/);
  const summary = page.locator('.subscription-summary');
  await expect(summary).toContainText('Power Inhaler');
  await expect(summary).toContainText('Free trial');
  await expect(summary).toContainText('$29');
  await expect(summary).toContainText('\u2022\u2022\u2022\u2022 4242 on Oct 7');

  await page.getByRole('link', { name: 'Back to Breezy' }).click();
  await expect(page).toHaveURL(/breezy-intern-test\.html$/);
  const chip = page.locator('#accountSlot .account-chip');
  await expect(chip).toContainText('Journey Tester');
  await expect(chip).toContainText('Power Inhaler');

  await page.getByRole('link', { name: 'Get Started' }).click();
  await expect(page).toHaveURL(/signup\/plans\.html\?plan=casual$/);
  await expect(page.locator('.subscribed-notice')).toContainText("You're already subscribed to Power Inhaler");
});
