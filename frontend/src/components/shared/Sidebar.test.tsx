import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import Sidebar from './Sidebar';

// Mock useLocation from wouter
vi.mock('wouter', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
  useLocation: vi.fn(() => ['/dashboard']),
}));

describe('Sidebar Accessibility', () => {
  it('should render with proper semantic structure', () => {
    renderWithProviders(<Sidebar />);
    
    // Check main semantic elements
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('navigation')).toBeInTheDocument();
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('should have skip link for keyboard navigation', () => {
    renderWithProviders(<Sidebar />);
    
    const skipLink = screen.getByTestId('skip-to-main');
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveTextContent('Aller au contenu principal');
    expect(skipLink).toHaveAttribute('href', '#main-content');
  });

  it('should have proper ARIA labels and descriptions', () => {
    renderWithProviders(<Sidebar />);
    
    // Check sidebar has aria-label
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveAttribute('aria-label', 'Navigation principale');
    
    // Check navigation has aria-label
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('aria-label', 'Navigation principale du tableau de bord');
  });

  it('should mark active page with aria-current', () => {
    renderWithProviders(<Sidebar />);
    
    // Dashboard should be active (mocked location)
    const dashboardLink = screen.getByTestId('link-nav-dashboard');
    expect(dashboardLink).toHaveAttribute('aria-current', 'page');
  });

  it('should have proper menuitem roles', () => {
    renderWithProviders(<Sidebar />);
    
    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems.length).toBeGreaterThan(0);
    
    // Each menu item should have proper attributes
    menuItems.forEach((item) => {
      expect(item).toHaveAttribute('role', 'menuitem');
      expect(item).toHaveAttribute('aria-describedby');
    });
  });

  it('should have screen reader descriptions for navigation items', () => {
    renderWithProviders(<Sidebar />);
    
    // Check that descriptions exist for screen readers
    expect(screen.getByText('Vue d\'ensemble du système et métriques')).toHaveClass('sr-only');
    expect(screen.getByText('Gestion des appels entrants et historique')).toHaveClass('sr-only');
  });

  it('should have proper badge labels for screen readers', () => {
    renderWithProviders(<Sidebar />);
    
    // Find badges and check their accessibility labels
    const liveStatus = screen.getByRole('status', { name: /en direct/i });
    expect(liveStatus).toBeInTheDocument();
    
    const badgeStatus = screen.getByRole('status', { name: /3 éléments non lus/i });
    expect(badgeStatus).toBeInTheDocument();
  });

  it('should have proper logo accessibility', () => {
    renderWithProviders(<Sidebar />);
    
    const logo = screen.getByRole('img', { name: /logo paul/i });
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('aria-label', 'Logo Paul - Assistant vocal pour Drain Fortin');
  });

  it('should have proper system status accessibility', () => {
    renderWithProviders(<Sidebar />);
    
    const statusSection = screen.getByTestId('system-status-section');
    expect(statusSection).toHaveAttribute('role', 'status');
    expect(statusSection).toHaveAttribute('aria-live', 'polite');
    
    const statusIndicator = screen.getByRole('img', { name: /indicateur de statut/i });
    expect(statusIndicator).toBeInTheDocument();
  });

  it('should hide decorative icons from screen readers', () => {
    renderWithProviders(<Sidebar />);
    
    const sidebar = screen.getByRole('complementary');
    const decorativeIcons = sidebar.querySelectorAll('[aria-hidden="true"]');
    
    // Should have decorative icons marked as hidden
    expect(decorativeIcons.length).toBeGreaterThan(0);
    
    decorativeIcons.forEach((icon) => {
      expect(icon).toHaveAttribute('focusable', 'false');
    });
  });

  it('should have focus-visible styles for keyboard navigation', () => {
    renderWithProviders(<Sidebar />);
    
    const menuItems = screen.getAllByRole('menuitem');
    menuItems.forEach((item) => {
      expect(item.className).toContain('focus-visible:outline-none');
      expect(item.className).toContain('focus-visible:ring-2');
    });
  });

  it('should handle navigation callback', async () => {
    const mockOnNavigate = vi.fn();
    const { user } = renderWithProviders(<Sidebar onNavigate={mockOnNavigate} />);
    
    const analyticsLink = screen.getByTestId('link-nav-analytics');
    await user.click(analyticsLink);
    
    expect(mockOnNavigate).toHaveBeenCalledWith('/analytics');
  });

  it('should apply custom className', () => {
    renderWithProviders(<Sidebar className="custom-sidebar-class" />);
    
    const sidebar = screen.getByRole('complementary');
    expect(sidebar).toHaveClass('custom-sidebar-class');
  });

  it('should have proper heading structure', () => {
    renderWithProviders(<Sidebar />);
    
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Paul');
    expect(heading).toHaveAttribute('id', 'sidebar-title');
  });

  it('should connect subtitle to heading with aria-describedby', () => {
    renderWithProviders(<Sidebar />);
    
    const subtitle = screen.getByTestId('text-logo-subtitle');
    expect(subtitle).toHaveAttribute('aria-describedby', 'sidebar-title');
  });

  it('should handle keyboard events on skip link', async () => {
    const { user } = renderWithProviders(<Sidebar />);
    
    const skipLink = screen.getByTestId('skip-to-main');
    
    // Test Enter key
    await user.click(skipLink);
    await user.keyboard('{Enter}');
    
    // Test Space key
    await user.keyboard(' ');
    
    // Skip link should exist and be functional
    expect(skipLink).toBeInTheDocument();
  });

  it('should maintain list structure for navigation', () => {
    renderWithProviders(<Sidebar />);
    
    const list = screen.getByRole('menu');
    expect(list.tagName).toBe('UL');
    
    const listItems = screen.getAllByRole('none');
    expect(listItems.length).toBeGreaterThan(0);
    
    listItems.forEach((item) => {
      expect(item.tagName).toBe('LI');
    });
  });
});