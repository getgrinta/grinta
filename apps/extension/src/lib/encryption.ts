import { AesGcm, Mnemonic, Bytes, Hex } from 'ox'
import { appStore } from './store/app.svelte'

async function getKey() {
    const privateKey = Mnemonic.toPrivateKey(appStore.data.syncEncryptionKey)
    const password = Bytes.toHex(privateKey)
    return AesGcm.getKey({ salt: Bytes.from([0]), password })
}

export async function encrypt(data: string): Promise<Hex.Hex> {
    const key = await getKey()
    const payload = Bytes.fromString(JSON.stringify(data))
    const bytes = await AesGcm.encrypt(payload, key)
    return Bytes.toHex(bytes)
}

export async function decrypt(data: Hex.Hex) {
    const key = await getKey()
    const decrypted = await AesGcm.decrypt(data, key)
    const stringified = Hex.toString(decrypted)
    return JSON.parse(stringified)
}
