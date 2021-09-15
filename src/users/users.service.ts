import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import User from './user.entity';
import CreateUserDto from './dto/createUser.dto';
import RequestWithUser from 'src/authentication/requestWithUser.interface';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>
    ) {}

    async getById(id: number) {
        const user = await this.usersRepository.findOne({
            id });
        if (user) {
            return user;
        }
        throw new HttpException('User with this id does not exist', HttpStatus.NOT_FOUND);
    }

    async getByUsername(username: string) {
        // console.log('username', username);
        const user = await this.usersRepository.findOne({
            username: username });
        if (user) {
            return user;
        }
        throw new HttpException('User with this username does not exist', HttpStatus.NOT_FOUND);
    }

    async create(userData: CreateUserDto) {
        const newUser = await this.usersRepository.create(userData);
        await this.usersRepository.save(newUser);
        return newUser;
    }

    async addFriend(username: string, req: RequestWithUser) {
        const user = await this.usersRepository.findOne({username: req.user.username});
        user.friendlist[user.friendlist.length] = username;
        await this.usersRepository.save(user);
        return user.friendlist;
    }

    async delFriend(username: string, req: RequestWithUser) {
        const user = await this.usersRepository.findOne({username: req.user.username});
        for(var i = 0; i < user.friendlist.length; i++) {
            if(user.friendlist[i] == username) {
                user.friendlist.splice(i, 1);
                break;
            }
        }
        await this.usersRepository.save(user);
        return user.friendlist;
    }

    async block(username: string, req: RequestWithUser) {
        const user = await this.usersRepository.findOne({username: req.user.username});
        user.blocklist[user.blocklist.length] = username;
        await this.usersRepository.save(user);
        return user.blocklist;
    }

    async unblock(username: string, req: RequestWithUser) {
        const user = await this.usersRepository.findOne({username: req.user.username});
        for(var i = 0; i < user.blocklist.length; i++) {
            if(user.blocklist[i] == username) {
                user.blocklist.splice(i, 1);
                break;
            }
        }
        await this.usersRepository.save(user);
        return user.blocklist;
    }

    async getEveryone() {
        var users = await this.usersRepository.find();
        users = users.sort((a,b) => (a.username > b.username) ? 1 : ((b.username > a.username) ? -1 : 0))
        return users;
    }

    async save(user: User) {
        await this.usersRepository.save(user);
    }

    async updateAvatar(req: RequestWithUser, data: string) {
        const user = await this.usersRepository.findOne({username: req.user.username});

        user.avatar = data;
        this.usersRepository.save(user);
    }
}
