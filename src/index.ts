#!/usr/bin/env node

import { program } from "commander";
import inquirer from "inquirer";
import dotenv from "dotenv";

import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
  GetObjectCommandOutput,
} from "@aws-sdk/client-s3";

import { homedir } from "os";
import { join } from "path";

import fs from "fs";
import { mkdirSync, existsSync } from "fs";

dotenv.config();

console.log(
  "\n----------------------------------------------------------------",
);
console.log("KioydioLabs Screenshot CDN CLI (C) 2025");
console.log(
  "----------------------------------------------------------------\n",
);

program.version("1.1.1", "-v, --version", "Output the current version");

const CONFIG_DIR = join(homedir(), ".cdn-cli");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

function loadCredentials() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error("No credentials found. Run `cdn configure` first.");
    process.exit(69);
  }

  const creds = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
  const {
    endpoint,
    accessKeyId,
    secretAccessKey,
    bucketName,
    domain,
    cloudflareApiKey,
    cloudflareZoneId,
  } = creds;

  if (
    !endpoint ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucketName ||
    !domain ||
    !cloudflareApiKey ||
    !cloudflareZoneId
  ) {
    console.error(
      "No credentials found or some credentials missing after an update. (Re)run `cdn configure` first.",
    );
    process.exit(69);
  }

  return creds;
}

// Define the 'delete' command
program
  .command("delete <url>")
  .description("Delete a file from the CDN by providing its URL.")
  .option("-f, --force", "Skip confirmation prompt and delete immediately")
  .option(
    "-p, --purge-cache",
    "Purge Cloudflare cache to stop serving file immediately",
  )
  .action(async (url: string, options: { force?: boolean }) => {
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
          `You are about to delete this file: ${key},\nwhich was uploaded on: ${result.LastModified}.\n`,
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

        try {
          console.log("Attempting to purge cache...");

          const response = await fetch(
            `https://api.cloudflare.com/client/v4/zones/${cloudflareZoneId}/purge_cache`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${cloudflareApiKey}`,
              },
              body: JSON.stringify({
                files: [url],
              }),
            },
          );
          const jsonResponse = await response.json();

          if (jsonResponse.success) {
            console.log("Purged cache successfully.");
            process.exit(0);
          } else {
            console.log(
              `Failed to purge cache. The following errors were reported by Cloudflare: `,
            );
            jsonResponse.errors.forEach(
              (error: { code: Number; message: string }) => {
                console.log(`${error.code}: ${error.message}`);
              },
            );
          }
        } catch (error) {
          if (error instanceof Error) {
            console.error(error);
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
  });

program
  .command("configure")
  .description("Configure your CDN credentials")
  .action(async () => {
    let creds: {
      endpoint: string;
      accessKeyId: string;
      secretAccessKey: string;
      bucketName: string;
      domain: string;
      cloudflareApiKey: string;
      cloudflareZoneId: string;
    } = {
      endpoint: "",
      accessKeyId: "",
      secretAccessKey: "",
      bucketName: "",
      domain: "",
      cloudflareApiKey: "",
      cloudflareZoneId: "",
    };

    if (fs.existsSync(CONFIG_PATH)) {
      const {
        endpoint,
        accessKeyId,
        secretAccessKey,
        bucketName,
        domain,
        cloudflareApiKey,
        cloudflareZoneId,
      } = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      creds = {
        endpoint: endpoint ? endpoint : "",
        accessKeyId: accessKeyId ? accessKeyId : "",
        secretAccessKey: secretAccessKey ? secretAccessKey : "",
        bucketName: bucketName ? bucketName : "",
        domain: domain ? domain : "",
        cloudflareApiKey: cloudflareApiKey ? cloudflareApiKey : "",
        cloudflareZoneId: cloudflareZoneId ? cloudflareZoneId : "",
      };
    }

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "endpoint",
        message: "CDN Endpoint:",
        default: creds.endpoint,
      },
      {
        type: "input",
        name: "accessKeyId",
        message: "Access Key ID:",
        default: creds.accessKeyId,
      },
      {
        type: "input",
        name: "secretAccessKey",
        message: "Secret Access Key:",
        default: creds.secretAccessKey,
      },
      {
        type: "input",
        name: "bucketName",
        message: "Bucket Name:",
        default: creds.bucketName,
      },
      {
        type: "input",
        name: "domain",
        message: "Domain (e.g. mycdn.kioydiolabs.dev):",
        default: creds.domain,
      },
      {
        type: "input",
        name: "cloudflareApiKey",
        message:
          "Cloudflare API Token (must have the Purce Cache permission for the specific zone):",
        default: creds.cloudflareApiKey,
      },
      {
        type: "input",
        name: "cloudflareZoneId",
        message: "Cloudflare Zone ID:",
        default: creds.cloudflareZoneId,
      },
    ]);

    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR);
    }

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(answers, null, 2));
    console.log(`✅ Credentials saved to ${CONFIG_PATH}`);
  });

program
  .command("version")
  .description("Get the latest version")
  .action(async () => {
    console.log("Version 1.1.0");
  });

// If no command is provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
