# OWASP Single Sign-On [![OWASP Incubator](https://img.shields.io/badge/owasp-incubator%20project-fe7d37.svg)](https://owasp.org/projects/) [![GitHub release](https://img.shields.io/github/v/release/OWASP/SSO_Project.svg)](https://github.com/OWASP/SSO_Project/releases/latest) [![Subreddit subscribers](https://img.shields.io/reddit/subreddit-subscribers/owasp_sso?style=social)](https://reddit.com/r/owasp_sso)

[![Build Status](https://travis-ci.com/OWASP/SSO_Project.svg?branch=master)](https://travis-ci.com/OWASP/SSO_Project)
[![Maintainability](https://api.codeclimate.com/v1/badges/ed0dcb586f3143886687/maintainability)](https://codeclimate.com/github/OWASP/SSO_Project/maintainability)
[![Test Coverage](https://api.codeclimate.com/v1/badges/ed0dcb586f3143886687/test_coverage)](https://codeclimate.com/github/OWASP/SSO_Project/test_coverage)
[![Code Climate technical debt](https://img.shields.io/codeclimate/tech-debt/OWASP/SSO_Project)](https://codeclimate.com/github/OWASP/SSO_Project/trends/technical_debt)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-v2.0%20adopted-ff69b4.svg)](CODE_OF_CONDUCT.md)

OWASP SSO is a javascript application that allows a secure-by-default self-hosted SSO experience, 
including phishing-proof two-factor authentication, using state-of-the-art security mechanisms.

For a detailed introduction, full list of features and architecture
overview please visit the official project page:
<https://owasp.org/www-project-sso/>

### From Sources ![GitHub repo size](https://img.shields.io/github/repo-size/OWASP/SSO_Project.svg)

1. Install [node.js](#nodejs-version-compatibility)
2. Run `git clone https://github.com/OWASP/SSO_Project.git` (or
   clone [your own fork](https://github.com/OWASP/SSO_Project/fork)
   of the repository)

#### Set up backend

1. Go into the cloned folder with `cd SSO_Project`
2. Go into the backend folder with `cd js-backend` folder
3. Run `npm install` to set it up the first time
4. Edit the `.env` file and set all mandatory environment variables, especially your MariaDB database and SMTP server.
You can use your email account like [Gmail](https://www.hostinger.com/tutorials/how-to-use-free-google-smtp-server) for testing.
5. If you are on an operating system without the bash shell, you need to install it and add it to the PATH.
For Windows, install [Git](https://git-scm.com/download/win) and add the `bash.exe` to your PATH environment variable.
You will need to restart the command line in such case
6. Generate certificates by running `bash scripts/setup.bash "OWASP SSO"`. For Windows, use `\` instead of `/` and you can put another name instead of `OWASP SSO` for branding
7. Run `npm run serve` to run the backend - it is now available at <https://localhost:3000>
8. Visit the page once to accept the certificate warning in your browser

#### Set up frontend

1. Open a new console and go into the cloned folder with `SSO_Project`
2. Go into the frontend folder with `cd vue-ui` folder
3. Run `npm install` to set it up the first time
4. Run `npm run serve` to start a development server
5. Open <https://localhost:8080> in your browser to use the application

### Docker Container

#### Backend [![Docker Automated build](https://img.shields.io/docker/automated/owaspsso/js-backend.svg)](https://hub.docker.com/r/owaspsso/js-backend) [![Docker Pulls](https://img.shields.io/docker/pulls/owaspsso/js-backend.svg)](https://hub.docker.com/r/owaspsso/js-backend) ![Docker Stars](https://img.shields.io/docker/stars/owaspsso/js-backend.svg) [![Docker size](https://images.microbadger.com/badges/image/owaspsso/js-backend.svg)](https://microbadger.com/images/owaspsso/js-backend) [![Docker Version](https://images.microbadger.com/badges/version/owaspsso/js-backend.svg)](https://microbadger.com/images/owaspsso/js-backend)

#### Frontend [![Docker Automated build](https://img.shields.io/docker/automated/owaspsso/vue-ui.svg)](https://hub.docker.com/r/owaspsso/vue-ui) [![Docker Pulls](https://img.shields.io/docker/pulls/owaspsso/vue-ui.svg)](https://hub.docker.com/r/owaspsso/vue-ui) ![Docker Stars](https://img.shields.io/docker/stars/owaspsso/vue-ui.svg) [![Docker size](https://images.microbadger.com/badges/image/owaspsso/vue-ui.svg)](https://microbadger.com/images/owaspsso/vue-ui) [![Docker Version](https://images.microbadger.com/badges/version/owaspsso/vue-ui.svg)](https://microbadger.com/images/owaspsso/vue-ui)

You can use the `docker-compose.yml` file to start a test environment via `docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build`
and a production-ready environment via `docker-compose -f docker-compose.yml up --build`.
This environment requires to set the environment variables for all external services.

## Customization

Most changes to the application can be done by modifying the `.env` files or providing environment variables to the components,
as existing environment variables are not overwritten.

In `js-backend/websites.json` you can configure your own websites for SSO.
Below you find a sample configuration.

```javascript
{
	"default": { // Default behavior of the website, if no SSO flow is used
		"branding": { // Allows branding the login page
			"backgroundColor": "#f7f9fb", // Page background color
			"fontColor": "#888", // Color of the text below the login box
			"legalName": "OWASP Foundation", // Legal name displayed below the login box
			"privacyPolicy": "https://owasp.org/www-policy/operational/privacy", // Link to privacy policy, mandatory
			"imprint": "https://owasp.org/contact/", // Link to legal imprint, optional
			"logo": "https://owasp.org/assets/images/logo.png" // Link to logo
		},
		"syslog": { // Configure a syslog server that will receive audit logs in CEF format, optional
			"target": "default-siem", // IP or hostname
			"protocol": "tcp" // Protocol
			// Check out all parameters at https://cyamato.github.io/SyslogPro/module-SyslogPro-Syslog.html
		}
	},
	"1": { // ID of the website
		"jwt": "hello-world", // JWT secret for authentication flow
		"signedRequestsOnly": false, // If set to true, only signed login requests are allowed
		"name": "E Corp", // Short name of the company
		"redirect": "https://postman-echo.com/post", // URL to redirect to
		"branding": { // Allows branding the login page
			"backgroundColor": "#fff", // Page background color
			"fontColor": "#254799", // Color of the text below the login box
			"legalName": "E Corp", // Legal name displayed below the login box
			"privacyPolicy": "https://www.nbcuniversal.com/privacy", // Link to privacy policy, mandatory
			"imprint": "https://www.e-corp-usa.com/about.html", // Link to legal imprint, optional
			"logo": "https://www.e-corp-usa.com/images/e-corp-logo-blue.png" // Link to logo
		},
		"certificates": [{ // Allow external certificate authorities, optional
			"authorities": ["e-corp.ca.pem"], // List of CA files in js-backend/keys/ca folder to be used for this webhook
			"webhook": { // Webhook settings. If not set, matching with a custom CA passes authentication
				"url": "https://postman-echo.com/post", // URL for the server to contact for verification
				"successContains": "94:0B:DE:AD:BB:80:10:BD:17:C1:48:B4:5A:B2:66:3C:B5:75:DE:7B:89:37:65:D3:60:FF:B0:09:26:27:B2:91", // If the webhook return contains this text, pass the check
				"successRegex": "/test/" // If the webhook return matches this regex, pass the check
			}
		}]
	}
}
```

## Login flow

The OWASP SSO supports two login flows.

### SAML flow

Simply redirect the user using SAML GET/POST parameters to `https://example.com/#/in/saml`.
You need to provide a `destination` parameter. This host will be matched against the host of websites `redirect` parameter.
If one is found, this branding will be used and the user will be on checkout redirected to the URL you specified in the `destination` parameter.

### JWT flow

The JWT flow is intended to allow both a simple integration and advanced use cases.

For an unauthenticated JWT login request, the user can simply be redirected to `https://example.com/#/in/1`, where `1` is a placeholder for the website ID.
This is the easiest way to integrate OWASP SSO into a custom application.

For an authenticated JWT login request, you need to create a JWT token using the shared JWT secret.
The token has the following requirements:

1. Maximum validity of five minutes
2. Audience needs to match the hostname of the deployed SSO page
3. Issuer needs to match the configured pages shortname

If you specify an email address as `Subject`, the user will be automatically logged in (missing the second factor) with this address.
If no user with this email address exists, it will be registered.

The authenticated user flow is intended for cases where you want to manage users internally and only delegate for MFA requests to OWASP SSO.

In both cases, the user will be redirected to the configured `redirect` URL with a short-lived JWT token.

## Demo

A demo will be provided in the future.

> This is a deployment-test and sneak-peek instance only! You are __not
> supposed__ to use this instance for your own hacking endeavours! No
> guaranteed uptime! Guaranteed stern looks if you break it!

## Node.js version compatibility

OWASP SSO officially supports the [node.js](http://nodejs.org) in line with the
official [node.js LTS schedule](https://github.com/nodejs/LTS).
Docker images and packaged distributions are offered accordingly.

## Troubleshooting [![Subreddit subscribers](https://img.shields.io/reddit/subreddit-subscribers/owasp_sso?style=social)](https://reddit.com/r/owasp_sso)

If you need support to set up the application or customize it for you needs,
please post your specific problem and question in the [subreddit](https://reddit.com/r/owasp_sso) 
where community members can best try to help you.

:stop_sign: **Please avoid opening GitHub issues for support requests or
questions!**

## Contributing [![GitHub contributors](https://img.shields.io/github/contributors/OWASP/SSO_Project.svg)](https://github.com/OWASP/SSO_Project/graphs/contributors) [![Crowdin](https://badges.crowdin.net/owasp-single-sign-on/localized.svg)](https://crowdin.com/project/owasp-single-sign-on) ![GitHub issues by-label](https://img.shields.io/github/issues/OWASP/SSO_Project/help%20wanted.svg) ![GitHub issues by-label](https://img.shields.io/github/issues/OWASP/SSO_Project/good%20first%20issue.svg)

We are always happy to get new contributors on board! Please check
[CONTRIBUTING.md](CONTRIBUTING.md) to learn how to
[contribute to our codebase](CONTRIBUTING.md#code-contributions) or the
[translation into different languages](CONTRIBUTING.md#i18n-contributions)!

## References

Did you write a blog post, magazine article or do a podcast about or
mentioning OWASP Single Sign-On? Or maybe you held or joined a conference
talk or meetup session, a hacking workshop or public training where this
project was mentioned?

Add it to our ever-growing list of [REFERENCES.md](REFERENCES.md) by
forking and opening a Pull Request!

## Donations [![](https://img.shields.io/badge/support-OWASP%20SSO-blue)](https://owasp.org/donate?reponame=www-project-sso&title=OWASP+Single+Sign-On)

The OWASP Foundation gratefully accepts donations via Stripe. Projects
such as Single Sign-On can then request reimbursement for expenses from the
Foundation. If you'd like to express your support of the SSO
project, please make sure to tick the "Publicly list me as a supporter
of OWASP SSO" checkbox on the donation form. You can find our
more about donations and how they are used [here](https://owasp.org/donate/?reponame=www-project-sso&title=OWASP+Single+Sign-On).

## Contributors

The OWASP SSO core project team are:

- [@JamesCullum](https://github.com/JamesCullum)

For a list of all contributors to the OWASP SSO please visit our
[Contributor list](https://github.com/OWASP/SSO_Project/graphs/contributors).

All special mentions are included in the application at `/#/about`.

## Licensing [![license](https://img.shields.io/github/license/OWASP/SSO_Project.svg)](https://github.com/OWASP/SSO_Project/blob/master/LICENSE)

This program is free software: You can redistribute it and/or modify it
under the terms of the
[GPL License](https://github.com/OWASP/SSO_Project/blob/master/LICENSE).
