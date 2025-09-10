import { describe, it, expect, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils';
import EnhancedConstraintsDashboard from './EnhancedConstraintsDashboard';

// Mock the child components to isolate the dashboard test
vi.mock('./ConstraintFilters', () => ({
  default: ({ searchTerm, onSearchChange }: any) => (
    <div data-testid="constraint-filters">
      <input 
        data-testid="search-input"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search constraints"
      />
    </div>
  ),
}));

vi.mock('./ConstraintStatsCard', () => ({
  default: ({ stats, isLoading }: any) => (
    <div data-testid="constraint-stats">
      {isLoading ? 'Loading...' : `Total: ${stats?.total || 0}`}
    </div>
  ),
}));

vi.mock('./ConstraintItem', () => ({
  default: ({ constraint, onToggle }: any) => (
    <div data-testid={`constraint-item-${constraint.id}`}>
      <span>{constraint.name}</span>
      <button onClick={() => onToggle(constraint.id, true)}>
        Toggle
      </button>
    </div>
  ),
}));

// Mock the constraint service
vi.mock('@/services/constraintService', () => ({
  fetchConstraints: vi.fn(async () => ({
    items: [
      {
        id: 'C001',
        name: 'Test Constraint 1',
        condition: 'test condition',
        category: 'service',
        priority: 'P1',
        description: 'Test description',
        violationCount: 0,
        active: true,
        action: 'validate'
      },
      {
        id: 'C002', 
        name: 'Test Constraint 2',
        condition: 'another condition',
        category: 'pricing',
        priority: 'P2',
        description: 'Another test description',
        violationCount: 1,
        active: false,
        action: 'validate'
      }
    ]
  })),
  getConstraintsByCategory: vi.fn(() => ({})),
  getConstraintStats: vi.fn(() => ({
    total: 2,
    active: 1,
    inactive: 1,
    activationRate: 50,
    byCategory: [],
    byPriority: { P1: 1, P2: 1, P3: 0, P4: 0 }
  }))
}));

describe('EnhancedConstraintsDashboard', () => {
  it('should render dashboard with all main sections', async () => {
    renderWithProviders(<EnhancedConstraintsDashboard />);
    
    // Check that main container exists
    expect(screen.getByTestId('enhanced-constraints-dashboard')).toBeInTheDocument();
    
    // Check that main sections are present
    await waitFor(() => {
      expect(screen.getByTestId('stats-section')).toBeInTheDocument();
      expect(screen.getByTestId('filters-section')).toBeInTheDocument();
      expect(screen.getByTestId('constraints-table')).toBeInTheDocument();
    });
  });

  it('should display constraints list', async () => {
    renderWithProviders(<EnhancedConstraintsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByTestId('constraints-list')).toBeInTheDocument();
      expect(screen.getByTestId('constraint-item-C001')).toBeInTheDocument();
      expect(screen.getByTestId('constraint-item-C002')).toBeInTheDocument();
    });
  });

  it('should handle toggle callback', async () => {
    const mockOnToggle = vi.fn();
    const { user } = renderWithProviders(
      <EnhancedConstraintsDashboard onToggle={mockOnToggle} />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('constraint-item-C001')).toBeInTheDocument();
    });

    const toggleButton = screen.getAllByText('Toggle')[0];
    await user.click(toggleButton);
    
    expect(mockOnToggle).toHaveBeenCalledWith('C001', true);
  });

  it('should display constraint count in title', async () => {
    renderWithProviders(<EnhancedConstraintsDashboard />);
    
    await waitFor(() => {
      expect(screen.getByText(/2 résultats/)).toBeInTheDocument();
    });
  });

  it('should handle pending constraints', async () => {
    const pending = new Set(['C001']);
    renderWithProviders(
      <EnhancedConstraintsDashboard pending={pending} />
    );
    
    await waitFor(() => {
      expect(screen.getByTestId('constraint-item-C001')).toBeInTheDocument();
    });
  });

  it('should apply custom className', () => {
    renderWithProviders(
      <EnhancedConstraintsDashboard className="custom-class" />
    );
    
    const dashboard = screen.getByTestId('enhanced-constraints-dashboard');
    expect(dashboard).toHaveClass('custom-class');
  });

  it('should handle search functionality', async () => {
    const { user } = renderWithProviders(<EnhancedConstraintsDashboard />);
    
    const searchInput = screen.getByTestId('search-input');
    await user.type(searchInput, 'Test Constraint 1');
    
    expect(searchInput).toHaveValue('Test Constraint 1');
  });
});
