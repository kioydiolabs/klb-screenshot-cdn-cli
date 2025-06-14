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

import { loadCredentials } from "../utils/credentials.js";
import { purgeCloudflareCache } from "../utils/cloudflare.js";
import { fileObject } from "../utils/types";

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
            console.error(e.message, `Skipping file "${url}"`);
          }
        }
      });

      await Promise.all(promises);

      console.log(table.toString());
      process.exit(0);
    },
  );
