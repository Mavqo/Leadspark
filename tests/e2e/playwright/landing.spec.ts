import { test, expect } from '@playwright/test';

/**
 * LeadSpark E2E Tests - Landing Page
 * Test per la landing page principale
 */

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Hero Section', () => {
    test('dovrebbe mostrare il titolo principale', async ({ page }) => {
      // Verifica che il titolo principale sia visibile
      const heroTitle = page.locator('h1').first();
      await expect(heroTitle).toBeVisible();
      
      // Il titolo dovrebbe contenere parole chiave del centro
      const titleText = await heroTitle.textContent();
      expect(titleText?.toLowerCase()).toMatch(/centro|fisioterapia|movimento/);
    });

    test('dovrebbe mostrare la descrizione del servizio', async ({ page }) => {
      const heroDescription = page.locator('section p').first();
      await expect(heroDescription).toBeVisible();
    });

    test('dovrebbe avere un CTA (Call to Action)', async ({ page }) => {
      // Cerca un bottone o link CTA nella hero
      const cta = page.locator('section a, section button').first();
      await expect(cta).toBeVisible();
    });
  });

  test.describe('About Section', () => {
    test('dovrebbe mostrare la sezione About', async ({ page }) => {
      const aboutSection = page.locator('section#about, #about');
      await expect(aboutSection).toBeVisible();
    });

    test('dovrebbe contenere informazioni sul centro', async ({ page }) => {
      const aboutText = page.locator('#about, section:has-text("Chi Siamo"), section:has-text("About")');
      await expect(aboutText).toBeVisible();
    });
  });

  test.describe('Services Section', () => {
    test('dovrebbe mostrare la sezione Servizi', async ({ page }) => {
      const servicesSection = page.locator('section#services, #services');
      await expect(servicesSection).toBeVisible();
    });

    test('dovrebbe elencare i servizi offerti', async ({ page }) => {
      // Cerca elementi che sembrano servizi (cards, liste, etc.)
      const serviceItems = page.locator('#services >> div, #services >> article, #services >> li').first();
      await expect(serviceItems).toBeVisible();
    });
  });

  test.describe('Contact Section', () => {
    test('dovrebbe mostrare la sezione Contatti', async ({ page }) => {
      const contactSection = page.locator('section#contact, #contact');
      await expect(contactSection).toBeVisible();
    });

    test('dovrebbe mostrare informazioni di contatto', async ({ page }) => {
      // Cerca indirizzo, telefono o email
      const contactInfo = page.locator('#contact, section:has-text("Contattaci"), section:has-text("Contact")');
      await expect(contactInfo).toBeVisible();
    });
  });

  test.describe('Testimonials Section', () => {
    test('dovrebbe mostrare la sezione Testimonianze', async ({ page }) => {
      const testimonialsSection = page.locator('section#testimonials, #testimonials');
      await expect(testimonialsSection).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('dovrebbe avere navigazione funzionante', async ({ page }) => {
      // Verifica che ci siano link di navigazione
      const navLinks = page.locator('nav a, header a');
      const count = await navLinks.count();
      expect(count).toBeGreaterThan(0);
    });

    test('dovrebbe navigare alle sezioni con anchor links', async ({ page }) => {
      // Cerca link a sezioni interne
      const aboutLink = page.locator('a[href="#about"]');
      
      if (await aboutLink.isVisible().catch(() => false)) {
        await aboutLink.click();
        await page.waitForTimeout(500);
        
        // Verifica che la sezione about sia visibile
        const aboutSection = page.locator('#about');
        await expect(aboutSection).toBeInViewport();
      }
    });
  });

  test.describe('Footer', () => {
    test('dovrebbe mostrare il footer', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });

    test('dovrebbe contenere informazioni copyright', async ({ page }) => {
      const footer = page.locator('footer');
      await expect(footer).toContainText(/©|Copyright|2024|2025/);
    });
  });

  test.describe('Meta tags', () => {
    test('dovrebbe avere titolo della pagina', async ({ page }) => {
      await expect(page).toHaveTitle(/./);
    });

    test('dovrebbe avere meta description', async ({ page }) => {
      const metaDescription = page.locator('meta[name="description"]');
      const hasDescription = await metaDescription.isVisible().catch(() => false);
      
      if (hasDescription) {
        const content = await metaDescription.getAttribute('content');
        expect(content?.length).toBeGreaterThan(0);
      }
    });
  });
});
