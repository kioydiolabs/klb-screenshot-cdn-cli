/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import readline from "readline";
import fs from "fs";

// Replace your original `urls` array logic with this
export async function getUrlsFromAllSources(
  urls: string[],
  file: string,
): Promise<string[]> {
  let finalUrls: string[] = [];

  if (file && fs.existsSync(file)) {
    const content = fs.readFileSync(file, "utf-8");
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    urls.push(...lines);
    return lines;
  }

  for (const input of urls) {
    finalUrls.push(input);
  }

  // If input is being piped via stdin, grab that too
  if (!process.stdin.isTTY) {
    const rl = readline.createInterface({
      input: process.stdin,
      crlfDelay: Infinity,
    });

    for await (const line of rl) {
      const trimmed = line.trim();
      if (trimmed.length > 0) {
        finalUrls.push(trimmed);
      }
    }
  }

  // Remove duplicates
  return [...new Set(finalUrls)];
}
