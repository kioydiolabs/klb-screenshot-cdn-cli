#!/usr/bin/env node

import { program } from "commander";
import dotenv from "dotenv";
import updateNotifier from "update-notifier";
import packageJson from "../package.json" with { type: "json" };

dotenv.config();

console.log(
  "\n----------------------------------------------------------------",
);
console.log("KioydioLabs Screenshot CDN CLI (C) 2025");
console.log(
  "----------------------------------------------------------------\n",
);

updateNotifier({ pkg: packageJson }).notify();

program.version(
  packageJson.version,
  "-v, --version",
  "Output the current version",
);

import { configureCredentialsCommand } from "./commands/configure-credentials";
import { deleteCommand } from "./commands/delete";
import { purgeCacheCommand } from "./commands/purge-cache";

program.addCommand(configureCredentialsCommand);
program.addCommand(deleteCommand);
program.addCommand(purgeCacheCommand);

// If no command is provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
