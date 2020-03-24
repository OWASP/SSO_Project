#!/bin/sh

if [ -n "$DOMAIN" ]; then
	echo "Check default certificates"
	if [ -e "/etc/letsencrypt/live/$DOMAIN/chain.pem" ]; then
		echo "Certificates exist"
	else
		echo "Certificates don't exist, create one"
		rm -rf /etc/letsencrypt/live/$DOMAIN
		
		CERTBOTPARAMS=""
		if [ -n "$STAGING" ]; then
			echo "Using staging"
			CERTBOTPARAMS="--staging"
		fi
		
		if [ -n "$EMAIL" ]; then
			echo "Using own email"
			CERTBOTPARAMS="$CERTBOTPARAMS -m $EMAIL"
		else 
			echo "Using no email"
			CERTBOTPARAMS="$CERTBOTPARAMS --register-unsafely-without-email"
		fi
		
		certbot certonly --webroot -w /var/www/certbot $CERTBOTPARAMS -d $DOMAIN --rsa-key-size 4096 --agree-tos
	fi
else
	echo "No domain has been set"
fi

echo "Start certbot"
while true; do sleep 12h; certbot renew; done;