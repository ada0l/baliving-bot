export class SelectionKeyboard {
    static CHOSE = '✅'

    static proccess(keyboard, clickedText, data, finishItem, size = 2) {
        let keyboard1d = this.convertToOneDimension(keyboard).slice(
            0,
            data.length
        )
        let anySelected = false
        keyboard1d.forEach((keyboardItem, index, arr) => {
            if (this.isEqual(keyboardItem, clickedText)) {
                if (this.isSelected(keyboardItem)) {
                    arr[index] = this.unselect(keyboardItem)
                } else {
                    arr[index] = this.select(keyboardItem)
                }
            }
            if (this.isSelected(arr[index])) {
                anySelected = true
            }
        })

        let keyboardReshaped = this.sliceIntoChunks(keyboard1d, size)

        if (anySelected) {
            keyboardReshaped.push([finishItem])
        }

        return [keyboardReshaped, anySelected] as const
    }

    static create(
        data,
        callback_data,
        finishItem = null,
        alreadySelected = [],
        size = 2
    ) {
        console.debug(alreadySelected)
        let keyboard: any = []
        let anySelected = false
        data.forEach((dataItem) => {
            const keyboardItem = {
                text: alreadySelected.includes(dataItem)
                    ? `${SelectionKeyboard.CHOSE} ${dataItem}`
                    : `${dataItem}`,
                callback_data: `${callback_data} ${dataItem}`,
            }
            if (this.isSelected(keyboardItem)) {
                anySelected = true
            }
            keyboard.push(keyboardItem)
        })
        const reshapedKeyboard = this.sliceIntoChunks(keyboard, 2)

        if (anySelected && finishItem) {
            reshapedKeyboard.push([finishItem])
        }

        return [reshapedKeyboard, anySelected] as const
    }

    static getSelected(keyboard) {
        const keyboard1d = this.convertToOneDimension(keyboard)
        let result = []
        keyboard1d.forEach((keyboardItem) => {
            if (this.isSelected(keyboardItem)) {
                result.push(this.getText(keyboardItem))
            }
        })
        return result
    }

    private static sliceIntoChunks(array, size) {
        const result = []
        for (let i = 0; i < array.length; i += size) {
            const chunk = array.slice(i, i + size)
            result.push(chunk)
        }
        return result
    }

    private static convertToOneDimension(keyboard) {
        const keyboardItems = []
        keyboard.forEach((subKeyboard) => {
            subKeyboard.forEach((subKeyboardItem) => {
                keyboardItems.push(subKeyboardItem)
            })
        })
        return keyboardItems
    }

    private static isEqual(keyboardItem, clickedText) {
        return keyboardItem.text.includes(clickedText)
    }

    private static isSelected(keyboardItem) {
        return keyboardItem.text.includes(SelectionKeyboard.CHOSE)
    }

    private static select(keyboardItem) {
        return {
            text: `${SelectionKeyboard.CHOSE} ${keyboardItem.text}`,
            callback_data: keyboardItem.callback_data,
        }
    }

    private static unselect(keyboardItem) {
        return {
            text: keyboardItem.text.substring(2),
            callback_data: keyboardItem.callback_data,
        }
    }

    private static getText(keyboardItem) {
        if (this.isSelected(keyboardItem)) {
            return keyboardItem.text.substring(2)
        }
        return keyboardItem.text
    }
}
