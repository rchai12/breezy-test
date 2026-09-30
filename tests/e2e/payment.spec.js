const { test, expect, fileUrl, seedFlow, SAMPLE } = require('./helpers');

const ACCOUNT_INPUT = {
  firstName: 'Ada',
  lastName: 'Breath',
  email: 'ada@example.com',
  password: 'breathe123',
  passwordConfirm: 'breathe123',
  waiver: true,
};

async function createAccount(page) {
  await page.goto(fileUrl('signup/plans.html'));
  await page.evaluate(input => {
    window.__pendingAccount = Breezy.api.createAccount(input);
  }, ACCOUNT_INPUT);
  await page.clock.runFor(1000);
  const result = await page.evaluate(() => window.__pendingAccount);
  expect(result.ok).toBe(true);
  return {
    accountId: result.data.accountId,
    firstName: result.data.firstName,
    lastName: result.data.lastName,
    email: result.data.email,
  };
}

async function openPayment(page, planId = 'power') {
  const account = await createAccount(page);
  await seedFlow(page, { planId, account });
  await page.goto(fileUrl('signup/payment.html'));
  return account;
}

async function settleSubmit(page) {
  await page.clock.runFor(1000);
  await page.clock.runFor(1000);
}

test.beforeEach(async ({ page }) => {
  const frozen = new Date('2026-09-30T12:00:00');
  await page.clock.install({ time: frozen });
  await page.clock.pauseAt(frozen);
});

test('sends a signup without an account back to register', async ({ page }) => {
  await seedFlow(page, { planId: 'power' });
  await page.goto(fileUrl('signup/payment.html'));
  await expect(page).toHaveURL(/signup\/register\.html$/);
});

test('sends a subscribed user back to plans', async ({ page }) => {
  await seedFlow(page, {
    planId: 'power',
    account: SAMPLE.account,
    subscription: SAMPLE.subscription,
  });
  await page.goto(fileUrl('signup/payment.html'));
  await expect(page).toHaveURL(/signup\/plans\.html$/);
});

test('summarizes a trial and links back to that plan', async ({ page }) => {
  await openPayment(page, 'power');
  const summary = page.locator('.order-summary');
  await expect(summary).toContainText('Due today');
  await expect(summary).toContainText('$0');
  await expect(summary).toContainText('$29 on Oct 7');
  await expect(page.locator('#submitBtn')).toHaveText('Start free trial');
  await expect(summary.getByRole('link', { name: 'Change' })).toHaveAttribute('href', 'plans.html?plan=power');
});

test('summarizes a plan that charges today', async ({ page }) => {
  await openPayment(page, 'casual');
  const summary = page.locator('.order-summary');
  await expect(summary).toContainText('Due today');
  await expect(summary).toContainText('$9');
  await expect(summary).toContainText('Then $9 every month');
  await expect(page.locator('#submitBtn')).toHaveText('Pay $9 and subscribe');
  await expect(summary.getByRole('link', { name: 'Change' })).toHaveAttribute('href', 'plans.html?plan=casual');
});

test('shows who is paying and prefills the card name', async ({ page }) => {
  await openPayment(page);
  await expect(page.locator('.paying-as')).toContainText('Ada Breath');
  await expect(page.locator('.paying-as')).toContainText('ada@example.com');
  await expect(page.locator('#cardName')).toHaveValue('Ada Breath');
  await expect(page.locator('#cardName-error')).toBeEmpty();
  await page.locator('#cardName').focus();
  await page.locator('#cardName').press('Tab');
  await expect(page.locator('#cardName-error')).toBeEmpty();
});

test('keeps letters out of the numeric fields', async ({ page }) => {
  await openPayment(page);
  await page.locator('#cardNumber').pressSequentially('ab12cd');
  await expect(page.locator('#cardNumber')).toHaveValue('12');
  await page.locator('#cardExpiry').pressSequentially('ab12cd');
  await expect(page.locator('#cardExpiry')).toHaveValue('12');
  await page.locator('#cardCvc').pressSequentially('ab12cd');
  await expect(page.locator('#cardCvc')).toHaveValue('12');
});

test('formats a typed card, a pasted card, and an expiry date', async ({ page }) => {
  await openPayment(page);
  await page.locator('#cardNumber').pressSequentially('4242424242424242');
  await expect(page.locator('#cardNumber')).toHaveValue('4242 4242 4242 4242');
  await page.locator('#cardNumber').fill('');
  await page.locator('#cardNumber').focus();
  await page.keyboard.insertText('3782-822463-10005');
  await expect(page.locator('#cardNumber')).toHaveValue('3782 822463 10005');
  await page.locator('#cardExpiry').pressSequentially('1227');
  await expect(page.locator('#cardExpiry')).toHaveValue('12/27');
});

