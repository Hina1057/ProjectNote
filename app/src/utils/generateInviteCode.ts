const INVITE_CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const INVITE_CODE_LENGTH = 6

export const generateInviteCode = (): string => {
  const randomValues = new Uint32Array(INVITE_CODE_LENGTH)
  globalThis.crypto.getRandomValues(randomValues)

  return Array.from(
    randomValues,
    (value) => INVITE_CODE_CHARACTERS[value % INVITE_CODE_CHARACTERS.length],
  ).join('')
}
