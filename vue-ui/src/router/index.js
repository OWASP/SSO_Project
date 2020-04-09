import Vue from "vue";
import VueRouter from "vue-router";
import i18n from "../i18n";

const Register = () => import("@/views/register.vue");
const TwoFactorAuth = () => import("@/views/two-factor-auth.vue");
const FlowIn = () => import("@/views/flow-in.vue");

Vue.use(VueRouter);

const routes = [
	{
		path: "/",
		name: "login",
		component: () => import("@/views/login.vue"),
		meta: {
			title: i18n.t("router.login"),
		},
	},
	{
		path: "/register",
		name: "register",
		component: Register,
		meta: {
			title: i18n.t("router.register"),
		},
	},
	{
		path: "/register/:token",
		name: "register-confirm",
		component: Register,
		meta: {
			title: i18n.t("router.register"),
		},
	},
	{
		path: "/reset-password",
		name: "reset-password",
		component: () => import("@/views/reset-password.vue"),
		meta: {
			title: i18n.t("router.reset-password"),
		},
	},
	{
		path: "/change-password/:token",
		name: "change-password",
		component: () => import("@/views/change-password.vue"),
		meta: {
			title: i18n.t("router.change-password"),
		},
	},
	{
		path: "/two-factor",
		name: "two-factor",
		component: TwoFactorAuth,
		meta: {
			title: i18n.t("router.confirm"),
		},
	},
	{
		path: "/two-factor/:token",
		name: "two-factor-email-confirm",
		component: TwoFactorAuth,
		meta: {
			title: i18n.t("router.confirm"),
		},
		beforeEnter: (to, from, next) => {
			if(from.name == "two-factor") {
				// Change from /two-factor to /two-factor/:id will not reload the component
				// and there is no good way to just have the mounted hook re-run - ideas welcome
				window.location.reload();
				return;
			}
			
			next();
		},
	},
	{
		path: "/audit",
		name: "audit",
		component: () => import("@/views/audit.vue"),
		meta: {
			title: i18n.t("router.review"),
		},
	},
	{
		path: "/in/:id/:data",
		name: "flow-in-signed",
		component: FlowIn,
		meta: {
			title: i18n.t("general.loading"),
		},
	},
	{
		path: "/in/:id",
		name: "flow-in",
		component: FlowIn,
		meta: {
			title: i18n.t("general.loading"),
		},
	},
	{
		path: "/about",
		name: "about",
		component: () => import("@/views/about.vue"),
		meta: {
			title: i18n.t("router.about"),
		},
	},
];

const router = new VueRouter({
	routes,
});

router.beforeEach((to, from, next) => {
	document.title = to.meta.title;
	next();
});

export default router;
