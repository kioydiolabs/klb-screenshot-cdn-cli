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
import { fileObject, fileObjectDeleted } from "../utils/types.js";
import { getUrlsFromAllSources } from "../utils/accept-urls.js";
import { showJobOverview } from "../utils/show-job-overview.js";
import {
  CloudflareComponentsThatMayAffectCDN,
  getCfStatus,
  prettyCloudflareStatusTable,
} from "../utils/check-cf-status";

const cancelGracefully = (message?: string) => {
  console.log(chalk.green(message ? message : "Cancelled"));
  process.exit(0);
};

export const deleteCommand = new Command()
  .command("delete [urls...]")
  .alias("d")
  .description("Delete a file from the CDN by providing its URL.")
  .option("-f, --force", "Skip confirmation prompt and delete immediately")
  .option(
    "-p, --purge-cache",
    "Purge Cloudflare cache to stop serving file immediately",
  )
  .option(
    "--file <filePath>",
    "Provide a .txt file of URLs (one every new line) for batch jobs",
  )
  .action(
    async (
      urls: string[],
      options: { force?: boolean; purgeCache?: boolean; file: string },
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

      urls = await getUrlsFromAllSources(urls, options.file);

      if (urls.length < 1) {
        console.log(
          chalk.ansi256(202)(
            "You haven't provided any URLs of files to delete.",
          ),
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

      // array of all items that will be fetched
      const filesFetched: fileObject[] = [];
      const skippedUrls: string[] = [];

      // table object for cli-table3
      const table = new Table({
        head: ["URL", "Size", "Date uploaded (Local Timezone)"],
        // colWidths: [60, 15],
        style: { head: ["cyan"], border: ["white"] },
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
            fileObject.date?.toLocaleString() ?? "",
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
        console.log(
          chalk.bold.ansi256(202)("No files match the URLs you entered.\n") +
            chalk.ansi256(202)(
              "That could be either:\n- Because all of the files you entered have already been deleted\n- Or because all URLs are invalid",
            ),
        );
        process.exit(1);
      }

      console.log(
        chalk.bgWhiteBright.black(
          "Job overview: The following actions will be performed:\n",
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
            "Some URLs, however, don't seem to point to existing files on the bucket. These will be skipped:",
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
          cancelGracefully();
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
          cancelGracefully();
        }
      }

      const spinner = ora(chalk.green("Attempting to delete files...")).start();

      const filesDeleted: fileObjectDeleted[] = [];
      const deletedTable = new Table({
        head: ["URL", "Size", "Date uploaded", "Deleted", "Cache purged"],
        // colWidths: [60, 15],
        style: { head: ["cyan"], border: ["white"] },
      });

      let deleteErrors: boolean = false;
      const deletePromises = filesFetched.map(async (obj: fileObject) => {
        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: obj.key,
            }),
          );
          filesDeleted.push({
            url: obj.url,
            date: obj.date,
            key: obj.key,
            size: obj.size,
            deleted: true,
          });
        } catch (e) {
          if (e instanceof Error) {
            deleteErrors = true;
          }
        }
      });

      await Promise.all(deletePromises);
      spinner.succeed("Files deleted.");

      let purgeCache = true;
      if (!options.purgeCache) {
        const answer = await inquirer.prompt([
          {
            type: "confirm",
            name: "purgeCache",
            message:
              "It looks like you haven't specified whether you want cache to be purged too. Should that be done?",
            default: true,
          },
        ]);

        if (!answer.purgeCache) {
          purgeCache = false;
        }
      }

      const filesPurged: fileObjectDeleted[] = [];
      const filesPurgedFailed: fileObjectDeleted[] = [];
      if (purgeCache) {
        const purgeCachePromises = filesDeleted.map(
          async (obj: fileObjectDeleted) => {
            const purged = await purgeCloudflareCache({
              cloudflareZoneId,
              cloudflareApiKey,
              url: obj.url,
            });
            if (purged.success) {
              filesPurged.push({
                url: obj.url,
                date: obj.date,
                key: obj.key,
                size: obj.size,
                deleted: purged.success,
                errors: purged.errors,
              });
            } else {
              filesPurgedFailed.push({
                url: obj.url,
                date: obj.date,
                key: obj.key,
                size: obj.size,
                deleted: purged.success,
                errors: purged.errors,
              });
            }
            const tableDeletedObject = [
              obj.url,
              obj.size,
              obj.date?.toString() ?? "",
              obj.deleted ? "✔" : "✗",
              purged ? "✔" : "✗",
            ];
            deletedTable.push(tableDeletedObject);
          },
        );

        let errors: boolean = false;
        spinner.start("Purging cache...");
        await Promise.all(purgeCachePromises);
        if (filesPurged.length == filesDeleted.length) {
          spinner.succeed("Done");
        } else if (
          filesPurged.length < filesDeleted.length &&
          filesPurged.length != 0
        ) {
          spinner.info("Partially failed");
          errors = true;
        } else {
          spinner.fail("Failed");
          errors = true;
        }

        let showErrors: boolean = false;
        if (errors) {
          const answer = await inquirer.prompt([
            {
              type: "confirm",
              name: "showErrors",
              message:
                "There were errors during the cache-purge job. Show details?",
              default: true,
            },
          ]);

          if (answer.showErrors) {
            showErrors = true;
          }
        }

        if (errors) {
          const answer = await inquirer.prompt([
            {
              type: "confirm",
              name: "showErrors",
              message:
                "There were errors during the cache-purge job. Show details?",
              default: true,
            },
          ]);

          if (answer.showErrors) {
            showErrors = true;
          }
        }

        if (showErrors) {
          const purgeErrors = new Table({
            head: ["File", "Errors"],
            // colWidths: [60, 15],
            style: { head: ["cyan"], border: ["white"] },
          });
          filesPurgedFailed.map((filePurged: fileObjectDeleted) => {
            if (filePurged.errors) {
              purgeErrors.push([
                filePurged.url,
                filePurged.errors
                  .map((error) => `${error.code}: ${error.message}`)
                  .join("\n"),
              ]);
            }
          });
          console.log("\n" + purgeErrors.toString());
        }
      }

      console.log(
        showJobOverview({
          filesFetched: filesFetched.length,
          filesDeleted: filesDeleted.length,
          filesPurged: filesPurged.length,
          urls: urls.length,
        }),
      );

      if (filesDeleted.length > 1) {
        const answer = await inquirer.prompt([
          {
            type: "confirm",
            name: "showJobResults",
            message: `${deleteErrors || filesPurged.length < filesDeleted.length ? "There were errors." : ""}Show job results in detail?`,
            default: false,
          },
        ]);

        if (answer.showJobResults) {
          console.log(deletedTable.toString());
        }
      }

      if (1 === 1) {
        const answer = await inquirer.prompt([
          {
            type: "confirm",
            name: "checkStatus",
            message: `Since there were errors, do you want to check Cloudflare status for incidents?`,
            default: false,
          },
        ]);

        if (answer.checkStatus) {
          spinner.start("Querying the Cloudflare status API");
          const table = await prettyCloudflareStatusTable(
            CloudflareComponentsThatMayAffectCDN,
          );
          spinner.succeed();
          if (table.impactingComponents) {
            console.log(
              chalk.ansi256(202)(
                "\n\nThe following active Cloudflare incidents may be affecting this job:",
              ),
            );
            console.log(table.incidentTableString);
            console.log("\n\n");
          } else {
            console.log(
              chalk.greenBright(
                "\n\nIt looks like the components required for the CDN are operational.",
              ),
            );
            console.log(
              "Please check the job again, since the errors are not on Cloudflare's side.\n\n",
            );
          }
        }
      }

      console.log(chalk.cyanBright.bold("Bye!\n"));
      process.exit(0);
    },
  );
