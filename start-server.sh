#!/bin/bash
set -e

cd "$(dirname "$0")"
export PATH="$PWD/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

exec /opt/homebrew/bin/node server.js
