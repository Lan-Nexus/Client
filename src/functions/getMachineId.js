import pkg from 'node-machine-id';
const { machineId } = pkg;

export default async function getMachineId() {
  return await machineId();
}
