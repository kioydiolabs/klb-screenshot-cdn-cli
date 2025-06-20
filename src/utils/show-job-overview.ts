/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import chalk from "chalk";

export function showJobOverview(inputs: {
  filesFetched?: number;
  filesDeleted?: number;
  filesPurged?: number;
  urls?: number;
  filesUploaded?: number;
  onlyHeader?: boolean;
}) {
  if (inputs.onlyHeader) {
    return chalk.bgWhiteBright.black.bold("\n\nJob overview:\n");
  }
  let jobOverviewString: string = "";
  jobOverviewString += chalk.bgWhiteBright.black.bold("\n\nJob overview:\n");
  if (inputs.filesUploaded) {
    jobOverviewString += chalk.whiteBright(
      `Files uploaded by user: ${inputs.filesUploaded}`,
    );
  }
  if (inputs.urls) {
    jobOverviewString += chalk.whiteBright(
      `URLs Provided by user: ${inputs.urls}\n`,
    );
  }
  if (inputs.filesFetched) {
    jobOverviewString += chalk.whiteBright(
      `Files found: ${inputs.filesFetched}\n`,
    );
  }
  if (inputs.filesDeleted && inputs.filesFetched) {
    if (inputs.filesDeleted == inputs.filesFetched) {
      jobOverviewString += chalk.whiteBright(
        `Files deleted successfully: ${inputs.filesDeleted}/${inputs.filesFetched}\n`,
      );
    } else {
      jobOverviewString += chalk.redBright(
        `Files deleted successfully: ${inputs.filesDeleted}/${inputs.filesFetched}\n`,
      );
    }
  }
  if (inputs.filesDeleted && inputs.filesFetched) {
    if (inputs.filesPurged == inputs.filesDeleted) {
      jobOverviewString += chalk.whiteBright(
        `Files purged from cache: ${inputs.filesPurged}/${inputs.filesDeleted}\n\n`,
      );
    } else {
      jobOverviewString += chalk.redBright(
        `Files purged from cache: ${inputs.filesPurged}/${inputs.filesDeleted}\n\n`,
      );
    }
  }

  return jobOverviewString;
}
