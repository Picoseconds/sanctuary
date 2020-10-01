# sanctuary [![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-success.svg)](https://GitHub.com/Picoseconds/sanctuary/graphs/commit-activity) [![Written in TypeScript](https://img.shields.io/badge/types-typescript-success)](https://github.com/microsoft/TypeScript/)
Sanctuary is a private server implementation for the game MooMoo.io.

## Features
See [Issue #16](https://github.com/Picoseconds/sanctuary/issues/16) for a list of current features supported.

## Getting started
1. Clone the repo
```
git clone https://github.com/Picoseconds/sanctuary.git
```
2. Compile with `npm run build` **OR** `yarn build` depending on your package manager of choice.
3. Run the server with `npm start`/`yarn start`

## Project Scope
The goal of the Sanctuary project is to create a customizable, modular private server for MooMoo.io. This means that some features will be implemented differently to support configuration using environment variables.

See [Environment Variables](#environment-variables).

### Environment variables
| Variable name            | Effect                                                                                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| PORT                     | The port that the server binds on, defaults to 3000.                                                                      |
| MAX_CPS                  | The CPS cap to use, defaults to 25.                                                                                       |
| PLAYER_NEARBY_RADIUS     | The radius that players can see other players in.                                                                         |
| GAMEOBJECT_NEARBY_RADIUS | The radius that players can see structures (this includes trees, bushes and all other naturally generated structures) in. |
| MODERATOR_PASSWORD       | See [Password Login System](#password-login-system)                                                                       |

This project utilises .env files with the `dotenv` module for configuration. Simply make a file named `.env` in the root of the cloned repo, and populate it with environment variables.

A .env file is similar to a Unix shell file, and uses the same syntax for assigning environment variables.  
Sample .env file:
```bash
PORT=8080
MAX_CPS=20
MODERATOR_PASSWORD=password123
```

## Moderation Commands
| Command                                                                      | Use                                                                                                  |
| ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| set \<player id> \<health/food/wood/stone/kills/xp/gold> \<number>           | Sets the specified numerical attribute of a player to the specified number.                          |
| tp \<destination player id>                                                  | Teleports you to the player specified.                                                               |
| invisible                                                                    | Toggles invisibility. You can see yourself, but others cannot see you.                               |
| invincible                                                                   | Toggles invincibility.                                                                               |
| promote \<player id>                                                         | Makes someone else a moderator.                                                                      |
| ban \<player id>                                                             | Bans someone by IP address. Moderators cannot be banned.                                             |
| kick \<player id>                                                            | Kicks a user.                                                                                        |
| broadcast \<message>                                                         | Displays a message in the top left of everyone's screen (including yours).                           |
| restart                                                                      | Stops the server.                                                                                    |
| speed \<speed multiplier>                                                    | Changes your speed.                                                                                  |
| weaponVariant \<ruby/gold/diamond/normal> [player id (defaults to yourself)] | Changes the variant of the currently selected weapon of the player. |
| login \<password>                                                            | See [Password Login System](#password-login-system)                                                  |

Commands can be called from the terminal that Sanctuary is run from, and from chat.

While Sanctuary doesn't enforce this with chat commands, with the normal MooMoo.io client, chat has a 15 character limit.
When called from chat, commands must be prefixed with a `/` (slash) to differentiate them from normal chat.

The player ID can be found from the API, or by the number beside the player's name.

## Password Login System
Sanctuary provides an additional login system for cases where not all moderators can be fully trusted. In this scheme, a password is used. The password is set with the environment variable `MODERATOR_PASSWORD`.  
Admins utilize the `/login` command to log in. A major problem with this system's current implementation is that these temporary "admins" are able to use `/promote` to become permanent admins, so this system is not quite ready for production.

## REST API
Sanctuary implements a rudimentary REST API, with only two endpoints:
### `/api/v1/players`
Lists the currently connected clients. Output takes the following format (as a TypeScript type):
```ts
{
  'type': 'success' | 'error',
  'clients': { playerName: string = 'unknown', playerID: number = -1, clientIPHash: string }[] | undefined,
  'message': string | undefined
}
```

### `/api/v1/playerCount`
Reports the amount of currently connected clients. Output takes the following format (as a TypeScript type):
```ts
{
  'type': 'success' | 'error',
  'playerCount': number | undefined,
  'message': string | undefined
}
```
