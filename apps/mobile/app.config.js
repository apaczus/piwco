// The web version for GitHub Pages (npm run build:web) lives under /piwco/app/, so only that build gets a base URL.
// Phones (Expo Go through Metro) keep app.json as it is.
module.exports = ({ config }) =>
  process.env.PIWCO_WEB === "1" ? { ...config, experiments: { ...config.experiments, baseUrl: "/piwco/app" } } : config;
