import { type RefObject, useState } from 'react'
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
  const abortController = new AbortController()
  const [isExecuting, setIsExecuting] = useState(false)
  const [isFinalized, setIsFinalized] = useState(false)
  const [status, setStatus] = useState<AuthenticationState | null>(null)
  const [result, setResult] = useState<ThreeDSecureResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { setBrowserData, executeAuthentication } = useApi({ baseUrl, publicKey })
  const { executeDsMethod } = useDsMethod(container)
  const { executeChallenge } = useChallenge(container)

  abortController.signal.addEventListener('abort', () => {
    console.log('useThreeDSecure: Aborting')
    setIsExecuting(false)
  })

  const handleResult = (authentication: Authentication) => {
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
    abortController.abort()
    return Promise.resolve()
  }

  const execute = async (parameters: ThreeDSecureParameters) => {
    console.log('useThreeDSecure: execute')
    if (isExecuting) {
      console.log('useThreeDSecure: isExecuting', isExecuting)
      return
    }

    if (isFinalized) {
      console.log('useThreeDSecure: isFinalized', isFinalized)
      return
    }

    try {
      setIsExecuting(true)

      console.log('useThreeDSecure: setBrowserData', parameters)
      await setBrowserData(parameters)

      const actionMapping = new Map([
        [AuthenticationState.PendingDirectoryServer, executeDsMethod],
        [AuthenticationState.PendingChallenge, executeChallenge],
        [AuthenticationState.Failed, handleResult],
        [AuthenticationState.Completed, handleResult],
        [AuthenticationState.AuthorizedToAttempt, handleResult],
      ])

      for await (const authentication of executeAuthentication(parameters, abortController.signal)) {
        console.log('useThreeDSecure: flowStep', authentication)
        setStatus(authentication.state)
        const action = actionMapping.get(authentication.state)
        await action?.(authentication)
      }
    } catch (error) {
      console.log('useThreeDSecure: error', error)
      setError(error instanceof Error ? error.message : 'Failed to execute 3DS')
    } finally {
      console.log('useThreeDSecure: setIsExecuting(false)')
      setIsExecuting(false)
    }
  }

  const cancel = () => {
    console.log('useThreeDSecure: cancel')
    abortController.abort()
  }

  return { isExecuting, isFinalized, status, result, execute, cancel, error }
}
