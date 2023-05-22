import { Injectable } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'
import { UsersService } from '../users/users.service'
import { RequestsService } from '../requests/requests.service'
import Database from './engine/database'
import locales from '../config/locales'
import { BotSenderService } from './bot-sender.service'
import { isValidUrl } from './engine/utils'

const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()

@Injectable()
export class TasksService {
    constructor(
        private readonly usersService: UsersService,
        private readonly requestsService: RequestsService,
        private readonly botSenderService: BotSenderService
    ) {}

    @Cron('0 0 * * * *')
    handleCron() {
        console.debug('Checking new properties ...')
        const bot = new TelegramBot(process.env.TOKEN)
        this.usersService.find().then((users) => {
            users.forEach((user) => {
                if (user.requestId) {
                    Database.findUser(user.email).then((databaseUser) => {
                        if (
                            databaseUser &&
                            (Database.isUserAccessValid(databaseUser) ||
                                Database.isTrialUser(databaseUser))
                        ) {
                            if (Database.isTrialUser(databaseUser)) {
                                this.handleActiveUser(bot, user, true)
                            } else if (Database.isVIPUser(databaseUser)) {
                                this.handleActiveUser(bot, user)
                            } else {
                                this.handleUndefinedActiveUser(bot, user)
                            }
                        } else {
                            this.handleExpiredUser(bot, user)
                        }
                    })
                }
            })
        })
    }

    handleActiveUser(bot, user, isTrial = false) {
        this.requestsService.find(+user.requestId).then((request) => {
            if (request.areas && request.beds && request.price) {
                const properties: any = request.properties
                    ? request.properties
                    : []
                console.debug(properties)
                Database.findNewProperties(
                    request.areas,
                    request.beds,
                    request.minPrice,
                    request.price,
                    properties
                ).then(async (newProperties) => {
                    let isSent: boolean = false
                    console.debug(
                        `new properties (${newProperties.length}) ...`
                    )
                    for (const property of newProperties) {
                        if (isValidUrl(property.get('Телеграм ссылка'))) {
                            const id: any =
                                await this.botSenderService.sendProperty(
                                    property,
                                    user
                                )
                            if (id) {
                                properties.push(id)
                                isSent = true
                            }
                        }
                    }
                    if (isSent) {
                        this.requestsService
                            .update(request.id, { properties })
                            .then(() => {
                                bot.sendMessage(
                                    user.chatId,
                                    locales[user.locale].foundOptions
                                )
                            })
                    }
                })
            }
        })
    }

    handleUndefinedActiveUser(bot, user) {
        const options: any = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: locales[user.locale].goToWebsite,
                            switch_inline_query:
                                locales[user.locale].goToWebsite,
                            url: 'https://baliving.ru/tariffs',
                        },
                    ],
                    [
                        {
                            text: locales[user.locale].writeToSupport,
                            switch_inline_query:
                                locales[user.locale].writeToSupport,
                            url: 'https://t.me/info_baliving',
                        },
                    ],
                    [
                        {
                            text: `${locales[user.locale].writeAnotherEmail}`,
                            callback_data: `start`,
                        },
                    ],
                ],
            },
        }
        bot.sendMessage(
            user.chatId,
            locales[user.locale].expired,
            options
        ).then(() => {
            this.usersService.delete(user.userId).then((r) => console.debug(r))
        })
    }

    handleExpiredUser(bot, user) {
        const options: any = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: locales[user.locale].goToWebsite,
                            switch_inline_query:
                                locales[user.locale].goToWebsite,
                            url: 'https://baliving.ru/tariffs',
                        },
                    ],
                    [
                        {
                            text: `${locales[user.locale].writeAnotherEmail}`,
                            callback_data: `start`,
                        },
                    ],
                ],
            },
        }
        bot.sendMessage(
            user.chatId,
            locales[user.locale].expired,
            options
        ).then(() => {
            this.usersService
                .delete(user.userId)
                .then((response) => console.debug(response))
        })
    }
}
