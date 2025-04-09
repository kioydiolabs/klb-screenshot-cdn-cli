#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import dotenv from "dotenv";
dotenv.config();

import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

const { ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME } = process.env;

if (!ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !BUCKET_NAME) {
  throw new Error("Missing one or more required environment variables: ENDPOINT, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME");
}

const s3 = new S3Client({
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
  region: "auto",
});

console.log(
  "\n----------------------------------------------------------------",
);
console.log("KioydioLabs Screenshot CDN Manager (C) 2025");
console.log(
  "----------------------------------------------------------------\n",
);

// Define the 'delete' command
program
  .command("delete <url>")
  .description("Delete a file from the CDN by providing its URL.")
  .option("-f, --force", "Skip confirmation prompt and delete immediately")
  .action(async (url: string, options: { force?: boolean }) => {
    try {
      const key = String(url).slice(24);
      const filename = String(url).slice(35);

      let result: GetObjectCommandOutput | null;

      try {
        result = await s3.send(
          new GetObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
          }),
        );
      } catch (e){
        if (e instanceof Error) {
          console.error(e.message, "Did not touch file.");
        }
        process.exit(69);
      }

      if (!options.force) {
        console.log(
          `You are about to delete this file: ${filename},\nwhich was uploaded on: ${result.LastModified}.\n`,
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
            Bucket: BUCKET_NAME,
            Key: key,
          }),
        );

        console.log("Deleted.");
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
  });

// If no command is provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
