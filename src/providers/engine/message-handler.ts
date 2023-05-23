import { UsersService } from '../../users/users.service'
import locales from '../../config/locales'
import { User } from '../../users/entities/user.entity'
import Database from './database'
import areas from '../../config/areas'
import { RequestsService } from '../../requests/requests.service'
import { Templater } from './templater'
import { Actions } from './actions'
import { Commands } from './commands'
import { SelectionKeyboard } from './selection-keyboard'
import { BotSenderService } from '../bot-sender.service'

export default class MessageHandler {
    constructor(
        private usersService: UsersService,
        private requestsService: RequestsService,
        private botSenderService: BotSenderService
    ) {}

    async handle(message) {
        const chatId: number = message.chat.id
        const userId: number = message.from.id
        const user: User = await this.usersService.findOne(userId, chatId)
        console.debug(user)
        console.debug(message)
        try {
            if (message.text.toString() === Commands.Start) {
                await this.handleLocaleMessage(message, user)
            } else if (
                user.nextAction &&
                user.nextAction === Actions.ReadEmail
            ) {
                await this.handleEmailMessage(message, user)
            } else if (
                user.nextAction &&
                (user.nextAction.includes(Actions.ReadPrice) ||
                    user.nextAction.includes(Actions.ReadEditPrice))
            ) {
                await this.handlePriceMessage(message, user)
            } else if (
                user.nextAction &&
                (user.nextAction.includes(Actions.ReadMinPrice) ||
                    user.nextAction.includes(Actions.ReadEditMinPrice))
            ) {
                await this.handleMinPriceMessage(message, user)
            } else if (message.text === Commands.Edit) {
                await this.handleEditMessage(message)
            }
        } catch (exception) {
            console.error(exception)
        }
    }

