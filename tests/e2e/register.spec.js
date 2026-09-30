const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

async function openRegister(page, state = { planId: 'power' }, search = '') {
  await seedFlow(page, state);
  await page.goto(fileUrl('signup/register.html', search));
}

async function fillAccount(page, overrides = {}) {
  const values = {
    firstName: 'Ada',
    lastName: 'Breath',
    email: 'ada@example.com',
    password: 'breathe123',
    passwordConfirm: 'breathe123',
    waiver: true,
    ...overrides,
  };
  await page.locator('#firstName').fill(values.firstName);
  await page.locator('#lastName').fill(values.lastName);
  await page.locator('#email').fill(values.email);
  await page.locator('#password').fill(values.password);
  await page.locator('#passwordConfirm').fill(values.passwordConfirm);
  if (values.waiver) await page.locator('#waiver').check();
}

test.beforeEach(async ({ page }) => {
  const frozen = new Date('2026-09-30T12:00:00');
  await page.clock.install({ time: frozen });
  await page.clock.pauseAt(frozen);
  await page.addInitScript(() => {
    const marker = 'breezy.db.cleared';
    if (sessionStorage.getItem(marker)) return;
    localStorage.removeItem('breezy.db');
    sessionStorage.setItem(marker, '1');
  });
});

test('shows the chosen plan and a way to change it', async ({ page }) => {
  await openRegister(page);
  const reminder = page.locator('.plan-reminder');
  await expect(reminder).toContainText('Power Inhaler');
  await expect(reminder).toContainText('free for 7 days, then $29/mo');
  await expect(reminder.getByRole('link', { name: 'Change' })).toHaveAttribute('href', 'plans.html?plan=power');
});

test('shows a no-trial price without a free period', async ({ page }) => {
  await openRegister(page, { planId: 'casual' });
  await expect(page.locator('.plan-reminder')).toContainText('$9/mo');
  await expect(page.locator('.plan-reminder')).not.toContainText('free for');
});

test('waits a second before showing a name error', async ({ page }) => {
  await openRegister(page);
  await page.locator('#firstName').evaluate(el => {
    el.value = 'R2';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });
  await page.clock.runFor(999);
  expect(await page.locator('#firstName-error').textContent()).toBe('');
  await page.clock.runFor(1);
  await expect(page.locator('#firstName-error')).toHaveText('Use letters only. Spaces, hyphens, apostrophes and periods are fine.');
  await expect(page.locator('#firstName')).toHaveAttribute('aria-invalid', 'true');
});

test('shows a name error immediately when the field is left', async ({ page }) => {
  await openRegister(page);
  await page.locator('#firstName').pressSequentially('R2');
  await page.locator('#firstName').press('Tab');
  await expect(page.locator('#firstName-error')).toHaveText('Use letters only. Spaces, hyphens, apostrophes and periods are fine.');
});

test('clears a name error as soon as the value becomes valid', async ({ page }) => {
  await openRegister(page);
  const input = page.locator('#firstName');
  await input.pressSequentially('R2');
  await input.press('Tab');
  await expect(page.locator('#firstName-error')).not.toBeEmpty();
  await input.fill('Ada');
  await expect(page.locator('#firstName-error')).toBeEmpty();
  await expect(input).not.toHaveAttribute('aria-invalid');
});

test('leaves an untouched empty field alone', async ({ page }) => {
  await openRegister(page);
  await page.locator('#firstName').focus();
  await page.locator('#firstName').press('Tab');
  await expect(page.locator('#firstName-error')).toBeEmpty();
  await expect(page.locator('#firstName')).not.toHaveAttribute('aria-invalid');
});

test('updates the password checklist while typing', async ({ page }) => {
  await openRegister(page);
  await page.locator('#password').pressSequentially('abc');
  await expect(page.locator('[data-check="letter"]')).toHaveClass(/is-met/);
  await expect(page.locator('[data-check="length"]')).not.toHaveClass(/is-met/);
  await expect(page.locator('[data-check="number"]')).not.toHaveClass(/is-met/);
  await page.locator('#password').pressSequentially('12345');
  await expect(page.locator('.password-checks li')).toHaveClass([/is-met/, /is-met/, /is-met/]);
});

