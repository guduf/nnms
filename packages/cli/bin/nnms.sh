PKG_DIR=$(dirname $(dirname $(realpath "$0")))
node "$PKG_DIR/bundles/nnms-cli.cjs.js" $@
