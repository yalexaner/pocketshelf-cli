import { program } from "commander";
import { infoCommand } from "./src/commands/info";
import {
  listBooksCommand,
  listShelvesCommand,
  listAuthorsCommand,
} from "./src/commands/list";
import { showCommand, showSessionsCommand } from "./src/commands/show";
import { statsCommand } from "./src/commands/stats";
import { addBookCommand, addSessionCommand } from "./src/commands/add";
import { editBookCommand, editSessionCommand } from "./src/commands/edit";
import { deleteBookCommand, deleteSessionCommand } from "./src/commands/delete";
import { interactiveCommand } from "./src/commands/interactive";

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

// add commands
const add = program.command("add").description("Add items to the library");

add
  .command("book [name]")
  .description("Add a new book")
  .option("--from <file>", "import book(s) from JSON file")
  .option("-a, --author <name>", "author name")
  .option("-t, --type <type>", "publication type (book/audiobook)", "book")
  .option("--book-type <type>", "book type (paperback/hardcover/ebook)")
  .option("-s, --shelf <name>", "shelf name", "To Read")
  .option("--narrator <name>", "narrator (for audiobooks)")
  .option("--isbn <isbn>", "ISBN number")
  .option("--publisher <name>", "publisher name")
  .option("--pages <range>", "page range (e.g., 1-350)")
  .option("--duration <time>", "duration (e.g., 3600 or 1h30m)")
  .action(async (name, cmdOpts) => {
    const opts = program.opts();
    await addBookCommand(name, {
      file: opts.file,
      from: cmdOpts.from,
      author: cmdOpts.author,
      type: cmdOpts.type,
      bookType: cmdOpts.bookType,
      shelf: cmdOpts.shelf,
      narrator: cmdOpts.narrator,
      isbn: cmdOpts.isbn,
      publisher: cmdOpts.publisher,
      pages: cmdOpts.pages,
      duration: cmdOpts.duration,
    });
  });

add
  .command("session <book-id>")
  .description("Add a reading session to a book")
  .option("--start <value>", "starting page/time")
  .option("--end <value>", "ending page/time")
  .option("--notes <text>", "session notes")
  .action(async (bookId, cmdOpts) => {
    const opts = program.opts();
    await addSessionCommand(bookId, {
      file: opts.file,
      start: cmdOpts.start,
      end: cmdOpts.end,
      notes: cmdOpts.notes,
    });
  });

// edit commands
const edit = program.command("edit").description("Edit items in the library");

edit
  .command("book <id>")
  .description("Edit a book")
  .option("-n, --name <name>", "book name")
  .option("-a, --author <name>", "author name")
  .option("-t, --type <type>", "publication type (book/audiobook)")
  .option("--book-type <type>", "book type (paperback/hardcover/ebook)")
  .option("-s, --shelf <name>", "shelf name")
  .option("--narrator <name>", "narrator (for audiobooks)")
  .option("--isbn <isbn>", "ISBN number")
  .option("--publisher <name>", "publisher name")
  .option("--pages <range>", "page range (e.g., 1-350)")
  .option("--duration <time>", "duration (e.g., 3600 or 1h30m)")
  .option("--description <text>", "book description")
  .action(async (id, cmdOpts) => {
    const opts = program.opts();
    await editBookCommand(id, {
      file: opts.file,
      name: cmdOpts.name,
      author: cmdOpts.author,
      type: cmdOpts.type,
      bookType: cmdOpts.bookType,
      shelf: cmdOpts.shelf,
      narrator: cmdOpts.narrator,
      isbn: cmdOpts.isbn,
      publisher: cmdOpts.publisher,
      pages: cmdOpts.pages,
      duration: cmdOpts.duration,
      description: cmdOpts.description,
    });
  });

edit
  .command("session <id>")
  .description("Edit a reading session")
  .option("--start <value>", "starting page/time")
  .option("--end <value>", "ending page/time")
  .option("--notes <text>", "session notes")
  .action(async (id, cmdOpts) => {
    const opts = program.opts();
    await editSessionCommand(id, {
      file: opts.file,
      start: cmdOpts.start,
      end: cmdOpts.end,
      notes: cmdOpts.notes,
    });
  });

// delete commands
const del = program.command("delete").description("Delete items from the library");

del
  .command("book <id>")
  .description("Delete a book")
  .option("--force", "skip confirmation")
  .action(async (id, cmdOpts) => {
    const opts = program.opts();
    await deleteBookCommand(id, {
      file: opts.file,
      force: cmdOpts.force,
    });
  });

del
  .command("session <id>")
  .description("Delete a reading session")
  .option("--force", "skip confirmation")
  .action(async (id, cmdOpts) => {
    const opts = program.opts();
    await deleteSessionCommand(id, {
      file: opts.file,
      force: cmdOpts.force,
    });
  });

// interactive command
program
  .command("interactive")
  .alias("i")
  .description("Launch interactive TUI mode")
  .action(async () => {
    const opts = program.opts();
    await interactiveCommand({ file: opts.file });
  });

program.parse();
