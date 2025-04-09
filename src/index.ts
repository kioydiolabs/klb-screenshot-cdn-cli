#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import dotenv from "dotenv";

import { homedir } from 'os';
import { join } from 'path';

import fs from 'fs';
import { mkdirSync, existsSync } from 'fs';

dotenv.config();

console.log(
  "\n----------------------------------------------------------------",
);
console.log("KioydioLabs Screenshot CDN Manager (C) 2025");
console.log(
  "----------------------------------------------------------------\n",
);

const CONFIG_DIR = join(homedir(), '.cdn-cli');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

function loadCredentials() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('No credentials found. Run `cdn configure` first.');
    process.exit(69);
  }

  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

const { endpoint, accessKeyId, secretAccessKey, bucketName } = loadCredentials();

const s3 = new S3Client({
  endpoint: endpoint,
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
  region: "auto",
});

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
            Bucket: bucketName,
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
            Bucket: bucketName,
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

program
.command('configure')
.description('Configure your CDN credentials')
.action(async () => {
  const answers = await inquirer.prompt([
    { type: 'input', name: 'endpoint', message: 'CDN Endpoint:' },
    { type: 'input', name: 'accessKeyId', message: 'Access Key ID:' },
    { type: 'password', name: 'secretAccessKey', message: 'Secret Access Key:' },
    { type: 'input', name: 'bucketName', message: 'Bucket Name:' },
  ]);

  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR);
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(answers, null, 2));
  console.log(`✅ Credentials saved to ${CONFIG_PATH}`);
});

// If no command is provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
