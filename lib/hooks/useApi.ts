import type { Authentication, ThreeDSecureParameters } from '../types'
import { Bucket } from '../models'

export type UseApiOptions = {
  baseUrl?: string
  publicKey: string
}

export const useApi = ({ baseUrl = 'https://api.sqala.tech/threedsecure/v1', publicKey }: UseApiOptions) => {
  const executeAuthentication = (
    parameters: ThreeDSecureParameters,
    abortSignal: AbortSignal,
  ): AsyncIterableIterator<Authentication> => {
    const eventSource = new EventSource(`${baseUrl}/authentications/${parameters.id}/listen?publicKey=${publicKey}`)
    const bucket = new Bucket<Authentication>()
    eventSource.onmessage = (event) => {
      const parsedEvent = JSON.parse(event.data) as Authentication
      bucket.push(parsedEvent)
    }
    eventSource.onerror = (_) => {
      bucket.pushError(new Error('Failed to connect to event source'))
    }
    abortSignal.onabort = () => {
      bucket.close()
      eventSource.close()
    }
    return bucket.iterator
  }

  return { executeAuthentication }
}
