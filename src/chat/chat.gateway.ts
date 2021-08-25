import {
  ConnectedSocket,
  MessageBody, OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ChatService } from './chat.service';
 
@WebSocketGateway({cors: true})
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly chatService: ChatService
  ) {
  }

  @SubscribeMessage('connection')
  async handleConnection(socket: Socket) {
    await this.chatService.getUserFromSocket(socket);
    console.log('new client connected');
    socket.emit('connection', null);
  }

  @SubscribeMessage('send_message')
  async listenForMessages(
    @MessageBody() content: string,
    @ConnectedSocket() socket: Socket,
  ) {
    const author = await this.chatService.getUserFromSocket(socket);
    const message = await this.chatService.saveMessage(content, author);

    this.server.sockets.emit('receive_message', message);
  }

  @SubscribeMessage('request_all_messages')
  async requestAllMessages(
    @ConnectedSocket() socket: Socket,
  ) {
    await this.chatService.getUserFromSocket(socket);
    const messages = await this.chatService.getAllMessages();
 
    socket.emit('send_all_messages', messages);
  }

  @SubscribeMessage('test')
  async test1(
    @MessageBody() content: string, @ConnectedSocket() socket: Socket
  )
  {
    console.log(content)
    this.server.emit('test', content);
  }
}