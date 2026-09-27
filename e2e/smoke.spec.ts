import { expect, test } from '@playwright/test';

// Smoke tests that need no backend: the shell, the styleguide, and the PWA bits.

test('sign-in screen offers Google sign-in', async ({ page }) => {
  await page.goto('/signin');
  await expect(page.getByRole('button', { name: 'Continue with Google' })).toBeVisible();
});

test('privacy and terms are public and linked from sign-in', async ({ page }) => {
  await page.goto('/signin');
  await page.getByRole('link', { name: 'Privacy' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy', level: 1 })).toBeVisible();
  await expect(page.getByText('never sold')).toBeVisible();
  await page.goto('/terms');
  await expect(page.getByRole('heading', { name: 'Terms', level: 1 })).toBeVisible();
});

test('signed-out visitors are sent to sign-in', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/signin$/);
});

test('an invite link asks you to sign in first', async ({ page }) => {
  await page.goto('/join/ABCD2345EFGH');
  await expect(page.getByRole('heading', { name: 'Sign in to use this invite' })).toBeVisible();
});

for (const theme of ['classic', 'squad-hq']) {
  for (const mode of ['light', 'dark']) {
    test(`styleguide renders ${theme} ${mode} at 360px with no sideways scroll`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.addInitScript(
        ([t, m]) => {
          localStorage.setItem('sp.theme', t);
          localStorage.setItem('sp.mode', m);
        },
        [theme, mode],
      );
      await page.goto('/styleguide');
      await expect(page.locator('html')).toHaveAttribute('data-app-theme', theme);
      await expect(page.locator('html')).toHaveAttribute('data-theme', mode);
      await expect(page.getByRole('heading', { name: 'Styleguide' })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
}

test('app is installable: manifest and service worker', async ({ page, request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest.name).toBe('Spawnpoint');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  await page.goto('/signin');
  const sw = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg || !!(await navigator.serviceWorker.ready.then(() => true));
  });
  expect(sw).toBe(true);
});
