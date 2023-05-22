import { UsersService } from '../../users/users.service'
import locales from '../../config/locales'
import { User } from '../../users/entities/user.entity'
import Database from './database'
import areas from '../../config/areas'
import beds from '../../config/beds'
import { RequestsService } from '../../requests/requests.service'
import { Actions } from './actions'
import { SelectionKeyboard } from './selection-keyboard'
import { BotSenderService } from '../bot-sender.service'
import { isValidUrl } from './utils'

export default class CallbackHandler {
    constructor(
        private usersService: UsersService,
        private requestsService: RequestsService,
        private botSenderService: BotSenderService
    ) {}

    async handle(chatId, userId, messageId, data, keyboard) {
        const user: User = await this.usersService.findOne(userId, chatId)
        console.debug(user)
        try {
            if (['choose-locale:ru', 'choose-locale:en'].includes(data)) {
                await this.handleLocaleMessage(
                    chatId,
                    userId,
                    messageId,
                    data,
                    user
                )
            } else if (data === 'start') {
                await this.handleEmailMessage(chatId, userId, user)
            } else if (user.nextAction === Actions.ReadAreas) {
                if (data === Actions.Finish) {
                    await this.handleFinishAreaMessage(
                        messageId,
                        user,
                        keyboard
                    )
                } else {
                    await this.handleAreaMessage(
                        messageId,
                        data,
                        keyboard,
                        user
                    )
                }
            } else if (user.nextAction === Actions.ReadBeds) {
                if (data === Actions.Finish) {
                    await this.handleFinishBedMessage(messageId, user, keyboard)
                } else {
                    await this.handleBedMessage(messageId, data, keyboard, user)
                }
            } else if (
                [
                    Actions.EditAreas,
                    Actions.EditBeds,
                    Actions.EditMinPrice,
                    Actions.EditPrice,
                ].includes(data)
            ) {
                const isValid: boolean = await this.isValidUser(user)
                if (isValid) {
                    switch (data) {
                        case Actions.EditAreas:
                            await this.handleEditAreasMessage(messageId, user)
                            break
                        case Actions.EditBeds:
                            await this.handleEditBedsMessage(messageId, user)
                            break
                        case Actions.EditMinPrice:
                            await this.handleEditMinPriceMessage(
                                messageId,
                                user
                            )
                            break
                        case Actions.EditPrice:
                            await this.handleEditPriceMessage(messageId, user)
                            break
                    }
                }
            } else if (user.nextAction === Actions.Confirm) {
                console.log(data)
                if (data.includes(Actions.StartSearch)) {
                    await this.handleSearchMessage(
                        messageId,
                        user,
                        data.includes(Actions.StartSearchNext)
                    )
                }
            } else if (
                user.nextAction &&
                user.nextAction.includes('read-edit')
            ) {
                if (user.nextAction.includes(Actions.ReadEditAreas)) {
                    if (data === Actions.Finish) {
                        await this.handleFinishAreaMessage(
                            messageId,
                            user,
                            keyboard,
                            true
                        )
                    } else if (data.includes(Actions.ReadAreas)) {
                        await this.handleAreaMessage(
                            messageId,
                            data,
                            keyboard,
                            user
                        )
                    }
                }
                if (user.nextAction.includes(Actions.ReadEditBeds)) {
                    if (data === Actions.Finish) {
                        await this.handleFinishBedMessage(
                            messageId,
                            user,
                            keyboard,
                            true
                        )
                    } else if (data.includes(Actions.ReadBeds)) {
                        await this.handleBedMessage(
                            messageId,
                            data,
                            keyboard,
                            user
                        )
                    }
                }
            }
        } catch (exception) {
            console.error(exception)
        }
    }

    async handleLocaleMessage(chatId, userId, messageId, data, user) {
        const locale: string = data === 'choose-locale:ru' ? 'ru' : 'en'
        user = await this.usersService.update(userId, chatId, { locale })
        await this.botSenderService.deleteMessage(chatId, messageId)
        await this.handleEmailMessage(chatId, userId, user)
    }

    async handleEmailMessage(chatId, userId, user) {
        await this.usersService.update(userId, chatId, {
            currentAction: Actions.AskEmail,
            nextAction: Actions.ReadEmail,
            requestId: null,
        })
        await this.botSenderService.sendMessage(
            chatId,
            locales[user.locale].start
        )
    }

