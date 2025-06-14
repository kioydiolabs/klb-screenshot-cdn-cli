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
import inquirer from "inquirer";
import prettyBytes from "pretty-bytes";
import {
  S3Client,
  GetObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

import Table from "cli-table3";
import chalk from "chalk";
import ora from "ora";

import { loadCredentials } from "../utils/credentials.js";
import { purgeCloudflareCache } from "../utils/cloudflare.js";
import { fileObject, fileObjectDeleted } from "../utils/types";

export const deleteCommand = new Command()
  .command("delete [urls...]")
  .alias("d")
  .description("Delete a file from the CDN by providing its URL.")
  .option("-f, --force", "Skip confirmation prompt and delete immediately")
  .option(
    "-p, --purge-cache",
    "Purge Cloudflare cache to stop serving file immediately",
  )
  .action(
    async (
      urls: string[],
      options: { force?: boolean; purgeCache?: boolean },
    ) => {
      const {
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucketName,
        domain,
        cloudflareApiKey,
        cloudflareZoneId,
      } = loadCredentials();

      // initiate s3 client
      const s3 = new S3Client({
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        region: "auto",
      });

      // array of all items that will be fetched
      let filesFetched: fileObject[] = [];
      let skippedUrls: string[] = [];

      // table object for cli-table3
      const table = new Table({
        head: ["URL", "Size", "Date uploaded"],
        // colWidths: [60, 15],
        style: { head: ["cyan"] },
      });

      // go through every url the user provided, and look it up in s3
      const promises = urls.map(async (url: string) => {
        const index = url.indexOf(domain);
        const key = url.substring(index + domain.length + 1);

        let result: GetObjectCommandOutput | null;

        // try to fetch the file
        try {
          result = await s3.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: key,
            }),
          );

          const fileObject: fileObject = {
            url: url,
            size: result.ContentLength
              ? prettyBytes(result.ContentLength)
              : "-",
            date: result.LastModified,
            key: key,
          };
          filesFetched.push(fileObject);
          const tableFileObject = [
            fileObject.url,
            fileObject.size,
            fileObject.date?.toString() ?? "",
          ];
          table.push(tableFileObject);
        } catch (e) {
          if (e instanceof Error) {
            skippedUrls.push(url);
          }
        }
      });

      await Promise.all(promises);

      if (filesFetched.length < 1) {
        console.log(chalk.ansi256(202)("No files found."));
        process.exit(1);
      }

      console.log(
        chalk.bgWhiteBright.black(
          "Job overview/preview: The following actions will be performed:\n",
        ),
      );

      console.log(
        chalk.greenBright("These files were found. They will be") +
          chalk.redBright(" DELETED PERMANENTLY:"),
      );
      console.log(table.toString());

      if (skippedUrls.length >= 1) {
        console.log(
          chalk.ansi256(202)(
            "Some URLs however don't seem to point to existing files on the bucket. These will be skipped:",
          ),
        );
        skippedUrls.forEach((url: string) => {
          console.log(`${url}`);
        });
        console.log("\n");
      }

      if (!options.force) {
        const answer = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmDelete",
            message: "Do you actually want to proceed?",
            default: false,
          },
        ]);

        if (!answer.confirmDelete) {
          console.log("Cancelled.");
          process.exit(0);
        }
      }

      if (!options.force && urls.length > 1) {
        const answer = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirmDelete2",
            message:
              "Looks like this is a batch job. Confirm one last time that you really want these gone.",
            default: false,
          },
        ]);

        if (!answer.confirmDelete2) {
          console.log("Cancelled.");
          process.exit(0);
        }
      }

      const spinner = ora(chalk.green("Attempting to delete files...")).start();

      let filesDeleted: fileObjectDeleted[] = [];
      const deletedTable = new Table({
        head: ["URL", "Size", "Date uploaded", "Deleted successfully"],
        // colWidths: [60, 15],
        style: { head: ["cyan"] },
      });
      const deletePromises = filesFetched.map(async (obj: fileObject) => {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: obj.url,
            }),
          );
          filesDeleted.push({
            url: obj.url,
            date: obj.date,
            key: obj.key,
            size: obj.size,
            deleted: true,
          });
          const tableDeletedObject = [
            obj.url,
            obj.size,
            obj.date?.toString() ?? "",
            "✔",
          ];
          deletedTable.push(tableDeletedObject);
        } catch (e) {
          if (e instanceof Error) {
            filesDeleted.push({
              url: obj.url,
              date: obj.date,
              key: obj.key,
              size: obj.size,
              deleted: false,
            });
            const tableDeletedObject = [
              obj.url,
              obj.size,
              obj.date?.toString() ?? "",
              "✗",
            ];
            deletedTable.push(tableDeletedObject);
          }
        }
      });

      await Promise.all(deletePromises);
      spinner.succeed("Job done.");

      console.log(
        chalk.bgWhiteBright.black.bold(`\n\nJob overview:\n`) +
          `URLs Provided by user: ${urls.length}\nFiles found: ${filesFetched.length}\nFiles deleted successfully: ${filesDeleted.length}/${filesFetched.length}\n\n `,
      );

      if (filesDeleted.length > 1) {
        const answer = await inquirer.prompt([
          {
            type: "confirm",
            name: "showJobResults",
            message: "Show job results in detail?",
            default: false,
          },
        ]);

        if (answer.showJobResults) {
          console.log(deletedTable.toString());
        }
      }

      process.exit(0);
    },
  );
