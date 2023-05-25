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

    AskEmail = 'ask-email',
    ReadEmail = 'read-email',

    ReadLocale = 'read-locale',
    ReadAreas = 'read-areas',
    ReadBeds = 'read-beds',
    ReadMinPrice = 'read-min-price',
    ReadPrice = 'read-price',

    ReadEditLocale = 'read-edit-locale',
    ReadEditAreas = 'read-edit-areas',
    ReadEditBeds = 'read-edit-beds',
    ReadEditMinPrice = 'read-edit-min-price',
    ReadEditPrice = 'read-edit-price',

    // use it to summarize read-edit and read
    EditAreas = 'edit-areas',
    EditBeds = 'edit-beds',
    EditMinPrice = 'edit-min-price',
    EditPrice = 'edit-price',
}
