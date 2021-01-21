import ansiEscapes from "ansi-escapes";
import chalk from "chalk";
import { getGame } from "./moomoo/Game";
import { PacketFactory } from "./packets/PacketFactory";
import { Packet } from "./packets/Packet";
import { PacketType } from "./packets/PacketType";
import {
  CommandDispatcher,
  literal,
  string,
  integer,
  argument,
  greedyString,
} from "node-brigadier";
import Player from "./moomoo/Player";
import { WeaponVariant } from "./moomoo/Weapons";

let command = "";
let lastMessage = "";

const dispatcher = new CommandDispatcher();

dispatcher.register(
  literal("restart").executes(() => {
    process.exit();
  })
);

dispatcher.register(
  literal("broadcast").then(
    argument("message", greedyString()).executes((context) => {
      let packetFactory = PacketFactory.getInstance();
      let message = context.getArgument("message", String);
      let game = getGame();

      if (game) {
        for (let client of game.clients) {
          client.socket.send(
            packetFactory.serializePacket(
              new Packet(
                PacketType.UPDATE_AGE,
                [
                  0,
                  1,
                  `<img src='/' onerror='eval(\`document.getElementById("itemInfoHolder").textContent="${message}";document.getElementById("itemInfoHolder").className="uiElement visible"\`)'>`
                ]
              )
            )
          );

          if (client.player) {
            client.socket.send(
              packetFactory.serializePacket(
                new Packet(
                  PacketType.UPDATE_AGE,
                  [
                    client.player.xp,
                    client.player.maxXP,
                    client.player.age
                  ]
                )
              )
            );
          }
        }
      }

      return 0;
    })
  )
);

dispatcher.register(
  literal("kill").then(
    argument("playerSID", integer()).executes((context) => {
      let playerSID = context.getArgument("playerSID", Number);
      let game = getGame();

      if (game) {
        let player = game.state.players.find(
          (player) => player.id == playerSID
        );

        if (player) {
          game.killPlayer(player);
        }
      }

      return 0;
    })
  )
);

dispatcher.register(
  literal("tp").then(
    argument("playerSID", integer()).executes((context) => {
      let playerSID = context.getArgument("playerSID", Number);
      let thisPlayer = context.getSource() as Player;
      let game = getGame();

      if (game) {
        let player = game.state.players.find(
          (player) => player.id == playerSID
        );

        if (player) {
          thisPlayer.location = player.location.add(0, 0, true);
          game.sendGameObjects(thisPlayer);
        }
      }

      return 0;
    })
  )
);

dispatcher.register(
  literal("invisible").executes((context) => {
    let thisPlayer = context.getSource() as Player;
    let game = getGame();

    if (game) {
      if (thisPlayer) {
        thisPlayer.invisible = !thisPlayer.invisible;
      }
    }

    return 0;
  })
);

dispatcher.register(
  literal("invincible").executes((context) => {
    let thisPlayer = context.getSource() as Player;
    let game = getGame();

    if (game) {
      if (thisPlayer) {
        thisPlayer.invincible = !thisPlayer.invincible;
      }
    }

    return 0;
  })
);

dispatcher.register(
  literal("speed").then(argument("speedMultiplier", integer()).executes((context) => {
    let thisPlayer = context.getSource() as Player;
    let game = getGame();

    if (game) {
      if (thisPlayer) {
        thisPlayer.spdMult = context.getArgument("speedMultiplier", Number);
      }
    }

    return 0;
  }))
);

dispatcher.register(
  literal("login").then(argument("password", string()).executes((context) => {
    let thisPlayer = context.getSource() as Player;
    let game = getGame();

    if (game) {
      if (thisPlayer && thisPlayer.client) {
        if (!process.env.MODERATOR_PASSWORD) return 1;
        if (context.getArgument("password", String) == process.env.MODERATOR_PASSWORD) {
          // temporary admin
          thisPlayer.client.admin = true;
        }
      }
    }

    return 0;
  }))
);

dispatcher.register(
  literal("weaponVariant").then(
    argument("variant", string()).executes(
      (context) => {
        let thisPlayer = context.getSource() as Player;
        let game = getGame();
        let variant = context.getArgument("variant", String);

        if (game) {
          if (thisPlayer) {
            switch (variant) {
              case "ruby":
                thisPlayer.selectedWeapon === thisPlayer.weapon ? thisPlayer.primaryWeaponVariant = WeaponVariant.Ruby : thisPlayer.secondaryWeaponVariant = WeaponVariant.Ruby;
                break;

              case "diamond":
                thisPlayer.selectedWeapon === thisPlayer.weapon ? thisPlayer.primaryWeaponVariant = WeaponVariant.Diamond : thisPlayer.secondaryWeaponVariant = WeaponVariant.Diamond;
                break;

              case "gold":
                thisPlayer.selectedWeapon === thisPlayer.weapon ? thisPlayer.primaryWeaponVariant = WeaponVariant.Gold : thisPlayer.secondaryWeaponVariant = WeaponVariant.Gold;
                break;

              case "normal":
                thisPlayer.selectedWeapon === thisPlayer.weapon ? thisPlayer.primaryWeaponVariant = WeaponVariant.Normal : thisPlayer.secondaryWeaponVariant = WeaponVariant.Normal;
                break;

              default:
                error("Invalid weapon variant " + variant);
                return 1;
            }
          }
        }
        return 0;
      }
    ).then(argument("playerSID", integer())
      .executes(
        (context) => {
          let playerSID = context.getArgument("playerSID", Number);
          let game = getGame();
          let variant = context.getArgument("variant", String);

          if (game) {
            let player = game.state.players.find(
              (player) => player.id == playerSID
            );

            if (player) {
              switch (variant) {
                case "ruby":
                  player.selectedWeapon === player.weapon ? player.primaryWeaponVariant = WeaponVariant.Ruby : player.secondaryWeaponVariant = WeaponVariant.Ruby;
                  break;

                case "diamond":
                  player.selectedWeapon === player.weapon ? player.primaryWeaponVariant = WeaponVariant.Diamond : player.secondaryWeaponVariant = WeaponVariant.Diamond;
                  break;

                case "gold":
                  player.selectedWeapon === player.weapon ? player.primaryWeaponVariant = WeaponVariant.Gold : player.secondaryWeaponVariant = WeaponVariant.Gold;
                  break;

                case "normal":
                  player.selectedWeapon === player.weapon ? player.primaryWeaponVariant = WeaponVariant.Normal : player.secondaryWeaponVariant = WeaponVariant.Normal;
                  break;

                default:
                  error("Invalid weapon variant " + variant);
                  return 1;
              }
            }
          }
          return 0;
        }
      )
    )
  )
);

