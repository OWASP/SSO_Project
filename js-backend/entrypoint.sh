#!/usr/bin/env bash

echo "Waiting on database to be ready"
/app/wait-for-it.sh database:3306 -t 600

echo "Starting test"
npm run serve