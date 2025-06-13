/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Command } from "commander";
import { loadCredentials } from "../utils/credentials";
import inquirer from "inquirer";
import { purgeCloudflareCache } from "../utils/cloudflare";

export const purgeCacheCommand = new Command()
  .command("cachepurge <url>")
  .alias("cp")
  .description("Purge Cloudflare cache for a file you've already deleted.'")
  .action(async (url: string) => {
    const { cloudflareApiKey, cloudflareZoneId } = loadCredentials();
    console.log(`You are about to manually purge the cache  this file: ${url}`);

    const answer = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmPurge",
        message: "Do you actually want to purge cache?",
        default: false,
      },
    ]);

    if (!answer.confirmPurge) {
      console.log("Cancelled. Cache not touched.");
      process.exit(0);
    }

    try {
      await purgeCloudflareCache({
        cloudflareZoneId,
        cloudflareApiKey,
        url,
      });
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
      }
    }
    process.exit(1);
  });
