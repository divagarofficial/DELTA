import { test, expect } from '@playwright/test';

test.describe('Delta Web Messaging Platform - Production & Auth Verification', () => {
  test('landing page buttons navigate correctly to authentication modes', async ({ page }) => {
    // 1. Visit root landing page
    await page.goto('/');

    // Verify brand heading
    await expect(page.locator('h1:has-text("Everything connects.")')).toBeVisible();

    // Verify "Create Free Account" button in hero navigates to signup mode
    const createAccountBtn = page.locator('a:has-text("Create Free Account")');
    await expect(createAccountBtn).toBeVisible();
    await createAccountBtn.click();
    await page.waitForURL('**/auth?mode=signup');
    await expect(page.locator('h2:has-text("Create Delta Account")')).toBeVisible();
    await expect(page.locator('text=Production Mode')).toBeVisible();

    // 2. Go back to landing page
    await page.goto('/');

    // Verify "Sign In" in header navigates to signin mode
    const signInHeaderBtn = page.locator('header a:has-text("Sign In")');
    await expect(signInHeaderBtn).toBeVisible();
    await signInHeaderBtn.click();
    await page.waitForURL('**/auth?mode=signin');
    await expect(page.locator('h2:has-text("Sign in to Delta")')).toBeVisible();

    // 3. Go back to landing page
    await page.goto('/');

    // Verify "Launch Delta Web" button in hero navigates to signin mode when unauthenticated
    const launchWebBtn = page.locator('a:has-text("Launch Delta Web")');
    await expect(launchWebBtn).toBeVisible();
    await launchWebBtn.click();
    await page.waitForURL('**/auth?mode=signin');
    await expect(page.locator('h2:has-text("Sign in to Delta")')).toBeVisible();

    // 4. Go back to landing page
    await page.goto('/');

    // Verify "Open Web App" in header navigates to signin mode when unauthenticated
    const openWebAppBtn = page.locator('header a:has-text("Open Web App")');
    await expect(openWebAppBtn).toBeVisible();
    await openWebAppBtn.click();
    await page.waitForURL('**/auth?mode=signin');
    await expect(page.locator('h2:has-text("Sign in to Delta")')).toBeVisible();
  });

  test('completes full user registration, sign out, and re-login workflow', async ({ page }) => {
    await page.goto('/auth?mode=signup');

    // Verify Production Mode badge
    await expect(page.locator('text=Production Mode')).toBeVisible();

    // Fill in registration fields (using DIVAGAR credentials)
    const testPhone = `93600${Math.floor(10000 + Math.random() * 90000)}`;
    const testUser = `diva_${Date.now().toString().slice(-6)}`;
    await page.locator('input[type="tel"]').fill(testPhone);
    await page.locator('input[placeholder="e.g. Priya Sharma"]').fill('DIVAGAR E');
    await page.locator('input[placeholder="priya_sharma"]').fill(testUser);
    await page.locator('input[type="password"]').fill('DivaSecret123!');

    // Submit registration
    await page.locator('button[type="submit"]:has-text("Register with Mobile Number")').click();

    // Verify successful registration and workspace entry
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible({ timeout: 10000 });

    // Open profile menu on navigation rail and verify name & production mode
    const profileBtn = page.locator('button[aria-label="User Profile and Persona Switcher"]');
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();

    await expect(page.locator('text=DIVAGAR E')).toBeVisible();
    await expect(page.locator(`text=@${testUser}`)).toBeVisible();
    await expect(page.locator('text=Delta Production Engine')).toBeVisible();

    // Sign Out
    await page.locator('button:has-text("Sign Out")').click();

    // Verify redirected back to Auth screen
    await expect(page.locator('h2:has-text("Sign in to Delta")')).toBeVisible();

    // Attempt sign in with wrong password
    const loginInput = page.locator('input[placeholder*="+91 98765 43210 or @username"]');
    await loginInput.fill(testPhone);
    await page.locator('input[type="password"]').fill('WrongPassword!');
    await page.locator('button:has-text("Sign In to Delta")').click();
    await expect(page.locator('text=Incorrect password')).toBeVisible();

    // Sign in with correct password using phone number
    await page.locator('input[type="password"]').fill('DivaSecret123!');
    await page.locator('button:has-text("Sign In to Delta")').click();

    // Verify successful login into workspace
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible({ timeout: 10000 });
  });

  test('allows logged-in user to launch web app from landing page without re-login', async ({ page }) => {
    // 1. Register a session
    await page.goto('/auth?mode=signup');
    const testPhone = `93600${Math.floor(10000 + Math.random() * 90000)}`;
    const testUser = `diva_${Date.now().toString().slice(-6)}`;
    await page.locator('input[type="tel"]').fill(testPhone);
    await page.locator('input[placeholder="e.g. Priya Sharma"]').fill('DIVAGAR E');
    await page.locator('input[placeholder="priya_sharma"]').fill(testUser);
    await page.locator('input[type="password"]').fill('DivaSecret123!');
    await page.locator('button[type="submit"]:has-text("Register with Mobile Number")').click();
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible({ timeout: 10000 });

    // 2. Explicitly visit landing page while logged in
    await page.goto('/?landing=true');
    await expect(page.locator('h1:has-text("Everything connects.")')).toBeVisible();

    // 3. Click "Launch Delta Web"
    const launchWebBtn = page.locator('a:has-text("Launch Delta Web")');
    await expect(launchWebBtn).toBeVisible();
    await launchWebBtn.click();

    // Verify immediately returns to workspace without redirecting to /auth
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible({ timeout: 5000 });
  });
});
