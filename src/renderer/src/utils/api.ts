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
  const firstNames = [
    'Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Quinn', 'Drew',
    'Blake', 'Cameron', 'Avery', 'Sage', 'River', 'Rowan', 'Skyler', 'Parker',
    'Emery', 'Finley', 'Hayden', 'Jamie', 'Logan', 'Reese', 'Sam', 'Dakota'
  ];

  const lastNames = [
    'Smith', 'Johnson', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
    'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson',
    'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez', 'Lewis', 'Lee',
    'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Lopez', 'Hill'
  ];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName}`;
}
