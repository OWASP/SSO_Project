#!/bin/bash
export MSYS_NO_PATHCONV=1 # win git bash workaround

if [ ! -f ../keys/server_key.pem ]; then
    echo "Server key not found, generating for $1..."
	
	openssl req -x509 -newkey rsa:4096 -keyout keys/server_key.pem -out keys/server_cert.pem -nodes -days 1825 -subj "/CN=$1/O=OWASP Europe VZW/OU=SSO_Project/emailAddress=JamesCullum@users.noreply.github.com/L=B-9660/ST=Opbrakel/C=BE"
fi