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

test('plans page stacks cards and keeps the feature column fixed at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(fileUrl('signup/plans.html', '?plan=power'));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);

  const cards = await page.locator('.plan-card').evaluateAll(items => {
    return items.map(item => {
      const box = item.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, left: box.left, right: box.right };
    });
  });
  expect(cards[1].top).toBeGreaterThanOrEqual(cards[0].bottom - 1);
  expect(cards[2].top).toBeGreaterThanOrEqual(cards[1].bottom - 1);
  cards.forEach(card => {
    expect(card.left).toBeGreaterThanOrEqual(-1);
    expect(card.right).toBeLessThanOrEqual(361);
  });
  const contact = await page.locator('.contact-sales').boundingBox();
  expect(contact.x).toBeGreaterThanOrEqual(-1);
  expect(contact.x + contact.width).toBeLessThanOrEqual(361);

  await expect(page.locator('.swipe-hint')).toBeVisible();

  const header = page.locator('.compare-table tbody th').first();
  const before = await header.boundingBox();
  const scrolled = await page.locator('.compare-scroll').evaluate(el => {
    el.scrollLeft = 200;
    return el.scrollLeft;
  });
  expect(scrolled).toBeGreaterThanOrEqual(200);
  const after = await header.boundingBox();
  expect(Math.abs(after.x - before.x)).toBeLessThan(1);

  await page.locator('.compare-scroll').evaluate(el => el.scrollIntoView({ block: 'start' }));
  const button = await page.locator('#continueBtn').boundingBox();
  expect(button.y).toBeGreaterThanOrEqual(0);
  expect(button.y + button.height).toBeLessThanOrEqual(800);
});

for (const width of [360, 768, 1280]) {
  test(`register form does not scroll horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedFlow(page, { planId: 'power' });
    await page.goto(fileUrl('signup/register.html'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test(`signed-in register view does not scroll horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedFlow(page, { planId: 'power', account: SAMPLE.account });
    await page.goto(fileUrl('signup/register.html'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('first and last name stack at 360px and sit side by side at 768px', async ({ page }) => {
  await seedFlow(page, { planId: 'power' });
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto(fileUrl('signup/register.html'));
  const stacked = await page.locator('#firstName, #lastName').evaluateAll(inputs => {
    return inputs.map(input => input.getBoundingClientRect());
  });
  expect(stacked[1].top).toBeGreaterThanOrEqual(stacked[0].bottom - 1);

  await page.setViewportSize({ width: 768, height: 800 });
  const row = await page.locator('#firstName, #lastName').evaluateAll(inputs => {
    return inputs.map(input => input.getBoundingClientRect());
  });
  expect(Math.abs(row[0].top - row[1].top)).toBeLessThan(2);
  expect(row[0].right).toBeLessThanOrEqual(row[1].left + 1);
});

test('plans page keeps the cards in one row at 1280px', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fileUrl('signup/plans.html', '?plan=power'));
  const tops = await page.locator('.plan-card').evaluateAll(items => {
    return items.map(item => item.getBoundingClientRect().top);
  });
  expect(Math.abs(tops[0] - tops[1])).toBeLessThan(2);
  expect(Math.abs(tops[1] - tops[2])).toBeLessThan(2);
  await expect(page.locator('.swipe-hint')).toBeHidden();
  const overflow = await page.locator('.compare-scroll').evaluate(el => el.scrollWidth - el.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
