import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { getItem, init, setItem, removeItem } from "node-persist";

require("dotenv").config();

// must after require('dotenv').config();
import { AppCreate, AppShow } from "./app";
import { PersistKey } from "./const";

// --- 辅助函数 ---
function logVerbose(args: any, message: string) {
    const options = args as unknown as GlobalOptions;
    if (options.verbose) {
        console.log(`[VERBOSE] ${message}`);
        console.log(`[VERBOSE] Arguments: ${JSON.stringify(args)}`);
    }
}

async function main() {
    await init({ dir: ".cache" }); // 初始化缓存目录
    // --- yargs 配置 ---
    const argv = yargs(hideBin(process.argv))
        .usage("Usage: $0 <command> [options]")
        .option("verbose", {
            alias: "v",
            describe: "Run with verbose logging",
            type: "boolean",
        })
        // --- app commands ---
        .command("app", "Manage apps", (yargs) => {
            yargs
                .command(
                    "create <appName>",
                    "Create a new app",
                    (yargs) => {
                        yargs.positional("appName", {
                            describe: "The name of the app to create",
                            type: "string",
                        });
                    },
                    async (argv) => {
                        const options = argv as unknown as AppCreateOptions;
                        console.log(`Creating app: ${options.appName}`);
                        await AppCreate(options.appName);
                        logVerbose(argv, `Created app ${options.appName}`);
                    },
                )
                .command(
                    "delete <appName>",
                    "Delete an app",
                    (yargs) => {
                        yargs.positional("appName", {
                            describe: "The name of the app to delete",
                            type: "string",
                        });
                    },
                    (argv) => {
                        const options = argv as unknown as AppDeleteOptions;
                        console.log(`Deleting app: ${options.appName}`);
                        logVerbose(argv, `Deleted app ${options.appName}`);
                    },
                )
                .command("show", "show active app", {}, async (argv) => {
                    const appId = await getItem(PersistKey.ActiveAppId);
                    await AppShow(appId);
                })
                // set active app
                .command(
                    "set <appId>",
                    "Set the active app",
                    (yargs) => {
                        yargs.positional("appId", {
                            describe: "The id of the app to set as active",
                            type: "string",
                        });
                    },
                    async (argv) => {
                        const options = argv as unknown as AppSetOptions;
                        console.log(`Setting app: ${options.appId}`);
                        logVerbose(argv, `Set app ${options.appId}`);
                        await setItem(PersistKey.ActiveAppId, options.appId);
                    },
                )
                .demandCommand(1, "Must provide a subcommand for app");
        })
        // --- session commands ---
        .command("session", "Manage session", (yargs) => {
            yargs
                .command(
                    "create <sessionName>",
                    "Create a new session",
                    (yargs) => {
                        yargs.positional("sessionName", {
                            describe: "The name of the session to create",
                            type: "string",
                        });
                    },
                    (argv) => {
                        const options =
                            argv as unknown as WorkcopyCreateOptions;
                        console.log(`Creating session: ${options.sessionName}`);
                        logVerbose(
                            argv,
                            `Created session ${options.sessionName}`,
                        );
                    },
                )
                .command(
                    "set <sessionName>",
                    "Set the current session",
                    (yargs) => {
                        yargs.positional("sessionName", {
                            describe:
                                "The name of the session to set as current",
                            type: "string",
                        });
                    },
                    (argv) => {
                        const options = argv as unknown as WorkcopySetOptions;
                        console.log(
                            `Setting current session to: ${options.sessionName}`,
                        );
                        logVerbose(
                            argv,
                            `Set current session to ${options.sessionName}`,
                        );
                    },
                )
                .command("current", "Show the current session", {}, (argv) => {
                    console.log("Current session: ...");
                    logVerbose(argv, "Show the current session");
                    // TODO: Implement logic to display the current session
                })
                .demandCommand(1, "Must provide a subcommand for session");
        })
        // --- model commands ---
        .command("model", "Manage model elements", (yargs) => {
            yargs.option("wc", {
                describe: "Reuse the last workcopy",
                type: "boolean",
                normalize: true,
                default: false,
                demandOption: false,
            });

            // module
            yargs.command("module", "Manage modules", (yargs) => {
                yargs
                    .command(
                        "create <moduleName>",
                        "Create a new module",
                        (yargs) => {
                            yargs.positional("moduleName", {
                                describe: "The name of the module to create",
                                type: "string",
                            });
                        },
                        async (argv) => {
                            const options =
                                argv as unknown as ModelModuleCreateOptions;
                            let workcopy = Date.now().toString();
                            if (options.wc) {
                                workcopy = await getItem(PersistKey.WorkCopy);
                                if (workcopy === undefined) {
                                    throw new Error("No last workcopy found");
                                }
                            } else {
                                await setItem(PersistKey.WorkCopy, workcopy);
                            }
                            console.log(
                                `Creating module: ${options.moduleName}, reuseWorkCopy: ${options.wc}, workcopy: ${workcopy}`,
                            );
                        },
                    )
                    .command(
                        "list",
                        "List all modules in current workcopy",
                        {},
                        (argv) => {
                            console.log("Listing modules...");
                            logVerbose(argv, "Listing modules");
                            // TODO: implement module list
                        },
                    )
                    .command(
                        "set <moduleName>",
                        "Set the current module",
                        (yargs) => {
                            yargs.positional("moduleName", {
                                describe:
                                    "The name of the module to set as current",
                                type: "string",
                            });
                        },
                        (argv) => {
                            const options =
                                argv as unknown as ModelModuleSetOptions;
                            console.log(
                                `Setting current module to ${options.moduleName}`,
                            );
                            logVerbose(
                                argv,
                                `Set current module to ${options.moduleName}`,
                            );
                        },
                    );
            });

            // page
            yargs
                .command("page", "Manage pages", (yargs) => {
                    yargs
                        .command(
                            "create <pageName>",
                            "Create a new page",
                            (yargs) => {
                                yargs.positional("pageName", {
                                    describe: "The name of the page to create",
                                    type: "string",
                                });
                            },
                            (argv) => {
                                const options =
                                    argv as unknown as ModelPageCreateOptions;
                                console.log(
                                    `Creating page: ${options.pageName}`,
                                );
                                logVerbose(
                                    argv,
                                    `Created page ${options.pageName}`,
                                );
                            },
                        )
                        .command(
                            "delete <pageName>",
                            "Delete a page",
                            (yargs) => {
                                yargs.positional("pageName", {
                                    describe: "The name of the page to delete",
                                    type: "string",
                                });
                            },
                            (argv) => {
                                const options =
                                    argv as unknown as ModelPageDeleteOptions;
                                console.log(
                                    `Deleting page: ${options.pageName}`,
                                );
                                logVerbose(
                                    argv,
                                    `Deleted page ${options.pageName}`,
                                );
                            },
                        );
                })

                // --- domain placeholder ---
                .command("domain", "Manage domain models", {}, (argv) => {
                    console.log("TODO: domain operations...");
                    logVerbose(argv, "Domain operations placeholder");
                    // TODO: Implement domain operations
                })
                // --- microflow placeholder ---
                .command("microflow", "Manage microflows", {}, (argv) => {
                    console.log("TODO: microflow operations...");
                    logVerbose(argv, "Microflow operations placeholder");
                    // TODO: Implement microflow operations
                })
                .demandCommand(1, "Must provide a subcommand for model");
        })

        .help("h")
        .alias("h", "help")
        .demandCommand(1, "Must provide a command")
        .parse();
}

main();
