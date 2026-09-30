const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
});

test('Start Breathing Better opens the plans page', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.getByRole('link', { name: 'Start Breathing Better →' }).click();
  await expect(page).toHaveURL(/signup\/plans\.html$/);
});

test('Get Started opens plans with the casual plan', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.getByRole('link', { name: 'Get Started' }).click();
  await expect(page).toHaveURL(/signup\/plans\.html\?plan=casual$/);
});

test('Start Free Trial opens plans with the power plan', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.getByRole('link', { name: 'Start Free Trial' }).click();
  await expect(page).toHaveURL(/signup\/plans\.html\?plan=power$/);
});

test('Book Air in the mid bar opens the plans page', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.locator('.mid-links').getByRole('link', { name: 'Book Air' }).click();
  await expect(page).toHaveURL(/signup\/plans\.html$/);
});

test('Book Air in the mobile menu opens the plans page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.locator('#hamburgerBtn').click();
  await page.locator('#mobileMenu').getByRole('link', { name: 'Book Air' }).click();
  await expect(page).toHaveURL(/signup\/plans\.html$/);
});

test('Watch the Story shows its toast and stays on the homepage', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  const url = page.url();
  await page.getByRole('button', { name: 'Watch the Story' }).click();
  const toast = page.locator('#toast');
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toHaveText('📺 Playing: "The Art of Nothing" (3 min)');
  await expect(page).toHaveURL(url);
});

test('Watch the Story does not open another page', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  let opened = false;
  page.context().on('page', () => {
    opened = true;
  });
  await page.getByRole('button', { name: 'Watch the Story' }).click();
  await expect(page.locator('#toast')).toHaveClass(/show/);
  expect(opened).toBe(false);
});

test('Contact Sales shows its toast and stays on the homepage', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  const url = page.url();
  await page.getByRole('button', { name: 'Contact Sales' }).click();
  const toast = page.locator('#toast');
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toHaveText('📞 Our Air Sales team will reach out within 1 business breath.');
  await expect(page).toHaveURL(url);
});

test('Subscribe Free asks for an email, then welcomes a valid one', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  const toast = page.locator('#toast');
  await page.getByRole('button', { name: 'Subscribe Free →' }).click();
  await expect(toast).toHaveClass(/show/);
  await expect(toast).toContainText('valid email');

  await page.locator('#emailInput').fill('a@b.co');
  await page.getByRole('button', { name: 'Subscribe Free →' }).click();
  await expect(toast).toContainText('Welcome to Breezy');
  await expect(page.locator('#emailInput')).toHaveValue('');
});

const SEEDED_PAGES = [
  ['plans', 'signup/plans.html', {}],
  ['register', 'signup/register.html', { planId: 'power' }],
  ['payment', 'signup/payment.html', { planId: 'power', account: SAMPLE.account }],
  ['confirmation', 'signup/confirmation.html', { subscription: SAMPLE.subscription }],
];

for (const [name, relPath, state] of SEEDED_PAGES) {
  test(`the Breezy brand on the ${name} page returns home`, async ({ page }) => {
    await seedFlow(page, state);
    await page.goto(fileUrl(relPath));
    await page.locator('.signup-header .nav-brand').click();
    await expect(page).toHaveURL(/breezy-intern-test\.html$/);
  });
}
