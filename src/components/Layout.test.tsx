import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Layout } from './Layout';

// Wrapper component to provide router context
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Layout', () => {
  it('renders the app title correctly', () => {
    render(<Layout>Test Content</Layout>, { wrapper: TestWrapper });
    expect(screen.getByText('Vibe Apps')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    render(<Layout>Test Content</Layout>, { wrapper: TestWrapper });
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('renders children content', () => {
    const testContent = 'Test Child Content';
    render(<Layout>{testContent}</Layout>, { wrapper: TestWrapper });
    expect(screen.getByText(testContent)).toBeInTheDocument();
  });

  it('has correct navigation link hrefs', () => {
    render(<Layout>Test Content</Layout>, { wrapper: TestWrapper });
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/');
    expect(screen.getByText('About').closest('a')).toHaveAttribute('href', '/about');
  });

  it('applies correct styling classes', () => {
    render(<Layout>Test Content</Layout>, { wrapper: TestWrapper });
    expect(document.querySelector('nav')).toHaveClass('bg-white', 'shadow-lg');
    expect(document.querySelector('main')).toHaveClass('container', 'mx-auto', 'px-4', 'py-8');
  });
}); 