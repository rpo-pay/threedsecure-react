import { type RefObject, useState, useCallback } from 'react'
import {
  type Authentication,
  AuthenticationState,
  type Logger,
  type ThreeDSecureParameters,
  type ThreeDSecureResult,
} from '../types'
import { useApi } from './useApi'
import { useDsMethod } from './useDsMethod'
import { useChallenge } from './useChallenge'
import { v4 } from 'uuid'

export type UseThreeDSecureOptions = {
  baseUrl?: string
  publicKey: string
  container: RefObject<HTMLDivElement>
}

export const useThreeDSecure = ({ baseUrl, publicKey, container }: UseThreeDSecureOptions) => {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [status, setStatus] = useState<AuthenticationState | null>(null)
  const [result, setResult] = useState<ThreeDSecureResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setBrowserData, executeAuthentication } = useApi({ baseUrl, publicKey })
  const { executeDsMethod } = useDsMethod(container)
  const { executeChallenge } = useChallenge(container)

  const handleResult = useCallback((authentication: Authentication, logger: Logger) => {
    logger('Handle result', authentication)
    setIsFinalized(true)
    setResult({
      id: authentication.id,
      transStatus: authentication.transStatus,
      transStatusReason: authentication.transStatusReason,
      authenticationValue: authentication.authenticationValue,
      eci: authentication.eci,
      dsTransId: authentication.dsTransId,
      protocolVersion: authentication.protocolVersion,
      failReason: authentication.failReason,
      isSuccess: () =>
        authentication.state === AuthenticationState.AuthorizedToAttempt ||
        authentication.state === AuthenticationState.Completed,
    })
  }, [])

  const execute = useCallback(
    async (
      options: ThreeDSecureParameters & {
        abortController?: AbortController
      },
    ) => {
      const id = v4()

      const log = (message: string, ...rest: unknown[]) => {
        console.log(`[${id}] useThreeDSecure: ${message}`, ...rest)
      }

      log('Execute start')
      const { abortController: controller, ...parameters } = options

      const abortController = controller ?? new AbortController()

      const iFrames = {
        dsMethod: document.createElement('iframe'),
        challenge: document.createElement('iframe'),
      }

      const forms = {
        dsMethod: document.createElement('form'),
        challenge: document.createElement('form'),
      }

      const cleanup = () => {
        log('Clean up')
        iFrames.dsMethod.remove()
        forms.dsMethod.remove()
        iFrames.challenge.remove()
        forms.challenge.remove()
      }

      if (abortController.signal.aborted) {
        log('Already aborted, not executing')
        setIsExecuting(false)
        cleanup()
        return
      }

      abortController.signal.addEventListener('abort', (event) => {
        log('Aborted via event listener handler', event)
        setIsExecuting(false)
        cleanup()
      })

      try {
        setIsExecuting(true)

        log('Starting setBrowserData')
        await setBrowserData(parameters, abortController.signal, log)
        log('Finished setBrowserData')

        if (abortController.signal.aborted) {
          log('Aborted after finishing setBrowserData')
          return
        }

        for await (const authentication of executeAuthentication(parameters, abortController.signal, log)) {
          if (abortController.signal.aborted) {
            log('Aborted during execution')
            break
          }

          log('Handle flowStep', authentication)
          setStatus(authentication.state)

          switch (authentication.state) {
            case AuthenticationState.PendingDirectoryServer:
              await executeDsMethod(authentication, iFrames.dsMethod, forms.dsMethod)
              break
            case AuthenticationState.PendingChallenge:
              iFrames.dsMethod.remove()
              forms.dsMethod.remove()
              await executeChallenge(authentication, iFrames.challenge, forms.challenge)
              break
            case AuthenticationState.ChallengeCompleted:
              iFrames.challenge.remove()
              forms.challenge.remove()
              break
            case AuthenticationState.Failed:
            case AuthenticationState.Completed:
            case AuthenticationState.AuthorizedToAttempt:
              abortController.abort('completed')
              handleResult(authentication, log)
              break
          }
        }
      } catch (error) {
        log('Error', error)
        abortController.abort('error')
        setError(error instanceof Error ? error.message : 'Failed to execute 3DS')
      } finally {
        log('Execution finished')
      }
    },
    [setBrowserData, executeAuthentication, executeDsMethod, executeChallenge, handleResult],
  )

  return { isExecuting, isFinalized, status, result, execute, error }
}
