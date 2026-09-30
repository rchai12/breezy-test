const { test, expect, fileUrl } = require('./helpers');

function question(page, index) {
  return page.locator('.faq-item').nth(index);
}

async function expectSynced(page) {
  const count = await page.locator('.faq-item').count();
  for (let i = 0; i < count; i += 1) {
    const item = question(page, i);
    const qClass = (await item.locator('.faq-q').getAttribute('class')) || '';
    const aClass = (await item.locator('.faq-a').getAttribute('class')) || '';
    const qOpen = qClass.split(/\s+/).includes('open');
    const aOpen = aClass.split(/\s+/).includes('open');
    expect(qOpen).toBe(aOpen);
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto(fileUrl('breezy-intern-test.html'));
});

test('starts with every question closed', async ({ page }) => {
  await expect(page.locator('.faq-q.open')).toHaveCount(0);
  await expect(page.locator('.faq-a.open')).toHaveCount(0);
});

test('opens the first question when it is clicked', async ({ page }) => {
  const item = question(page, 0);
  await item.locator('.faq-q').click();
  await expect(item.locator('.faq-q')).toHaveClass(/open/);
  await expect(item.locator('.faq-a')).toHaveClass(/open/);
});

test('closes the open question when it is clicked again', async ({ page }) => {
  const item = question(page, 0);
  await item.locator('.faq-q').click();
  await item.locator('.faq-q').click();
  await expect(item.locator('.faq-q')).not.toHaveClass(/open/);
  await expect(item.locator('.faq-a')).not.toHaveClass(/open/);
});

test('closes the previous question when another one opens', async ({ page }) => {
  await question(page, 0).locator('.faq-q').click();
  await question(page, 2).locator('.faq-q').click();
  await expect(question(page, 0).locator('.faq-a')).not.toHaveClass(/open/);
  await expect(question(page, 2).locator('.faq-q')).toHaveClass(/open/);
  await expect(question(page, 2).locator('.faq-a')).toHaveClass(/open/);
});

test('keeps exactly one answer open while clicking through every question', async ({ page }) => {
  const count = await page.locator('.faq-item').count();
  for (let i = 0; i < count; i += 1) {
    await question(page, i).locator('.faq-q').click();
    await expect(page.locator('.faq-a.open')).toHaveCount(1);
    await expect(question(page, i).locator('.faq-a')).toHaveClass(/open/);
    await expectSynced(page);
  }
});

test('opens and closes a question from the keyboard', async ({ page }) => {
  const button = question(page, 1).locator('.faq-q');
  await button.focus();
  await button.press('Enter');
  await expect(button).toHaveClass(/open/);
  await expect(question(page, 1).locator('.faq-a')).toHaveClass(/open/);
  await button.press('Enter');
  await expect(button).not.toHaveClass(/open/);
  await expect(question(page, 1).locator('.faq-a')).not.toHaveClass(/open/);
});
