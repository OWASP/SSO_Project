# Contributing [![GitHub contributors](https://img.shields.io/github/contributors/OWASP/SSO_Project.svg)](https://github.com/OWASP/SSO_Project/graphs/contributors)

![GitHub issues by-label](https://img.shields.io/github/issues/OWASP/SSO_Project/help%20wanted.svg)
![GitHub issues by-label](https://img.shields.io/github/issues/OWASP/SSO_Project/good%20first%20issue.svg)

## Code Contributions

The minimum requirements for code contributions are:

1. The code _must_ be compliant with the lint settings within each components `package.json` file.
You can check if your code is compliant by running `npm run lint`.
To fix most issues automatically, you can use `npm run lint:fix`.
2. All new and changed code _should_ have a corresponding unit and/or
   integration test.
3. Bigger changes _must_ have a corresponding e2e test.
4. Linting, as well as all unit, integration and e2e tests _should_ pass
   locally before opening a Pull Request.
5. All commits to the library must follow the [Developer Certificate of Origin](https://developercertificate.org/).

## I18N Contributions

The `vue-ui` component needs translation support!
The views and components need to be converted to the i18n syntax and correct entries in the `vue-ui/locales` need to be created.
