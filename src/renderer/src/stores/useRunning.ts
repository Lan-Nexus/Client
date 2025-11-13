import { defineStore } from 'pinia';
import Logger from '@renderer/utils/logger.js';
import functions from '../functions.js';

const logger = Logger('useRunningStore');

export const useRunningStore = defineStore('running', {
  state: () => ({
    programs: [] as string[],
  }),
  actions: {
    init() {
      this.updatePrograms();
      setInterval(() => {
        this.updatePrograms();
      }, 5000);
    },
    async updatePrograms() {
      const programs = await functions.getRunningPrograms();
      this.programs = programs;
    },
    isRunning(program: string): boolean {
      if (!program) {
        logger.warn('isRunning called with empty program name');
        return false;
      }
      program = program.substring(0, 25); // Limit to 25 characters to avoid issues with long names as tasklist can truncate names
      logger.log(`Checking if program is running: ${program}`);
      return this.programs.includes(program);
    },

    /**
     * Check if any of the provided executables are running.
     * Handles both full paths and just filenames.
     */
    isAnyRunning(executables: string[]): boolean {
      if (!executables || executables.length === 0) {
        return false;
      }

      logger.log(`Checking if any of these executables are running: ${executables.join(', ')}`);

      for (const exe of executables) {
        // Extract filename from path if needed (handle both / and \ path separators)
        let filename = exe;
        if (exe.includes('\\') || exe.includes('/')) {
          const parts = exe.split(/[\\/]/);
          filename = parts[parts.length - 1];
        }

        // Truncate to 25 chars for tasklist compatibility
        const truncated = filename.substring(0, 25);

        logger.log(`  Checking: ${exe} -> ${filename} -> ${truncated}`);

        if (this.programs.includes(truncated)) {
          logger.log(`  ✓ Found running process: ${truncated}`);
          return true;
        }
      }

      logger.log(`  ✗ None of the executables are running`);
      return false;
    },
  },
});
