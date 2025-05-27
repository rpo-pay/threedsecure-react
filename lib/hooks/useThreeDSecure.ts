import { type RefObject, useState, useCallback, useRef } from 'react'
import {
  type Authentication,
  AuthenticationState,
  type ThreeDSecureParameters,
  type ThreeDSecureResult,
} from '../types'
import { useApi } from './useApi'
import { useDsMethod } from './useDsMethod'
import { useChallenge } from './useChallenge'

export type UseThreeDSecureOptions = {
  baseUrl?: string
  publicKey: string
  container: RefObject<HTMLDivElement>
}

export const useThreeDSecure = ({ baseUrl, publicKey, container }: UseThreeDSecureOptions) => {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [status, setStatus] = useState<AuthenticationState | null>(null)
  const [result, setResult] = useState<ThreeDSecureResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setBrowserData, executeAuthentication } = useApi({ baseUrl, publicKey })
  const { executeDsMethod } = useDsMethod(container)
  const { executeChallenge } = useChallenge(container)

  const handleResult = useCallback((authentication: Authentication) => {
    console.log('useThreeDSecure: handleResult', authentication)
    setIsFinalized(true)
    setResult({
      id: authentication.id,
      transStatus: authentication.transStatus,
      transStatusReason: authentication.transStatusReason,
      authenticationValue: authentication.authenticationValue,
      eci: authentication.eci,
      dsTransId: authentication.dsTransId,
    })
    abortControllerRef.current?.abort("finalized")
  }, [])

  const execute = useCallback(async (parameters: ThreeDSecureParameters) => {
    console.log('useThreeDSecure: execute')

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    const iFrames = {
      dsMethod: document.createElement('iframe'),
      challenge: document.createElement('iframe')
    }

    const forms = {
      dsMethod: document.createElement('form'),
      challenge: document.createElement('form')
    }

    abortController.signal.addEventListener('abort', () => {
      console.log('useThreeDSecure: Aborting')
      setIsExecuting(false)
      iFrames.dsMethod.remove()
      forms.dsMethod.remove()
      iFrames.challenge.remove()
      forms.challenge.remove()
    })

    try {
      setIsExecuting(true)

      console.log('useThreeDSecure: setBrowserData', parameters)
      await setBrowserData(parameters, abortController.signal)

      for await (const authentication of executeAuthentication(parameters, abortController.signal)) {
        console.log('useThreeDSecure: flowStep', authentication)
        setStatus(authentication.state)

        switch (authentication.state) {
          case AuthenticationState.PendingDirectoryServer:
            await executeDsMethod(authentication, iFrames.dsMethod, forms.dsMethod)
            break;
          case AuthenticationState.PendingChallenge:
            iFrames.dsMethod.remove()
            forms.dsMethod.remove()
            await executeChallenge(authentication, iFrames.challenge, forms.challenge)
            break;
          case AuthenticationState.ChallengeCompleted:
            iFrames.challenge.remove()
            forms.challenge.remove()
            break;
          case AuthenticationState.Failed:
          case AuthenticationState.Completed:
          case AuthenticationState.AuthorizedToAttempt:
            handleResult(authentication)
        }
      }
    } catch (error) {
      console.log('useThreeDSecure: error', error)
      setIsFinalized(true)
      setError(error instanceof Error ? error.message : 'Failed to execute 3DS')
    } finally {
      console.log('useThreeDSecure: execution stopped')
      abortController.abort("execution stopped")
    }
  }, [setBrowserData, executeAuthentication, executeDsMethod, executeChallenge, handleResult])

  const cancel = useCallback(() => {
    console.log('useThreeDSecure: cancel')
    abortControllerRef.current?.abort("cancelled")
  }, [])

  return { isExecuting, isFinalized, status, result, execute, cancel, error }
}
