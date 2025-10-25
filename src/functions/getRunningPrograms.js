import { exec } from 'child_process';

/**
 * Gets a list of all running programs.
 * Uses 'tasklist' on Windows and 'ps -e -o comm=' on Linux.
 * @returns {Promise<string[]>} A promise that resolves to an array of running program names.
 */
export default function getRunningPrograms() {
    return new Promise((resolve, reject) => {
        let command;
        switch (process.platform) {
            case 'win32':
                command = 'tasklist';
                break;
            case 'linux':
                command = 'ps -e -o comm=';
                break;
            default:
                reject(new Error(`Unsupported platform: ${process.platform}`));
                return;
        }

        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            let programs;

            if (process.platform === 'win32') {
                const lines = stdout.split('\r\n').slice(3);
                programs = lines
                    .map(line => line.substring(0, 25).trim())
                    .filter(name => name && name !== '');
            } else if (process.platform === 'linux') {
                programs = stdout
                    .split('\n')
                    .map(line => line.trim())
                    .filter(name => name && name !== '');
            }

            const uniquePrograms = [...new Set(programs)];
            resolve(uniquePrograms);
        });
    });
}
