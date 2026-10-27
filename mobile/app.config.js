// The web build is published under the website, e.g. https://<user>.github.io/<repo>/app/.
// CI passes EXPO_BASE_URL (derived from the repository name or custom domain) and,
// for Android builds, APP_BUILD_NUMBER so each APK installs as an update of the previous one.
module.exports = ({ config }) => ({
  ...config,
  android: {
    ...config.android,
    versionCode: Number(process.env.APP_BUILD_NUMBER) || 1,
  },
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? '/home-herose/app',
  },
});
