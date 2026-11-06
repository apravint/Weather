import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/geminiService', () => ({
  getStructuredWeatherData: vi.fn(),
  getWeatherSummary: vi.fn(),
  askWeatherQuestion: vi.fn(),
  generateSpeech: vi.fn(),
  editImage: vi.fn(),
}));

import App from '../App';

describe('<App />', () => {
  it('starts on the weather tab and switches to Vision Studio', async () => {
    vi.stubGlobal('AudioContext', class {});
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Weather Dashboard' })).toBeInTheDocument();

    await userEvent.setup().click(screen.getByRole('button', { name: 'Vision Studio' }));

    expect(screen.getByRole('heading', { name: 'Vision Studio' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Weather Dashboard' })).not.toBeInTheDocument();
  });
});
