import { StringSchema } from '@hapi/joi';
import { Param } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody, OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { useContainer } from 'class-validator';
import { use } from 'passport';
import { Server, Socket } from 'socket.io';
import { UsersService } from 'src/users/users.service';
import { ChatService } from './chat.service';
 
@WebSocketGateway({cors: true})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService,
    private readonly userService: UsersService
  ) {
  }

  public tab: {[key: string]: Socket} = {}
  public players: string[] = [];

  @SubscribeMessage('connection')
  async handleConnection(socket: Socket) {
    console.log('new client connected');
    socket.emit('connection', null);
  }

  @SubscribeMessage('disconnect')
  async handleDisconnect(socket: Socket) {
    var username = Object.keys(this.tab).find(k => this.tab[k] === socket);
    if (username) {
    console.log(username + ' disconnected');
    delete this.tab[username];
    var user = await this.userService.getByUsername(username);
    user.status = 'offline';
    await this.userService.save(user);
    this.server.emit('status',{username, status:'offline'});
    }
    else
      console.log('disconnect');
  }

  @SubscribeMessage('login')
  async handleLogin(@MessageBody() username: string, @ConnectedSocket() socket: Socket) {
    if (!(username in this.tab))
    {
      this.tab[username] = socket;
      console.log(username + ' logged in');
      var user = await this.userService.getByUsername(username);
      user.status = 'online';
      await this.userService.save(user);
      this.server.emit('status', {username, status:'online'});
    }
  }

  @SubscribeMessage('logout')
  async handleLogout(@MessageBody() username: string, @ConnectedSocket() socket: Socket) {
    if ((username in this.tab))
    {
      delete this.tab[username];
      console.log(username + ' logged out');
      var user = await this.userService.getByUsername(username);
      user.status = 'offline';
      await this.userService.save(user);
      this.server.emit('status', {username, status: 'offline'});
    }
  }


  @SubscribeMessage('send_message')
  async listenForMessages(
    @MessageBody() message: {
      channel: string,
      content: string
    },
    @ConnectedSocket() socket: Socket) {
    const username = Object.keys(this.tab).find((k) => this.tab[k] === socket);
    const res = await this.chatService.saveMessage(message, username);
    console.log(res);
    this.server.sockets.emit('receive_message', res);
  }

  @SubscribeMessage('request_all_messages')
  async requestAllMessages(
    @ConnectedSocket() socket: Socket, 
    @MessageBody() channel: string) {
    const messages = await this.chatService.getAllMessages(channel);
    socket.emit('send_all_messages', messages);
  }

  @SubscribeMessage('request_create_channel')
  async createChannel(@MessageBody() data: { admin: string, name: string, password: string}) {
    await this.chatService.createChannel(data);
    this.server.emit('channel_created', data);
  }

  @SubscribeMessage('request_join_channel')
  async joinChannel(@MessageBody() data: { username: string, channel: string}) {
    await this.chatService.joinChannel(data);
    const chanlist = await this.chatService.getChannels(data.username);
    this.server.emit('send_channel_joined', chanlist[chanlist.length - 1]);
  }

   @SubscribeMessage('request_get_channels')
  async getChannels(@MessageBody() username: string) {
    const chanlist = await this.chatService.getChannels(username);
    this.server.emit('send_channels', chanlist);
   }

  @SubscribeMessage('newplayer')
  async newplayer(@MessageBody() playername: string) {
    this.players.push(playername);
    this.server.emit('nb_players', this.players.length);
  }

  @SubscribeMessage('player_leave')
  async playerLeave(@MessageBody() playername: string) {
    this.players.splice(this.players.findIndex(element => element == playername));
    this.server.emit('nb_players', this.players.length);
  }

}