test('updates a mismatched confirmation after the password changes', async ({ page }) => {
  await openRegister(page);
  await page.locator('#password').fill('breathe123');
  await page.locator('#passwordConfirm').fill('breathe124');
  await page.locator('#passwordConfirm').press('Tab');
  await expect(page.locator('#passwordConfirm-error')).toHaveText("Passwords don't match.");
  await page.locator('#password').fill('breathe124');
  await page.clock.runFor(1000);
  await expect(page.locator('#passwordConfirm-error')).toBeEmpty();
});

test('asks for every required field when the form is empty', async ({ page }) => {
  await openRegister(page);
  await page.locator('#submitBtn').click();
  await expect(page.locator('#firstName-error')).toHaveText('Enter your first name.');
  await expect(page.locator('#lastName-error')).toHaveText('Enter your last name.');
  await expect(page.locator('#email-error')).toHaveText('Enter your email address.');
  await expect(page.locator('#password-error')).toHaveText('Create a password.');
  await expect(page.locator('#passwordConfirm-error')).toHaveText('Re-enter your password.');
  await expect(page.locator('#waiver-error')).toHaveText('Please accept the Nostril Waiver to continue.');
  await expect(page.locator('#firstName')).toBeFocused();
});

test('rejects the demo email and keeps the user on the page', async ({ page }) => {
  await openRegister(page);
  await fillAccount(page, { email: 'taken@breezy.io' });
  await page.locator('#submitBtn').click();
  const button = page.locator('#submitBtn');
  await expect(button).toHaveText('Creating account…');
  await expect(button).toBeDisabled();
  await page.clock.runFor(1000);
  await expect(page.locator('#email-error')).toHaveText('An account with this email already exists.');
  await expect(page.locator('#email')).toBeFocused();
  await expect(page).toHaveURL(/signup\/register\.html$/);
});

test('saves the account without the password and continues to payment', async ({ page }) => {
  await openRegister(page);
  await fillAccount(page, { email: 'new@example.com', password: 'breathe123', passwordConfirm: 'breathe123' });
  await page.locator('#submitBtn').click();
  await page.clock.runFor(1000);
  await expect(page).toHaveURL(/signup\/payment\.html$/);
  const account = await page.evaluate(() => Breezy.flow.get().account);
  expect(Object.keys(account).sort()).toEqual(['accountId', 'email', 'firstName', 'lastName']);
  expect(account.firstName).toBe('Ada');
  expect(account.lastName).toBe('Breath');
  expect(account.email).toBe('new@example.com');
  const stored = await page.evaluate(() => ({
    flow: sessionStorage.getItem('breezy.signup'),
    db: localStorage.getItem('breezy.db'),
  }));
  expect(stored.flow.includes('breathe123')).toBe(false);
  expect(stored.db.includes('breathe123')).toBe(false);
});

test('a second submit does not create another account', async ({ page }) => {
  await openRegister(page);
  await fillAccount(page, { email: 'once@example.com' });
  await page.evaluate(() => {
    const original = Breezy.api.createAccount.bind(Breezy.api);
    window.__accountCalls = 0;
    Breezy.api.createAccount = input => {
      window.__accountCalls += 1;
      return original(input);
    };
  });
  await page.locator('#submitBtn').click();
  await page.evaluate(() => {
    document.querySelector('.register-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(await page.evaluate(() => window.__accountCalls)).toBe(1);
  await page.clock.runFor(1000);
  await expect(page).toHaveURL(/signup\/payment\.html$/);
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem('breezy.db')).accounts.length);
  expect(count).toBe(2);
});

test('shows and hides the password', async ({ page }) => {
  await openRegister(page);
  const input = page.locator('#password');
  const toggle = page.locator('[aria-controls="password"]');
  await toggle.click();
  await expect(input).toHaveAttribute('type', 'text');
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(toggle).toHaveText('Hide');
  await toggle.click();
  await expect(input).toHaveAttribute('type', 'password');
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(toggle).toHaveText('Show');
});

test('offers the expected autofill hints', async ({ page }) => {
  await openRegister(page);
  await expect(page.locator('#firstName')).toHaveAttribute('autocomplete', 'given-name');
  await expect(page.locator('#lastName')).toHaveAttribute('autocomplete', 'family-name');
  await expect(page.locator('#email')).toHaveAttribute('autocomplete', 'email');
  await expect(page.locator('#password')).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.locator('#passwordConfirm')).toHaveAttribute('autocomplete', 'new-password');
});

