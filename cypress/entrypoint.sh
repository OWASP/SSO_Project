#!/usr/bin/env bash
echo "Installing dependancies"
npm install

echo "Waiting on application to be ready"
/cypress/wait-for-it.sh frontend:443 -t 600

echo "Starting test"
if [ -z "$CYPRESS_RECORD_KEY" ]; then
	npm run cy:run
else
	npm run cy:run -- --record --key $CYPRESS_RECORD_KEY
fi