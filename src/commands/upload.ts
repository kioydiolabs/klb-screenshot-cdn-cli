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
import { uploadFile } from "../utils/s3.js";
import { generateRandomID } from "../utils/misc.js";
import ora from "ora";
import { tryCatch } from "../utils/try-catch.js";
import prettyBytes from "pretty-bytes";
import inquirer from "inquirer";
import { showJobOverview } from "../utils/show-job-overview.js";
import { askToCheckForIssues } from "../utils/check-cf-status.js";

const cancelGracefully = (message?: string) => {
  console.log(chalk.green(message ? message : "Cancelled"));
  process.exit(0);
};

export const uploadCommand = new Command()
  .command("upload <file>")
  .alias("u")
  .description("Upload a file to the CDN")
  .option(
    "--path <name>",
    "Custom path, including name. For example `myfolder/test/file.png`",
  )
  .option("--random", "Will give the filename a random name.")
  .option("--force", "Will not ask before uploading.")
  .action(
    async (
      file: string,
      options: { path?: string; random: boolean; force: boolean },
    ) => {
      const { endpoint, accessKeyId, secretAccessKey, bucketName, domain } =
        loadCredentials();

      if (!file) {
        console.log("no file smh");
      }

      const filePath = path.resolve(file);
      const fileStream = fs.createReadStream(filePath);
      const statSync = fs.statSync(filePath);

      let key: string = file;
      if (options.path) {
        key = options.path;
      } else if (options.random) {
        key = generateRandomID(10);
      }

      console.log(
        chalk.bgWhiteBright.black(
          "Job overview: The following actions will be performed:\n",
        ),
      );

      console.log(`The file ${filePath} will be uploaded:\n`);
      console.log(`- It is ${prettyBytes(statSync.size)} large.`);
      console.log(`- Once uploaded, its name on the bucket will be: ${key}`);

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
          filesUploaded: 1,
        }),
      );

      const urlOfUploadedFile: string = `https://${domain}/${key}`;

      console.log(
        showJobOverview({
          filesUploaded: 1,
        }),
      );
      console.log(`The URL of the file is now: ${urlOfUploadedFile}\n\n`);

      console.log(chalk.cyanBright.bold("Bye!\n"));
      process.exit(0);
    },
  );
