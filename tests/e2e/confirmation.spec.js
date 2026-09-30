const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

const BULLETS = '\u2022\u2022\u2022\u2022';

function casualSubscription() {
  const startedAt = '2026-09-30T12:00:00.000Z';
  return {
    ...SAMPLE.subscription,
    planId: 'casual',
    status: 'active',
    startedAt,
    firstChargeAt: startedAt,
    amountCents: 900,
  };
}

async function openConfirmation(page, state) {
  await seedFlow(page, state);
  await page.goto(fileUrl('signup/confirmation.html'));
}

test.beforeEach(async ({ page }) => {
  const frozen = new Date('2026-09-30T12:00:00');
  await page.clock.install({ time: frozen });
  await page.clock.pauseAt(frozen);
});

test('summarizes a power trial', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("You're all set. Inhale.");
  await expect(page.locator('.welcome-line')).toHaveText('Welcome to Breezy, Ada.');
  const summary = page.locator('.subscription-summary');
  await expect(summary).toContainText('Power Inhaler');
  await expect(summary).toContainText('Free trial');
  await expect(summary).toContainText("Your 7-day free trial has started. We'll charge $29 to");
  await expect(summary.locator('img')).toHaveAttribute('alt', 'Visa');
  await expect(summary).toContainText(`${BULLETS} 4242 on Oct 7`);
  await expect(summary).toContainText('Ada Breath \u00B7 ada@example.com');
  await expect(summary).toContainText('sub_test');
});

test('summarizes a casual plan charged today', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'casual',
    account: SAMPLE.account,
    subscription: casualSubscription(),
  });
  const summary = page.locator('.subscription-summary');
  await expect(summary).toContainText('Active');
  await expect(summary).toContainText('We charged $9 to');
  await expect(summary).toContainText('today');
  await expect(summary).toContainText('Next charge: $9 on Oct 30');
});

test('lists the three things that happen next', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await expect(page.locator('.next-steps li')).toHaveText([
    'Enjoy a breath of air with every breath.',
    'Please do not email us.',
    'Thank you for your donation.',
  ]);
});

test('shows a name as text when it contains markup', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: { ...SAMPLE.account, firstName: '<b>Ada</b>' },
    subscription: SAMPLE.subscription,
  });
  const welcome = page.locator('.welcome-line');
  await expect(welcome).toHaveText('Welcome to Breezy, <b>Ada</b>.');
  await expect(welcome.locator('b')).toHaveCount(0);
});

test('back to breezy opens the homepage', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.getByRole('link', { name: 'Back to Breezy' }).click();
  await expect(page).toHaveURL(/breezy-intern-test\.html$/);
});

test('the cancel dialog closes without changing the subscription', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.getByRole('button', { name: 'Cancel subscription' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel your subscription' });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('ol li')).toHaveText([
    'Fill out our 23-page cancellation form.',
    'Attend an exit interview with our Air Retention Specialist.',
    'Solve a CAPTCHA that is actually a lung capacity test.',
  ]);
  await dialog.getByRole('button', { name: 'Continue' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#cancelBtn')).toBeFocused();
  await expect(page).toHaveURL(/confirmation\.html$/);
  const stored = await page.evaluate(() => Breezy.flow.get().subscription);
  expect(stored).toEqual(SAMPLE.subscription);
});

test('escape closes the cancel dialog', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.getByRole('button', { name: 'Cancel subscription' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('the page behind the cancel dialog cannot be clicked', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.getByRole('button', { name: 'Cancel subscription' }).click();
  await page.getByRole('link', { name: 'Back to Breezy' }).click({ force: true });
  await expect(page).toHaveURL(/confirmation\.html$/);
});

test('plays a breath overlay that does not block the page', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  const overlay = page.locator('.breath-overlay');
  await expect(overlay).toHaveAttribute('aria-hidden', 'true');
  await expect(overlay).toHaveCSS('pointer-events', 'none');
  await expect(overlay).toHaveCSS('animation-duration', '2s');
  await page.getByRole('link', { name: 'Back to Breezy' }).click();
  await expect(page).toHaveURL(/breezy-intern-test\.html$/);
});

test('removes the breath overlay when the animation ends', async ({ page }) => {
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.locator('.breath-overlay').dispatchEvent('animationend');
  await expect(page.locator('.breath-overlay')).toHaveCount(0);
});

test('skips the breath overlay when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    window.__breathAdded = false;
    const watch = new MutationObserver(records => {
      records.forEach(record => {
        record.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList.contains('breath-overlay')) {
            window.__breathAdded = true;
          }
        });
      });
    });
    watch.observe(document, { childList: true, subtree: true });
  });
  await openConfirmation(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await expect(page.locator('.breath-overlay')).toHaveCount(0);
  const added = await page.evaluate(() => window.__breathAdded);
  expect(added).toBe(false);
});

test('sends a signup without a subscription back to payment', async ({ page }) => {
  await openConfirmation(page, { planId: 'power', account: SAMPLE.account });
  await expect(page).toHaveURL(/signup\/payment\.html$/);
});