    async handleLocaleMessage(message, user) {
        await this.usersService.update(user.userId, user.chatId, {
            currentAction: Actions.WaitingForReply,
            nextAction: Actions.ReadEditMinPrice,
            requestId: null,
        })
        await this.botSenderService.sendMessage(
            message.chat.id,
            locales.askLocale,
            {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: locales.ru.language,
                                callback_data: 'choose-locale:ru',
                            },
                        ],
                        [
                            {
                                text: locales.en.language,
                                callback_data: 'choose-locale:en',
                            },
                        ],
                    ],
                },
            }
        )
    }

    async handleEditMessage(message) {
        const chatId: number = message.chat.id
        const userId: number = message.from.id
        const user: User = await this.usersService.findOne(userId, chatId)
        const options: any = {
            reply_markup: {
                inline_keyboard: [
                    [
                        {
                            text: locales[user.locale].editAreas,
                            callback_data: 'edit-areas',
                        },
                    ],
                    [
                        {
                            text: locales[user.locale].editBeds,
                            callback_data: 'edit-beds',
                        },
                    ],
                    [
                        {
                            text: locales[user.locale].editMinPrice,
                            callback_data: 'edit-min-price',
                        },
                    ],
                    [
                        {
                            text: locales[user.locale].editPrice,
                            callback_data: 'edit-price',
                        },
                    ],
                ],
            },
        }
        await this.botSenderService.sendMessage(
            message.chat.id,
            locales[user.locale].choseEditOption,
            options
        )
    }

    async handleMinPriceMessage(message, user) {
        const minPrice: number = +message.text
        const isEdit = await this.botSenderService.isEditStage(user)
        const actionData = isEdit
            ? {
                  currentAction: Actions.WaitingForReply,
                  nextAction: Actions.Confirm,
              }
            : {
                  currentAction: Actions.WaitingForReply,
                  nextAction: Actions.ReadPrice,
              }
        await this.usersService.update(user.userId, user.chatId, actionData)
        console.debug(minPrice)
        if (Number.isNaN(minPrice)) {
            await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].minPrice
            )
            return
        }
        if (user.nextAction.includes('delete-message')) {
            await this.botSenderService.deleteMessage(
                user.chatId,
                +user.nextAction.substring(user.nextAction.indexOf(':') + 1)
            )
        }
        await this.botSenderService.deleteMessage(
            user.chatId,
            message.message_id
        )
        await this.requestsService.update(+user.requestId, { minPrice })
        const request: any = await this.requestsService.find(+user.requestId)
        if (isEdit) {
            await this.botSenderService.sendStartSearchingPreview(user, request)
        } else {
            await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].price
            )
            await this.usersService.update(user.userId, user.chatId, {
                currentAction: Actions.WaitingForReply,
                nextAction: Actions.ReadPrice,
            })
        }
    }

    async handlePriceMessage(message, user) {
        const price: number = +message.text
        console.debug(price)
        if (Number.isNaN(price)) {
            await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].price
            )
        } else {
            console.debug(message)
            const request: any = await this.requestsService.update(
                +user.requestId,
                {
                    price,
                }
            )
            if (user.nextAction.includes('delete-message')) {
                await this.botSenderService.deleteMessage(
                    user.chatId,
                    +user.nextAction.substring(user.nextAction.indexOf(':') + 1)
                )
            }
            await this.botSenderService.deleteMessage(
                user.chatId,
                message.message_id
            )
            await this.usersService.update(user.userId, user.chatId, {
                currentAction: Actions.WaitingForReply,
                nextAction: Actions.Confirm,
            })
            await this.botSenderService.sendMessage(
                message.chat.id,
                locales[user.locale].finish,
                { parse_mode: 'html' }
            )
            const options: any = {
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: locales[user.locale].agree,
                                callback_data: 'start-search',
                            },
                        ],
                    ],
                },
            }
            const template = Templater.applyDetails(request, user.locale)
            await this.botSenderService.sendMessage(
                message.chat.id,
                template,
                options
            )
        }
    }

    async handleEmailMessage(message, user) {
        const email: string = message.text.toString().toLowerCase()
        await this.usersService.update(user.userId, user.chatId, { email })
        await this.botSenderService.sendMessage(
            message.chat.id,
            locales[user.locale].checking
        )
        const databaseUser: any = await Database.findUser(email)
        if (!databaseUser) {
            await this.usersService.update(user.userId, user.chatId, {
                currentAction: Actions.WaitingForReply,
                nextAction: null,
            })
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
                                text: `${
                                    locales[user.locale].writeAnotherEmail
                                }`,
                                callback_data: `start`,
                            },
                        ],
                    ],
                },
            }
            await this.botSenderService.sendMessage(
                message.chat.id,
                locales[user.locale].notFound,
                options
            )
        } else if (
            Database.isUserAccessValid(databaseUser) ||
            Database.isTrialUser(databaseUser)
        ) {
            if (
                Database.isVIPUser(databaseUser) ||
                Database.isTrialUser(databaseUser)
            ) {
                await this.usersService.update(user.userId, user.chatId, {
                    currentAction: Actions.WaitingForReply,
                    nextAction: Actions.ReadAreas,
                    isTrial: Database.isTrialUser(databaseUser),
                })
                const request: any = await this.requestsService.find(
                    +user.requestId
                )
                await this.botSenderService.sendAreaKeyboard(user, request)
            } else {
                await this.usersService.update(user.userId, user.chatId, {
                    currentAction: Actions.WaitingForReply,
                    nextAction: null,
                })
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
                                    text: `${
                                        locales[user.locale].writeAnotherEmail
                                    }`,
                                    callback_data: `start`,
                                },
                            ],
                        ],
                    },
                }
                await this.botSenderService.sendMessage(
                    message.chat.id,
                    locales[user.locale].expired,
                    options
                )
            }
        } else {
            await this.usersService.update(user.userId, user.chatId, {
                currentAction: Actions.WaitingForReply,
                nextAction: null,
            })
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
                                text: `${
                                    locales[user.locale].writeAnotherEmail
                                }`,
                                callback_data: `start`,
                            },
                        ],
                    ],
                },
            }
            await this.botSenderService.sendMessage(
                message.chat.id,
                locales[user.locale].expired,
                options
            )
        }
    }
}