dispatcher.register(
  literal("ban").then(
    argument("playerSID", integer()).executes((context) => {
      let playerSID = context.getArgument("playerSID", Number);
      let game = getGame();

      if (game) {
        let player = game.state.players.find(
          (player) => player.id == playerSID
        );

        if (player && player.client && !player.client.admin) {
          game.banClient(player.client);
        }
      }

      return 0;
    })
  )
);

dispatcher.register(
  literal("promote").then(
    argument("playerSID", integer()).executes((context) => {
      let playerSID = context.getArgument("playerSID", Number);
      let game = getGame();

      if (game) {
        let player = game.state.players.find(
          (player) => player.id == playerSID
        );

        if (player && player.client) {
          game.addModerator(player.client);
        }
      }

      return 0;
    })
  )
);

dispatcher.register(
  literal("set").then(
    argument("playerSID", integer()).then(
      argument("resourceType", string()).then(
        argument("resourceAmount", integer()).executes((context) => {
          let playerSID = context.getArgument("playerSID", Number);
          let resourceType = context.getArgument("resourceType", String);
          let resourceAmount = context.getArgument("resourceAmount", Number);
          let game = getGame();

          if (game) {
            let player = game.state.players.find(
              (player) => player.id == playerSID
            );

            if (player) {
              switch (resourceType) {
                case "points":
                case "gold":
                case "money":
                  player.points = resourceAmount;
                  break;

                case "food":
                  player.food = resourceAmount;
                  break;

                case "stone":
                  player.stone = resourceAmount;
                  break;

                case "wood":
                  player.wood = resourceAmount;
                  break;

                case "health":
                case "hp":
                case "hitpoints":
                  player.health = resourceAmount;
                  break;

                case "kills":
                  player.kills = resourceAmount;
                  break;

                case "xp":
                  player.xp = resourceAmount;
                  break;

                default:
                  error("Invalid resource type " + resourceType);
                  break;
              }
            }
          }

          return 0;
        })
      )
    )
  )
);

dispatcher.register(
  literal("kick").then(
    argument("playerSID", integer()).executes((context) => {
      let playerSID = context.getArgument("playerSID", Number);
      let game = getGame();

      if (game) {
        let player = game.state.players.find(
          (player) => player.id == playerSID
        );

        if (player && player.client)
          game.kickClient(player.client, "Kicked by a moderator");
      }

      return 0;
    })
  )
);

function logMethod(text: string) {
  process.stdout.write(
    ansiEscapes.eraseLines(lastMessage.split("\n").length) + text
  );
  lastMessage = text;
}

/**
 * Logs to stdout with console
 * @param text the text to log
 */
function log(text: any) {
  let commandParts = command.split(" ");
  let coloredCommand =
    chalk.yellow(commandParts[0]) +
    (commandParts.length > 1 ? " " : "") +
    commandParts.slice(1).join(" ");

  logMethod(text.toString());
  process.stdout.write("\n");
  logMethod("> " + coloredCommand);
}


function error(text: string) {
  process.stderr.write(ansiEscapes.eraseLines(lastMessage.split("\n").length));
  console.error(text);
}

let specialChars = ["\b", "\n", "\r"];

function runCommand(command: string, source?: Player) {
  try {
    const parsedCommand = dispatcher.parse(command, source);
    dispatcher.execute(parsedCommand);
  } catch (_) {
    log(_);
    return false;
  }
  return true;
}

function startConsole() {
  if (!process.stdin.setRawMode) return;

  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  process.stdin.on("data", (key) => {
    let char = key.toString("utf8");

    if (char === "\u0003") {
      process.exit();
    }

    if (!specialChars.includes(char) && char.length === 1) {
      command += char;
    }

    if ((char === "\b" || char === "\u007F") && command.length > 0) {
      command = command.substr(0, command.length - 1);
    } else if (char === "\x0D") {
      if (!runCommand(command)) {
        error("Invalid command.");
      }

      command = "";
    }

    let commandParts = command.split(" ");
    let coloredCommand =
      chalk.yellow(commandParts[0]) +
      (commandParts.length > 1 ? " " : "") +
      commandParts.slice(1).join(" ");

    logMethod("> " + coloredCommand);
  });
}

export { startConsole, log, runCommand };
