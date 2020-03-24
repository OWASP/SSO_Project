#!/bin/bash
export MSYS_NO_PATHCONV=1 # win git bash workaround

TMPID=tmp/$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
TIMESTAMP=$(date +%s%N)
CACRT=keys/server_cert.pem
CAKEY=keys/server_key.pem

openssl req -newkey rsa:4096 -keyout $TMPID.key -out $TMPID.csr -nodes -subj "/CN=$1/emailAddress=$2" >/dev/null 2>&1
openssl x509 -req -in $TMPID.csr -CA $CACRT -CAkey $CAKEY -out $TMPID.crt -set_serial $TIMESTAMP -days 1095 -extfile scripts/v3.ext >/dev/null 2>&1
FINGERPRINT=$(openssl x509 -in $TMPID.crt -noout -sha256 -fingerprint | cut -c 20-)
cat $CACRT >> $TMPID.crt
openssl pkcs12 -export -in $TMPID.crt -inkey $TMPID.key -out $TMPID.p12 -passout pass: >/dev/null 2>&1
rm $TMPID.key $TMPID.csr $TMPID.crt >/dev/null
echo -e "{\"file\":\"$TMPID.p12\", \"fingerprint256\":\"$FINGERPRINT\"}"