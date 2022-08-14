#!/bin/bash
DIR=`dirname $0`
SCRIPT=`basename $0 | tr abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ`
APP=$DIR/..
set -e

VERSION=`node $DIR/version.cjs`
echo "<template>$VERSION</template>" | tee $APP/src/components/Version.vue
