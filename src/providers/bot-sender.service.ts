import { Injectable } from '@nestjs/common'
import locales from 'src/config/locales'
import { Templater } from './engine/templater'

const TelegramBot = require('node-telegram-bot-api')
require('dotenv').config()

@Injectable()
export class BotSenderService {
    protected bot: any

    constructor() {
        this.bot = new TelegramBot(process.env.TOKEN)
    }

    async sendStartSearchingPreview(user, request) {
        await this.sendMessage(user.chatId, locales[user.locale].finish, {
            parse_mode: 'html',
        })
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
        await this.sendMessage(user.chatId, template, options)
    }

    async sendProperty(property, user) {
        try {
            let options: any = {
                parse_mode: 'html',
            }
            if (!user.isTrial) {
                options.reply_markup = {
                    inline_keyboard: [
                        [
                            {
                                text: locales[user.locale].write,
                                switch_inline_query: locales[user.locale].write,
                                url: property.get('Телеграм ссылка'),
                            },
                        ],
                    ],
                }
            }
            const template = Templater.applyProperty(property, user.locale)
            await this.sendMessage(user.chatId, template, options)
            await this.handlePhotos(property, user)
            return +property.get('Номер')
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`)
            return null
        }
    }

    async handlePhotos(property, user) {
        if (property.get('Фото') && Array.isArray(property.get('Фото'))) {
            console.debug('Photo is processing...')
            let media: any = []
            const images = property
                .get('Фото')
                .map((image) => image.thumbnails.large.url)
            for (const url of images) {
                const i = images.indexOf(url)
                if (i < 3) {
                    // limit = 3
                    media.push({
                        type: 'photo',
                        media: url,
                    })
                }
            }
            if (media.length) {
                await this.sendMediaGroup(user.chatId, media)
            }
        }
    }

    async sendMessage(...params: Array<any>) {
        return await this.bot.sendMessage(...params)
    }

    async deleteMessage(...params: Array<any>) {
        return await this.bot.deleteMessage(...params)
    }

    async sendMediaGroup(...params: Array<any>) {
        return await this.bot.sendMediaGroup(...params)
    }

    async editMessageReplyMarkup(...params: Array<any>) {
        return await this.bot.editMessageReplyMarkup(...params)
    }
}
