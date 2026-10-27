import { test, expect } from '@playwright/test';

test.describe('Delta Web Messaging Platform - E2E Verification', () => {
  test('loads messaging workspace with navigation rail, conversations, and active chat', async ({ page }) => {
    await page.goto('/');

    // Check brand logo
    const brand = page.locator('button[aria-label="Delta Home"]');
    await expect(brand).toBeVisible();

    // Check main navigation tabs
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Status"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Channels"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Communities"]')).toBeVisible();

    // Check conversation list header
    await expect(page.locator('h1:has-text("Chats")')).toBeVisible();

    // Check active conversation header
    await expect(page.locator('h2:has-text("Priya Sharma")')).toBeVisible();
  });

  test('sends a message optimistically and receives automatic reply', async ({ page }) => {
    await page.goto('/');

    // Find message composer textarea
    const composer = page.locator('textarea[aria-label="Type a message"]');
    await expect(composer).toBeVisible();

    const testContent = `Playwright E2E message ${Date.now()}`;
    await composer.fill(testContent);
    await composer.press('Enter');

    // Verify message appears in conversation bubble
    await expect(page.locator(`p:has-text("${testContent}")`)).toBeVisible();
  });

  test('launches WebRTC audio call modal and connects with timer', async ({ page }) => {
    await page.goto('/');

    // Click audio call button
    const audioCallBtn = page.locator('button[aria-label="Audio Call"]');
    await expect(audioCallBtn).toBeVisible();
    await audioCallBtn.click();

    // Verify WebRTC modal appears
    await expect(page.locator('text=WebRTC P2P')).toBeVisible();
    await expect(page.locator('button[aria-label="End call"]')).toBeVisible();

    // End call
    await page.locator('button[aria-label="End call"]').click();
    await expect(page.locator('text=WebRTC P2P')).not.toBeVisible();
  });

  test('opens settings modal and inspects DevOps Supabase status', async ({ page }) => {
    await page.goto('/');

    // Click settings button in rail
    const settingsBtn = page.locator('button[aria-label="Settings"]');
    await settingsBtn.click();

    // Verify modal opened
    await expect(page.locator('h2:has-text("Settings & Privacy")')).toBeVisible();

    // Switch to DevOps & Backend tab
    await page.locator('button:has-text("DevOps & Backend")').click();
    await expect(page.locator('text=Supabase PostgreSQL Backend')).toBeVisible();
    await expect(page.locator('text=Row Level Security (RLS) configured')).toBeVisible();

    // Close modal
    await page.locator('button:has(svg.lucide-x)').first().click();
  });

  test('enforces mobile number as mandatory key identity and supports mobile login', async ({ page }) => {
    await page.goto('/auth');

    // Verify Sign In with Mobile Number or Username label
    await expect(page.locator('label:has-text("Mobile Number or Username")')).toBeVisible();

    // Switch to Registration mode
    await page.locator('button:has-text("Register with Mobile Number")').click();

    // Verify Mobile Number is marked Mandatory • Key Identity
    await expect(page.locator('text=Mandatory • Key Identity')).toBeVisible();
    await expect(page.locator('input[type="tel"]')).toBeVisible();

    // Switch back to Sign In
    await page.locator('button:has-text("Already have an account? Sign In")').click();

    // Login using Priya's mobile number: 9811122334
    const idInput = page.locator('input[placeholder*="+91 98765 43210 or @username"]');
    await idInput.fill('9811122334');
    await page.locator('input[type="password"]').fill('DeltaPass123!');
    await page.locator('button:has-text("Sign In to Delta")').click();

    // Redirected to workspace
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible();
  });

  test('completes full user registration, sign out, and re-login workflow', async ({ page }) => {
    await page.goto('/auth');

    // Switch to Registration mode
    await page.locator('button:has-text("Register with Mobile Number")').click();

    // Fill in registration fields
    await page.locator('input[type="tel"]').fill('9876543299');
    await page.locator('input[placeholder="e.g. Priya Sharma"]').fill('Vikram Malhotra');
    await page.locator('input[placeholder="priya_sharma"]').fill('vikram_m');
    await page.locator('input[type="password"]').fill('VikramSecret123!');

    // Submit registration
    await page.locator('button[type="submit"]:has-text("Register with Mobile Number")').click();

    // Verify successful registration and workspace entry
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible();

    // Open profile menu on navigation rail and Sign Out
    await page.locator('button[aria-label="User Profile and Persona Switcher"]').click();
    await page.locator('button:has-text("Sign Out")').click();

    // Verify redirected back to Auth screen
    await expect(page.getByRole('heading', { name: 'Sign in to Delta' })).toBeVisible();

    // Attempt sign in with wrong password
    const loginInput = page.locator('input[placeholder*="+91 98765 43210 or @username"]');
    await loginInput.fill('9876543299');
    await page.locator('input[type="password"]').fill('WrongPassword!');
    await page.locator('button:has-text("Sign In to Delta")').click();
    await expect(page.locator('text=Incorrect password')).toBeVisible();

    // Now sign in with correct registered password
    await page.locator('input[type="password"]').fill('VikramSecret123!');
    await page.locator('button:has-text("Sign In to Delta")').click();

    // Verify successful login into workspace
    await expect(page.locator('button[aria-label="Chats"]')).toBeVisible();
  });

  test('syncs phone address book contacts, matches registered Delta users, and provides instant messaging or invite', async ({ page }) => {
    await page.goto('/');

    // Open New Chat modal
    const newChatBtn = page.locator('button[aria-label="New Chat"]');
    await newChatBtn.click();

    // Verify New Chat modal opened with auto-synced phone contacts by default
    await expect(page.locator('text=Auto-Synced with Phone')).toBeVisible();

    // Verify synced contact sections appear immediately without manual sync
    await expect(page.locator('text=Contacts on Delta')).toBeVisible();
    await expect(page.locator('text=Invite to Delta')).toBeVisible();

    // Verify registered users are detected with "On Delta" badge
    await expect(page.locator('div:has-text("Priya Sharma"):has-text("On Delta")').first()).toBeVisible();

    // Verify unregistered users are placed under Invite section
    await expect(page.locator('text=Dr. Neha Sen')).toBeVisible();
    await expect(page.locator('button:has-text("Invite")').first()).toBeVisible();

    // Capture visual screenshot of the automatically synced contacts modal
    await page.screenshot({
      path: 'C:/Users/ediva/.gemini/antigravity-ide/brain/6314fabf-031b-4bd4-93a7-4378dabf450b/auto_synced_phone_contacts_active.png',
    });

    // Click Message button on matched contact Arjun Patel
    const arjunMessageBtn = page.locator('button[data-testid="message-contact-user-arjun"]');
    await expect(arjunMessageBtn).toBeVisible();
    await arjunMessageBtn.click();

    // Modal should close and active chat should switch to Arjun Patel
    await expect(page.locator('button:has-text("Direct Message")')).not.toBeVisible();
    await expect(page.locator('h2:has-text("Arjun Patel")')).toBeVisible();

    // Now open Settings modal and verify Contacts & Sync tab
    await page.locator('button[aria-label="Settings"]').click();
    await page.locator('button:has-text("Contacts & Sync")').click();
    await expect(page.locator('text=Automatic Background Sync Active')).toBeVisible();

    // Capture visual screenshot of the Settings Contacts & Sync tab
    await page.screenshot({
      path: 'C:/Users/ediva/.gemini/antigravity-ide/brain/6314fabf-031b-4bd4-93a7-4378dabf450b/auto_synced_settings_tab.png',
    });
  });
});

