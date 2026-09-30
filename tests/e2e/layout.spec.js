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

for (const width of [360, 768, 1280]) {
  test(`payment form does not scroll horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedFlow(page, { planId: 'power', account: SAMPLE.account });
    await page.goto(fileUrl('signup/payment.html'));
    await expect(page.locator('.payment-form')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

test('order summary sits beside the form at 1280px and above it at 360px', async ({ page }) => {
  await seedFlow(page, { planId: 'power', account: SAMPLE.account });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(fileUrl('signup/payment.html'));
  const wide = await page.locator('.payment-main, .order-summary').evaluateAll(els => {
    return els.map(el => el.getBoundingClientRect());
  });
  expect(wide[1].left).toBeGreaterThan(wide[0].right - 1);

  await page.setViewportSize({ width: 360, height: 800 });
  const narrow = await page.locator('.payment-main, .order-summary').evaluateAll(els => {
    return els.map(el => el.getBoundingClientRect());
  });
  expect(narrow[1].bottom).toBeLessThanOrEqual(narrow[0].top + 1);
});

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 800 },
]) {
  test(`the selected plan dot stays inside its circle at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(fileUrl('signup/plans.html', '?plan=power'));
    const selected = page.locator('.plan-card.is-selected');
    const measured = await selected.evaluate(card => {
      const radio = card.querySelector('.plan-card-radio');
      const name = card.querySelector('.plan-card-name');
      const radioBox = radio.getBoundingClientRect();
      const nameBox = name.getBoundingClientRect();
      const dot = getComputedStyle(radio, '::after');
      const hit = document.elementFromPoint(
        nameBox.left + nameBox.width / 2,
        nameBox.top + nameBox.height / 2
      );
      return {
        width: radioBox.width,
        height: radioBox.height,
        centerGap: Math.abs((radioBox.top + radioBox.height / 2) - (nameBox.top + nameBox.height / 2)),
        dotWidth: Number.parseFloat(dot.width),
        dotHeight: Number.parseFloat(dot.height),
        position: getComputedStyle(radio).position,
        nameIsOnTop: hit === name || name.contains(hit),
      };
    });
    expect(measured.width).toBeCloseTo(18, 0);
    expect(measured.height).toBeCloseTo(18, 0);
    expect(measured.centerGap).toBeLessThanOrEqual(4);
    expect(measured.dotWidth).toBeLessThanOrEqual(18);
    expect(measured.dotHeight).toBeLessThanOrEqual(18);
    expect(measured.position).not.toBe('static');
    expect(measured.nameIsOnTop).toBe(true);
  });

  test(`the pinned summary stays above the comparison table at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(fileUrl('signup/plans.html', '?plan=power'));
    await page.locator('.compare-title').evaluate(el => el.scrollIntoView());
    const covered = await page.evaluate(() => {
      const summary = document.querySelector('.plan-summary');
      const text = summary.querySelector('.plan-summary-text').getBoundingClientRect();
      const button = document.getElementById('continueBtn').getBoundingClientRect();
      const bar = summary.getBoundingClientRect();
      const points = [
        [text.left + text.width / 2, text.top + text.height / 2],
        [button.left + button.width / 2, button.top + button.height / 2],
        [bar.left + 10, bar.top + bar.height / 2],
      ];
      return points.map(([x, y]) => summary.contains(document.elementFromPoint(x, y)));
    });
    expect(covered).toEqual([true, true, true]);
  });

  test(`continue still opens register when the summary covers the table at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto(fileUrl('signup/plans.html', '?plan=power'));
    await page.locator('.compare-title').evaluate(el => el.scrollIntoView());
    const box = await page.locator('#continueBtn').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(/register\.html$/);
  });
}

for (const width of [360, 768, 1280]) {
  test(`open confirmation dialog does not scroll horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedFlow(page, READY);
    await page.goto(fileUrl('signup/confirmation.html'));
    await page.locator('#cancelBtn').click();
    await expect(page.locator('#cancelDialog')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const width of [360, 1280]) {
  test(`signed-in homepage does not scroll horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedFlow(page, READY);
    await page.goto(fileUrl('breezy-intern-test.html'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

for (const width of [360, 768, 1280]) {
  test(`homepage with a newsletter error does not scroll horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(fileUrl('breezy-intern-test.html'));
    await page.locator('#newsletterForm').evaluate(form => form.requestSubmit());
    await expect(page.locator('#emailInput-error')).not.toBeEmpty();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });

  test(`register actions row does not scroll horizontally at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedFlow(page, { planId: 'power' });
    await page.goto(fileUrl('signup/register.html'));
    await expect(page.locator('.signup-main > .back-to-plans')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}

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
