import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { getItem, init, setItem, removeItem } from 'node-persist';


// --- 辅助函数 ---
function logVerbose(args: any, message: string) {
    const options = args as unknown as GlobalOptions;
    if (options.verbose) {
        console.log(`[VERBOSE] ${message}`);
        console.log(`[VERBOSE] Arguments: ${JSON.stringify(args)}`);
    }
}

async function main() {
    await init({ dir: '.cache' }); // 初始化缓存目录

    // 设置数据
    // await setItem('myKey', { name: 'John Doe', age: 30 });

    // 获取数据
    const myData = await getItem('myKey');
    console.log(myData); // 输出: { name: 'John Doe', age: 30 }

    // 删除数据
    // await removeItem('myKey');

    // 清空所有数据
    // await clear();


    // --- yargs 配置 ---
    const argv = yargs(hideBin(process.argv))
        .usage('Usage: $0 <command> [options]')
        .option('verbose', {
            alias: 'v',
            describe: 'Run with verbose logging',
            type: 'boolean',
        })
        // --- app commands ---
        .command(
            'app',
            'Manage apps',
            (yargs) => {
                yargs
                    .command(
                        'create <appName>',
                        'Create a new app',
                        (yargs) => {
                            yargs.positional('appName', {
                                describe: 'The name of the app to create',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as AppCreateOptions;
                            console.log(`Creating app: ${options.appName}`);
                            logVerbose(argv, `Created app ${options.appName}`);
                        }
                    )
                    .command(
                        'delete <appName>',
                        'Delete an app',
                        (yargs) => {
                            yargs.positional('appName', {
                                describe: 'The name of the app to delete',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as AppDeleteOptions;
                            console.log(`Deleting app: ${options.appName}`);
                            logVerbose(argv, `Deleted app ${options.appName}`);
                        }
                    )
                    .command('list', 'List all apps', {}, (argv) => {
                        console.log('Listing apps...');
                        logVerbose(argv, "Listing apps");
                        // TODO: Implement app listing logic
                    })
                    .demandCommand(1, 'Must provide a subcommand for app')
            },
        )
        // --- workcopy commands ---
        .command(
            'workcopy',
            'Manage workcopies',
            (yargs) => {
                yargs
                    .command(
                        'create <workcopyName>',
                        'Create a new workcopy',
                        (yargs) => {
                            yargs.positional('workcopyName', {
                                describe: 'The name of the workcopy to create',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as WorkcopyCreateOptions;
                            console.log(`Creating workcopy: ${options.workcopyName}`);
                            logVerbose(argv, `Created workcopy ${options.workcopyName}`);
                        }
                    )
                    .command(
                        'set <workcopyName>',
                        'Set the current workcopy',
                        (yargs) => {
                            yargs.positional('workcopyName', {
                                describe: 'The name of the workcopy to set as current',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as WorkcopySetOptions;
                            console.log(`Setting current workcopy to: ${options.workcopyName}`);
                            logVerbose(argv, `Set current workcopy to ${options.workcopyName}`);
                        }
                    )
                    .command('current', 'Show the current workcopy', {}, (argv) => {
                        console.log('Current workcopy: ...');
                        logVerbose(argv, "Show the current workcopy");
                        // TODO: Implement logic to display the current workcopy
                    })
                    .demandCommand(1, 'Must provide a subcommand for workcopy')

            }

        )
        // --- model commands ---
        .command(
            'model',
            'Manage model elements',
            (yargs) => {
                yargs
                    .command(
                        'module create <moduleName>',
                        'Create a new module',
                        (yargs) => {
                            yargs.positional('moduleName', {
                                describe: 'The name of the module to create',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as ModelModuleCreateOptions;
                            console.log(`Creating module: ${options.moduleName}`);
                            logVerbose(argv, `Created module ${options.moduleName}`);
                        }
                    )
                    .command(
                        'module list',
                        'List all modules in current workcopy',
                        {},
                        (argv) => {
                            console.log("Listing modules...");
                            logVerbose(argv, "Listing modules");
                            // TODO: implement module list
                        }
                    )
                    .command(
                        'module set <moduleName>',
                        'Set the current module',
                        (yargs) => {
                            yargs.positional('moduleName', {
                                describe: 'The name of the module to set as current',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as ModelModuleSetOptions;
                            console.log(`Setting current module to ${options.moduleName}`);
                            logVerbose(argv, `Set current module to ${options.moduleName}`);
                        }
                    )
                    .command(
                        'page create <pageName>',
                        'Create a new page',
                        (yargs) => {
                            yargs.positional('pageName', {
                                describe: 'The name of the page to create',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as ModelPageCreateOptions;
                            console.log(`Creating page: ${options.pageName}`);
                            logVerbose(argv, `Created page ${options.pageName}`);
                        }
                    )
                    .command(
                        'page delete <pageName>',
                        'Delete a page',
                        (yargs) => {
                            yargs.positional('pageName', {
                                describe: 'The name of the page to delete',
                                type: 'string',
                            });
                        },
                        (argv) => {
                            const options = argv as unknown as ModelPageDeleteOptions;
                            console.log(`Deleting page: ${options.pageName}`);
                            logVerbose(argv, `Deleted page ${options.pageName}`);
                        }
                    )
                    // --- domain placeholder ---
                    .command('domain', 'Manage domain models', {}, (argv) => {
                        console.log('TODO: domain operations...');
                        logVerbose(argv, "Domain operations placeholder");
                        // TODO: Implement domain operations
                    })
                    // --- microflow placeholder ---
                    .command('microflow', 'Manage microflows', {}, (argv) => {
                        console.log('TODO: microflow operations...');
                        logVerbose(argv, "Microflow operations placeholder");
                        // TODO: Implement microflow operations
                    })
                    .demandCommand(1, 'Must provide a subcommand for model')
            }
        )

        .help('h')
        .alias('h', 'help')
        .demandCommand(1, 'Must provide a command')
        .parse();
}

main();

