import { render, screen } from '@testing-library/react';
import App from './App';

describe('App routing shell', () => {
  it('redirects to Vitamins and renders navigation', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'תוספים' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
  });
});
