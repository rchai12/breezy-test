const path = require('path');
const { pathToFileURL } = require('url');
const { test: base, expect } = require('@playwright/test');

const ROOT = path.join(__dirname, '../..');

const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => {
      if (msg.type() !== 'error') return;
      const url = msg.location().url || '';
      if (/fonts\.(googleapis|gstatic)\.com/.test(url)) return;
      errors.push(msg.text());
    });
    await use(page);
    expect(errors, 'console errors').toEqual([]);
  },
});

function fileUrl(relPath, search = '') {
  return pathToFileURL(path.join(ROOT, relPath)).href + search;
}

async function seedFlow(page, state) {
  await page.addInitScript(seed => {
    const marker = 'breezy.signup.seeded';
    if (sessionStorage.getItem(marker)) return;
    const base = { version: 1, planId: null, account: null, subscription: null };
    sessionStorage.setItem('breezy.signup', JSON.stringify({ ...base, ...seed }));
    sessionStorage.setItem(marker, '1');
  }, state);
}

const SAMPLE = {
  account: { accountId: 'acc_test', name: 'Ada Breath', email: 'ada@example.com' },
  subscription: {
    subscriptionId: 'sub_test',
    planId: 'power',
    status: 'trialing',
    startedAt: '2026-09-30T12:00:00.000Z',
    firstChargeAt: '2026-10-07T12:00:00.000Z',
    amountCents: 2900,
    card: { brand: 'visa', last4: '4242' },
  },
};

module.exports = { test, expect, fileUrl, seedFlow, SAMPLE };
