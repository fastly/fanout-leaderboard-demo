#!/bin/bash

# Build client app
npm run build

# Copy template
rm -rf app.yaml
cp app.template.yaml app.yaml

# Replace placeholders
jq -r 'to_entries[] | "\(.key)=\(.value)"' secrets.json | while IFS='=' read -r key value; do
  escaped_value=$(printf '%s\n' "$value" | sed 's/[&/\]/\\&/g')
  sed -i '' "s|__${key}__|${escaped_value}|g" app.yaml
done

# Deploy
gcloud app deploy app.yaml -q --no-cache

# Clean up
rm app.yaml
