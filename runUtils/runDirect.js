import { spawn } from 'child_process';

export default function () {
  return {
    name: 'runDirect',
    description: 'Runs a command using an absolute path (for shortcuts and external executables)',
    usage: 'runDirect ABSOLUTE_PATH',
    args: [
      {
        name: 'ABSOLUTE_PATH',
        description: 'The absolute path to the executable to run.',
        required: true,
      },
    ],
    action(absolutePath, params) {
      return new Promise((resolve, reject) => {
        // Expand environment variables in the path
        const expandedPath = absolutePath.replace(/%([^%]+)%/g, (_, key) => process.env[key] || '');

        console.log(`Running direct command1: ${expandedPath} with params:`, params);

        // Use spawn instead of execFile for better handling of paths with spaces
        const child = spawn(expandedPath, params || [], {
          detached: true,
          stdio: 'ignore',
          shell: false,
        });

        // Unref the child process so it can run independently
        child.unref();

        child.on('error', (error) => {
          console.error(`Failed to start process: ${error.message}`);
          reject({ error, exitCode: 'FAILED_TO_START', stdout: '', stderr: error.message });
        });

        // For shortcuts, we consider it successful if it starts
        // We don't wait for it to exit
        console.log(`Process started successfully with PID: ${child.pid}`);
        resolve({ stdout: '', stderr: '', exitCode: 0, pid: child.pid });
      });
    },
  };
}
