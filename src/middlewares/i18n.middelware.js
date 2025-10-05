const i18n = require("i18next");
const Backend = require("i18next-fs-backend");
const path = require("path");

i18n.use(Backend).init({
  lng: "vi", 
  fallbackLng: "vi",
  backend: {
    loadPath: path.join(__dirname, "../i18n/i18n.json")
  },
  interpolation: {
    escapeValue: false 
  }
});

module.exports = i18n;
