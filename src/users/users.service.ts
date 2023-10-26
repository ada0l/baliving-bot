import { Injectable } from '@nestjs/common'
import { LessThanOrEqual, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { User } from './entities/user.entity'

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>
    ) {}
    async create(attributes) {
        const user = this.usersRepository.create(attributes)
        return await this.usersRepository.save(user)
    }

    async findOne(userId: number, chatId: number) {
        const exists: boolean = await this.usersRepository.exist({
            where: { userId, chatId },
        })
        if (exists) {
            return await this.usersRepository.findOneBy({ userId, chatId })
        } else {
            const user = this.usersRepository.create({ userId, chatId })
            return await this.usersRepository.save(user)
        }
    }

    async findForWarning() {
        return await this.usersRepository.find({
            where: {
                warningTime: LessThanOrEqual(
                    new Date(Date.now() + 60 * 10 * 1000) // after 10 minutes
                ),
            },
        })
    }

    async markAsWarned(users: Array<User>) {
        users.forEach((user: User) => {
            user.warningTime = null
        })
        return await this.usersRepository.save(users)
    }

    async find() {
        return await this.usersRepository.find()
    }

    async update(userId: number, chatId: number, attributes) {
        const user: User = await this.findOne(userId, chatId)
        return await this.usersRepository.save({ ...user, ...attributes })
    }

    async delete(userId: number) {
        return await this.usersRepository.delete({ userId })
    }

    async addMessageForDelete(
        userId: number,
        chatId: number,
        messageId: number
    ) {
        const user: User = await this.findOne(userId, chatId)
        user.messageForDelete.push(messageId)
        return await this.usersRepository.save({ ...user })
    }

    async clearMessageForDelete(userId: number, chatId: number) {
        const user: User = await this.findOne(userId, chatId)
        user.messageForDelete = []
        return await this.usersRepository.save({ ...user })
    }
}
