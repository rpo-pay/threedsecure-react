export const useBase64Encoder = () => {
  const encode = (data: object): string => {
    const base64 = btoa(JSON.stringify(data))
    return base64.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  }

  return {
    encode,
  }
}
