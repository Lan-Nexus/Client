import { spawn } from 'child_process';

/**
 * Executes a program using an absolute path (for shortcuts and external executables).
 * This bypasses the game directory system and launches the executable directly.
 *
 * @param {string} absolutePath - The absolute path to the executable to run.
 * @param {string[]} [params=[]] - Optional parameters to pass to the executable.
 * @returns {Promise<void>} Resolves when the process has been launched.
 *
 * @throws {Error} If the executable fails to start.
 */
export default async function (absolutePath, params = []) {
  console.log(`Running direct command: ${absolutePath} with params:`, params);

  return new Promise((resolve, reject) => {
    // Use spawn for better handling of paths with spaces
    const child = spawn(absolutePath, params, {
      detached: true,
      stdio: 'ignore',
      shell: false,
    });

    // Unref the child process so it can run independently
    child.unref();

    child.on('error', (error) => {
      console.error(`Failed to start process: ${error.message}`);
      reject(new Error(`Failed to launch: ${error.message}`));
    });

    // For shortcuts, we consider it successful if it starts
    // We don't wait for it to exit
    console.log(`Process started successfully with PID: ${child.pid}`);
    resolve();
  });
}
