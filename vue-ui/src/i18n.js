import Vue from "vue";
import VueI18n from "vue-i18n";

Vue.use(VueI18n);

function loadLocaleMessages() {
	const locales = require.context(
		"./locales",
		true,
		/[A-Za-z0-9-_,\s]+\.json$/i
	);
	const messages = {};
	locales.keys().forEach(key => {
		const matched = key.match(/(([a-z]+)-[A-Z]+)\./i);
		if (matched && matched.length > 1) {
			const locale = locales(key);
			
			messages[matched[1]] = locale;
			messages[matched[2]] = locale;
		}
	});
	return messages;
}

export default new VueI18n({
	locale: navigator.language || process.env.VUE_APP_I18N_LOCALE || "en",
	fallbackLocale: process.env.VUE_APP_I18N_FALLBACK_LOCALE || "en",
	messages: loadLocaleMessages(),
});
