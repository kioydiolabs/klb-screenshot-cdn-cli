#!/usr/bin/env node

/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { program } from "commander";
import dotenv from "dotenv";
import updateNotifier from "update-notifier";
import packageJson from "../package.json" with { type: "json" };

// command imports
import { configureCredentialsCommand } from "./commands/configure-credentials.js";
import { deleteCommand } from "./commands/delete.js";
import { purgeCacheCommand } from "./commands/purge-cache.js";
import { banner } from "./utils/banner.js";
import { uploadCommand } from "./commands/upload.js";
import { getCipherInfo } from "node:crypto";
import { getFileInfo } from "./commands/info";

dotenv.config();

const notifier = updateNotifier({ pkg: packageJson, updateCheckInterval: 0 });
notifier.notify({ isGlobal: true, defer: false });

program.version(
  packageJson.version,
  "-v, --version",
  "Output the current version",
);

program.addCommand(configureCredentialsCommand);
program.addCommand(deleteCommand);
program.addCommand(purgeCacheCommand);
program.addCommand(uploadCommand);
program.addCommand(getFileInfo);

// If no command is provided, display help
if (!process.argv.slice(2).length) {
  banner();
  program.outputHelp();
  process.exit(0);
}

program.parse(process.argv);
