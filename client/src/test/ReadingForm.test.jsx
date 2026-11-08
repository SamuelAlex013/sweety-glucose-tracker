import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReadingForm from '../components/ReadingForm.jsx';
import { api, ApiError } from '../api.js';

vi.mock('../api.js', async (importOriginal) => ({ ...(await importOriginal()), api: vi.fn() }));
const props = () => ({
  date: '2026-10-15',
  today: '2026-10-15',
  onSaved: vi.fn(),
  onCancel: vi.fn(),
  onSessionExpired: vi.fn(),
});
beforeEach(() => vi.clearAllMocks());

describe('reading form', () => {
  it('shows a required error, then rejects decimal and future values before calling the API', async () => {
    const user = userEvent.setup();
    render(<ReadingForm {...props()} />);
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(screen.getByText('Please enter a glucose value.')).toBeVisible();
    await user.type(screen.getByRole('spinbutton'), '100.5');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(
      screen.getByText('Value must be a whole number between 40 and 600 mg/dl.'),
    ).toBeVisible();
    await user.clear(screen.getByRole('spinbutton'));
    await user.type(screen.getByRole('spinbutton'), '110');
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-16' } });
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(screen.getByText('Date cannot be in the future.')).toBeVisible();
    expect(api).not.toHaveBeenCalled();
  });
  it('submits an edit once with its date and slot, then calls onSaved', async () => {
    const user = userEvent.setup();
    const callbacks = props();
    const reading = { id: 'reading-id', date: '2026-10-14', slot: 'lunch', value: 120 };
    api.mockResolvedValue({ reading: { ...reading, value: 130 } });
    render(<ReadingForm {...callbacks} reading={reading} />);
    await user.clear(screen.getByRole('spinbutton'));
    await user.type(screen.getByRole('spinbutton'), '130');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    await waitFor(() => expect(callbacks.onSaved).toHaveBeenCalledWith({ ...reading, value: 130 }));
    expect(api).toHaveBeenCalledExactlyOnceWith('/readings/reading-id', {
      method: 'PUT',
      body: { date: '2026-10-14', slot: 'lunch', value: '130' },
    });
  });
  it('keeps entered values and displays server conflicts beside the slot', async () => {
    const user = userEvent.setup();
    const message = 'You already have an After lunch reading for this date.';
    api.mockRejectedValue(new ApiError(message, 409, { slot: message }));
    render(<ReadingForm {...props()} />);
    await user.selectOptions(screen.getByLabelText('Time slot'), 'lunch');
    await user.type(screen.getByRole('spinbutton'), '120');
    await user.click(screen.getByRole('button', { name: 'Save reading' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByRole('spinbutton')).toHaveValue(120);
    expect(screen.getByLabelText('Time slot')).toHaveAttribute('aria-invalid', 'true');
  });
});
