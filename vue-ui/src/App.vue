<template>
	<div id="app">
		<svg
			aria-hidden="true"
			version="1.1"
			xmlns="http://www.w3.org/2000/svg"
			xmlns:xlink="http://www.w3.org/1999/xlink"
		>
			<defs>
				<symbol
					id="icon-envelope"
					viewBox="0 0 28 28"
				>
					<credit>"envelope" by Dave Gandy (FontAwesome - fontawesome.com)</credit>
					<path
						d="M28 11.094v12.406c0 1.375-1.125 2.5-2.5 2.5h-23c-1.375 0-2.5-1.125-2.5-2.5v-12.406c0.469 0.516 1 0.969 1.578 1.359 2.594 1.766 5.219 3.531 7.766 5.391 1.313 0.969 2.938 2.156 4.641 2.156h0.031c1.703 0 3.328-1.188 4.641-2.156 2.547-1.844 5.172-3.625 7.781-5.391 0.562-0.391 1.094-0.844 1.563-1.359zM28 6.5c0 1.75-1.297 3.328-2.672 4.281-2.438 1.687-4.891 3.375-7.313 5.078-1.016 0.703-2.734 2.141-4 2.141h-0.031c-1.266 0-2.984-1.437-4-2.141-2.422-1.703-4.875-3.391-7.297-5.078-1.109-0.75-2.688-2.516-2.688-3.938 0-1.531 0.828-2.844 2.5-2.844h23c1.359 0 2.5 1.125 2.5 2.5z"
					/>
				</symbol>
				<symbol
					id="icon-fidoalliance"
					viewBox="0 0 32 32"
				>
					<credit>"fidoalliance" by simpleicons.org</credit>
					<path
						d="M10.465 10.017c-0.799 0-1.447 0.648-1.447 1.447s0.648 1.447 1.447 1.447c0.799 0 1.446-0.647 1.447-1.445v-0.001c0-0.799-0.648-1.447-1.447-1.447zM6.589 14.071v1.891h2.597v6.391h0.939v-3.632h0.679v3.632h0.947v-8.281zM18.829 14.785h-0.029c-0.383-0.555-1.149-0.936-2.185-0.936-1.985 0-3.729 1.632-3.715 4.425 0 2.581 1.575 4.268 3.545 4.268 1.063 0 2.080-0.481 2.58-1.387l0.156 1.191h2.225v-12.145h-2.579zM18.829 18.657c0 0.211-0.016 0.417-0.045 0.62l0.003-0.023c-0.147 0.709-0.765 1.233-1.507 1.233h-0.017c-1.063 0-1.757-0.879-1.757-2.297 0-1.304 0.595-2.356 1.772-2.356 0.808 0 1.363 0.583 1.517 1.263 0.019 0.12 0.031 0.259 0.031 0.4l-0.001 0.072v-0.004zM6.403 11.853l0.633-2.133c-0.139-0.049-0.311-0.096-0.487-0.131l-0.025-0.004-0.025-0.004c-0.326-0.078-0.701-0.123-1.087-0.123-0.007 0-0.013 0-0.020 0h0.001c-0.003 0-0.006 0-0.009 0-0.512 0-1.007 0.078-1.472 0.221l0.035-0.009 0.036-0.009c-0.195 0.057-0.363 0.126-0.521 0.211l0.014-0.007 0.015-0.007c-0.34 0.173-0.631 0.384-0.884 0.634l0-0c-0.667 0.653-1.005 1.54-1.005 2.633v0.944h-1.604v1.891h1.599v6.391h2.561v-6.391h1.599v-1.888h-1.599v-1c-0.002-0.026-0.003-0.057-0.003-0.087 0-0.329 0.117-0.63 0.311-0.866l-0.002 0.002-0.001 0.003c0.027-0.029 0.054-0.056 0.083-0.082l0.001-0.001 0.001-0.001c0 0 0.552-0.547 1.853-0.187zM27.075 13.851c-2.68 0-4.436 1.715-4.436 4.409s1.857 4.283 4.284 4.283c2.219 0 4.368-1.387 4.368-4.436-0.003-2.499-1.689-4.256-4.216-4.256zM26.991 20.685c-1.109 0-1.701-1.063-1.701-2.495 0-1.22 0.481-2.481 1.701-2.481 1.161 0 1.645 1.248 1.645 2.468 0 1.516-0.643 2.509-1.645 2.508zM29.991 13.015h0.309v0.785h0.187v-0.785h0.308v-0.156h-0.804zM31.732 12.859l-0.243 0.673-0.241-0.673h-0.271v0.943h0.173v-0.761l0.264 0.761h0.151l0.26-0.761v0.761h0.173v-0.943z"
					/>
				</symbol>
			</defs>
		</svg>

		<section class="h-100 app-container">
			<div class="container h-100">
				<div class="row justify-content-md-center h-100">
					<div class="card-wrapper">
						<div
							class="brand"
							:class="{round: $root.ssoPage.branding.logoIsRound}"
						>
							<router-link
								to="/"
							>
								<img
									:src="$root.ssoPage.branding.logo"
									:alt="$root.ssoPage.branding.legalName + ' - Logo'"
								>
							</router-link>
						</div>
						<div class="card fat">
							<router-view></router-view>
						</div>
						<div
							class="footer"
							:style="{color: $root.ssoPage.branding.fontColor}"
						>
							{{ $root.ssoPage.branding.legalName }}<br>
							<a
								:href="$root.ssoPage.branding.privacyPolicy"
								target="_privacy"
								rel="noopener noreferrer"
								:style="{color: $root.ssoPage.branding.fontColor}"
							>Privacy</a> 
							<span v-if="$root.ssoPage.branding.imprint">
								&bull; 
								<a
									:href="$root.ssoPage.branding.imprint"
									target="_imprint"
									rel="noopener noreferrer"
									:style="{color: $root.ssoPage.branding.fontColor}"
								>Imprint</a>
							</span>
							&bull; 
							<router-link
								to="/about"
								:style="{color: $root.ssoPage.branding.fontColor}"
							>
								About
							</router-link>
						</div>
					</div>
				</div>
			</div>
		</section>
	</div>
