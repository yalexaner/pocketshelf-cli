import { program } from "commander";
import { infoCommand } from "./src/commands/info";
import {
  listBooksCommand,
  listShelvesCommand,
  listAuthorsCommand,
} from "./src/commands/list";
import { showCommand, showSessionsCommand } from "./src/commands/show";
import { statsCommand } from "./src/commands/stats";

program
  .name("bookshelf")
  .description("CLI for managing Pocketshelf book library backups")
  .version("0.1.0")
  .option("-f, --file <path>", "backup file path (default: $BOOKSHELF_FILE or ./file)")
  .option("--json", "output as JSON");

// info command
program
  .command("info")
  .description("Show backup file metadata")
  .action(async () => {
    const opts = program.opts();
    await infoCommand({ file: opts.file, json: opts.json });
  });

// list commands
const list = program.command("list").description("List items from the library");

list
  .command("books")
  .description("List all publications")
  .option("-s, --shelf <name>", "filter by shelf")
  .option("-t, --type <type>", "filter by type (book/audiobook)")
  .option("-a, --author <name>", "filter by author")
  .action(async (cmdOpts) => {
    const opts = program.opts();
    await listBooksCommand({
      file: opts.file,
      json: opts.json,
      shelf: cmdOpts.shelf,
      type: cmdOpts.type,
      author: cmdOpts.author,
    });
  });

list
  .command("shelves")
  .description("List all shelves with book counts")
  .action(async () => {
    const opts = program.opts();
    await listShelvesCommand({ file: opts.file, json: opts.json });
  });

list
  .command("authors")
  .description("List all authors with book counts")
  .action(async () => {
    const opts = program.opts();
    await listAuthorsCommand({ file: opts.file, json: opts.json });
  });

// show commands
const show = program.command("show").description("Show detailed information");

show
  .command("book <id>")
  .description("Show detailed info for a specific book")
  .action(async (id) => {
    const opts = program.opts();
    await showCommand(id, { file: opts.file, json: opts.json });
  });

show
  .command("sessions <id>")
  .description("Show reading sessions for a book")
  .action(async (id) => {
    const opts = program.opts();
    await showSessionsCommand(id, { file: opts.file, json: opts.json });
  });

// stats command
program
  .command("stats")
  .description("Show library statistics")
  .action(async () => {
    const opts = program.opts();
    await statsCommand({ file: opts.file, json: opts.json });
  });

program.parse();
