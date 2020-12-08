import { WebSocket } from "uWebSockets.js";
import Game from "./Game";

/**
 * Gets a unique (if game is passed) id for a MooMoo.io client
 * @param game A game containing client IDs to skip
 */
function getID(game: Game | null = null) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz1234567890=-+_$%?/";

  function randString() {
    return new Array(10)
      .fill(0)
      .reduce(
        (acc, _item) =>
          acc + alphabet[Math.floor(Math.random() * alphabet.length)],
        ""
      );
  }

  let id = randString();

  if (game) {
    while (game.clients.some((client) => client.id == id)) {
      id = randString();
    }
  }

  return id;
}

/**
 * Starts a MooMoo.io/Sanctuary server on an existing ws.Server
 * @param server the ws.Server to use
 */
export function startServer() {
  let game = new Game();
  return [
    (socket: WebSocket) => {
      game.addClient(
        getID(game),
        socket,
        Buffer.from(socket.getRemoteAddressAsText()).toString("utf8")
      );
    },
    game.clientClose.bind(game),
  ];
}
