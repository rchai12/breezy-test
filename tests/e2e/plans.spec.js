const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

const ROW_LABELS = [
  'Price',
  'Free trial',
  'Daily breaths',
  'Atmospheric blends',
  'Nostril optimization',
  'Support',
  'Monthly Air Report™',
  'SSO (Single Sniff-On)',
  '99.9% oxygen uptime SLA',
];

async function openPlans(page, search = '') {
  await page.clock.install({ time: new Date('2026-09-30T12:00:00') });
  await page.goto(fileUrl('signup/plans.html', search));
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
});

test('offers two radios and a separate contact card', async ({ page }) => {
  await openPlans(page);
  await expect(page.getByRole('group', { name: 'Choose a plan' })).toBeVisible();
  await expect(page.getByRole('radio')).toHaveCount(2);
  await expect(page.getByRole('radio', { name: /Casual Breather/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Power Inhaler/ })).toBeVisible();
  const enterprise = page.locator('.plan-card[data-plan="enterprise"]');
  await expect(enterprise.locator('input')).toHaveCount(0);
  await expect(enterprise.getByRole('button', { name: 'Contact Sales' })).toBeVisible();
  await expect(page.getByText('Most popular')).toHaveCount(1);
  await expect(page.getByText('7-day free trial')).toHaveCount(1);
  await expect(page.locator('.plan-card[data-plan="power"] .popular-badge')).toBeVisible();
  await expect(page.locator('.plan-card[data-plan="power"] .trial-badge')).toBeVisible();
});

test('renders a read-only comparison of nine features', async ({ page }) => {
  await openPlans(page);
  const headers = page.locator('.compare-table thead th');
  await expect(headers).toHaveText(['Feature', 'Casual Breather', 'Power Inhaler', 'Enterprise Lung']);
  await expect(page.locator('.compare-table tbody th')).toHaveText(ROW_LABELS);
  await expect(page.locator('.compare-table .visually-hidden', { hasText: 'Included' }).first()).toBeAttached();
  await expect(page.locator('.compare-table .visually-hidden', { hasText: 'Not included' }).first()).toBeAttached();
  await expect(page.locator('.compare-table input, .compare-table button')).toHaveCount(0);
});

test('preselects the power plan from the URL', async ({ page }) => {
  await openPlans(page, '?plan=power');
  await expect(page.getByRole('radio', { name: /Power Inhaler/ })).toBeChecked();
  await expect(page.locator('.plan-card[data-plan="power"]')).toHaveClass(/is-selected/);
  const cells = page.locator('.compare-table [data-plan="power"]');
  const count = await cells.count();
  for (let i = 0; i < count; i += 1) {
    await expect(cells.nth(i)).toHaveClass(/is-highlighted/);
  }
  await expect(page.locator('.plan-summary-text')).toContainText('free for 7 days, then $29/month starting Oct 7');
  await expect(page.locator('#continueBtn')).toBeEnabled();
  await expect(page.locator('#continueBtn')).toHaveText('Continue with Power Inhaler →');
});

test('describes a casual plan as charging today', async ({ page }) => {
  await openPlans(page, '?plan=casual');
  await expect(page.locator('.plan-summary-text')).toContainText('$9/month, first charge today');
});

test('starts with nothing selected when there is no plan to restore', async ({ page }) => {
  await openPlans(page);
  await expect(page.locator('input[name="plan"]:checked')).toHaveCount(0);
  await expect(page.locator('.is-highlighted')).toHaveCount(0);
  await expect(page.locator('.plan-summary-text')).toHaveText('Select a plan to continue.');
  await expect(page.locator('#continueBtn')).toBeDisabled();
  await expect(page.locator('#continueBtn')).toHaveText('Continue');
});

test('restores a saved self-serve plan when the URL has no plan', async ({ page }) => {
  await seedFlow(page, { planId: 'casual' });
  await openPlans(page);
  await expect(page.getByRole('radio', { name: /Casual Breather/ })).toBeChecked();
});

test('lets the URL win over a saved plan', async ({ page }) => {
  await seedFlow(page, { planId: 'casual' });
  await openPlans(page, '?plan=power');
  await expect(page.getByRole('radio', { name: /Power Inhaler/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Casual Breather/ })).not.toBeChecked();
});

