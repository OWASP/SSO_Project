#!/usr/bin/env bash

echo "Checking environment"
CHECKIP=$(getent hosts database)
if [ -z "$CHECKIP" ]; then
	echo "Production environment detected, not waiting on database"
else
	echo "Dev environment detected, waiting on database"
	/app/wait-for-it.sh database:3306 -t 600
fi

echo "Starting test"
npm run serve