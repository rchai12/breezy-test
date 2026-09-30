const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

const PAGES = [
  { name: 'homepage', path: 'breezy-intern-test.html', signup: false },
  { name: 'plans', path: 'signup/plans.html', signup: true },
  { name: 'register', path: 'signup/register.html', signup: true },
  { name: 'payment', path: 'signup/payment.html', signup: true },
  { name: 'confirmation', path: 'signup/confirmation.html', signup: true },
];

const READY = {
  planId: 'power',
  account: SAMPLE.account,
  subscription: SAMPLE.subscription,
};

for (const width of [360, 768, 1280]) {
  for (const entry of PAGES) {
    test(`${entry.name} does not scroll horizontally at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      if (entry.signup) await seedFlow(page, READY);
      await page.goto(fileUrl(entry.path));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

for (const entry of PAGES.filter(item => item.signup)) {
  test(`${entry.name} shows all four step numbers at 360px`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await seedFlow(page, READY);
    await page.goto(fileUrl(entry.path));
    const visible = await page.locator('.steps-indicator li').evaluateAll(items => {
      return items.map(item => {
        const box = item.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      });
    });
    expect(visible).toEqual([true, true, true, true]);
  });
}
