const CHARS = "abcdefghijklmnopqrstuvwxyz".split("")

export namespace tools {
    export function randomString(len: number) {
        let rtn = ""
        for (let i = 0; i < len; i++) {
            let index = Math.floor(Math.random() * CHARS.length)
            rtn = rtn + CHARS[index]
        }
        return rtn
    }
}