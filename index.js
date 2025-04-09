const { program } = require('commander');
const axios = require('axios');

// Define the 'delete' command
program
  .command('delete <url>')
  .description('Delete a file from the CDN by providing its URL.')
  .action(async (url) => {
    console.log(`Attempting to delete file at ${url}...`);
    try {
      const response = await axios.delete(url);
      if (response.status === 200 || response.status === 204) {
        console.log('File deletion successful!');
      } else {
        console.error(`Failed to delete file: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('An error occurred:', error.message);
      process.exit(1);
    }
  });

// If no command is provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);