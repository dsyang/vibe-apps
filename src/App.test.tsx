import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

describe('App', () => {
  it('renders home page by default', () => {
    render(<App RouterComponent={MemoryRouter} />);
    expect(screen.getByText(/Welcome to Your App/i)).toBeInTheDocument();
    expect(screen.getByText(/This is a modern React application/i)).toBeInTheDocument();
  });

  it('navigates to about page when clicking About link', async () => {
    render(<App RouterComponent={MemoryRouter} />);
    const user = userEvent.setup();
    
    // Click the About link
    await user.click(screen.getByText('About'));
    
    // Verify About page content is shown
    expect(screen.getByRole('heading', { name: /About/i })).toBeInTheDocument();
    expect(screen.getByText(/This was created by Dan with the help of Cursor/i)).toBeInTheDocument();
  });

  it('renders about page directly when navigated to /about', () => {
    render(
      <App 
        RouterComponent={({ children }) => (
          <MemoryRouter initialEntries={['/about']}>{children}</MemoryRouter>
        )} 
      />
    );
    expect(screen.getByRole('heading', { name: /About/i })).toBeInTheDocument();
    expect(screen.getByText(/This was created by Dan with the help of Cursor/i)).toBeInTheDocument();
  });

  it('navigates back to home page when clicking Home link from about page', async () => {
    render(
      <App 
        RouterComponent={({ children }) => (
          <MemoryRouter initialEntries={['/about']}>{children}</MemoryRouter>
        )} 
      />
    );
    const user = userEvent.setup();
    
    // Verify we're on the about page
    expect(screen.getByRole('heading', { name: /About/i })).toBeInTheDocument();
    
    // Click the Home link
    await user.click(screen.getByText('Home'));
    
    // Verify we're back on the home page
    expect(screen.getByRole('heading', { name: /Welcome to Your App/i })).toBeInTheDocument();
    expect(screen.getByText(/This is a modern React application/i)).toBeInTheDocument();
  });
});
