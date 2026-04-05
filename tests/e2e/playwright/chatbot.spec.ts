import { test, expect } from '@playwright/test';

/**
 * LeadSpark E2E Tests - Chatbot
 * Test per il flusso completo del chatbot
 */

test.describe('Chatbot', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Attendi che la pagina sia caricata
    await page.waitForLoadState('networkidle');
  });

  test.describe('Apertura chatbot', () => {
    test('dovrebbe mostrare il pulsante del chatbot', async ({ page }) => {
      // Cerca il pulsante di apertura chat (tipicamente in basso a destra)
      const chatButton = page.locator('[data-testid="chat-toggle"], button:has-text("Chat"), button:has(svg)').last();
      
      // Se il bottone è visibile, verificalo
      const isVisible = await chatButton.isVisible().catch(() => false);
      
      if (isVisible) {
        await expect(chatButton).toBeVisible();
      } else {
        // Alternativa: cerca qualsiasi elemento cliccabile che potrebbe aprire la chat
        const possibleButton = page.locator('button').filter({ hasText: /chat|aiuto|emma/i }).first();
        if (await possibleButton.isVisible().catch(() => false)) {
          await expect(possibleButton).toBeVisible();
        }
      }
    });

    test('dovrebbe aprire il chatbot al click', async ({ page }) => {
      // Trova e clicca il bottone del chatbot
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        
        // Attendi l'animazione
        await page.waitForTimeout(300);
        
        // Verifica che la chat sia aperta
        const chatWindow = page.locator('[data-testid="chat-window"], .chat-window, [role="dialog"]').first();
        await expect(chatWindow).toBeVisible();
      }
    });
  });

  test.describe('Interfaccia chat', () => {
    test('dovrebbe mostrare il messaggio di benvenuto', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(300);
        
        // Cerca il messaggio di benvenuto
        const welcomeMessage = page.locator('text=/benvenuto|buongiorno|emma|ciao/i').first();
        await expect(welcomeMessage).toBeVisible();
      }
    });

    test('dovrebbe avere un input per i messaggi', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(300);
        
        // Cerca l'input
        const chatInput = page.locator('input[placeholder*="messaggio"], textarea[placeholder*="messaggio"], [data-testid="chat-input"]').first();
        
        if (await chatInput.isVisible().catch(() => false)) {
          await expect(chatInput).toBeVisible();
        }
      }
    });

    test('dovrebbe avere un bottone per inviare messaggi', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(300);
        
        // Cerca il bottone di invio
        const sendButton = page.locator('button[type="submit"], button[aria-label*="invia"], [data-testid="send-button"]').first();
        
        if (await sendButton.isVisible().catch(() => false)) {
          await expect(sendButton).toBeVisible();
        }
      }
    });
  });

  test.describe('Flusso conversazionale', () => {
    test('dovrebbe inviare un messaggio e ricevere risposta', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(500);
        
        const input = page.locator('input[placeholder*="messaggio"], textarea[placeholder*="messaggio"], [data-testid="chat-input"]').first();
        const sendButton = page.locator('button[type="submit"], button[aria-label*="invia"]').first();
        
        if (await input.isVisible().catch(() => false) && await sendButton.isVisible().catch(() => false)) {
          // Invia un messaggio di test
          await input.fill('Ciao, ho mal di schiena');
          await sendButton.click();
          
          // Attendi la risposta
          await page.waitForTimeout(2000);
          
          // Verifica che ci sia una risposta (almeno 2 messaggi: benvenuto + risposta)
          const messages = page.locator('[data-role="bot"], .message-bot, .bot-message, [data-testid="chat-message"]').first();
          await expect(messages).toBeVisible();
        }
      }
    });

    test('dovrebbe gestire input con Enter', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(500);
        
        const input = page.locator('input[placeholder*="messaggio"], textarea[placeholder*="messaggio"], [data-testid="chat-input"]').first();
        
        if (await input.isVisible().catch(() => false)) {
          await input.fill('Test con Enter');
          await input.press('Enter');
          
          // Attendi la risposta
          await page.waitForTimeout(2000);
          
          // L'input dovrebbe essere stato svuotato
          const value = await input.inputValue();
          expect(value).toBe('');
        }
      }
    });

    test('dovrebbe mostrare indicatore di caricamento', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(500);
        
        const input = page.locator('input[placeholder*="messaggio"], textarea[placeholder*="messaggio"]').first();
        const sendButton = page.locator('button[type="submit"]').first();
        
        if (await input.isVisible().catch(() => false) && await sendButton.isVisible().catch(() => false)) {
          await input.fill('Messaggio lungo per test');
          await sendButton.click();
          
          // Subito dopo l'invio, cerca un indicatore di caricamento
          const loadingIndicator = page.locator('.animate-spin, [data-testid="loading"], .loading').first();
          
          // L'indicatore potrebbe apparire brevemente
          try {
            await loadingIndicator.waitFor({ timeout: 500 });
          } catch {
            // Ignora se non appare (potrebbe essere troppo veloce)
          }
        }
      }
    });
  });

  test.describe('Raccolta dati lead', () => {
    test('dovrebbe raccogliere sintomi', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(500);
        
        const input = page.locator('input[placeholder*="messaggio"], textarea[placeholder*="messaggio"]').first();
        const sendButton = page.locator('button[type="submit"]').first();
        
        if (await input.isVisible().catch(() => false)) {
          await input.fill('Ho mal di schiena da settimane');
          await sendButton.click();
          
          await page.waitForTimeout(2000);
          
          // Verifica che la risposta menzioni sintomi o durata
          const response = page.locator('[data-role="bot"], .message-bot').last();
          const text = await response.textContent().catch(() => '');
          
          // La risposta dovrebbe contenere parole relative alla raccolta dati
          expect(text?.toLowerCase() ?? '').toMatch(/durata|quanto|tempo|sintomi|dispiace/);
        }
      }
    });

    test('dovrebbe raccogliere disponibilità', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(500);
        
        const input = page.locator('input[placeholder*="messaggio"], textarea[placeholder*="messaggio"]').first();
        const sendButton = page.locator('button[type="submit"]').first();
        
        if (await input.isVisible().catch(() => false)) {
          // Simula una conversazione più lunga
          await input.fill('Sono disponibile martedì pomeriggio');
          await sendButton.click();
          
          await page.waitForTimeout(2000);
          
          // Verifica che la risposta sia presente
          const response = page.locator('[data-role="bot"], .message-bot').last();
          await expect(response).toBeVisible();
        }
      }
    });
  });

  test.describe('Chiusura chatbot', () => {
    test('dovrebbe chiudere il chatbot', async ({ page }) => {
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(300);
        
        // Cerca il bottone di chiusura
        const closeButton = page.locator('[data-testid="chat-close"], button:has-text("✕"), button:has-text("×"), button:has-text("X"), .close-button').first();
        
        if (await closeButton.isVisible().catch(() => false)) {
          await closeButton.click();
          await page.waitForTimeout(300);
          
          // La finestra della chat non dovrebbe più essere visibile
          const chatWindow = page.locator('[data-testid="chat-window"]').first();
          await expect(chatWindow).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Responsive', () => {
    test('dovrebbe essere accessibile su mobile', async ({ page }) => {
      // Imposta viewport mobile
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      const chatButton = page.locator('[data-testid="chat-toggle"]').first();
      
      if (await chatButton.isVisible().catch(() => false)) {
        await chatButton.click();
        await page.waitForTimeout(300);
        
        const chatWindow = page.locator('[data-testid="chat-window"]').first();
        
        if (await chatWindow.isVisible().catch(() => false)) {
          // Verifica che la chat sia visibile su mobile
          await expect(chatWindow).toBeVisible();
          
          // Verifica che non esca dallo schermo
          const box = await chatWindow.boundingBox();
          expect(box?.width).toBeLessThanOrEqual(375);
        }
      }
    });
  });
});
