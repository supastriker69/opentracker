#!/bin/sh
# Builds the SFINCS flood model program (Deltares, GPL-3.0) from a fixed, reviewed revision, so every machine and
# every CI run uses the same model code. Needs: git, gfortran, autotools, libnetcdff-dev (Ubuntu/Debian:
#   sudo apt-get install -y git gfortran autoconf automake libtool make libnetcdff-dev).
# Usage: sh modelling/build_sfincs.sh [prefix]     (default prefix: modelling/.sfincs)
# Then:  SFINCS_BIN=<prefix>/bin/sfincs python -m opentracker_model accra
set -eu

SFINCS_REPO=https://github.com/Deltares/SFINCS.git
SFINCS_COMMIT=f867835ee5efcda64d6e7f5112c91f637caca6c7   # main on 2026-10-12; change only after re-running the model tests

here=$(cd "$(dirname "$0")" && pwd)
prefix=${1:-$here/.sfincs}
case $prefix in /*) ;; *) prefix=$(pwd)/$prefix ;; esac

if [ -x "$prefix/bin/sfincs" ] && [ "$(cat "$prefix/REVISION" 2>/dev/null)" = "$SFINCS_COMMIT" ]; then
    echo "SFINCS $SFINCS_COMMIT is already built at $prefix/bin/sfincs"
    exit 0
fi

src=$(mktemp -d)
trap 'rm -rf "$src"' EXIT
git -C "$src" init -q
git -C "$src" fetch -q --depth 1 "$SFINCS_REPO" "$SFINCS_COMMIT"
git -C "$src" checkout -q FETCH_HEAD
test "$(git -C "$src" rev-parse HEAD)" = "$SFINCS_COMMIT"

cd "$src/source"
autoreconf -fi >/dev/null 2>&1
flags="-fopenmp -O3 -fallow-argument-mismatch -w"
./configure -q FC=gfortran FCFLAGS="$flags" FFLAGS="$flags" --disable-shared --prefix="$prefix"
make -s >/dev/null   # one job at a time: the Fortran modules must compile in order
make -s install >/dev/null
echo "$SFINCS_COMMIT" > "$prefix/REVISION"
"$prefix/bin/sfincs" </dev/null 2>&1 | grep -q "Welcome to SFINCS"
echo "Built SFINCS $SFINCS_COMMIT at $prefix/bin/sfincs"
