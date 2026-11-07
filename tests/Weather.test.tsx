import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const svc = vi.hoisted(() => ({
  getStructuredWeatherData: vi.fn(),
  getWeatherSummary: vi.fn(),
  askWeatherQuestion: vi.fn(),
  generateSpeech: vi.fn(),
  editImage: vi.fn(),
}));
vi.mock('../services/geminiService', () => svc);

import Weather from '../components/Weather';

const weather = {
  locationName: 'Paris, France',
  currentTempCelsius: 17.6,
  weatherDescription: 'light rain',
  weatherIcon: 'RAIN',
  dailyForecast: [
    { day: 'Mon', highTemp: 19.4, lowTemp: 8.6, description: 'cloudy' },
    { day: 'Tue', highTemp: 21, lowTemp: 10, description: 'sunny' },
  ],
};

beforeEach(() => {
  Object.values(svc).forEach((f) => f.mockReset());
  vi.stubGlobal(
    'AudioContext',
    class {
      destination = {};
    },
  );
});

async function search(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText(/Paris, France/), 'Paris');
  await user.click(screen.getByRole('button', { name: 'Search' }));
}

describe('<Weather />', () => {
  it('disables Search until a location is typed', async () => {
    render(<Weather />);
    const button = screen.getByRole('button', { name: 'Search' });
    expect(button).toBeDisabled();
    await userEvent.setup().type(screen.getByPlaceholderText(/Paris, France/), 'x');
    expect(button).toBeEnabled();
  });

  it('shows rounded current conditions, forecast and the AI summary', async () => {
    svc.getStructuredWeatherData.mockResolvedValue(weather);
    svc.getWeatherSummary.mockResolvedValue({
      summary: 'Take a coat.',
      sources: [{ maps: { uri: 'https://maps.example/x', title: 'Louvre' } }],
    });
    const user = userEvent.setup();
    render(<Weather />);

    await search(user);

    expect(await screen.findByText('Paris, France')).toBeInTheDocument();
    expect(screen.getByText('18°C')).toBeInTheDocument();
    expect(screen.getByText('19° / 9°')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(await screen.findByText('Take a coat.')).toBeInTheDocument();
    expect(svc.getStructuredWeatherData).toHaveBeenCalledWith('Paris');
    expect(svc.getWeatherSummary).toHaveBeenCalledWith('Paris, France', undefined, undefined);
  });

  it('shows an error message when the weather request fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    svc.getStructuredWeatherData.mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    render(<Weather />);

    await search(user);

    expect(await screen.findByText(/Failed to fetch weather data/)).toBeInTheDocument();
    expect(screen.queryByText('Paris, France')).not.toBeInTheDocument();
  });

  it('answers follow-up questions in the context of the current location', async () => {
    svc.getStructuredWeatherData.mockResolvedValue(weather);
    svc.getWeatherSummary.mockResolvedValue({ summary: 's', sources: [] });
    svc.askWeatherQuestion.mockResolvedValue({
      answer: 'Yes, pack an umbrella.',
      sources: [{ web: { uri: 'https://example.com', title: 'Met Office' } }],
    });
    const user = userEvent.setup();
    render(<Weather />);
    await search(user);
    await screen.findByText('Paris, France');

    const askInput = screen.getAllByRole('textbox').find((el) => el !== screen.getByPlaceholderText(/Paris, France/))!;
    await user.type(askInput, 'Will I need an umbrella?');
    await user.click(screen.getByRole('button', { name: /Ask Gemini/ }));

    expect(await screen.findByText('Yes, pack an umbrella.')).toBeInTheDocument();
    expect(svc.askWeatherQuestion).toHaveBeenCalledWith(
      'Regarding the weather in Paris, France, Will I need an umbrella?',
    );
    expect(screen.getByRole('link', { name: 'Met Office' })).toHaveAttribute('href', 'https://example.com');
  });

  it('passes coordinates through when using the device location', async () => {
    svc.getStructuredWeatherData.mockResolvedValue(weather);
    svc.getWeatherSummary.mockResolvedValue({ summary: 's', sources: [] });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: (ok: PositionCallback) =>
          ok({ coords: { latitude: 48.85, longitude: 2.35 } } as GeolocationPosition),
      },
    });
    render(<Weather />);

    await userEvent.setup().click(screen.getByRole('button', { name: /Use My Location/ }));

    await waitFor(() => expect(svc.getStructuredWeatherData).toHaveBeenCalledWith('48.85,2.35'));
    await waitFor(() => expect(svc.getWeatherSummary).toHaveBeenCalledWith('Paris, France', 48.85, 2.35));
  });

  it('reports denied geolocation', async () => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: (_ok: PositionCallback, fail: PositionErrorCallback) => fail({} as GeolocationPositionError) },
    });
    render(<Weather />);

    await userEvent.setup().click(screen.getByRole('button', { name: /Use My Location/ }));

    expect(await screen.findByText(/Unable to retrieve your location/)).toBeInTheDocument();
    expect(svc.getStructuredWeatherData).not.toHaveBeenCalled();
  });
});
