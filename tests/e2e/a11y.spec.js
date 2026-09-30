const { test: base, expect } = require('@playwright/test');
const { fileUrl, seedFlow, SAMPLE } = require('./helpers');
const { AxeBuilder } = require('@axe-core/playwright');

// axe fetches stylesheets with XHR. file:// blocks that and logs console errors
// even though the linked styles are already applied.
const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      const text = msg.text();
      const url = msg.location().url || '';
      if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return;
      if (/XMLHttpRequest at 'file:/.test(text) && /\.css/.test(text)) return;
      if (text.includes('Failed to load resource') && /\.css/.test(url)) return;
      errors.push(text);
    });
    await use(page);
    expect(errors, 'console errors').toEqual([]);
  },
});

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

async function expectAccessible(page, label) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const noted = results.violations.filter(item => item.impact === 'moderate' || item.impact === 'minor');
  for (const item of noted) {
    const targets = item.nodes.map(node => node.target.join(' ')).join(', ');
    console.log(`[axe ${label}] ${item.impact} ${item.id}: ${targets}`);
  }
  const blocking = results.violations.filter(item => item.impact === 'serious' || item.impact === 'critical');
  const message = blocking.map(item => {
    const targets = item.nodes.map(node => node.target.join(' ')).join(', ');
    return `${item.id} (${item.impact}): ${targets}`;
  }).join('\n');
  expect(blocking, message).toEqual([]);
}

test('homepage', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await expectAccessible(page, 'homepage');
});

test('homepage mobile menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.locator('#hamburgerBtn').click();
  await expect(page.locator('#mobileMenu')).toHaveClass(/open/);
  await expectAccessible(page, 'homepage mobile menu');
});

test('plans with no selection', async ({ page }) => {
  await page.goto(fileUrl('signup/plans.html'));
  await expectAccessible(page, 'plans empty');
});

test('plans with power selected', async ({ page }) => {
  await page.goto(fileUrl('signup/plans.html', '?plan=power'));
  await expectAccessible(page, 'plans power');
});

test('register form', async ({ page }) => {
  await seedFlow(page, { planId: 'power' });
  await page.goto(fileUrl('signup/register.html'));
  await expectAccessible(page, 'register form');
});

test('register form with errors', async ({ page }) => {
  await seedFlow(page, { planId: 'power' });
  await page.goto(fileUrl('signup/register.html'));
  await page.locator('#submitBtn').click();
  await expect(page.locator('#firstName-error')).not.toBeEmpty();
  await expectAccessible(page, 'register errors');
});

test('register signed in', async ({ page }) => {
  await seedFlow(page, { planId: 'power', account: SAMPLE.account });
  await page.goto(fileUrl('signup/register.html'));
  await expect(page.locator('.signed-in-panel')).toBeVisible();
  await expectAccessible(page, 'register signed in');
});

test('payment empty', async ({ page }) => {
  await seedFlow(page, { planId: 'power', account: SAMPLE.account });
  await page.goto(fileUrl('signup/payment.html'));
  await expectAccessible(page, 'payment empty');
});

test('payment with errors', async ({ page }) => {
  await seedFlow(page, { planId: 'power', account: SAMPLE.account });
  await page.goto(fileUrl('signup/payment.html'));
  await page.locator('#submitBtn').click();
  await expect(page.locator('#cardNumber-error')).not.toBeEmpty();
  await expectAccessible(page, 'payment errors');
});

test('confirmation without the breath overlay', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedFlow(page, { subscription: SAMPLE.subscription });
  await page.goto(fileUrl('signup/confirmation.html'));
  await expect(page.locator('.breath-overlay')).toHaveCount(0);
  await expectAccessible(page, 'confirmation');
});

test('confirmation cancel dialog', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await seedFlow(page, { subscription: SAMPLE.subscription });
  await page.goto(fileUrl('signup/confirmation.html'));
  await page.locator('#cancelBtn').click();
  await expect(page.locator('#cancelDialog')).toBeVisible();
  await expectAccessible(page, 'confirmation dialog');
});

test('index before redirect', async ({ page }) => {
  const html = require('fs').readFileSync(require('path').join(__dirname, '../..', 'index.html'), 'utf8');
  // Aborting the refresh replaces the tab with Chrome's error page, and Playwright
  // cannot read the document while that request is paused. Serve the same file
  // without the refresh line, and abort the homepage if it is still requested.
  await page.route(url => url.pathname.endsWith('/breezy-intern-test.html'), route => route.abort());
  await page.route(url => url.pathname.endsWith('/index.html'), route => {
    route.fulfill({
      status: 200,
      contentType: 'text/html; charset=utf-8',
      body: html.replace('<meta http-equiv="refresh" content="0; url=breezy-intern-test.html">', ''),
    });
  });
  await page.goto(fileUrl('index.html'));
  await expect(page).toHaveURL(/index\.html$/);
  await expect(page.getByRole('link', { name: 'Continue to Breezy' })).toBeVisible();
  await expectAccessible(page, 'index');
});
