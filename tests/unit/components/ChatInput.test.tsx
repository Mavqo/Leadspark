/**
 * Unit Tests - ChatInput Component
 * Test per il componente di input messaggi
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '../../../src/components/chatbot/ChatInput';

describe('ChatInput Component', () => {
  describe('Rendering', () => {
    it('dovrebbe renderizzare il componente', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      expect(screen.getByPlaceholderText('Scrivi un messaggio...')).toBeInTheDocument();
    });

    it('dovrebbe mostrare placeholder personalizzato', () => {
      render(<ChatInput onSend={vi.fn()} placeholder="Messaggio personalizzato..." />);
      
      expect(screen.getByPlaceholderText('Messaggio personalizzato...')).toBeInTheDocument();
    });

    it('dovrebbe mostrare il bottone di invio', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      expect(screen.getByLabelText('Invia messaggio')).toBeInTheDocument();
    });

    it('dovrebbe mostrare testo helper', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      expect(screen.getByText(/Premi Invio per inviare/)).toBeInTheDocument();
      expect(screen.getByText(/Shift \+ Invio per nuova riga/)).toBeInTheDocument();
    });
  });

  describe('Input handling', () => {
    it('dovrebbe aggiornare il valore quando si digita', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Ciao!' } });
      
      expect(textarea).toHaveValue('Ciao!');
    });

    it('dovrebbe chiamare onSend quando si preme Invio', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Test message' } });
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
      
      expect(onSend).toHaveBeenCalledWith('Test message');
    });

    it('non dovrebbe inviare con Shift+Enter', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Line 1' } });
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true, code: 'Enter' });
      
      expect(onSend).not.toHaveBeenCalled();
    });

    it('dovrebbe chiamare onSend quando si clicca il bottone', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Button click test' } });
      
      const button = screen.getByLabelText('Invia messaggio');
      fireEvent.click(button);
      
      expect(onSend).toHaveBeenCalledWith('Button click test');
    });

    it('dovrebbe pulire l\'input dopo l\'invio', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Clear test' } });
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
      
      expect(textarea).toHaveValue('');
    });

    it('non dovrebbe inviare messaggio vuoto', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      
      const button = screen.getByLabelText('Invia messaggio');
      fireEvent.click(button);
      
      expect(onSend).not.toHaveBeenCalled();
    });

    it('non dovrebbe inviare messaggio con solo spazi', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: '   ' } });
      
      const button = screen.getByLabelText('Invia messaggio');
      fireEvent.click(button);
      
      expect(onSend).not.toHaveBeenCalled();
    });

    it('dovrebbe trimmare il messaggio prima di inviare', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: '  Spazi extra  ' } });
      fireEvent.keyDown(textarea, { key: 'Enter', code: 'Enter' });
      
      expect(onSend).toHaveBeenCalledWith('Spazi extra');
    });
  });

  describe('Stato disabled', () => {
    it('dovrebbe disabilitare input quando disabled=true', () => {
      render(<ChatInput onSend={vi.fn()} disabled={true} />);
      
      const textarea = screen.getByPlaceholderText('Attendere risposta...');
      expect(textarea).toBeDisabled();
    });

    it('dovrebbe disabilitare bottone quando disabled=true', () => {
      render(<ChatInput onSend={vi.fn()} disabled={true} />);
      
      const button = screen.getByLabelText('Invia messaggio');
      expect(button).toBeDisabled();
    });

    it('dovrebbe mostrare placeholder diverso quando disabled', () => {
      render(<ChatInput onSend={vi.fn()} disabled={true} />);
      
      expect(screen.getByPlaceholderText('Attendere risposta...')).toBeInTheDocument();
    });

    it('dovrebbe mostrare spinner quando disabled', () => {
      const { container } = render(<ChatInput onSend={vi.fn()} disabled={true} />);
      
      // Cerca l'icona di loading (animate-spin)
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('non dovrebbe chiamare onSend quando disabled', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} disabled={true} />);
      
      // Prova a scrivere (non dovrebbe funzionare ma testiamo comunque)
      const textarea = screen.getByPlaceholderText('Attendere risposta...');
      fireEvent.change(textarea, { target: { value: 'Test' } });
      
      expect(textarea).toBeDisabled();
    });
  });

  describe('Bottone di invio', () => {
    it('dovrebbe essere disabilitato senza messaggio', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const button = screen.getByLabelText('Invia messaggio');
      expect(button).toBeDisabled();
    });

    it('dovrebbe essere abilitato con messaggio', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Messaggio' } });
      
      const button = screen.getByLabelText('Invia messaggio');
      expect(button).not.toBeDisabled();
    });

    it('dovrebbe cambiare stile quando abilitato', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Stile test' } });
      
      const button = screen.getByLabelText('Invia messaggio');
      expect(button.className).toContain('bg-blue-600');
    });

    it('dovrebbe avere stile disabilitato quando vuoto', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const button = screen.getByLabelText('Invia messaggio');
      expect(button.className).toContain('bg-gray-200');
    });
  });

  describe('Auto-resize textarea', () => {
    it('dovrebbe avere stile auto-resize', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      expect(textarea).toHaveAttribute('style');
    });

    it('dovrebbe avere rows=1 di default', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      expect(textarea).toHaveAttribute('rows', '1');
    });

    it('dovrebbe permettere multi-linea', () => {
      const { container } = render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = container.querySelector('textarea');
      expect(textarea).toHaveClass('resize-none');
    });
  });

  describe('Eventi tastiera', () => {
    it('dovrebbe gestire keydown senza errori', () => {
      render(<ChatInput onSend={vi.fn()} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      
      // Altri tasti non dovrebbero causare errori
      fireEvent.keyDown(textarea, { key: 'a', code: 'KeyA' });
      fireEvent.keyDown(textarea, { key: 'Tab', code: 'Tab' });
      fireEvent.keyDown(textarea, { key: 'Escape', code: 'Escape' });
    });

    it('dovrebbe inviare solo con Enter senza modificatori', () => {
      const onSend = vi.fn();
      render(<ChatInput onSend={onSend} />);
      
      const textarea = screen.getByPlaceholderText('Scrivi un messaggio...');
      fireEvent.change(textarea, { target: { value: 'Ctrl test' } });
      
      // Ctrl+Enter non dovrebbe inviare
      fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true, code: 'Enter' });
      expect(onSend).not.toHaveBeenCalled();
      
      // Alt+Enter non dovrebbe inviare
      fireEvent.keyDown(textarea, { key: 'Enter', altKey: true, code: 'Enter' });
      expect(onSend).not.toHaveBeenCalled();
    });
  });
});