test('backspace at the end removes a digit and the leftover space', async ({ page }) => {
  await openPayment(page);
  const input = page.locator('#cardNumber');
  await input.pressSequentially('42424');
  await expect(input).toHaveValue('4242 4');
  await page.keyboard.press('Backspace');
  await expect(input).toHaveValue('4242');
  await page.keyboard.press('Backspace');
  await expect(input).toHaveValue('424');
});

test('backspace over a separator also removes the digit before it', async ({ page }) => {
  await openPayment(page);
  const input = page.locator('#cardNumber');
  await input.pressSequentially('42424242');
  await expect(input).toHaveValue('4242 4242');
  await input.evaluate(el => el.setSelectionRange(5, 5));
  await page.keyboard.press('Backspace');
  await expect(input).toHaveValue('4244 242');
});

test('keeps the cursor beside a digit typed in the middle', async ({ page }) => {
  await openPayment(page);
  const input = page.locator('#cardNumber');
  await input.pressSequentially('4242424242424242');
  await input.evaluate(el => el.setSelectionRange(7, 7));
  await page.keyboard.press('9');
  await expect(input).toHaveValue('4242 4294 2424 2424 2');
  expect(await input.evaluate(el => el.selectionStart)).toBe(8);
});

test('highlights the brand that matches the digits typed so far', async ({ page }) => {
  await openPayment(page);
  await expect(page.locator('[data-brand="visa"]')).toHaveAttribute('alt', 'Visa');
  await expect(page.locator('[data-brand="mastercard"]')).toHaveAttribute('alt', 'Mastercard');
  await expect(page.locator('[data-brand="amex"]')).toHaveAttribute('alt', 'American Express');
  await expect(page.locator('[data-brand="discover"]')).toHaveAttribute('alt', 'Discover');
  await page.locator('#cardNumber').pressSequentially('4');
  await expect(page.locator('[data-brand="visa"]')).toHaveClass(/is-active/);
  await expect(page.locator('[data-brand="mastercard"]')).toHaveClass(/is-dimmed/);
  await expect(page.locator('[data-brand="amex"]')).toHaveClass(/is-dimmed/);
  await expect(page.locator('[data-brand="discover"]')).toHaveClass(/is-dimmed/);
  await expect(page.locator('.card-brand-status')).toHaveText('Visa card');
  await page.locator('#cardNumber').fill('');
  await page.locator('#cardNumber').pressSequentially('37');
  await expect(page.locator('[data-brand="amex"]')).toHaveClass(/is-active/);
  await expect(page.locator('.card-brand-status')).toHaveText('American Express card');
  await page.locator('#cardNumber').fill('');
  await expect(page.locator('.card-brands img.is-dimmed')).toHaveCount(0);
  await expect(page.locator('.card-brand-status')).toHaveText('');
});

test('asks for the four-digit American Express security code', async ({ page }) => {
  await openPayment(page);
  await page.locator('#cardNumber').pressSequentially('378282246310005');
  await page.locator('#cardCvc').pressSequentially('123');
  await page.locator('#cardCvc').press('Tab');
  await expect(page.locator('#cardCvc-error')).toHaveText('Enter the 4-digit security code on the front of your card.');
});

test('rejects an expiry in a previous month', async ({ page }) => {
  await openPayment(page);
  await page.locator('#cardExpiry').pressSequentially('0826');
  await page.locator('#cardExpiry').press('Tab');
  await expect(page.locator('#cardExpiry-error')).toHaveText('This card has expired.');
});

test('waits a second before showing an expiry error', async ({ page }) => {
  await openPayment(page);
  await page.locator('#cardExpiry').evaluate(el => {
    el.value = '0826';
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText' }));
  });
  await page.clock.runFor(999);
  expect(await page.locator('#cardExpiry-error').textContent()).toBe('');
  await page.clock.runFor(1);
  await expect(page.locator('#cardExpiry-error')).toHaveText('This card has expired.');
});

test('fills a test card and focuses the submit button', async ({ page }) => {
  await openPayment(page);
  await page.locator('#fillTestCard').click();
  await expect(page.locator('#cardNumber')).toHaveValue('4242 4242 4242 4242');
  await expect(page.locator('#cardExpiry')).toHaveValue('12/28');
  await expect(page.locator('#cardCvc')).toHaveValue('123');
  await expect(page.locator('#postalCode')).toHaveValue('10001');
  await expect(page.locator('#cardName')).toHaveValue('Ada Breath');
  await expect(page.locator('#submitBtn')).toBeFocused();
});

