module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-native-async-storage|@react-native-community/netinfo|expo(nent)?|@expo(nent)?/.*|react-native-get-random-values|uuid)/)'
  ],
};