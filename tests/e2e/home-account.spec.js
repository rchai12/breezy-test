const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

const LONG_NAME = 'Bartholomew-Maximilian';
const MARKUP_NAME = '<img src=x onerror=alert(1)>';

test.beforeEach(async ({ page }) => {
  const frozen = new Date('2026-09-30T12:00:00');
  await page.clock.install({ time: frozen });
  await page.clock.pauseAt(frozen);
});

test('leaves both account slots empty when nobody is signed in', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await expect(page.locator('#accountSlot')).toBeEmpty();
  await expect(page.locator('#accountSlotMobile')).toBeEmpty();
  await expect(page.locator('.mid-links a').first()).toContainText('Locations');
});

test('offers to finish signing up when there is an account but no subscription', async ({ page }) => {
  await seedFlow(page, { account: SAMPLE.account });
  await page.goto(fileUrl('breezy-intern-test.html'));
  const chip = page.locator('#accountSlot .account-chip');
  await expect(chip).toContainText('Ada Breath');
  await expect(chip).toContainText('Finish signing up \u2192');
  await expect(chip).toHaveAttribute('href', 'signup/payment.html');
  await expect(chip).toHaveAttribute('aria-label', 'Signed in as Ada Breath, finish signing up');
});

test('shows the plan tier after a subscription starts', async ({ page }) => {
  await seedFlow(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.goto(fileUrl('breezy-intern-test.html'));
  const chip = page.locator('#accountSlot .account-chip');
  await expect(chip).toContainText('Ada Breath');
  await expect(chip).toContainText('Power Inhaler');
  await expect(chip).toHaveAttribute('href', 'signup/confirmation.html');
  await expect(chip).toHaveAttribute('aria-label', 'Signed in as Ada Breath, Power Inhaler plan');
});

test('shows the account chip first in the mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedFlow(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.locator('#hamburgerBtn').click();
  await expect(page.locator('#mobileMenu > :first-child')).toHaveAttribute('id', 'accountSlotMobile');
  await expect(page.locator('#accountSlotMobile .account-chip')).toBeVisible();
  await expect(page.locator('#accountSlotMobile')).toContainText('Ada Breath');
});

test('truncates a long name without widening the mid bar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await seedFlow(page, {
    account: { ...SAMPLE.account, firstName: LONG_NAME },
  });
  await page.goto(fileUrl('breezy-intern-test.html'));
  const name = page.locator('#accountSlot .account-chip-name');
  await expect(name).toContainText(LONG_NAME);
  const truncated = await name.evaluate(el => {
    const style = getComputedStyle(el);
    return style.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth;
  });
  expect(truncated).toBe(true);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('renders a markup name as text', async ({ page }) => {
  let dialogs = 0;
  page.on('dialog', async dialog => {
    dialogs += 1;
    await dialog.dismiss();
  });
  await seedFlow(page, {
    account: { ...SAMPLE.account, firstName: MARKUP_NAME },
  });
  await page.goto(fileUrl('breezy-intern-test.html'));
  const chip = page.locator('#accountSlot .account-chip');
  await expect(chip.locator('img')).toHaveCount(0);
  await expect(chip).toContainText(MARKUP_NAME);
  expect(dialogs).toBe(0);
});
