## Running the tests
The site itself needs no install: open `breezy-intern-test.html` in a browser.
The tests need Node 22 or newer:

    npm install
    npx playwright install chromium
    npm test              # unit + browser tests
    npm run test:unit     # logic only, runs in under a second
    npm run test:e2e      # Chromium browser tests against the local files

Tests also run on GitHub Actions on every push.