test('ignores an enterprise query param', async ({ page }) => {
  await openPlans(page, '?plan=enterprise');
  await expect(page.locator('input[name="plan"]:checked')).toHaveCount(0);
  await expect(page.locator('.plan-summary-text')).toHaveText('Select a plan to continue.');
});

test('selects a plan from anywhere on its card without adding history', async ({ page }) => {
  await openPlans(page);
  const before = await page.evaluate(() => history.length);
  await page.locator('.plan-card[data-plan="casual"] .plan-card-price').click();
  await expect(page.getByRole('radio', { name: /Casual Breather/ })).toBeChecked();
  await expect(page).toHaveURL(/signup\/plans\.html\?plan=casual$/);
  expect(await page.evaluate(() => history.length)).toBe(before);
  await expect(page.locator('.plan-card.is-selected')).toHaveCount(1);
  await expect(page.locator('.plan-card[data-plan="casual"]')).toHaveClass(/is-selected/);
  const casualCells = page.locator('.compare-table [data-plan="casual"]');
  const otherCells = page.locator('.compare-table [data-plan="power"], .compare-table [data-plan="enterprise"]');
  const casualCount = await casualCells.count();
  for (let i = 0; i < casualCount; i += 1) {
    await expect(casualCells.nth(i)).toHaveClass(/is-highlighted/);
  }
  const otherCount = await otherCells.count();
  for (let i = 0; i < otherCount; i += 1) {
    await expect(otherCells.nth(i)).not.toHaveClass(/is-highlighted/);
  }
});

test('moves from Casual to Power with the down arrow', async ({ page }) => {
  await openPlans(page);
  const casual = page.locator('input[value="casual"]');
  await casual.focus();
  await casual.press('ArrowDown');
  await expect(page.getByRole('radio', { name: /Power Inhaler/ })).toBeChecked();
  await expect(page.locator('.compare-table [data-plan="power"]').first()).toHaveClass(/is-highlighted/);
});

test('contact sales shows its message without changing the choice', async ({ page }) => {
  await openPlans(page);
  const url = page.url();
  const message = await page.evaluate(() => Breezy.plans.get('enterprise').contactMessage);
  await page.getByRole('button', { name: 'Contact Sales' }).click();
  await expect(page.locator('.contact-note')).toHaveText(message);
  await expect(page).toHaveURL(url);
  await expect(page.locator('input[name="plan"]:checked')).toHaveCount(0);
});

test('continue saves the plan and back returns to that choice', async ({ page }) => {
  await openPlans(page);
  await page.locator('.plan-card[data-plan="power"] .plan-card-name').click();
  await page.locator('#continueBtn').click();
  await expect(page).toHaveURL(/signup\/register\.html$/);
  expect(await page.evaluate(() => Breezy.flow.get().planId)).toBe('power');
  await page.goBack();
  await expect(page).toHaveURL(/signup\/plans\.html\?plan=power$/);
  await expect(page.getByRole('radio', { name: /Power Inhaler/ })).toBeChecked();
});

test('selecting a plan does not save it', async ({ page }) => {
  await openPlans(page);
  await page.locator('.plan-card[data-plan="casual"] .plan-card-price').click();
  expect(await page.evaluate(() => Breezy.flow.get().planId)).toBeNull();
});

test('an existing subscription blocks another signup', async ({ page }) => {
  await seedFlow(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await openPlans(page, '?plan=casual');
  const notice = page.locator('.subscribed-notice');
  await expect(notice).toContainText("You're already subscribed to Power Inhaler");
  await expect(notice.locator('a')).toHaveAttribute('href', 'confirmation.html');
  await expect(page.getByRole('radio', { name: /Power Inhaler/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Casual Breather/ })).not.toBeChecked();
  await expect(page.getByRole('radio', { name: /Casual Breather/ })).toBeDisabled();
  await expect(page.getByRole('radio', { name: /Power Inhaler/ })).toBeDisabled();
  await expect(page.locator('.compare-table [data-plan="power"]').first()).toHaveClass(/is-highlighted/);
  await expect(page.locator('#continueBtn')).toBeDisabled();

  await page.goto(fileUrl('signup/register.html'));
  await expect(page).toHaveURL(/signup\/plans\.html$/);
  await page.goto(fileUrl('signup/payment.html'));
  await expect(page).toHaveURL(/signup\/plans\.html$/);
});
