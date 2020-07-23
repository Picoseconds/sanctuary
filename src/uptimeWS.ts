import WebSocket from 'ws';
import { Server as WSServer } from 'ws';
import { Server as HTTPServer } from 'http';

function format(timestamp: number) {
    var hours = Math.floor(timestamp / (60 * 60));
    var minutes = Math.floor(timestamp % (60 * 60) / 60);
    var seconds = Math.floor(timestamp % 60);

    return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
}

export default class UptimeWSServer {
  public sockets: WebSocket[] = [];
  public sendInterval: NodeJS.Timeout | null = null;

  constructor(uptimeServer: WSServer) {
    uptimeServer.addListener("connection", socket => {
      if (!this.sendInterval)
        this.sendInterval = setInterval(this.sendUptime.bind(this), 10);
        
      this.sockets.push(socket);

      socket.addEventListener("close", () => {
        let socketIndex = this.sockets.indexOf(socket);

        if (socketIndex > -1)
          this.sockets.splice(socketIndex, 1);

        if (this.sockets.length == 0 && this.sendInterval) {
          clearInterval(this.sendInterval);
          this.sendInterval = null;
        }
      })
    });

    uptimeServer.addListener("close", () => {
      if (this.sendInterval)
        clearInterval(this.sendInterval);
    });
  }

  sendUptime() {
    for (let socket of this.sockets) {
      socket.send(format(process.uptime()));
    }
  }
}