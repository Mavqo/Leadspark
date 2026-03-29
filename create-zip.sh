#!/bin/bash
zip -r leadspark-deploy.zip . -x "node_modules/*" ".git/*" "dist/*" ".astro/*"
echo "Creato leadspark-deploy.zip - pronto per upload su Vercel"
