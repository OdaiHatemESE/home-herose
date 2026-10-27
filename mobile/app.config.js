// The web build is published under the website, e.g. https://<user>.github.io/<repo>/app/.
// CI passes EXPO_BASE_URL (derived from the repository name or custom domain).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL ?? '/home-herose/app',
  },
});
