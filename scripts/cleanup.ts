#!/usr/bin/env tsx
/**
 * Cleanup Script
 * Removes temporary files and directories created during build
 */

import { existsSync, rmSync } from 'fs';
import { join } from 'path';
import chalk from 'chalk';

const TEMP_DIRS = ['.repos', 'node_modules/.cache', 'dist/.repos', 'tmp', 'temp', '.cache'];

const TEMP_FILES = [
  'dist/manifest.json', // Internal manifest, not needed in production
];

function main() {
  console.log(chalk.blue.bold('\n🧹 Cleanup Script\n'));

  let cleanedCount = 0;

  // Remove temporary directories
  for (const dir of TEMP_DIRS) {
    const fullPath = join(process.cwd(), dir);
    if (existsSync(fullPath)) {
      try {
        rmSync(fullPath, { recursive: true, force: true });
        console.log(chalk.green(`✓ Removed ${dir}`));
        cleanedCount++;
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not remove ${dir}: ${error}`));
      }
    }
  }

  // Remove temporary files
  for (const file of TEMP_FILES) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      try {
        rmSync(fullPath, { force: true });
        console.log(chalk.green(`✓ Removed ${file}`));
        cleanedCount++;
      } catch (error) {
        console.warn(chalk.yellow(`⚠️  Could not remove ${file}: ${error}`));
      }
    }
  }

  if (cleanedCount === 0) {
    console.log(chalk.cyan('ℹ️  No temporary files to clean up'));
  } else {
    console.log(chalk.green.bold(`\n✅ Cleaned up ${cleanedCount} item(s)\n`));
  }
}

main();
