/*
 * Copyright 2025 KioydioLabs
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import fs from "fs";

export async function uploadFile(
  s3: S3Client,
  uploadParams: {
    Bucket: string;
    Key: string;
    Body: fs.ReadStream;
    ContentType?: string;
  },
) {
  try {
    return await s3.send(new PutObjectCommand(uploadParams));
  } catch (err) {
    return err;
  }
}

type checkIfFileExists = {
  size?: number;
  type?: string;
  uploadedOn?: Date;
  exists: boolean;
  error?: Error;
};
export async function checkIfFileExists(
  s3: S3Client,
  params: {
    Bucket: string;
    Key: string;
  },
): Promise<checkIfFileExists> {
  try {
    const data = await s3.send(new GetObjectCommand(params));

    return {
      size: data.ContentLength,
      type: data.ContentType,
      uploadedOn: data.LastModified,
      exists: true,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    return {
      exists: false,
    };
  }
}
