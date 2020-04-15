# Build files
FROM node:lts as build-stage
WORKDIR /app

# Packages first for caching
COPY vue-ui/package.json /app/package.json
RUN npm install

# Now application
COPY vue-ui /app
RUN npm run build

# Prepare crypto components
RUN mkdir -p /crypto && \
	curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > /crypto/options-ssl-nginx.conf && \
	curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > /crypto/ssl-dhparams.pem && \
	openssl req -x509 -nodes -newkey rsa:1024 -days 7 -keyout '/crypto/snake-privkey.pem' -out '/crypto/snake-fullchain.pem' -subj '/CN=localhost' && \
	touch /crypto/ca.pem

# Run files from webserver
FROM nginx:stable-alpine as production-stage
RUN mkdir -p /etc/letsencrypt/live

COPY nginx/default.conf /etc/nginx/conf.d/default.template
COPY --from=build-stage /crypto /etc/nginx/crypto

COPY nginx/docker-entrypoint.sh /etc/nginx/docker-entrypoint.sh
RUN chmod 777 /etc/nginx/docker-entrypoint.sh
COPY nginx/security.txt /app/owasp_sso/.well-known/security.txt
COPY --from=build-stage /app/dist /app/owasp_sso

CMD ["/etc/nginx/docker-entrypoint.sh"]