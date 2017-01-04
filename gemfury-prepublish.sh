#!/usr/bin/env bash

echo "Building project.."
npm start
echo "Done."

echo "Setting npm registry to GemFury.."
npm config set registry https://npm-proxy.fury.io/sayhi-ai/
echo "Done."

echo "Logging in.."
#npm adduser
echo "Done."
