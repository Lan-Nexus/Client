import axios from 'axios';

export async function reserveGameKey(serverAddress: string, gameId: number, clientId: string) {
  const response = await axios.post(
    `${serverAddress}/api/games/${gameId}/keys/reserve`,
    {clientId},
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data.data;
}

export async function releaseGameKey(serverAddress: string, gameId: number, keyId: number) {
  return axios.post(`${serverAddress}/api/games/${gameId}/keys/${keyId}/release`);
}

export async function loadGames(serverAddress: string,clientId: string) {
  const response = await axios.get(`${serverAddress}/api/games?clientId=${clientId}`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data.data;
}

export async function getIpAddress(serverAddress: string) {
  const response = await axios.get(`${serverAddress}/api/ip`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.data.ip;
}

export async function createUser(serverAddress: string, name: string, clientId: string) {
  const response = await axios.post(
    `${serverAddress}/api/users`,
    {
      name,
      clientId,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

export async function updateUser(serverAddress: string, clientId: string, name: string) {
  const response = await axios.patch(
    `${serverAddress}/api/users/update-by-client-id/${clientId}`,
    {
      name,
    },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
  return response.data;
}

export function generateFakeName(): string {
  const gamerNames = [
    'ShadowStrike', 'NoobSlayer', 'PixelWarrior', 'GamerGod', 'ProPlayer', 'EliteSniper', 'RageQuit', 'PwnMaster',
    'LootGoblin', 'HeadshotKing', 'CriticalHit', 'RespawnHero', 'FragMaster', 'BossRaid', 'ComboBreaker', 'SkillShot',
    'NightRaven', 'BlazeFury', 'IceCold', 'ThunderBolt', 'DragonSlayer', 'PhoenixRise', 'SteelWolf', 'VoidHunter',
    'CyberNinja', 'NeonGhost', 'QuantumLeap', 'TurboBoost', 'HyperDrive', 'LaserBeam', 'RocketJump', 'PowerCore',
    'AceSniper', 'AlphaWolf', 'BetaTester', 'GammaRay', 'DeltaForce', 'EpsilonStrike', 'ZetaHacker', 'OmegaEnd',
    'DeathBringer', 'LifeSaver', 'SoulReaper', 'MindBender', 'TimeWarp', 'SpaceRanger', 'StarCrusher', 'MoonWalker'
  ];

  const randomIndex = Math.floor(Math.random() * gamerNames.length);
  return gamerNames[randomIndex];
}
