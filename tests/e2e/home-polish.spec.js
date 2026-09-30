const fs = require('fs');
const path = require('path');
const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

const ROOT = path.join(__dirname, '../..');

test('the homepage has one heading and no leftover WordPress title', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await expect(page.locator('h1')).toHaveCount(1);
  await expect(page.locator('h1')).toContainText('Artisanal Air');
  await expect(page.locator('.entry-title')).toHaveCount(0);
});

test('the mid-bar logo links back to the top', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  const brand = page.locator('a.nav-brand');
  await expect(brand).toHaveAttribute('href', '#hero');
  await expect(brand).toHaveAccessibleName('Breezy, back to top');
  await page.locator('footer').scrollIntoViewIfNeeded();
  const before = await page.evaluate(() => window.scrollY);
  expect(before).toBeGreaterThan(200);
  await brand.click();
  await page.waitForFunction(() => window.scrollY <= document.getElementById('hero').offsetTop + 2);
});

test('Escape closes the mobile menu and returns focus to the button', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(fileUrl('breezy-intern-test.html'));
  const menu = page.locator('#mobileMenu');
  const button = page.locator('#hamburgerBtn');
  await button.click();
  await expect(menu).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveClass(/open/);
  await expect(button).toBeFocused();
  await expect(button).toHaveAttribute('aria-expanded', 'false');
});

test('Escape closes the more menu and returns focus to its button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fileUrl('breezy-intern-test.html'));
  const menu = page.locator('#moreDropdown');
  const button = page.locator('.more-btn');
  await button.click();
  await expect(menu).toHaveClass(/open/);
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveClass(/open/);
  await expect(button).toBeFocused();
});

test('an empty newsletter submit shows an inline error and no toast', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.locator('#emailInput').press('Enter');
  const error = page.locator('#emailInput-error');
  await expect(error).toHaveText('Enter your email address.');
  await expect(page.locator('#emailInput')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#emailInput')).toBeFocused();
  await expect(page.locator('#toast')).not.toHaveClass(/show/);
});

test('a partial newsletter email is flagged when the field is left', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.locator('#emailInput').pressSequentially('ada@');
  await page.locator('#emailInput').press('Tab');
  await expect(page.locator('#emailInput-error')).toHaveText('Enter an email like name@example.com.');
});

test('a valid newsletter email shows the welcome toast and clears the field', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  await page.locator('#emailInput').fill('ada@example.com');
  await page.locator('#emailInput').press('Enter');
  await expect(page.locator('#toast')).toContainText('Welcome to Breezy');
  await expect(page.locator('#emailInput')).toHaveValue('');
  await expect(page.locator('#emailInput-error')).toBeEmpty();
});

test('index.html redirects to the homepage', async ({ page }) => {
  await page.goto(fileUrl('index.html'));
  await expect(page).toHaveURL(/breezy-intern-test\.html$/);
});

test('every page links a favicon file that exists', async ({ page }) => {
  const pages = [
    'breezy-intern-test.html',
    'signup/plans.html',
    'signup/register.html',
    'signup/payment.html',
    'signup/confirmation.html',
  ];
  const indexHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const indexHref = indexHtml.match(/<link rel="icon" href="([^"]+)"/)[1];
  expect(fs.existsSync(path.join(ROOT, indexHref))).toBe(true);

  for (const rel of pages) {
    if (rel.startsWith('signup/')) {
      await seedFlow(page, {
        planId: 'power',
        account: SAMPLE.account,
        subscription: SAMPLE.subscription,
      });
    }
    await page.goto(fileUrl(rel));
    const href = await page.locator('link[rel="icon"]').getAttribute('href');
    const file = path.resolve(path.dirname(path.join(ROOT, rel)), href);
    expect(fs.existsSync(file), `${rel} -> ${href}`).toBe(true);
  }
});

test('plans tells you to turn JavaScript on', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(fileUrl('signup/plans.html'));
  const shown = await page.evaluate(() => {
    const el = document.querySelector('noscript .storage-warning');
    if (!el) return null;
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    return {
      text: el.textContent,
      display: style.display,
      visibility: style.visibility,
      height: box.height,
    };
  });
  expect(shown.text).toContain('This signup needs JavaScript');
  expect(shown.display).not.toBe('none');
  expect(shown.visibility).not.toBe('hidden');
  expect(shown.height).toBeGreaterThan(0);
  await context.close();
});
