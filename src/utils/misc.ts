/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { loadCredentials } from "./credentials.js";
import chalk from "chalk";

export function capitalizeFirstLetter(inputString: string) {
  return (
    String(inputString).charAt(0).toUpperCase() + String(inputString).slice(1)
  );
}

export function generateRandomID(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export function constructFileUrl(key: string) {
  const { domain } = loadCredentials();
  return `https://${domain}/${key}`;
}

export function getFilenameExtension(filename) {
  const base = filename.substring(filename.lastIndexOf("/") + 1); // remove path if any
  const lastDot = base.lastIndexOf(".");
  if (lastDot === -1 || lastDot === 0) return ""; // no extension or hidden file
  return base.substring(lastDot + 1);
}

export const cancelGracefully = (message?: string, bye?: boolean = true) => {
  console.log(chalk.green(message ? message : "Cancelled"));
  if (bye) console.log(chalk.cyanBright.bold("\nBye!\n"));
  process.exit(0);
};
