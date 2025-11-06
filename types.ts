export interface WeatherData {
  locationName: string;
  currentTempCelsius: number;
  weatherDescription: string;
  weatherIcon: 'SUNNY' | 'CLOUDY' | 'PARTLY_CLOUDY' | 'RAIN' | 'SNOW' | 'STORM' | 'FOG';
  dailyForecast: {
    day: string;
    highTemp: number;
    lowTemp: number;
    description: string;
  }[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
  maps?: {
    uri: string;
    title: string;
  };
}
