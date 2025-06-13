/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { Command } from "commander";
import inquirer from "inquirer";
import fs from "fs";
import { mkdirSync, existsSync } from "fs";
import { CONFIG_DIR, CONFIG_PATH } from "../config/constants";

export const configureCredentialsCommand = new Command()
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
