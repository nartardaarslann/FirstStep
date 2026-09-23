import config from './app.json';
export default { ...config.expo, name: 'Ritim', scheme: 'ritim',
  extra: { backendUrl: process.env.EXPO_PUBLIC_BACKEND_URL },
  ios: { ...config.expo.ios, infoPlist: { NSCameraUsageDescription: 'Öğünlerini fotoğraflayarak kaydet.', NSPhotoLibraryUsageDescription: 'Öğün fotoğraflarını seçerek kaydet.' } },
  android: { ...config.expo.android, permissions: ['CAMERA'] },
  plugins: [...config.expo.plugins, ['expo-camera', { cameraPermission: 'Öğünlerini fotoğraflayarak kaydet.', recordAudioAndroid: false }], ['expo-image-picker', { photosPermission: 'Öğün fotoğraflarını seçerek kaydet.', microphonePermission: false }]],
};