test('refuses a card outside the test list', async ({ page }) => {
  await openPayment(page);
  await page.locator('#cardNumber').pressSequentially('4111111111111111');
  await page.locator('#cardExpiry').pressSequentially('1228');
  await page.locator('#cardCvc').pressSequentially('123');
  await page.locator('#postalCode').fill('10001');
  await page.locator('#submitBtn').click();
  await settleSubmit(page);
  await expect(page.locator('#cardNumber-error')).toHaveText('This demo only accepts test cards. Try 4242 4242 4242 4242.');
  await expect(page.locator('#submitBtn')).toBeEnabled();
  await expect(page).toHaveURL(/signup\/payment\.html$/);
});

test('shows a declined card on the field and in the form error', async ({ page }) => {
  await openPayment(page);
  await page.locator('#cardNumber').pressSequentially('4000000000000002');
  await page.locator('#cardExpiry').pressSequentially('1228');
  await page.locator('#cardCvc').pressSequentially('123');
  await page.locator('#postalCode').fill('10001');
  await page.locator('#submitBtn').click();
  await settleSubmit(page);
  await expect(page.locator('#cardNumber-error')).toHaveText('Your card was declined. Try a different card.');
  await expect(page.locator('.form-error')).toContainText('Your card was declined.');
  await expect(page.locator('#submitBtn')).toBeEnabled();
});

test('subscribes with the test card and does not store the full number', async ({ page }) => {
  await openPayment(page);
  await page.locator('#fillTestCard').click();
  await page.locator('#submitBtn').click();
  await expect(page.locator('#submitBtn')).toHaveText('Processing…');
  await expect(page.locator('#submitBtn')).toBeDisabled();
  await settleSubmit(page);
  await expect(page).toHaveURL(/signup\/confirmation\.html$/);
  const card = await page.evaluate(() => Breezy.flow.get().subscription.card);
  expect(card).toEqual({ brand: 'visa', last4: '4242' });
  const stored = await page.evaluate(() => ({
    flow: sessionStorage.getItem('breezy.signup'),
    db: localStorage.getItem('breezy.db'),
  }));
  expect(stored.flow.includes('4242424242424242')).toBe(false);
  expect(stored.db.includes('4242424242424242')).toBe(false);
  const methods = JSON.parse(stored.db).paymentMethods;
  expect(methods.every(method => !Object.hasOwn(method, 'cvc'))).toBe(true);
  const seen = [];
  page.on('framenavigated', frame => {
    if (frame === page.mainFrame()) seen.push(frame.url());
  });
  await page.goBack();
  await expect(page).not.toHaveURL(/payment\.html/);
  expect(seen.some(url => url.includes('payment.html'))).toBe(false);
});

test('a second submit creates one subscription and one used token', async ({ page }) => {
  await openPayment(page);
  await page.locator('#fillTestCard').click();
  await page.evaluate(() => {
    const original = Breezy.api.tokenizeCard.bind(Breezy.api);
    window.__tokenCalls = 0;
    Breezy.api.tokenizeCard = input => {
      window.__tokenCalls += 1;
      return original(input);
    };
  });
  await page.locator('#submitBtn').click();
  await page.evaluate(() => {
    document.querySelector('.payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  expect(await page.evaluate(() => window.__tokenCalls)).toBe(1);
  await settleSubmit(page);
  await expect(page).toHaveURL(/signup\/confirmation\.html$/);
  const db = await page.evaluate(() => JSON.parse(localStorage.getItem('breezy.db')));
  expect(db.subscriptions.length).toBe(1);
  expect(db.paymentMethods.filter(method => method.used).length).toBe(1);
});

test('offers card autofill hints', async ({ page }) => {
  await openPayment(page);
  await expect(page.locator('#cardName')).toHaveAttribute('autocomplete', 'cc-name');
  await expect(page.locator('#cardNumber')).toHaveAttribute('autocomplete', 'cc-number');
  await expect(page.locator('#cardExpiry')).toHaveAttribute('autocomplete', 'cc-exp');
  await expect(page.locator('#cardCvc')).toHaveAttribute('autocomplete', 'cc-csc');
  await expect(page.locator('#postalCode')).toHaveAttribute('autocomplete', 'postal-code');
  await expect(page.locator('#cardNumber')).toHaveAttribute('inputmode', 'numeric');
  await expect(page.locator('#cardExpiry')).toHaveAttribute('inputmode', 'numeric');
  await expect(page.locator('#cardCvc')).toHaveAttribute('inputmode', 'numeric');
});
