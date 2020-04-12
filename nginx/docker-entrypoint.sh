#!/bin/sh

if [ -z "$DOMAIN" ]; then
	echo "Domain not set, using localhost"
	DOMAIN = "localhost"
fi

echo "Replace environment variables for $DOMAIN"
envsubst '${DOMAIN}' < /etc/nginx/conf.d/default.template > /etc/nginx/conf.d/default.conf

echo "Check default certificates"
if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
	echo "Certificates exist"
else
	echo "Certificates don't exist, using snake oil"
	mkdir -p /etc/letsencrypt/live/$DOMAIN
	#ls -l /etc/letsencrypt
	cp /etc/nginx/crypto/snake-fullchain.pem /etc/letsencrypt/live/$DOMAIN/fullchain.pem
	cp /etc/nginx/crypto/snake-privkey.pem /etc/letsencrypt/live/$DOMAIN/privkey.pem
	#ls -l /etc/letsencrypt/live/$DOMAIN
fi

echo "Start nginx"
while true; do sleep 6h; nginx -s reload; done & nginx -g "daemon off;"