import Vue from "vue";
import VueRouter from "vue-router";

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
			title: "Login",
		},
	},
	{
		path: "/register",
		name: "register",
		component: Register,
		meta: {
			title: "Register",
		},
	},
	{
		path: "/register/:token",
		name: "register-confirm",
		component: Register,
		meta: {
			title: "Register",
		},
	},
	{
		path: "/reset-password",
		name: "reset-password",
		component: () => import("@/views/reset-password.vue"),
		meta: {
			title: "Reset password",
		},
	},
	{
		path: "/change-password/:token",
		name: "change-password",
		component: () => import("@/views/change-password.vue"),
		meta: {
			title: "Change password",
		},
	},
	{
		path: "/two-factor",
		name: "two-factor",
		component: TwoFactorAuth,
		meta: {
			title: "Confirm your identity",
		},
	},
	{
		path: "/two-factor/:token",
		name: "two-factor-email-confirm",
		component: TwoFactorAuth,
		meta: {
			title: "Confirm your identity",
		},
	},
	{
		path: "/audit",
		name: "audit",
		component: () => import("@/views/audit.vue"),
		meta: {
			title: "Review Activity",
		},
	},
	{
		path: "/in/:id/:data",
		name: "flow-in-signed",
		component: FlowIn,
		meta: {
			title: "Loading...",
		},
	},
	{
		path: "/in/:id",
		name: "flow-in",
		component: FlowIn,
		meta: {
			title: "Loading...",
		},
	},
	{
		path: "/about",
		name: "about",
		component: () => import("@/views/about.vue"),
		meta: {
			title: "About",
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
