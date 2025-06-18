/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

// Define the 'delete' command
import { Command } from "commander";
import chalk from "chalk";
import { loadCredentials } from "../utils/credentials.js";
import { S3Client } from "@aws-sdk/client-s3";
import { checkIfFileExists } from "../utils/s3.js";
import { createWarning } from "../utils/misc.js";
import ora from "ora";
import { tryCatch } from "../utils/try-catch.js";
import prettyBytes from "pretty-bytes";
import { askToCheckForIssues } from "../utils/check-cf-status.js";
import Table from "cli-table3";
import {
  extractKeyFromURL,
  getUrlsFromAllSources,
} from "../utils/accept-urls.js";
import inquirer from "inquirer";

export const getFileInfo = new Command()
  .command("info [urls...]")
  .alias("i")
  .description("Get information about one or more files")
  .option(
    "--file <filePath>",
    "Provide a .txt file of URLs (one every new line) for batch jobs",
  )
  .action(async (urls: string[], options: { file: string }) => {
    const { endpoint, accessKeyId, secretAccessKey, bucketName } =
      loadCredentials();

    urls = await getUrlsFromAllSources(urls, options.file);

    if (urls.length < 1) {
      createWarning(
        "You haven't provided any URLs of files to try and fetch  .",
      );
      process.exit(1);
    }

    // initiate s3 client
    const s3 = new S3Client({
      endpoint: endpoint,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
      region: "auto",
    });

    // table object for cli-table3
    const table = new Table({
      head: ["URL", "Size", "Date uploaded (Local Timezone)", "Content Type"],
      // colWidths: [60, 15],
      style: { head: ["cyan"], border: ["white"] },
    });

    const errors = new Table({
      head: ["URL", "Error Message"],
      // colWidths: [60, 15],
      style: { head: ["cyan"], border: ["white"] },
    });

    let globalError: boolean = false;
    let countOfFiles: number = 0;
    const promises = urls.map(async (url: string) => {
      const { error, data } = await tryCatch(
        checkIfFileExists(s3, {
          Bucket: bucketName,
          Key: extractKeyFromURL(url),
        }),
      );

      if (data?.exists) {
        table.push([
          url,
          data.size ? prettyBytes(data.size) : "NaN",
          data.uploadedOn?.toLocaleString(),
          data.type,
        ]);
        countOfFiles++;
      }

      if (error) {
        globalError = true;
        errors.push([url, error.message]);
      }
    });

    let showErrors: boolean = false;
    const spinner = ora(chalk.green("Fetching file information...")).start();
    await Promise.all(promises);
    if (countOfFiles == urls.length) {
      spinner.succeed("Fetched all files successfully");
    } else if (countOfFiles < urls.length && countOfFiles > 0) {
      spinner.info("Partially failed");
      showErrors = true;
    } else if (countOfFiles == 0) {
      showErrors = true;
      spinner.fail("Failed to fetch any files.");
    }

    console.log(table.toString());

    if (showErrors || globalError) {
      const answer = await inquirer.prompt([
        {
          type: "confirm",
          name: "showErrors",
          message: "There were errors. Show details?",
          default: true,
        },
      ]);

      if (answer.showErrors) {
        createWarning(
          "The following files could not be fetched. The errors are described below:",
        );
        console.log(errors.toString());
      }
    }

    if (globalError) {
      await askToCheckForIssues(spinner);
    }

    console.log(chalk.cyanBright.bold("Bye!\n"));
    process.exit(0);
  });
