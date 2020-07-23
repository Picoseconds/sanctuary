import { PacketType } from "./PacketType";

/**
 * A type alias representing the data contained within a packet
 */
type PacketData = any[];

/**
 * An enumeration containing the different sides of communication (for conflicting packets)
 */
enum Side {
  Server,
  Client,
  Both
}

/**
 * A packet of data recieved from or sent to the server
 */
class Packet {
  type: PacketType;
  data: PacketData;
  time: number;

  constructor(type: PacketType, data: PacketData, time = 0) {
    this.type = type;
    this.data = data;
    this.time = time;
  }
}

export { PacketData, Packet, Side };