</template>
<style>
html, body {
	height: 100%;
}

body {
	background-color: #f7f9fb;
	font-size: 14px;
}

.app-container .brand {
	width: 150px;
	margin: 40px auto;
	position: relative;
	z-index: 1;
	text-align: center;
}

.app-container .brand.round {
	height: 150px;
	overflow: hidden;
	border-radius: 50%;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

div.collapse {
	transition: all 0.3s ease;
}

div.collapse:not(.show) {
	display: block;
	max-height: 0;
	opacity: 0;
	overflow: hidden;
}

div.collapse.show {
	max-height: 100px;
	opacity: 1;
}

.app-container .brand img {
	max-width: 100%;
}

.app-container .card-wrapper {
	width: 400px;
}

.app-container .card {
	border-color: transparent;
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

.app-container .card.fat {
	padding: 10px;
}

.app-container .card .card-title {
	margin-bottom: 30px;
}

.app-container .form-control {
	border-width: 2.3px;
}

.app-container .form-group label {
	width: 100%;
}

.app-container .btn.btn-block {
	padding: 12px 10px;
}

.app-container .footer {
	margin: 40px 0;
	color: #888;
	text-align: center;
}

@media screen and (max-width: 425px) {
	.app-container .card-wrapper {
		width: 90%;
		margin: 0 auto;
	}
}

@media screen and (max-width: 320px) {
	.app-container .card.fat {
		padding: 0;
	}

	.app-container .card.fat .card-body {
		padding: 15px;
	}
}

svg {
	display: inline-block;
	width: 1em;
	height: 1em;
	stroke-width: 0;
	stroke: currentColor;
	fill: currentColor;
}

svg[aria-hidden], .hidden {
	position: absolute;
	width: 5px;
	height: 5px;
	top: -1000px;
	left: -1000px;
	overflow: hidden;
}

span.spinner-border-lg {
	width: 3rem;
	height: 3rem;
}
</style>
