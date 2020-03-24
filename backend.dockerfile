# Build files
FROM node:lts as build-stage
WORKDIR /app

# Packages first for caching
COPY js-backend/package.json /app/package.json
RUN npm install

# Now application
COPY js-backend /app

# Run JS from alpine image
FROM node:lts-alpine as production-stage
RUN apk update && apk add bash openssl && \
	mkdir -p /app/keys && \
	touch /app/keys/bundled-ca.pem
WORKDIR /app
COPY --from=build-stage /app /app

EXPOSE 3000
CMD ["npm", "run", "serve"]