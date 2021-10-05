import { Injectable } from '@nestjs/common';
import { AuthenticationService } from '../authentication/authentication.service';
import { InjectRepository } from '@nestjs/typeorm';
import Message from './message.entity';
import User from '../users/user.entity';
import { Repository } from 'typeorm';
import Channel from './channel.entity';
import { UsersService } from '../users/users.service';
import { ChannelDto } from './channel.dto';
import { MessageDto } from './message.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly userService: UsersService,
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    @InjectRepository(Channel)
    private chanRepository: Repository<Channel>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {
  }
 
  async saveMessage(content: {
    'channel': string,
    'content': MessageDto,
  }, username: string) {

    const channel = await this.chanRepository.findOne({name: content.channel})
    if (!channel)
      throw 'You must chose a channel first';
    const message = this.messagesRepository.create({
      author: username,
      content: content.content.message,
      channel: channel
    });
    await this.messagesRepository.save(message);
    return message;
  }

  async getAllMessages(params: string) {
    const channel = await this.chanRepository.find({relations: ['message']});
    const found = channel.find(element => element.name == params);
    if (found)
      return found.message;
    else
      return undefined;
  }

  async getChannels(username: string) {
    const user = this.userService.getByUsername(username);
    const chanlist: string[] = [];
    const channel = await this.chanRepository.find({select: ['name', 'id']});
    let found;
    for (const c of (await user).public_channels)
    {
      found = channel.find(element => element.name == c);
      if (found)
        chanlist.push(found.name);
    }
    return chanlist;
  }

  async getPrivateChannels(username: string) {
    const user = this.userService.getByUsername(username);
    const chanlist: string[] = [];
    const channel = await this.chanRepository.find({select: ['name', 'id']});
    let found;
    for (const c of (await user).private_channels)
    {
      found = channel.find(element => element.name == c);
      if (found)
        chanlist.push(found.name);
    }
    return chanlist;
  }

  async getChannelClients(name: string) {
      const chan = await this.chanRepository.findOne({name: name});
    if (chan)
      return(chan.clients);
    else
      return([""]);
  }

  async createChannel(data: { owner: string, name: string, password: string}) {
    const channel = new Channel();
    channel.name = data.name;
    channel.owner = data.owner;
    channel.admin = [data.owner];
    channel.password = data.password;
    channel.clients = [data.owner];
    channel.message = [];
    await this.chanRepository.save(channel);
    return channel;
  }

  async joinChannel(data: { username: string, channel: ChannelDto, password: string}) {
    const user = await this.userService.getByUsername(data.username);
    let chan = await this.chanRepository.findOne({ name: data.channel.channel});

    if (!chan)
    {
      chan = await this.createChannel({ owner: data.username, name: data.channel.channel, password: data.password });
    }
    else if (chan.clients.includes(data.username))
    {
      ;
    }
    else if (chan.banlist.includes(data.username))
    {
      throw 'You are banned from ' + data.channel;
    }
    else if ((!chan.clients.includes(data.username)) &&
      (!chan.password || (chan.password === data.password)))
    {
        chan.clients.push(data.username);
        await this.chanRepository.save(chan);
    }
    else if (chan.password && chan.password !== data.password)
    {
      throw 'Wrong password to join ' + data.channel;
    }
    if (!user.public_channels.includes(data.channel.channel))
    {
      user.public_channels[user.public_channels.length] = data.channel.channel;
    }
    await this.usersRepository.save(user);
    return (await this.chanRepository.findOne({ name: data.channel.channel }));
  }

  async joinPrivateChannel(data: { src: string, dst: ChannelDto }) {
    let name :string = data.src + '&' + data.dst;
    if (data.src === data.dst.channel)
      throw 'You cannot speak with yourself';
    try
    {
      const user_src = await this.userService.getByUsername(data.src);
      const user_dst = await this.userService.getByUsername(data.dst.channel);
      let chan = await this.chanRepository.findOne({name});
      if (!chan)
      {
        name = data.dst + '&' + data.src;
        chan = await this.chanRepository.findOne({name});
      }
      if (!chan)
      {
        if (data.src === "")
        {
          throw 'You cannot send a message to a blank name';
        }
        name = data.src + '&' + data.dst;
        chan = await this.createChannel({ owner: data.src, name: name, password: ''});
        chan.clients.push(data.dst.channel);
        await this.chanRepository.save(chan);
      }
      else if (chan.clients.length === 2 && !chan.clients.includes(data.src))
        throw 'This is a private channel'
      else if (chan.clients.includes(data.src) && chan.clients.includes(data.dst.channel))
      {
        ;
      }
      else
      {
        if (!chan.clients.includes(data.src))
          chan.clients.push(data.src);
        if(!chan.clients.includes(data.dst.channel))
          chan.clients.push(data.dst.channel);
        await this.chanRepository.save(chan);
      }
      if (!user_src.private_channels.includes(name))
        user_src.private_channels[user_src.private_channels.length] = name;
      if (!user_dst.private_channels.includes(name))
        user_dst.private_channels[user_dst.private_channels.length] = name;
      await this.usersRepository.save(user_src);
      await this.usersRepository.save(user_dst);
      return (await this.chanRepository.findOne({name}));
    }
    catch(e)
    {
      throw data.dst + ' doest not exists';
    }
  }

  async leaveChannel(data: { channel: ChannelDto, username: string }) {
    const chan = await this.chanRepository.findOne({ name: data.channel.channel });
    const user = await this.userService.getByUsername(data.username);
    if (chan && user)
    {
      chan.clients.splice(chan.clients.indexOf(data.username), 1);
      user.public_channels.splice(user.public_channels.indexOf(data.channel.channel), 1);
      await this.usersRepository.save(user);
      await this.chanRepository.save(chan);
    }
    else
      throw data.username + ' is not part of ' + data.channel;
  }

  async promoteClient(data: { channel: string, client: string }) {
    const chan = await this.chanRepository.findOne({ name: data.channel });
    const user = await this.userService.getByUsername(data.client);
    if (chan && user)
    {
      if (!chan.admin.includes(data.client))
         chan.admin.push((data.client));
      await this.chanRepository.save(chan);
    }
    else
      throw data.client + ' is not part of ' + data.channel;
  }

  async demoteClient(data: { channel: string, client: string }) {
    const chan = await this.chanRepository.findOne({ name: data.channel });
    const user = await this.userService.getByUsername(data.client);
    if (chan && user)
    {
      if (chan.admin.includes(data.client))
        chan.admin.splice(chan.admin.indexOf(data.client), 1);
      await this.chanRepository.save(chan);
    }
    else
      throw data.client + ' is not part of ' + data.channel;
  }
  async muteClient(data: { channel: string, client: string }) {
    const chan = await this.chanRepository.findOne({ name: data.channel });
    const user = await this.userService.getByUsername(data.client);
    if (chan && user)
    {
      if (!chan.mutelist.includes(data.client))
         chan.mutelist.push((data.client));
      await this.chanRepository.save(chan);
    }
    else
      throw data.client + ' is not part of ' + data.channel;
  }

  async unmuteClient(data: { channel: string, client: string }) {
    const chan = await this.chanRepository.findOne({ name: data.channel });
    const user = await this.userService.getByUsername(data.client);
    if (chan && user)
    {
      if (chan.mutelist.includes(data.client))
        chan.mutelist.splice(chan.mutelist.indexOf(data.client), 1);
      await this.chanRepository.save(chan);
    }
    else
      throw data.client + ' is not part of ' + data.channel;
  }

  async banClient(data: { channel: string, client: string }) {
    const chan = await this.chanRepository.findOne({ name: data.channel });
    const user = await this.userService.getByUsername(data.client);
    if (chan && user)
    {
      if (!chan.banlist.includes(data.client))
         chan.banlist.push((data.client));
      if (chan.clients.includes(data.client))
         chan.clients.splice(chan.clients.indexOf(data.client), 1);
      if (user.public_channels.includes(data.channel))
        user.public_channels.splice(user.public_channels.indexOf(data.channel), 1);
      await this.usersRepository.save(user);
      await this.chanRepository.save(chan);
    }
    else
      throw data.client + ' is not part of ' + data.channel;
  }
}
