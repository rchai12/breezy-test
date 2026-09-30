const fs = require('fs');
const path = require('path');
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const root = path.join(__dirname, '../..');

function relativeTargets(markdown) {
  const targets = [];
  const pattern = /!\[[^\]]*\]\(([^)]+)\)|\[[^\]]*\]\(([^)]+)\)/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    const href = (match[1] || match[2]).trim();
    if (/^(https?:|mailto:|#)/i.test(href)) continue;
    const clean = decodeURIComponent(href.split('#')[0].split('?')[0]);
    if (!clean) continue;
    targets.push(clean);
  }
  return targets;
}

describe('README links', () => {
  it('points at files and folders that exist', () => {
    const markdown = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
    const targets = relativeTargets(markdown);
    assert.ok(targets.length > 0, 'expected relative links so a broken path can fail this test');
    for (const target of targets) {
      assert.ok(fs.existsSync(path.join(root, target)), target);
    }
  });
});
