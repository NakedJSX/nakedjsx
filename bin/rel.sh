#!/bin/bash
cd "$(dirname "$0")/.."
set -o errexit
set -o nounset

# Something like 0.x.y or 0.x.y-test.z
VERSION="$1"
# latest, test, dev, etc
NPM_TAG="$2"

TEMP_PKG="$(mktemp)"

OTHER_PACKAGES=(../plugin-asset-image ../plugin-asset-prism ../plugin-asset-mdx ../core)

check_package() {
	echo "Checking @nakedjsx/$(basename $(pwd)) ..."
	if [[ ! -z $(git status -s . -- ':!bin/rel.sh') ]] || [ "$(git branch --show-current)" != "main" ]
	then
		git status -s
		echo "Not clean or not on main, aborting"
		exit 1
	fi
}

package_json_remove_dev() {
	TEMP_PKG=$(mktemp)
	jq "del(.packageManager, .resolutions)" < package.json > "$TEMP_PKG"
	mv "$TEMP_PKG" package.json
}

package_json_update_version() {
	TEMP_PKG=$(mktemp)
	jq ".version=\"$VERSION\" |
			if .dependencies? then
				.dependencies |= with_entries(select(.key | startswith(\"@nakedjsx/\")).value = \"$VERSION\")
			else
				.
			end
		" < package.json > "$TEMP_PKG"
	mv "$TEMP_PKG" package.json
}

commit_updated_package() {
	git add package.json
	TAG="v$VERSION"
	git commit -m "$TAG"
	git tag "$TAG"
	git push origin
	git push origin "$TAG"
}

rm -rf node_modules .yarn* .pnp.* yarn.lock package-lock.json
git checkout npm-shrinkwrap.json

# Check that the other nakedjsx packages are clean
for package in ${OTHER_PACKAGES[*]}
do
	pushd "$package" >/dev/null
	package_json_remove_dev
	check_package
	popd >/dev/null
done

# Check that the nakedjsx dep package is clean
package_json_remove_dev
check_package

#
# ok, commit and tag
#

# First update the version for other nakedjsx packages
for package in ${OTHER_PACKAGES[*]}
do
	pushd "$package" >/dev/null
	package_json_update_version
	commit_updated_package
	popd >/dev/null
done

# now publish

for package in ${OTHER_PACKAGES[*]}
do
	pushd "$package" >/dev/null
	npm publish --tag $NPM_TAG
	popd >/dev/null
done

package_json_update_version
npm cache verify
npm install
npm shrinkwrap
git add npm-shrinkwrap.json
commit_updated_package

npm publish --tag $NPM_TAG
