/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import fs from "fs";
import { CONFIG_PATH } from "../config/constants";

export function loadCredentials() {
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
