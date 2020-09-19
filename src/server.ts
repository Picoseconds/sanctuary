import dotenv from 'dotenv';
import SHA256 from 'fast-sha256';
import arrayBufferToHex from 'array-buffer-to-hex';
import nunjucks from "nunjucks";
import uWS, { HttpResponse, RecognizedString, WebSocket } from "uWebSockets.js";

import * as console from './console';
import { startServer } from './moomoo/moomoo';
import { getGame } from './moomoo/Game';
import { TextEncoder } from 'util';

dotenv.config();

nunjucks.configure('views', { autoescape: true });

const port = process.env.PORT;
const VERSION = "0.0.0a";

function format(timestamp: number) {
  var hours = Math.floor(timestamp / (60 * 60));
  var minutes = Math.floor(timestamp % (60 * 60) / 60);
  var seconds = Math.floor(timestamp % 60);

  return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
}

const [addClient, removeClient] = startServer();

const app = (uWS.App()).ws('/*', {
	compression: uWS.SHARED_COMPRESSOR,
	maxPayloadLength: 16 * 1024 * 1024,
	idleTimeout: 10,
	open: (ws: WebSocket) => {
		ws.subscribe("broadcast");
		ws.binaryType = "arraybuffer";
		ws.msgQueue = [];
		ws._send = ws.send;
		ws.send = function (e: RecognizedString) {
			try {
				if (ws.getBufferedAmount() < 1024) ws._send(e, !0);
				else ws.msgQueue.push(e);
			} catch (e) { }
			return !1;
		}
		addClient(ws);
	},
	drain: (ws: WebSocket) => {
		while (ws.getBufferedAmount() < 1024 && ws.msgQueue.length)
			ws._send(ws.msgQueue.shift(), !0);
	},
	message: (ws: WebSocket, message: any, isBinary: boolean) => {
		ws.msgHandler(message, isBinary)
	},
	close: (ws: WebSocket) => {
		removeClient(ws);
	},
});

app.get('sanctuary', (res: HttpResponse) => {
    res.end(nunjucks.render('version.html', { version: VERSION, nodeVersion: process.version, uptime: format(process.uptime()) }));
});

app.get('/uptime', (res: HttpResponse) => {
  res.end(format(process.uptime()));
});

app.get('/api/v1/playerCount', (res: HttpResponse) => {
  let game = getGame();

  if (!game) {
    res.end(JSON.stringify({ type: "error", message: "No game active." }));
  } else {
    res.end(JSON.stringify({ type: "success", playerCount: game.clients.length }));
  }
});

app.get('/api/v1/players', (res: HttpResponse) => {
  let game = getGame();

  if (!game) {
    res.end(JSON.stringify({ type: "error", message: "No game active." }));
  } else {
    let clients: { clientIPHash: string, playerName: string, playerID: number }[] = [];

    for (let client of game.clients) {
      clients.push(
        {
          clientIPHash: arrayBufferToHex(SHA256(new TextEncoder().encode(client.ip))),
          playerName: client.player?.name || "unknown",
          playerID: client.player?.id || -1
        }
      );
    }

    res.end(JSON.stringify({ type: "success", clients: clients }));
  }
});

app.get('/*', (res: HttpResponse) => {
	res.writeStatus('301 Moved Permanently');
	res.writeHeader('location', `http://moomoo.io`);
	res.end();
});

console.startConsole();

app.listen(port ? parseInt(port) : 3000, () => console.log(`Sanctuary listening at https://localhost:${port || 3000}`));