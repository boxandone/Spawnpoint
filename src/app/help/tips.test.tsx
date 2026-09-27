import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { Tip } from './Tip';
import { useGuide } from './tips';

describe('guide mode', () => {
  beforeEach(() => localStorage.clear());

  it('shows tips by default and hides one once dismissed', () => {
    render(<Tip id="t1" text="tip.today.undo" />);
    expect(screen.getByText(/Undo for 6 seconds/)).toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Got it' }).click());
    expect(screen.queryByText(/Undo for 6 seconds/)).not.toBeInTheDocument();
  });

  it('turning guide mode off hides every tip; reset brings them back', () => {
    const { result } = renderHook(() => useGuide());
    act(() => result.current.dismiss('a'));
    act(() => result.current.setEnabled(false));
    expect(result.current.isVisible('b')).toBe(false);
    act(() => result.current.resetAll());
    expect(result.current.enabled).toBe(true);
    expect(result.current.isVisible('a')).toBe(true);
  });
});

describe('TipQueue', () => {
  beforeEach(() => localStorage.clear());

  it('shows one tip at a time, in order', async () => {
    const { TipQueue } = await import('./Tip');
    render(
      <TipQueue
        tips={[
          { id: 'q1', text: 'tip.today.longpress' },
          { id: 'q2', text: 'tip.today.undo' },
        ]}
      />,
    );
    expect(screen.getByText(/Press and hold/)).toBeInTheDocument();
    expect(screen.queryByText(/Undo for 6 seconds/)).not.toBeInTheDocument();
    act(() => screen.getByRole('button', { name: 'Got it' }).click());
    expect(screen.getByText(/Undo for 6 seconds/)).toBeInTheDocument();
  });
});
