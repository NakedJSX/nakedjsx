#!/usr/bin/env node

//
// If the destination root folder is part of a package
// that depends on @nakedjsx/core, then invoke that
// version's CLI directly. If not, then use the version
// of @nakedjsx/core installed as a dep of this npx tool.
//

import fs from 'node:fs';
import path from 'node:path';
import child_process from 'node:child_process';

import { main as bundledNakedJsxMain } from '@nakedjsx/core/cli';

export function log(message)
{
	console.log(message);
}

export function warn(message)
{
	console.warn(`\x1b[1mWARNING: ${message}\x1b[22m`);
}

export function err(message)
{
	console.error(`\x1b[1mERROR: ${message}\x1b[22m`);
}

function fatal(message, showUsage)
{
    err(message);
    if (showUsage)
        usage();
    process.exit(1);
}

function absolutePath(absoluteOrRelativePath)
{
	if (path.isAbsolute(absoluteOrRelativePath))
        return path.normalize(absoluteOrRelativePath);
    else
        return path.normalize(process.cwd() + path.sep + absoluteOrRelativePath);
}

function usage()
{
    log(
        `
    Usage:
    
        # Find and build NakedJSX pages in <pages-directory>
        npx nakedjsx <pages-directory> [options]
    
    All options will be passed through to the @nakedjsx/core nakedjsx bin -
    either the @nakedjsx/core installed around <pages-directory> or the one
    bundled with this tool if @nakedjsx/core is not installed.
`);
}

function determineRootDir(args)
{
    if (args < 1)
        fatal('<pages-directory> is required.', true);

    const rootDir = args.shift();

    if (rootDir === '--help')
    {
        options['--help'].impl();
        throw Error;
    }

    if (!fs.existsSync(rootDir))
        fatal(`Pages directory (${rootDir}) does not exist`);

    if (!fs.statSync(rootDir).isDirectory())
        fatal(`Pages directory (${rootDir}) exists but is not a directory`);

    log(`Pages directory is ${rootDir}`);

    return rootDir;
}

function findPackageJson(searchDir)
{
    searchDir = absolutePath(searchDir);

    while (searchDir)
    {
        const testFile = path.join(searchDir, 'package.json');
        if (fs.existsSync(testFile))
            return testFile;
        
        const nextSearchDir = path.normalize(path.join(searchDir, '..'));
        if (nextSearchDir === searchDir)
            return null;
        
        searchDir = nextSearchDir;
    }
}

function isDependencyOrDevDependency(packageFilePath, packageName)
{
    try
    {
        const pkg = JSON.parse(fs.readFileSync(packageFilePath));

        if (pkg.dependencies && pkg.dependencies[packageName])
            return true;

        if (pkg.devDependencies && pkg.devDependencies[packageName])
            return true;
    }
    catch(error)
    {
        warn(`Could not parse ${packageFilePath}`);
    }

    return false;
}

function useTargetNakedJSX(rootDir, packageFilePath)
{
    log(`Using NakedJSX from ${packageFilePath}`);

    const packageFileDir = path.dirname(packageFilePath);
    const nakedJsxArguments = process.argv.slice(2);

    let command;
    let commandArguments;

    if (fs.existsSync(path.join(packageFileDir, 'yarn.lock')))
    {
        log('yarn.lock detected, assuming yarn');

        command = 'yarn';
        commandArguments = ['nakedjsx'].concat(nakedJsxArguments);
    }
    else if (fs.existsSync(path.join(packageFileDir, 'pnpm-lock.yaml')))
    {
        log('pnpm-lock.yaml detected, assuming pnpm');

        command = 'pnpm';
        commandArguments = ['exec', 'nakedjsx'].concat(nakedJsxArguments);
    }
    else if (fs.existsSync(path.join(packageFileDir, 'package-lock.json')))
    {
        log('package-lock.json detected, assuming npm');

        command = 'npx';
        commandArguments = ['nakedjsx'].concat(nakedJsxArguments);
    }
    else
    {
        fatal('Target package mananger not detected (looked for yarn, pnpm, and npm)');
    }

    log(`Launching child process: ${command} ${commandArguments.join(' ')}`);

    child_process.spawn(
        command,
        commandArguments,
        {
            stdio: 'inherit',
            cwd: rootDir
        });
}

async function useBundledNakedJSX(rootDir)
{
    log(`NakedJSX not detected at ${rootDir}, using bundled version`);

    await bundledNakedJsxMain();
}

async function main()
{
    // [0] == node, [1] == this script
    const args = process.argv.slice(2);

    const rootDir = determineRootDir(args);
    const packageFilePath = findPackageJson(rootDir);

    if (packageFilePath && isDependencyOrDevDependency(packageFilePath, '@nakedjsx/core'))
        useTargetNakedJSX(rootDir, packageFilePath);
    else
        await useBundledNakedJSX(rootDir);
}

await main();