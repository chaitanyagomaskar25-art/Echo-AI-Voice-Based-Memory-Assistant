import Constants from 'expo-constants';
import { Platform } from 'react-native';

const getLocalHostUrl = () => {
  // If running in Android emulator, localhost is 10.0.2.2
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5000/api';
  }
  return 'http://localhost:5000/api';
};

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  Constants.expoConfig?.extra?.apiUrl ||
  getLocalHostUrl();

export const CONFIG = {
  APP_NAME: 'Echo',
  APP_SUBTITLE: 'AI Voice-Based Memory Assistant',
  VERSION: '1.0.0',
  API_BASE_URL,
  DEFAULT_AUDIO_SAMPLE_RATE: 44100,
  AUTO_TRANSCRIBE_DELAY: 800,
};

export default CONFIG;
