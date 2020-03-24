const fs = require("fs");

module.exports = {
	pluginOptions: {
		i18n: {
			locale: process.env.VUE_APP_I18N_LOCALE || "en",
			fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || "en",
			localeDir: "locales",
			enableInSFC: false,
		},
	},
	devServer: {
		allowedHosts: [
			"localhost",
		],
		https: {
			https: true,
		},
		public: "https://localhost:" + process.env.VUE_APP_PORT,
	},
};
