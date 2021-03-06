import { Socket } from 'socket.io';

export interface Room {
  sockets: {
    user: string,
    socket: Socket
  }[]
  id: number;
  start: boolean;
  end: boolean;
  custom: boolean;
  Players : string[];
  ingame: boolean;
  p1position: number;
  p2position: number;
  p1score: number;
  p2score: number;
  p1direction: number;
  p2direction: number;
  countdown: number;
  spectators: string[];
  speed: number;
  powerups: boolean;
  powerspecs: {
    type: number;
    x: number;
    y: number;
  }
  ballposition: {
    x: number;
    y: number;
    dir: number;
    coeff: number;
  };
 }
