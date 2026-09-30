const { test, expect, fileUrl } = require('./helpers');

test('homepage pricing cards match the shared plan data', async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
  const expected = await page.evaluate(() => {
    return Breezy.plans.list.map(plan => ({
      name: plan.name,
      tagline: plan.tagline,
      price: `${Breezy.plans.formatPrice(plan.priceCents)}/mo`,
      highlights: [...plan.highlights],
      cta: Breezy.plans.ctaLabel(plan),
      popular: plan.popular,
      selfServe: plan.selfServe,
      href: `signup/plans.html?plan=${plan.id}`,
    }));
  });

  const cards = page.locator('#pricingGrid .price-card');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('#pricingGrid .price-card.popular')).toHaveCount(1);
  await expect(page.locator('#pricingGrid .popular-tag')).toHaveCount(1);

  for (let i = 0; i < expected.length; i += 1) {
    const card = cards.nth(i);
    const plan = expected[i];
    await expect(card.locator('h3')).toHaveText(plan.name);
    await expect(card.locator('.desc')).toHaveText(plan.tagline);
    await expect(card.locator('.price')).toHaveText(plan.price);
    await expect(card.locator('li')).toHaveText(plan.highlights);
    if (plan.popular) {
      await expect(card).toHaveClass(/\bpopular\b/);
      await expect(card.locator('.popular-tag')).toHaveText('Most Popular');
    } else {
      await expect(card).not.toHaveClass(/\bpopular\b/);
      await expect(card.locator('.popular-tag')).toHaveCount(0);
    }
    if (plan.selfServe) {
      const link = card.getByRole('link', { name: plan.cta });
      await expect(link).toHaveAttribute('href', plan.href);
    } else {
      await expect(card.getByRole('button', { name: plan.cta })).toBeVisible();
    }
  }
});
