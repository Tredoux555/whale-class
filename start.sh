#!/bin/sh
# Start Next.js on the port specified by Railway (or default to 3000)
exec ./node_modules/.bin/next start -p ${PORT:-3000}
