# KioydioLabs Screenshot CDN CLI

The KioydioLabs Screenshot CDN CLI is a command-line tool that can be used to delete images or folders from a Cloudflare R2 bucket that's used with ShareX for uploading screenshots.

A guide on how to configure a bucket with ShareX can be found [here](https://blog.kioydiolabs.org/posts/sharex-r2).

## Installation

To install it, make sure you have NodeJS and npm installed, then run the command below:

```shell
npm install --global @kioydiolabs/klb-screenshot-cdn-cli
```

After it has been installed, use `cdn configure` anywhere, to setup your credentials for the bucket.

## Usage

Use `cdn delete <url>` where `<url>` is the URL of the screenshot on the bucket, to delete that screenshot. You will be asked to confirm. You can use the `-f, --force` to skip confirmation (use with caution).

## Bug reporting

You can report bugs directly in [the GitHub repository](https://github.com/kioydiolabs/klb-screenshot-cdn-cli).

## License

The project is licensed under the MIT license. **In short, you can do anything you want.** Read [LICENSE.md](LICENSE.md) for more details. We don't mind a little attribution though ;).
