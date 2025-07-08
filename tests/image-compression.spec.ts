import { test, expect } from '@playwright/test';

test('Inspect homepage for debugging', async ({ page }) => {
  await page.goto('https://easy-image-compressor.netlify.app');
  await page.pause(); // Open interactive debugger
});