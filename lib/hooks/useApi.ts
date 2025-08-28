import { useCallback } from 'react'
import { Bucket } from '../models'
import { AuthenticationState, type Authentication, type Logger, type ThreeDSecureParameters } from '../types'

export type UseApiOptions = {
  baseUrl?: string
  publicKey: string
  logger: Logger
}

export const useApi = ({ baseUrl = 'https://api.sqala.tech/core/v1/threedsecure', publicKey, logger }: UseApiOptions) => {
  const executeAuthentication = useCallback(
    (
      parameters: ThreeDSecureParameters,
      abortSignal: AbortSignal,
    ): AsyncIterableIterator<Authentication> => {
      logger('useApi.executeAuthentication', 'starting', parameters, {
        baseUrl,
        publicKey,
      })
      const eventSource = new EventSource(`${baseUrl}/${parameters.id}/listen?publicKey=${publicKey}&accountId=55809853-0e56-4cf1-a15a-3b16c3307baf`)
      const bucket = new Bucket<Authentication>()

      const close = () => {
        try {
          bucket.close()
          eventSource.close()
        } catch (error) {
          logger('useApi.executeAuthentication', 'close', error)
        }
      }

      eventSource.onmessage = (event) => {
        try {
          const parsedEvent = JSON.parse(event.data) as Authentication
          logger('useApi.executeAuthentication', 'onmessage', parsedEvent)
          bucket.push(parsedEvent)

          if (
            parsedEvent.state === AuthenticationState.Failed ||
            parsedEvent.state === AuthenticationState.AuthorizedToAttempt ||
            parsedEvent.state === AuthenticationState.Completed ||
            abortSignal.aborted
          ) {
            close()
          }
        } catch (error) {
          logger('useApi.executeAuthentication', 'onmessage', error)
        }
      }

      eventSource.onerror = (error) => {
        logger('useApi.executeAuthentication', 'onerror', error)

        if (abortSignal.aborted) {
          close()
        }
      }

      abortSignal.addEventListener('abort', () => {
        logger('useApi.executeAuthentication', 'abort')
        close()
      })
      return bucket.iterator
    },
    [baseUrl, publicKey],
  )

  const setBrowserData = useCallback(
    async (parameters: ThreeDSecureParameters, abortSignal: AbortSignal) => {
      const getIpAddress = async () => {
        const response = await fetch('https://api.ipify.org?format=json')
        const data = await response.json()
        return data.ip
      }

      logger('useApi.setBrowserData', 'starting', parameters)
      const ip = parameters.ip ?? (await getIpAddress())
      logger('useApi.setBrowserData', 'ip', ip)

      const allowedBrowserColorDepth = [48, 32, 24, 16, 15, 8, 4, 1]
      const colorDepth = allowedBrowserColorDepth.find((x) => x <= screen.colorDepth) ?? 48
      const browser = {
        ip,
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
      logger('useApi.setBrowserData', 'browser', browser)

      const response = await fetch(`${baseUrl}/${parameters.id}/browser?publicKey=${publicKey}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: '55809853-0e56-4cf1-a15a-3b16c3307baf',
          browser
        }),
        signal: abortSignal,
      })
      logger('useApi.setBrowserData', 'response', response)
      if (!response.ok) {
        throw new Error('Failed to set browser data')
      }
    },
    [baseUrl, publicKey],
  )

  return {
    setBrowserData,
    executeAuthentication,
  }
}
