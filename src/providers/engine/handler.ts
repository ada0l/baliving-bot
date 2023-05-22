import { UsersService } from '../../users/users.service'
import { RequestsService } from '../../requests/requests.service'
import CallbackHandler from './callback-handler'
import MessageHandler from './message-handler'
import { BotSenderService } from '../bot-sender.service'

export default class Handler {
    private readonly callbackHandler: CallbackHandler
    private readonly messageHandler: MessageHandler
    protected readonly bot: any

    constructor(
        usersService: UsersService,
        requestsService: RequestsService,
        botSenderService: BotSenderService,
        bot
    ) {
        this.bot = bot
        this.callbackHandler = new CallbackHandler(
            usersService,
            requestsService,
            botSenderService
        )
        this.messageHandler = new MessageHandler(
            usersService,
            requestsService,
            botSenderService
        )
    }

    async handle(message) {
        await this.messageHandler.handle(message)
    }

    async handleCallback(chatId, userId, messageId, data, keyboard) {
        await this.callbackHandler.handle(
            chatId,
            userId,
            messageId,
            data,
            keyboard
        )
    }
}
