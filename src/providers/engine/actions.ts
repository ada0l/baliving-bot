export enum Actions {
    WaitingForReply = 'waiting-for-reply',
    Confirm = 'confirm',
    DisplayResults = 'display-results',
    ReadService = 'read-service',
    AreaIsNotImportant = 'area-is-not-important',
    AreaNeedConsult = 'area-need-consult',
    AskArea = 'AskArea',

    Finish = 'finish',

    StartSearch = 'start-search',
    StartSearchNext = 'start-search-next',

    AskCity = 'ask-city',
    ReadCity = 'read-city',

    AskCategories = 'ask-categoies',
    ReadCategories = 'read-categoies',

    AskEmail = 'ask-email',
    ReadEmail = 'read-email',

    ReadLocale = 'read-locale',
    ReadAreas = 'read-areas',
    ReadBeds = 'read-beds',
    ReadMinPrice = 'read-min-price',
    ReadPrice = 'read-price',

    ReadEditCity = 'read-edit-city',
    ReadEditLocale = 'read-edit-locale',
    ReadEditAreas = 'read-edit-areas',
    ReadEditBeds = 'read-edit-beds',
    ReadEditMinPrice = 'read-edit-min-price',
    ReadEditPrice = 'read-edit-price',

    // use it to summarize read-edit and read
    EditCity = 'edit-city',
    EditAreas = 'edit-areas',
    EditBeds = 'edit-beds',
    EditMinPrice = 'edit-min-price',
    EditPrice = 'edit-price',
}