    async handleEditAreasMessage(messageId, user) {
        const request: any = await this.requestsService.find(+user.requestId)
        await this.usersService.update(user.userId, user.chatId, {
            currentAction: Actions.WaitingForReply,
            nextAction: Actions.ReadEditAreas,
        })
        const [keyboard, _] = SelectionKeyboard.create(
            areas[user.locale],
            Actions.ReadAreas,
            { text: locales[user.locale].next, callback_data: Actions.Finish },
            request.areas.map(
                (area) => areas[user.locale][areas['ru'].indexOf(area)]
            )
        )
        await this.botSenderService.sendMessage(
            user.chatId,
            locales[user.locale].chooseAreas,
            {
                reply_markup: {
                    inline_keyboard: keyboard,
                },
            }
        )
    }

    async handleEditBedsMessage(messageId, user) {
        const request: any = await this.requestsService.find(+user.requestId)
        await this.usersService.update(user.userId, user.chatId, {
            currentAction: Actions.WaitingForReply,
            nextAction: Actions.ReadEditBeds,
        })
        const [keyboard, _] = SelectionKeyboard.create(
            beds,
            Actions.ReadBeds,
            { text: locales[user.locale].next, callback_data: Actions.Finish },
            request.beds.map((bed: number) => beds.at(bed - 1))
        )
        await this.botSenderService.sendMessage(
            user.chatId,
            locales[user.locale].numberOfBeds,
            {
                reply_markup: {
                    inline_keyboard: keyboard,
                },
            }
        )
    }

    async handleEditMinPriceMessage(messageId, user, isEdit = false) {
        console.debug(messageId)
        await this.usersService.update(user.userId, user.chatId, {
            currentAction: Actions.WaitingForReply,
            nextAction: Actions.ReadEditPrice,
        })
        const botMessage = await this.botSenderService.sendMessage(
            user.chatId,
            locales[user.locale].minPrice
        )
        await this.usersService.update(user.userId, user.chatId, {
            nextAction: `${Actions.ReadEditMinPrice},delete-message:${botMessage.message_id}`,
        })
    }

    async handleEditPriceMessage(messageId, user) {
        console.debug(messageId)
        await this.usersService.update(user.userId, user.chatId, {
            currentAction: Actions.WaitingForReply,
            nextAction: Actions.ReadEditPrice,
        })
        const botMessage = await this.botSenderService.sendMessage(
            user.chatId,
            locales[user.locale].price
        )
        await this.usersService.update(user.userId, user.chatId, {
            nextAction: `${Actions.ReadEditPrice},delete-message:${botMessage.message_id}`,
        })
    }

