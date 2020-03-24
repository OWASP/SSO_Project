import Vue from "vue";

import { ValidationProvider, ValidationObserver, extend } from "vee-validate";
import {
	required,
	email,
	regex,
	numeric,
	min,
	max,
	confirmed
} from "vee-validate/dist/rules";

extend("email", email);
extend("required", required);
extend("regex", regex);
extend("numeric", numeric);
extend("min", min);
extend("max", max);
extend("confirmed", confirmed);
Vue.component("ValidationProvider", ValidationProvider);
Vue.component("ValidationObserver", ValidationObserver);
