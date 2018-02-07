#!/usr/bin/env node
'use strict'

/* istanbul ignore file */

const meow = require('meow')

const logger = require('./lib/logger')
const pkg = require('./package.json')

const helpers = require('./lib/cli-helpers')

const flagsToOptions = helpers.flagsToOptions
const parseCommand = helpers.parseCommand

const cwd = process.cwd()

const bigEye = require('.')

const cli = meow(`
	Usage
	  $ eye <command>

	Options
	  -w, --watch    Files/directories to be watched [Default: pwd]
	  -i, --ignore   Files/directories to be ignored [Default: from .gitignore]
	  -l, --lazy     Don't execute command on startup
	  -d, --delay    Debounce delay in ms between command executions [Default: 10]
	  -q, --quiet    Print only command output

	Examples
	  $ eye app.js
	  $ eye build.js -w src/
	  $ eye python module.py -i '*.pyc'
	  $ eye 'g++ main.cpp && ./a.out'

	Tips
	  Run eye without arguments to execute the npm start script.
`, {
	version: `${pkg.name} (${pkg.version})\n` +
		`maintained by ${pkg.author}\n` +
		`bug reports: ${pkg.bugs}`,
	flags: {
		watch: {
			alias: 'w',
			type: 'string'
		},
		ignore: {
			alias: 'w',
			type: 'string'
		},
		lazy: {
			alias: 'l',
			type: 'boolean',
			default: false
		},
		delay: {
			alias: 'd',
			type: 'string',
			default: 10
		},
		quiet: {
			alias: 'q',
			type: 'boolean',
			default: false
		}
	}
})

const options = flagsToOptions(cwd, cli.flags)
const command = parseCommand(cwd, cli.input.join(' '))

try {
	if (command.length === 0) {
		cli.showHelp()
	} else {
		const log = options.quiet ? () => {} : require('./lib/logger')
		const eye = bigEye(command.file, command.args, options)

		const leadMsg = 'starting with config:\n' +
			`\tcommand: ${command.file + ' ' + command.args.join(' ')}\n` +
			`\twatch: ${options.watch.join(', ')}\n` +
			`\tignore: ${options.ignore.join(', ')}`

		log('info', leadMsg)

		eye.on('executing', () => {
			log('info', 'executing child...')
		})

		eye.on('changes', (event, path) => {
			log('info', `file changes detected (${event} ${path})`)
		})

		eye.on('success', time => {
			log('success', `command exited without error (${time}ms), ` +
				'waiting for changes...')
		})

		eye.on('failure', (time, code) => {
			log('error', `command exited with code ${code} (${time}ms), ` +
				'waiting for changes...')
		})

		eye.on('killed', signal => {
			log('info', `child killed (${signal})`)
		})
	}
} catch (err) {
	logger('error', err.stack)
	process.exit(1)
}
