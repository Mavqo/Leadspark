/**
 * Unit Tests - ChatMessage Component
 * Test per il componente di visualizzazione messaggi
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChatMessage } from '../../../src/components/chatbot/ChatMessage';
import type { ChatMessage as ChatMessageType } from '../../../src/components/chatbot/types';

describe('ChatMessage Component', () => {
  const mockTimestamp = new Date('2024-01-15T10:30:00');

  describe('Rendering messaggi bot', () => {
    it('dovrebbe renderizzare un messaggio bot', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Buongiorno! Sono Emma.',
        timestamp: mockTimestamp
      };

      render(<ChatMessage message={message} />);
      
      expect(screen.getByText('Buongiorno! Sono Emma.')).toBeInTheDocument();
    });

    it('dovrebbe mostrare l\'icona bot per messaggi bot', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Test',
        timestamp: mockTimestamp
      };

      const { container } = render(<ChatMessage message={message} />);
      
      // Il messaggio bot ha data-role="bot"
      const messageDiv = container.querySelector('[data-role="bot"]');
      expect(messageDiv).toBeInTheDocument();
    });

    it('dovrebbe applicare stili diversi per messaggi bot', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Test bot',
        timestamp: mockTimestamp
      };

      const { container } = render(<ChatMessage message={message} />);
      
      // Cerca il bubble del bot (ha rounded-tl-sm)
      const bubble = container.querySelector('.rounded-tl-sm');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Rendering messaggi user', () => {
    it('dovrebbe renderizzare un messaggio utente', () => {
      const message: ChatMessageType = {
        id: '2',
        role: 'user',
        content: 'Ho mal di schiena',
        timestamp: mockTimestamp
      };

      render(<ChatMessage message={message} />);
      
      expect(screen.getByText('Ho mal di schiena')).toBeInTheDocument();
    });

    it('dovrebbe mostrare l\'icona user per messaggi utente', () => {
      const message: ChatMessageType = {
        id: '2',
        role: 'user',
        content: 'Test',
        timestamp: mockTimestamp
      };

      const { container } = render(<ChatMessage message={message} />);
      
      // Il messaggio user ha data-role="user"
      const messageDiv = container.querySelector('[data-role="user"]');
      expect(messageDiv).toBeInTheDocument();
    });

    it('dovrebbe applicare stili diversi per messaggi utente', () => {
      const message: ChatMessageType = {
        id: '2',
        role: 'user',
        content: 'Test user',
        timestamp: mockTimestamp
      };

      const { container } = render(<ChatMessage message={message} />);
      
      // Cerca il bubble dell'utente (ha rounded-tr-sm)
      const bubble = container.querySelector('.rounded-tr-sm');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Timestamp', () => {
    it('dovrebbe mostrare il timestamp formattato', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Test',
        timestamp: new Date('2024-01-15T14:30:00')
      };

      render(<ChatMessage message={message} />);
      
      // Formato italiano: ore:minuti
      expect(screen.getByText('14:30')).toBeInTheDocument();
    });

    it('dovrebbe gestire timestamp undefined', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Test senza timestamp'
      };

      render(<ChatMessage message={message} />);
      
      // Non dovrebbe mostrare timestamp
      expect(screen.getByText('Test senza timestamp')).toBeInTheDocument();
    });

    it('dovrebbe formattare correttamente ore e minuti', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Test',
        timestamp: new Date('2024-01-15T09:05:00')
      };

      render(<ChatMessage message={message} />);
      
      // Dovrebbe avere lo zero iniziale
      expect(screen.getByText('09:05')).toBeInTheDocument();
    });
  });

  describe('Layout e struttura', () => {
    it('dovrebbe avere layout flex row per bot', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Test',
        timestamp: mockTimestamp
      };

      const { container } = render(<ChatMessage message={message} />);
      
      // Bot usa flex-row (default)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex-row');
    });

    it('dovrebbe avere layout flex row-reverse per user', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'user',
        content: 'Test',
        timestamp: mockTimestamp
      };

      const { container } = render(<ChatMessage message={message} />);
      
      // User usa flex-row-reverse
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.className).toContain('flex-row-reverse');
    });

    it('dovrebbe avere avatar per entrambi i ruoli', () => {
      const botMessage: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Bot message',
        timestamp: mockTimestamp
      };

      const userMessage: ChatMessageType = {
        id: '2',
        role: 'user',
        content: 'User message',
        timestamp: mockTimestamp
      };

      const { container: botContainer } = render(<ChatMessage message={botMessage} />);
      const { container: userContainer } = render(<ChatMessage message={userMessage} />);

      // Entrambi dovrebbero avere un elemento con w-8 h-8 (avatar)
      expect(botContainer.querySelector('.w-8.h-8')).toBeInTheDocument();
      expect(userContainer.querySelector('.w-8.h-8')).toBeInTheDocument();
    });

    it('dovrebbe avere colore avatar diverso per bot e user', () => {
      const botMessage: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Bot',
        timestamp: mockTimestamp
      };

      const userMessage: ChatMessageType = {
        id: '2',
        role: 'user',
        content: 'User',
        timestamp: mockTimestamp
      };

      const { container: botContainer } = render(<ChatMessage message={botMessage} />);
      const { container: userContainer } = render(<ChatMessage message={userMessage} />);

      // Bot ha bg-blue-100
      const botAvatar = botContainer.querySelector('.bg-blue-100');
      expect(botAvatar).toBeInTheDocument();

      // User ha bg-gray-200
      const userAvatar = userContainer.querySelector('.bg-gray-200');
      expect(userAvatar).toBeInTheDocument();
    });
  });

  describe('Contenuto lungo', () => {
    it('dovrebbe gestire messaggi lunghi', () => {
      const longMessage: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Questo è un messaggio molto lungo che supera i 100 caratteri per testare che il componente gestisca correttamente contenuti estesi senza rompersi o creare problemi di layout.',
        timestamp: mockTimestamp
      };

      render(<ChatMessage message={longMessage} />);
      
      expect(screen.getByText(longMessage.content)).toBeInTheDocument();
    });

    it('dovrebbe limitare larghezza massima del messaggio', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Test',
        timestamp: mockTimestamp
      };

      const { container } = render(<ChatMessage message={message} />);
      
      // Il bubble ha max-w-[80%]
      const bubble = container.querySelector('.max-w-\[80\%\]');
      expect(bubble).toBeInTheDocument();
    });
  });

  describe('Messaggi speciali', () => {
    it('dovrebbe gestire messaggi con caratteri speciali', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: 'Ciao! Come stai? 😊 <script>alert("test")</script>',
        timestamp: mockTimestamp
      };

      render(<ChatMessage message={message} />);
      
      // Il contenuto dovrebbe essere mostrato come testo
      expect(screen.getByText(message.content)).toBeInTheDocument();
    });

    it('dovrebbe gestire messaggi vuoti', () => {
      const message: ChatMessageType = {
        id: '1',
        role: 'bot',
        content: '',
        timestamp: mockTimestamp
      };

      render(<ChatMessage message={message} />);
      
      // Dovrebbe renderizzare comunque
      const { container } = render(<ChatMessage message={message} />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});
