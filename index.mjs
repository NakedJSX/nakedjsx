#!/usr/bin/env node

//
// npx behaviour can be counterintuitive when a standalone package name 'nakedjsx' matches
// a 'bin' script within a dependency installed in a package around the current working
// directory.
//
// Running 'npx nakedjsx' in this case will run the 'nakedjsx' bin within the @nakedjsx/core dep.
// UNLESS you specify a version or tag, e.g. 'npx nakedjsx@latest' in which case the the standalone
// nakedjsx package (this one) will be invoked.
//
// Anyway, reign in the chaos by forwarding invocations of this script through to the bin script
// in @nakedjsx/core.
//
// In the event that 'npx nakedjsx' is from run outside of a package that does include the 
// @nakedjsx/core depenency, then the version of @nakedjsx/core bundled with 'npx nakedjsx'
// will detect and forward the invocation to the version that the project has installed.
// TODO: This forwarding mechanism should be migrated into this script.
//

import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

//
// If our package.json currently contains "resolutions",
// then we're likely under development and 'yarn link' has
// been used to connect plugins.
//
// By passing these to @nakedjsx/core, build-time imports
// can use the real paths to plugins which results in being
// able to set working breakpoints within.
//

const npxNakedJsxPackageInfo = JSON.parse(fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'package.json')));
if (npxNakedJsxPackageInfo.resolutions)
{
    for (const [key, value] of Object.entries(npxNakedJsxPackageInfo.resolutions))
    {
        if (!value.startsWith('portal:'))
            continue;

        const packageFilepath   = path.join(value.replace(/^portal:/, ''), 'package.json');
        const packageResolve    = createRequire(pathToFileURL(packageFilepath)).resolve;
        const packageInfo       = JSON.parse(fs.readFileSync(packageFilepath));

        if (packageInfo.exports)
        {
            //
            // We need to create an override for each of the exports
            //

            for (const [name, file] of Object.entries(packageInfo.exports))
            {
                const fullImport = path.join(key, name);
                process.argv.push(
                    '--import-resolve-override',
                    fullImport,
                    packageResolve(fullImport)
                    );
            }
        }
    }
}

// This import is a self-executing bin script like this one, just need to import it.
await import('@nakedjsx/core/cli-bin');
