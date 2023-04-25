#!/usr/bin/env node

//
// This tool is just a simple config building and
// invocation wrapper around @nakedjsx/core.
//

import fs from 'node:fs'

import { NakedJSX, emptyConfig, configFilename } from '@nakedjsx/core'
import path from 'node:path';

const log = console.log.bind(console);

function err(message)
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

let developmentMode = false;    // --dev
let configWrite     = false;    // --config-write

const options =
    {
        '--dev':
            {
                desc: 'Launch a hot-refresh development server',
                impl()
                {
                    developmentMode = true;
                }
            },
        
        '--config-write':
            {
                desc: 'Write the effective config file to <pages-directory>/.nakedjsx.json',
                impl()
                {
                    configWrite = true;
                }
            },
        
        '--output-dir':
            {
                desc: 'The build output will be placed here',
                args: ['path'],
                impl(config, { path })
                {
                    config.outputDir = path;
                }
            },

        '--css-common':
            {
                desc: 'CSS to compile and compress along with extracted scoped css="..." JSX attributes',
                args: ['pathToCssFile'],
                impl(config, { pathToCssFile })
                {
                    config.commonCssFile = pathToCssFile;
                }
            },

        '--plugin':
            {
                desc: 'Enable plugin such as @nakedjsx/plugin-asset-image.',
                args: ['pluginPackageNameOrPath'],
                async impl(config, { pluginPackageNameOrPath })
                {
                    if (!config.plugins.includes(pluginPackageNameOrPath))
                        config.plugins.push(pluginPackageNameOrPath);
                }
            },

        '--alias-source':
            {
                desc: 'Soucecode import path alias, eg. import something from \'$SRC/something.mjs\'',
                args: ['alias', 'sourceImportDirectory'],
                impl(config, { alias, sourceImportDirectory })
                {
                    config.importMapping[alias] = { type: 'source', path: sourceImportDirectory };
                }
            },

        '--alias-asset':
            {
                desc: 'Asset import path alias, eg. import logo_uri_path from \'$ASSET/logo.png\'',
                args: ['alias', 'assetImportDirectory'],
                impl(config, { alias, assetImportDirectory })
                {
                    config.importMapping[alias] = { type: 'asset', path: assetImportDirectory };
                }
            },

        '--define':
            {
                desc: 'Make string data available to code, eg. import VALUE from \'KEY\'',
                args: ['key', 'value'],
                impl(config, { key, value })
                {                    
                    config.importMapping[key] = { type: 'definition', value };
                }
            },

        '--help':
            {
                desc: 'Print basic help information and exit',
                impl()
                {
                    usage();
                    process.exit();
                }
            },
    };

function camelToKebabCase(camel)
{
    return camel.replace(/[A-Z]/g, char => '-' + char.toLowerCase());
}

function usage()
{
    let optionsHelp = '';

    for (const flag in options)
    {
        const option = options[flag];

        let argText = '';
        if (option.args)
            for (const argCamel of option.args)
                argText += ` <${camelToKebabCase(argCamel)}>`;

        optionsHelp += `\n`;
        optionsHelp += `    # ${option.desc}\n`;
        optionsHelp += `    ${flag}${argText}\n`;
    }

    log(
`
Usage:

    # ${options['--help'].desc}
    npx nakedjsx --help

    # Find and build NakedJSX pages in <pages-directory>
    npx nakedjsx <pages-directory> [options]

Options:

    \x1b[1mNOTE: All paths are either absolute or relative to <pages-directory>.\x1b[22m
${optionsHelp}`);
}

function determineRootDir()
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

function loadBaseConfig(rootDir)
{
    //
    // Attempt to load config from pages dir
    //

    const config = Object.assign({}, emptyConfig);

    const configFile = rootDir + path.sep + configFilename;

    if (!fs.existsSync(configFile))
    {
        log(`No config found at ${configFile}`);
        return config;
    }

    log(`Loading config from ${configFile}`);

    try
    {
        Object.assign(config, JSON.parse(fs.readFileSync(configFile)));
    }
    catch(error)
    {
        fatal('Failed to parse config file ' + error);
    }

    return config;
}

async function processCliArguments()
{
    //
    // Process command line options
    //

    while (args.length)
    {
        const flag = args.shift();
        const option = options[flag];

        if (!option)
            fatal(`Unknown flag: ${flag}`);
        
        const optionArguments = {};
        for (const argCamel of option.args || [])
        {
            if (args.length == 0)
                fatal(`${flag} missing required <${camelToKebabCase(argCamel)}> argument`, true);
            
            optionArguments[argCamel] = args.shift();
        }
        
        await option.impl(config, optionArguments);
    }
}

// [0] == node, [1] == this script
const args = process.argv.slice(2);

const rootDir   = determineRootDir();
const config    = loadBaseConfig(rootDir);

const configBefore = JSON.stringify(config);
await processCliArguments(config);
let configDirty = JSON.stringify(config) !== configBefore;

if (configWrite)
{
    const configPath = rootDir + path.sep + configFilename;
    log(`Writing config to ${configPath}`);

    fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
    configDirty = false;
}

let nakedJsx;

if (configDirty)
    nakedJsx = new NakedJSX(rootDir, { configOverride: config });
else
    nakedJsx = new NakedJSX(rootDir);

if (developmentMode)
    await nakedJsx.developmentMode();
else
    await nakedJsx.build();