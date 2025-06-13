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
import { loadCredentials } from "../utils/credentials";
import { purgeCloudflareCache } from "../utils/cloudflare";

export const deleteCommand = new Command()
  .command("delete <url>")
  .alias("d")
  .description("Delete a file from the CDN by providing its URL.")
  .option("-f, --force", "Skip confirmation prompt and delete immediately")
  .option(
    "-p, --purge-cache",
    "Purge Cloudflare cache to stop serving file immediately",
  )
  .action(
    async (url: string, options: { force?: boolean; purgeCache?: boolean }) => {
      const {
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucketName,
        domain,
        cloudflareApiKey,
        cloudflareZoneId,
      } = loadCredentials();

      const s3 = new S3Client({
        endpoint: endpoint,
        credentials: {
          accessKeyId: accessKeyId,
          secretAccessKey: secretAccessKey,
        },
        region: "auto",
      });

      try {
        const index = url.indexOf(domain);

        const key = url.substring(index + domain.length + 1);

        let result: GetObjectCommandOutput | null;

        try {
          result = await s3.send(
            new GetObjectCommand({
              Bucket: bucketName,
              Key: key,
            }),
          );
        } catch (e) {
          if (e instanceof Error) {
            console.error(e.message, "Did not touch file.");
          }
          process.exit(69);
        }

        if (!options.force) {
          console.log(
            `You are about to delete this file: ${key},\nwhich was uploaded on: ${result.LastModified} and is ${result?.ContentLength ? prettyBytes(result?.ContentLength) : "[size of the file is undefined]"} largen.\n`,
          );

          const answer = await inquirer.prompt([
            {
              type: "confirm",
              name: "confirmDelete",
              message: "Do you actually want to delete this file?",
              default: false,
            },
          ]);

          if (!answer.confirmDelete) {
            console.log("Cancelled. File not touched.");
            process.exit(0);
          }
        }

        try {
          await s3.send(
            new DeleteObjectCommand({
              Bucket: bucketName,
              Key: key,
            }),
          );

          console.log("Deleted.");

          if (options.purgeCache) {
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
          }
        } catch (e) {
          if (e instanceof Error) {
            console.error(e.message);
          }
          console.log("File was not deleted.");
        }
      } catch (error) {
        if (error instanceof Error) {
          console.error("An error occurred:", error.message);
        }
        process.exit(1);
      }
    },
  );
