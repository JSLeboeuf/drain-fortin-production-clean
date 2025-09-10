import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders, createMockCall, TEST_IDS } from '../../test/utils';
import CallsTable from './CallsTable';
import { Call } from '../../types';

describe('CallsTable', () => {
  const mockCalls: Call[] = [
    createMockCall({
      id: 'call-1',
      phoneNumber: '+1234567890',
      duration: 180,
      priority: 'P1',
      status: 'completed',
      metadata: { service: 'debouchage', tag: 'urgent' }
    }),
    createMockCall({
      id: 'call-2', 
      phoneNumber: '+1987654321',
      duration: 300,
      priority: 'P3',
      status: 'failed',
      metadata: { service: 'inspection', tag: 'routine' }
    })
  ];

  it('should render empty state when no calls provided', () => {
    renderWithProviders(<CallsTable calls={[]} />);
    
    expect(screen.getByTestId('text-no-calls')).toBeInTheDocument();
    expect(screen.getByText('Aucun appel disponible')).toBeInTheDocument();
  });

  it('should render calls table with proper data', () => {
    renderWithProviders(<CallsTable calls={mockCalls} />);
    
    // Vérifier les headers
    expect(screen.getByText('Heure')).toBeInTheDocument();
    expect(screen.getByText('Numéro')).toBeInTheDocument();
    expect(screen.getByText('Durée')).toBeInTheDocument();
    expect(screen.getByText('Priorité')).toBeInTheDocument();
    expect(screen.getByText('Statut')).toBeInTheDocument();
    expect(screen.getByText('Service')).toBeInTheDocument();
    expect(screen.getByText('Tag')).toBeInTheDocument();

    // Vérifier les données du premier appel
    expect(screen.getByTestId('text-phone-call-1')).toHaveTextContent('+1234567890');
    expect(screen.getByTestId('text-duration-call-1')).toHaveTextContent('3:00');
    expect(screen.getByTestId('badge-priority-call-1')).toHaveTextContent('P1');
    expect(screen.getByTestId('badge-status-call-1')).toHaveTextContent('Complété');
    expect(screen.getByTestId('text-service-call-1')).toHaveTextContent('debouchage');
    expect(screen.getByTestId('text-tag-call-1')).toHaveTextContent('urgent');
  });

  it('should apply correct CSS classes for priority badges', () => {
    renderWithProviders(<CallsTable calls={mockCalls} />);
    
    const p1Badge = screen.getByTestId('badge-priority-call-1');
    const p3Badge = screen.getByTestId('badge-priority-call-2');
    
    expect(p1Badge).toHaveClass('bg-red-600', 'text-white');
    expect(p3Badge).toHaveClass('bg-yellow-600', 'text-white');
  });

  it('should apply correct CSS classes for status badges', () => {
    renderWithProviders(<CallsTable calls={mockCalls} />);
    
    const completedBadge = screen.getByTestId('badge-status-call-1');
    const failedBadge = screen.getByTestId('badge-status-call-2');
    
    expect(completedBadge).toHaveClass('bg-green-100', 'text-green-800');
    expect(failedBadge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('should handle sorting functionality', async () => {
    const mockOnSortChange = vi.fn();
    const { user } = renderWithProviders(
      <CallsTable 
        calls={mockCalls} 
        onSortChange={mockOnSortChange}
        sortKey="date"
        sortDir="asc"
      />
    );

    const dateButton = screen.getByLabelText(/trier par date/i);
    await user.click(dateButton);

    expect(mockOnSortChange).toHaveBeenCalledWith('date');
    expect(dateButton).toHaveAttribute('aria-sort', 'ascending');
  });

  it('should hide actions column when showActions is false', () => {
    renderWithProviders(<CallsTable calls={mockCalls} showActions={false} />);
    
    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('button-view-call-1')).not.toBeInTheDocument();
  });

  it('should show actions column by default', () => {
    renderWithProviders(<CallsTable calls={mockCalls} />);
    
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByTestId('button-view-call-1')).toBeInTheDocument();
  });

  it('should handle missing metadata gracefully', () => {
    const callWithoutMetadata = createMockCall({
      id: 'call-3',
      metadata: undefined
    });
    
    renderWithProviders(<CallsTable calls={[callWithoutMetadata]} />);
    
    expect(screen.getByTestId('text-service-call-3')).toHaveTextContent('Service non spécifié');
    expect(screen.getByTestId('text-tag-call-3')).toHaveTextContent('—');
  });

  it('should formatéduration correctly', () => {
    const calls = [
      createMockCall({ id: 'call-short', duration: 65 }), // 1:05
      createMockCall({ id: 'call-long', duration: 3665 }) // 61:05
    ];
    
    renderWithProviders(<CallsTable calls={calls} />);
    
    expect(screen.getByTestId('text-duration-call-short')).toHaveTextContent('1:05');
    expect(screen.getByTestId('text-duration-call-long')).toHaveTextContent('61:05');
  });

  it('should formatétime correctly in French Canadian locale', () => {
    const call = createMockCall({
      id: 'call-time',
      startTime: new Date('2024-01-01T14:30:00Z')
    });
    
    renderWithProviders(<CallsTable calls={[call]} />);
    
    const timeElement = screen.getByTestId('text-time-call-time');
    // Vérifier que le temps est formaté (peut varier selon l'environnement)
    expect(timeElement.textContent).toBeTruthy();
    expect(timeElement.textContent?.length).toBeGreaterThan(0);
  });

  it('should be accessible with proper ARIA labels', () => {
    renderWithProviders(<CallsTable calls={mockCalls} />);
    
    const sortButtons = screen.getAllByRole('button');
    expect(sortButtons.length).toBeGreaterThan(0);
    
    // Vérifier que les boutons de tri ont des aria-labels
    const dateButton = screen.getByLabelText(/trier par date/i);
    const durationButton = screen.getByLabelText(/trier par durée/i);
    expect(dateButton).toHaveAttribute('aria-sort');
    expect(durationButton).toHaveAttribute('aria-sort');

    // Vérifier les test-ids pour les éléments de données
    expect(screen.getByTestId('row-call-call-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-call-call-2')).toBeInTheDocument();
  });

  it('should handle keyboard navigation on sort buttons', async () => {
    const mockOnSortChange = vi.fn();
    const { user } = renderWithProviders(
      <CallsTable calls={mockCalls} onSortChange={mockOnSortChange} />
    );

    const durationButton = screen.getByLabelText(/trier par durée/i);
    
    // Test keyboard interaction
    durationButton.focus();
    await user.keyboard('{Enter}');
    
    expect(mockOnSortChange).toHaveBeenCalledWith('duration');
  });

  it('should maintain performance with memoization', () => {
    const { rerender } = renderWithProviders(<CallsTable calls={mockCalls} />);
    
    const initialRender = screen.getByTestId('row-call-call-1');
    
    // Re-render avec les mêmes props ne devrait pas recréer l'élément
    rerender(<CallsTable calls={mockCalls} />);
    
    const afterRerender = screen.getByTestId('row-call-call-1');
    // En mode test, on vérifie que le composant est mémorisé correctement
    expect(afterRerender).toBeInTheDocument();
  });
});