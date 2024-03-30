#!/bin/bash
cd "$(dirname "$0")/.."
set -o errexit
set -o nounset

VERSION="$1"
NPM_TAG="$2"
TEMP_PKG="$(mktemp)"

OTHER_PACKAGES=(../plugin-asset-image ../plugin-asset-prism ../plugin-asset-mdx ../core)

check_package() {
	echo "Checking @nakedjsx/$(basename $(pwd)) ..."
	if [[ ! -z $(git status -s . -- ':!rel.sh') ]] || [ "$(git branch --show-current)" != "main" ]
	then
		git status -s
		echo "Not clean or not on main, aborting"
		exit 1
	fi
}

update_package_json() {
	TEMP_PKG=$(mktemp)
	jq "del(.packageManager, .resolutions) |
			.version=\"$VERSION\" |
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
	check_package
	popd >/dev/null
done

# Check that the nakedjsx dep package is clean
check_package

#
# ok, commit and tag
#

# First update the version for other nakedjsx packages
for package in ${OTHER_PACKAGES[*]}
do
	pushd "$package" >/dev/null
	update_package_json
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

update_package_json
npm cache verify
npm install
npm shrinkwrap
git add npm-shrinkwrap.json
commit_updated_package

npm publish --tag $NPM_TAG
