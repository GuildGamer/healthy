module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Vision Camera v4 frame processors compile through worklets-core.
      'react-native-worklets-core/plugin',
      // Reanimated 4 / worklets plugin must be listed LAST.
      'react-native-reanimated/plugin',
    ],
  };
};
