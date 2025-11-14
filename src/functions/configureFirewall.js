/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { app } from 'electron';
import { is } from '@electron-toolkit/utils';
import Logger from '../main/logger.js';

const logger = Logger('configureFirewall');
const execAsync = promisify(exec);

const RULE_NAME = 'LAN Nexus';
const PORT = 50001;

/**
 * Configures Windows Firewall to allow incoming connections on port 50001
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export default async function configureFirewall() {
  try {
    logger.log('Checking if firewall rule exists...');

    // Check if rule already exists
    const checkCommand = `netsh advfirewall firewall show rule name="${RULE_NAME}"`;

    try {
      await execAsync(checkCommand);
      logger.log('Firewall rule already exists');
      return true;
    } catch {
      // Rule doesn't exist, create it with elevated privileges
      logger.log('Creating firewall rule for port', PORT);

      return await createFirewallRuleElevated();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to configure firewall:', errorMessage);
    return false;
  }
}

/**
 * Creates firewall rule using PowerShell with elevation
 * Restricts the rule to only the current application executable
 * @returns {Promise<boolean>}
 */
async function createFirewallRuleElevated() {
  return new Promise((resolve) => {
    // In development, don't create a program-specific rule since the exe path changes
    // In production, use the actual app executable path
    let programArg = '';
    if (!is.dev) {
      const appPath = app.getPath('exe');
      programArg = ` program=\\"${appPath}\\"`;
      logger.log('Creating firewall rule for app:', appPath);
    } else {
      logger.log('Development mode: creating port-only firewall rule');
    }

    const psCommand = `Start-Process powershell -Verb RunAs -ArgumentList '-NoProfile','-Command','netsh advfirewall firewall add rule name=\\"${RULE_NAME}\\" dir=in action=allow protocol=UDP localport=${PORT} profile=any${programArg}' -WindowStyle Hidden -Wait`;

    const child = spawn('powershell.exe', ['-NoProfile', '-Command', psCommand]);

    child.on('close', (code) => {
      if (code === 0) {
        logger.log('Firewall rule created successfully with elevated privileges');
        resolve(true);
      } else {
        logger.warn('Failed to create firewall rule - user may have declined UAC prompt');
        logger.warn('Port 50001 may need to be opened manually in Windows Firewall');
        resolve(false);
      }
    });

    child.on('error', (error) => {
      logger.error('Error spawning elevated process:', error.message);
      resolve(false);
    });
  });
}

/**
 * Removes the firewall rule for port 50001
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function removeFirewallRule() {
  try {
    logger.log('Removing firewall rule...');
    const command = `netsh advfirewall firewall delete rule name="${RULE_NAME}"`;
    await execAsync(command);
    logger.log('Firewall rule removed successfully');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Failed to remove firewall rule:', errorMessage);
    return false;
  }
}
