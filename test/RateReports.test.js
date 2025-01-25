import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RateReports from '../client/src/components/RateReports';

test('renders RateReports component and checks impairment dropdown', () => {
    render(<RateReports />);

    // Check if the impairment dropdown is present
    const impairmentDropdown = screen.getByLabelText(/Impairment/i);
    expect(impairmentDropdown).toBeInTheDocument();

    // Check if the default option is present
    expect(screen.getByText(/----- I Select Impairment -----/)).toBeInTheDocument();

    // Simulate selecting an impairment
    fireEvent.change(impairmentDropdown, { target: { value: '219' } });
    expect(impairmentDropdown.value).toBe('219');
});
