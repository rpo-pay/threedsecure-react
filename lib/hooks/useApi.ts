import type { Authentication, ThreeDSecureParameters } from '../types'
import { Bucket } from '../models'

export type UseApiOptions = {
  baseUrl?: string
  publicKey: string
}

export const useApi = ({ baseUrl = 'https://api.sqala.tech/core/v1/threedsecure', publicKey }: UseApiOptions) => {
  const executeAuthentication = (
    parameters: ThreeDSecureParameters,
    abortSignal: AbortSignal,
  ): AsyncIterableIterator<Authentication> => {
    const eventSource = new EventSource(`${baseUrl}/${parameters.id}/listen?publicKey=${publicKey}`)
    const bucket = new Bucket<Authentication>()
    eventSource.onmessage = (event) => {
      const parsedEvent = JSON.parse(event.data) as Authentication
      console.log('useApi: executeAuthentication - onmessage', parsedEvent)
      bucket.push(parsedEvent)
    }
    eventSource.onerror = (error) => {
      console.log('useApi: executeAuthentication - onerror', error)
      bucket.pushError(new Error('Failed to connect to event source'))
    }
    abortSignal.addEventListener('abort', () => {
      console.log('useApi: executeAuthentication - abort')
      bucket.close()
      eventSource.close()
    })
    return bucket.iterator
  }

  const setBrowserData = async (parameters: ThreeDSecureParameters) => {
    console.log('useApi: setBrowserData', parameters)
    const ipResponse = await fetch('https://geolocation-db.com/json/')
    const ipResponseData = await ipResponse.json()
    console.log('useApi: setBrowserData - ipResponseData', ipResponseData)

    const allowedBrowserColorDepth = [48, 32, 24, 16, 15, 8, 4, 1]
    const colorDepth = allowedBrowserColorDepth.find((x) => x <= screen.colorDepth) ?? 48
    const browser = {
      ip: ipResponseData.IPv4,
      javaEnabled: true,
      javascriptEnabled: true,
      language: navigator.language,
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      timeZoneOffset: new Date().getTimezoneOffset(),
      colorDepth,
      acceptHeader:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    }
    console.log('useApi: setBrowserData - browser', browser)

    const response = await fetch(`${baseUrl}/${parameters.id}/browser?publicKey=${publicKey}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(browser),
    })
    console.log('useApi: setBrowserData - response', response)
    if (!response.ok) {
      throw new Error('Failed to set browser data')
    }
  }

  return {
    setBrowserData,
    executeAuthentication,
  }
}
