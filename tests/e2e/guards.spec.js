const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

const PAGES = [
  {
    path: 'signup/plans.html',
    seed: {},
    title: 'Choose your plan · Breezy',
    heading: 'Choose your plan',
    current: 'Plan',
    complete: [],
  },
  {
    path: 'signup/register.html',
    seed: { planId: 'power' },
    title: 'Create your account · Breezy',
    heading: 'Create your account',
    current: 'Account',
    complete: ['Plan'],
  },
  {
    path: 'signup/payment.html',
    seed: { planId: 'power', account: SAMPLE.account },
    title: 'Payment details · Breezy',
    heading: 'Payment details',
    current: 'Payment',
    complete: ['Plan', 'Account'],
  },
  {
    path: 'signup/confirmation.html',
    seed: { subscription: SAMPLE.subscription },
    title: "You're all set · Breezy",
    heading: "You're all set. Inhale.",
    current: 'Done',
    complete: ['Plan', 'Account', 'Payment'],
  },
];

test('an empty signup opens later steps on the plans page', async ({ page }) => {
  for (const relPath of ['signup/register.html', 'signup/payment.html', 'signup/confirmation.html']) {
    await page.goto(fileUrl(relPath));
    await expect(page).toHaveURL(/signup\/plans\.html$/);
  }
});

test('a guard redirect does not leave the skipped page in history', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.goto(fileUrl('signup/payment.html'));
  await expect(page).toHaveURL(/signup\/plans\.html$/);
  await page.goBack();
  await expect(page).toHaveURL(/breezy-intern-test\.html$/);
});

test('a chosen plan opens register and sends payment back to register', async ({ page }) => {
  await seedFlow(page, { planId: 'power' });
  await page.goto(fileUrl('signup/register.html'));
  await expect(page).toHaveURL(/signup\/register\.html$/);
  await page.goto(fileUrl('signup/payment.html'));
  await expect(page).toHaveURL(/signup\/register\.html$/);
});

test('an account opens payment and sends confirmation back to payment', async ({ page }) => {
  await seedFlow(page, { planId: 'power', account: SAMPLE.account });
  await page.goto(fileUrl('signup/payment.html'));
  await expect(page).toHaveURL(/signup\/payment\.html$/);
  await page.goto(fileUrl('signup/confirmation.html'));
  await expect(page).toHaveURL(/signup\/payment\.html$/);
});

test('enterprise is sent back to the plans page', async ({ page }) => {
  await seedFlow(page, { planId: 'enterprise' });
  await page.goto(fileUrl('signup/register.html'));
  await expect(page).toHaveURL(/signup\/plans\.html$/);
});

for (const entry of PAGES) {
  test(`${entry.heading} shows the right title and step`, async ({ page }) => {
    await seedFlow(page, entry.seed);
    await page.goto(fileUrl(entry.path));
    await expect(page).toHaveTitle(entry.title);
    await expect(page.locator('h1')).toHaveText(entry.heading);
    await expect(page.locator('.steps-indicator li[aria-current="step"]')).toHaveText(entry.current);
    for (const label of ['Plan', 'Account', 'Payment', 'Done']) {
      const item = page.locator('.steps-indicator li', { hasText: new RegExp(`^${label}$`) });
      if (entry.complete.includes(label)) await expect(item).toHaveClass(/is-complete/);
      else await expect(item).not.toHaveClass(/is-complete/);
    }
  });
}