    async isValidUser(user) {
        await this.botSenderService.sendMessage(
            user.chatId,
            locales[user.locale].checking
        )
        const databaseUser: any = await Database.findUser(user.email)
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
        if (!databaseUser) {
            await this.usersService.update(user.userId, user.chatId, {
                currentAction: Actions.WaitingForReply,
                nextAction: null,
            })
            await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].notFound,
                options
            )
            return false
        } else if (
            (Database.isUserAccessValid(databaseUser) &&
                Database.isVIPUser(databaseUser)) ||
            Database.isTrialUser(databaseUser)
        ) {
            await this.usersService.update(user.userId, user.chatId, {
                isTrial: Database.isTrialUser(databaseUser),
            })
            return true
        } else {
            await this.usersService.update(user.userId, user.chatId, {
                currentAction: Actions.WaitingForReply,
                nextAction: null,
            })
            await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].expired,
                options
            )
            return false
        }
    }

    async handleSearchMessage(messageId, user, isNext) {
        await this.usersService.update(user.userId, user.chatId, {
            currentAction: Actions.WaitingForReply,
            nextAction: Actions.Confirm,
        })
        await this.botSenderService.sendMessage(
            user.chatId,
            locales[user.locale].checking
        )
        const request: any = await this.requestsService.find(+user.requestId)
        const properties: any = (() => {
            if (!isNext) {
                return []
            }
            return request.properties ?? []
        })()
        console.debug(isNext)
        const databaseProperties: any = await Database.findNewProperties(
            request.areas,
            request.beds,
            request.minPrice,
            request.price,
            properties
        )
        if (databaseProperties.length) {
            let isSent: boolean = false
            for (const property of databaseProperties) {
                if (isValidUrl(property.get('Телеграм ссылка'))) {
                    const id: any = await this.botSenderService.sendProperty(
                        property,
                        user
                    )
                    if (id) {
                        properties.push(id)
                        isSent = true
                    }
                }
            }
            await this.requestsService.update(request.id, { properties })
            if (isSent) {
                await this.botSenderService.sendMessage(
                    user.chatId,
                    locales[user.locale].maybeYouCanFindSomethingElse,
                    {
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    {
                                        text: locales[user.locale]
                                            .showTheFollowingAds,
                                        callback_data: Actions.StartSearchNext,
                                    },
                                ],
                            ],
                        },
                    }
                )
            }
        } else {
            await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].notFoundOptions
            )
        }
    }

    async handleFinishBedMessage(
        messageId,
        user,
        keyboardBeds,
        isEdit = false
    ) {
        await this.botSenderService.deleteMessage(user.chatId, messageId)
        const actionData = isEdit
            ? {
                  currentAction: Actions.WaitingForReply,
                  nextAction: Actions.Confirm,
              }
            : {
                  currentAction: Actions.WaitingForReply,
                  nextAction: Actions.ReadEditMinPrice,
              }
        await this.usersService.update(user.userId, user.chatId, actionData)
        let userBeds = SelectionKeyboard.getSelected(keyboardBeds).map(
            (bed) => {
                return beds.indexOf(bed) + 1
            }
        )
        const request: any = await this.requestsService.update(
            +user.requestId,
            {
                beds: userBeds,
            }
        )
        if (isEdit) {
            await this.botSenderService.sendStartSearchingPreview(user, request)
        } else {
            const botMessage = await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].minPrice
            )
            await this.usersService.update(user.userId, user.chatId, {
                nextAction: `${Actions.ReadMinPrice},delete-message:${botMessage.message_id}`,
            })
        }
    }

    async handleFinishAreaMessage(
        messageId,
        user,
        keyboardAreas,
        isEdit = false
    ) {
        await this.botSenderService.deleteMessage(user.chatId, messageId)
        const actionData = isEdit
            ? {
                  currentAction: Actions.WaitingForReply,
                  nextAction: Actions.Confirm,
              }
            : {
                  currentAction: Actions.WaitingForReply,
                  nextAction: Actions.ReadBeds,
              }
        if (!user.requestId) {
            const request: any = await this.requestsService.create({
                userId: user.id,
            })
            user = await this.usersService.update(user.userId, user.chatId, {
                ...actionData,
                requestId: request.id,
            })
        } else {
            await this.usersService.update(user.userId, user.chatId, actionData)
        }
        let userAreas = SelectionKeyboard.getSelected(keyboardAreas).map(
            (area) => {
                return areas['ru'][areas[user.locale].indexOf(area)]
            }
        )
        const request: any = await this.requestsService.update(
            +user.requestId,
            {
                areas: userAreas,
            }
        )
        if (isEdit) {
            await this.botSenderService.sendStartSearchingPreview(user, request)
        } else {
            const [keyboard, _] = SelectionKeyboard.create(
                beds,
                Actions.ReadBeds,
                {
                    text: locales[user.locale].next,
                    callback_data: Actions.Finish,
                },
                request.beds ?? []
            )
            await this.botSenderService.sendMessage(
                user.chatId,
                locales[user.locale].numberOfBeds,
                {
                    reply_markup: {
                        inline_keyboard: keyboard,
                    },
                }
            )
        }
    }

    async handleBedMessage(messageId, data, keyboard, user) {
        const numberOfBeds: number = data.substring(
            `${Actions.ReadBeds} `.length
        )
        const [newKeyboard, _] = SelectionKeyboard.proccess(
            keyboard,
            numberOfBeds,
            beds,
            { text: locales[user.locale].next, callback_data: Actions.Finish }
        )
        await this.botSenderService.editMessageReplyMarkup(
            { inline_keyboard: newKeyboard },
            { chat_id: user.chatId, message_id: messageId }
        )
    }

    async handleAreaMessage(messageId, data, keyboard, user) {
        console.debug(keyboard)
        const area: string = data.substring(`${Actions.ReadAreas} `.length)
        const [newKeyboard, _] = SelectionKeyboard.proccess(
            keyboard,
            area,
            areas[user.locale],
            { text: locales[user.locale].next, callback_data: Actions.Finish }
        )
        await this.botSenderService.editMessageReplyMarkup(
            { inline_keyboard: newKeyboard },
            { chat_id: user.chatId, message_id: messageId }
        )
    }
}
