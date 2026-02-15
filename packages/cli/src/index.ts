#!/usr/bin/env npx tsx

import { Command } from 'commander';
import { jackCommand } from './commands/jack';
import { ingestCommand } from './commands/ingest';
import { configCommand } from './commands/config';

const program = new Command();

program
  .name('skilljack')
  .description('Turn any YouTube video into a Claude Code skill')
  .version('1.0.0')
  .addCommand(jackCommand, { isDefault: true })
  .addCommand(ingestCommand)
  .addCommand(configCommand);

program.parse();
