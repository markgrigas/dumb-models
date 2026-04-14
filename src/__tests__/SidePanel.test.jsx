import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SidePanel from '../components/SidePanel';

// shapes-dataset.json is a real file, no mock needed
// retrieval.js is pure JS, no mock needed

describe('SidePanel', () => {
  const noop = () => {};

  it('renders search input', () => {
    render(<SidePanel onSelect={noop} onSave={noop} savedShapes={[]} />);
    expect(screen.getByPlaceholderText('Search shapes...')).toBeTruthy();
  });

  it('shows shape results on initial render', () => {
    render(<SidePanel onSelect={noop} onSave={noop} savedShapes={[]} />);
    // Default search('', 20) returns first 20 shapes — each has a '+' save button
    const saveBtns = screen.getAllByText('+');
    expect(saveBtns.length).toBeGreaterThan(0);
  });

  it('shows shape names in results list', () => {
    render(<SidePanel onSelect={noop} onSave={noop} savedShapes={[]} />);
    // Empty query returns a shuffled sample — just verify at least one name span renders
    const nameSpans = document.querySelectorAll('[class*="_name_"]');
    expect(nameSpans.length).toBeGreaterThan(0);
  });

  it('filters results when user types in search box', async () => {
    const user = userEvent.setup();
    render(<SidePanel onSelect={noop} onSave={noop} savedShapes={[]} />);
    const input = screen.getByPlaceholderText('Search shapes...');
    await user.type(input, 'donut');
    expect(screen.getByText('Rubber Donut')).toBeTruthy();
  });

  it('calls onSelect when a shape button is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<SidePanel onSelect={onSelect} onSave={noop} savedShapes={[]} />);
    // Get the first select button regardless of which shape the shuffle put first
    const firstSelectBtn = screen.getAllByRole('button').find(b => b.className.includes('selectBtn'));
    await user.click(firstSelectBtn);
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
  });

  it('calls onSave when + button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SidePanel onSelect={noop} onSave={onSave} savedShapes={[]} />);
    const saveBtns = screen.getAllByText('+');
    await user.click(saveBtns[0]);
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
  });
});
