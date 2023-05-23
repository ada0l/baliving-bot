import Airtable from 'airtable'
import enteringAreas from '../../config/enteringAreas'

require('dotenv').config()

export default class Database {
    static async findUser(email) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
        try {
            const records = await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_USERS_TABLE_ID)
                .select({
                    filterByFormula: `{Email} = "${email}"`,
                })
                .all()
            return records.length > 0 ? records[0] : null
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`)
        }
    }

    static isTrialUser(databaseUser) {
        return databaseUser.get('TRIAL') === 'TRIAL'
    }

    static isVIPUser(databaseUser) {
        return databaseUser.get('Plan') === 'VIP'
    }

    static isUserAccessValid(databaseUser) {
        return databaseUser.get('Доступ действителен') === '✅'
    }

    static addAreasThatIncludeOther(areas) {
        const set = new Set()
        areas.forEach((area) => {
            set.add(area)
            enteringAreas[area].forEach((includedArea) => {
                set.add(includedArea)
            })
        })
        return Array.from(set)
    }

    static generateFilterForProperties(
        areas,
        beds,
        minPrice,
        price,
        properties = []
    ) {
        // The api has a limitation on working with arrays. There are no functions
        // for arrays as contain or in. Therefore, the search for the number is
        // performed by the string with the number treated with commas
        const propertiesFormula = `NOT(SEARCH(CONCATENATE(",", {Номер} ,","), ',${properties},'))`
        const areas_ = this.addAreasThatIncludeOther(areas)
        console.log(areas_)
        return `
        AND(
            ${properties.length ? propertiesFormula : 'TRUE()'},
            {Модерация},
            SEARCH({Район}, '${areas_}'),
            SEARCH({Количество спален}, '${beds}'),
            {Цена долларов в месяц} >= ${minPrice},
            {Цена долларов в месяц} <= ${price}
        )
        `
    }

    static async findProperties(areas, beds, minPrice, price, limit = 3) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
        try {
            return await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_PROPERTIES_TABLE_ID)
                .select({
                    filterByFormula: this.generateFilterForProperties(
                        areas,
                        beds,
                        minPrice,
                        price
                    ),
                    maxRecords: limit,
                })
                .all()
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`)
        }
    }

    static async findNewProperties(
        areas,
        beds,
        minPrice,
        price,
        properties = [],
        limit = 3
    ) {
        const airtable = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
        try {
            return await airtable
                .base(process.env.AIRTABLE_BASE_ID)
                .table(process.env.AIRTABLE_PROPERTIES_TABLE_ID)
                .select({
                    filterByFormula: this.generateFilterForProperties(
                        areas,
                        beds,
                        minPrice,
                        price,
                        properties
                    ),
                    maxRecords: limit,
                })
                .all()
        } catch (exception) {
            console.error(`issue detected ...\n${exception}`)
            return []
        }
    }
}
