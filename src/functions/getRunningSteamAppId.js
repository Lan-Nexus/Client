import { exec } from 'child_process';

/**
 * Gets the Steam RunningAppID from the Windows registry.
 * Only works on Windows with Steam installed.
 * @returns {Promise<string|null>} The AppID of the running Steam game, or null if none.
 */
export default function getRunningSteamAppId() {
    return new Promise((resolve, reject) => {
        // PowerShell command to read RunningAppID from registry
        const command = `powershell "Try { Get-ItemProperty -Path 'HKCU:\\Software\\Valve\\Steam' -Name 'RunningAppID' | Select-Object -ExpandProperty RunningAppID } Catch { '' }"`;
        exec(command, (error, stdout) => {
            if (error) {
                resolve(null); // Steam not running or registry key missing
                return;
            }
            const appId = stdout.trim();
            // If no game is running, Steam sets this to 0 or empty
            resolve(appId && appId !== '0' ? appId : null);
        });
    });
}
