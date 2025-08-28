import { type RefObject, useCallback, useState } from 'react'
import {
  type Authentication,
  AuthenticationState,
  IFrameEvents,
  type Logger,
  type ThreeDSecureParameters,
  type ThreeDSecureResult,
} from '../types'
import { useApi } from './useApi'
import { useChallenge } from './useChallenge'
import { useDsMethod } from './useDsMethod'

export type UseThreeDSecureOptions = {
  baseUrl?: string
  publicKey: string
  container: RefObject<HTMLDivElement>
  customLogger?: Logger
  iframeEvents?: IFrameEvents
}

function defaultLogger(customLogger?: Logger) {
  return (entrypoint: string, message: string, ...rest: unknown[]) => {
    console.log(`[${entrypoint}] ${message}`, ...rest)
    try {
      customLogger?.(entrypoint, message, ...rest)
    } catch (error) {
      console.error(`[${entrypoint}] Failed to log`, error)
    }
  }
}

export const useThreeDSecure = ({ baseUrl, publicKey, container, customLogger, iframeEvents }: UseThreeDSecureOptions) => {
  const logger = defaultLogger(customLogger)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [status, setStatus] = useState<AuthenticationState | null>(null)
  const [result, setResult] = useState<ThreeDSecureResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setBrowserData, executeAuthentication } = useApi({ baseUrl, publicKey, logger })
  const { executeDsMethod } = useDsMethod(container, logger, iframeEvents)
  const { executeChallenge } = useChallenge(container, logger, iframeEvents)

  const handleResult = useCallback((authentication: Authentication) => {
    logger('useThreeDSecure', 'Handle result', authentication)
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
      logger('useThreeDSecure.execute', 'starting', options)
      const { abortController: controller, ...parameters } = options

      const abortController = controller ?? new AbortController()

      const iFrames = {
        dsMethod: document.createElement('iframe'),
        challenge: document.createElement('iframe'),
      }
      iframeEvents?.onCreate?.(iFrames.dsMethod)
      iframeEvents?.onCreate?.(iFrames.challenge)

      const forms = {
        dsMethod: document.createElement('form'),
        challenge: document.createElement('form'),
      }

      const cleanup = () => {
        logger('useThreeDSecure.execute', 'clean up')
        iFrames.dsMethod.remove()
        iframeEvents?.onRemove?.(iFrames.dsMethod)
        forms.dsMethod.remove()
        iFrames.challenge.remove()
        iframeEvents?.onRemove?.(iFrames.challenge)
        forms.challenge.remove()
      }

      if (abortController.signal.aborted) {
        logger('useThreeDSecure.execute', 'Already aborted, not executing')
        setIsExecuting(false)
        cleanup()
        return
      }

      abortController.signal.addEventListener('abort', (event) => {
        logger('useThreeDSecure.execute', 'Aborted via event listener handler', event)
        setIsExecuting(false)
        cleanup()
      })

      try {
        setIsExecuting(true)

        await setBrowserData(parameters, abortController.signal)

        if (abortController.signal.aborted) {
          logger('useThreeDSecure.execute', 'Aborted after finishing setBrowserData')
          return
        }

        for await (const authentication of executeAuthentication(parameters, abortController.signal)) {
          if (abortController.signal.aborted) {
            logger('useThreeDSecure.execute', 'Aborted during execution')
            break
          }

          logger('useThreeDSecure.execute', 'Handle flowStep', authentication)
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
              handleResult(authentication)
              break
          }
        }
      } catch (error) {
        logger('useThreeDSecure', 'Error', error)
        abortController.abort('error')
        setError(error instanceof Error ? error.message : 'Failed to execute 3DS')
      } finally {
        logger('useThreeDSecure', 'Execution finished')
      }
    },
    [setBrowserData, executeAuthentication, executeDsMethod, executeChallenge, handleResult],
  )

  return { isExecuting, isFinalized, status, result, execute, error }
}