test('the nostril waiver can be opened', async ({ page }) => {
  await openRegister(page);
  await page.locator('.waiver-text summary').click();
  await expect(page.locator('.waiver-text')).toHaveJSProperty('open', true);
  await expect(page.locator('.waiver-text')).toContainText('No real payment is taken');
});

test('a returning user can start over', async ({ page }) => {
  await openRegister(page, { planId: 'power', account: SAMPLE.account });
  await expect(page.locator('.signed-in-panel')).toContainText('Ada Breath');
  await expect(page.locator('.signed-in-panel')).toContainText('ada@example.com');
  await expect(page.locator('.register-form')).toBeHidden();
  await expect(page.locator('.signed-in-panel .btn-primary')).toHaveAttribute('href', 'payment.html');
  await page.locator('#startOverBtn').click();
  await expect(page.locator('.register-form')).toBeVisible();
  await expect(page.locator('#firstName')).toHaveValue('');
  await expect(page.locator('#firstName')).toBeFocused();
  expect(await page.evaluate(() => Breezy.flow.get().account)).toBeNull();
});

test('still sends an empty or finished signup back to plans', async ({ page }) => {
  await page.goto(fileUrl('signup/register.html'));
  await expect(page).toHaveURL(/signup\/plans\.html$/);
  await openRegister(page, { planId: 'power', subscription: SAMPLE.subscription });
  await expect(page).toHaveURL(/signup\/plans\.html$/);
});

test('back to plans keeps the chosen plan', async ({ page }) => {
  await openRegister(page, { planId: 'power' });
  const link = page.locator('.signup-main > .back-to-plans');
  await expect(link).toHaveAttribute('href', /plans\.html\?plan=power$/);
  const before = await page.evaluate(() => Breezy.flow.get());
  await link.click();
  await expect(page).toHaveURL(/signup\/plans\.html\?plan=power$/);
  await expect(page.locator('input[value="power"]')).toBeChecked();
  const after = await page.evaluate(() => Breezy.flow.get());
  expect(after).toEqual(before);
});

test('the signed-in view also links back to the chosen plan', async ({ page }) => {
  await openRegister(page, { planId: 'power', account: SAMPLE.account });
  const link = page.locator('.signup-main > .back-to-plans');
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', /plans\.html\?plan=power$/);
});

test('back does not leave while the account is being created', async ({ page }) => {
  await openRegister(page);
  await fillAccount(page);
  await page.locator('#submitBtn').click();
  const link = page.locator('.signup-main > .back-to-plans');
  await expect(link).toHaveAttribute('aria-disabled', 'true');
  await expect(link).toHaveClass(/is-disabled/);
  await link.evaluate(el => el.click());
  await expect(page).toHaveURL(/signup\/register\.html$/);
});

test('back sits above the account card and is full width at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openRegister(page);
  const placed = await page.locator('.signup-main').evaluate(main => {
    const back = main.querySelector('.back-to-plans').getBoundingClientRect();
    const card = main.querySelector('.signup-card').getBoundingClientRect();
    return {
      above: back.bottom <= card.top + 1,
      backWidth: back.width,
      cardWidth: card.width,
    };
  });
  expect(placed.above).toBe(true);
  expect(Math.abs(placed.backWidth - placed.cardWidth)).toBeLessThan(2);
});
