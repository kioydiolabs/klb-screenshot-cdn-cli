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
import path from "node:path";
import chalk from "chalk";
import { loadCredentials } from "../utils/credentials.js";
import fs from "fs";
import { S3Client } from "@aws-sdk/client-s3";
import { checkIfFileExists, uploadFile } from "../utils/s3.js";
import {
  constructFileUrl,
  generateRandomID,
  getFilenameExtension,
  cancelGracefully,
  createWarning,
} from "../utils/misc.js";
import ora from "ora";
import { tryCatch } from "../utils/try-catch.js";
import prettyBytes from "pretty-bytes";
import inquirer from "inquirer";
import { showJobOverview } from "../utils/show-job-overview.js";
import { askToCheckForIssues } from "../utils/check-cf-status.js";
import Table from "cli-table3";

export const uploadCommand = new Command()
  .command("upload <file>")
  .alias("u")
  .description("Upload a file to the CDN")
  .option(
    "--name <name>",
    "Custom path, including name. For example `myfolder/test/file.png`",
  )
  .option("--random", "Will give the filename a random name.")
  .option("--force", "Will not ask before uploading.")
  .action(
    async (
      file: string,
      options: { name?: string; random: boolean; force: boolean },
    ) => {
      const { endpoint, accessKeyId, secretAccessKey, bucketName } =
        loadCredentials();

      if (!file) {
        console.log("no file smh");
      }

      const filePath = path.resolve(file);
      if (!fs.existsSync(filePath)) {
        createWarning("File not found. Check the name again.");
        process.exit(1);
      }
      const fileStream = fs.createReadStream(filePath);
      const statSync = fs.statSync(filePath);

      let key: string = file;
      if (options.name) {
        key = options.name;
      } else if (options.random) {
        key = generateRandomID(10) + "." + getFilenameExtension(file);
      }

      console.log(
        chalk.bgWhiteBright.black(
          "Job overview: The following actions will be performed:\n",
        ),
      );

      console.log(`The file ${filePath} will be uploaded:`);
      console.log(`- It is ${prettyBytes(statSync.size)} large.`);
      console.log(`- Once uploaded, its name on the bucket will be: ${key}\n`);

      if (!options.force) {
        const answer = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmUpload",
            message: "Do you actually want to proceed?",
            default: false,
          },
        ]);

        if (!answer.confirmUpload) {
          cancelGracefully();
        }
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

      const exists = await checkIfFileExists(s3, {
        Bucket: bucketName,
        Key: key,
      });

      let overrode: boolean = false;
      if (exists.exists) {
        createWarning(
          "The following file, with the same name, was found on the bucket:",
        );

        const table = new Table({
          head: ["URL", "Name", "Size", "Date uploaded (Local Timezone)"],
          // colWidths: [60, 15],
          style: { head: ["cyan"], border: ["white"] },
        });
        table.push([
          constructFileUrl(key),
          key,
          exists.size ? prettyBytes(exists.size) : "-",
          exists.uploadedOn?.toLocaleString(),
        ]);
        console.log(table.toString());

        console.log(
          chalk
            .ansi256(202)
            .bold(
              "\nIf you want to upload the file with a different name, you can use `--name` to change it,\n" +
                "or `--random` to generate a random one.\n",
            ),
        );

        const override = await inquirer.prompt([
          {
            type: "confirm",
            name: "override",
            message:
              "Override the old file? If you proceed the old file will be deleted permanently.",
            default: false,
          },
        ]);

        if (!override.override) {
          cancelGracefully();
        } else {
          overrode = true;
        }
      }

      const spinner = ora(chalk.green("Uploading file...")).start();

      const { error } = await tryCatch(
        uploadFile(s3, {
          Bucket: bucketName,
          Key: key,
          Body: fileStream,
        }),
      );

      if (error) {
        spinner.fail("There was an error");

        const askErrorDetails = await inquirer.prompt([
          {
            type: "confirm",
            name: "viewErrorDetails",
            message: "Show error details?",
            default: false,
          },
        ]);

        if (askErrorDetails.viewErrorDetails) {
          console.log(error);
        }

        await askToCheckForIssues(spinner);
      } else {
        spinner.succeed("Done");
      }

      console.log(
        showJobOverview({
          onlyHeader: true,
        }) +
          chalk.whiteBright(
            `${overrode ? "Overrode" : "Uploaded"} one file named ${key}`,
          ),
      );
      console.log(`The URL of the file is now: ${constructFileUrl(key)}\n\n`);

      console.log(chalk.cyanBright.bold("Bye!\n"));
      process.exit(0);
    },
  );
