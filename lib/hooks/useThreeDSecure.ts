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
  const [status, setStatus] = useState<AuthenticationState | null>(null)
  const [result, setResult] = useState<ThreeDSecureResult | null>(null)
  const { executeAuthentication } = useApi({ baseUrl, publicKey })
  const { executeDsMethod } = useDsMethod(container)
  const { executeChallenge } = useChallenge(container)

  abortController.signal.onabort = () => {
    setIsExecuting(false)
  }

  const handleResult = (authentication: Authentication) => {
    setResult({
      id: authentication.id,
      transStatus: authentication.transStatus,
      transStatusReason: authentication.transStatusReason,
      authenticationValue: authentication.authenticationValue,
      eci: authentication.eci,
      dsTransId: authentication.dsTransId,
    })
    abortController.abort()
  }

  const execute = async (parameters: ThreeDSecureParameters) => {
    if (isExecuting) {
      return
    }

    setIsExecuting(true)
    try {
      const actionMapping = new Map([
        [AuthenticationState.PendingDirectoryServer, executeDsMethod],
        [AuthenticationState.PendingChallenge, executeChallenge],
        [AuthenticationState.Failed, handleResult],
        [AuthenticationState.Completed, handleResult],
        [AuthenticationState.AuthorizedToAttempt, handleResult],
      ])

      for await (const authentication of executeAuthentication(parameters, abortController.signal)) {
        setStatus(authentication.state)
        const action = actionMapping.get(authentication.state)
        action?.(authentication)
      }
    } finally {
      setIsExecuting(false)
    }
  }

  const cancel = () => {
    abortController.abort()
  }

  return { isExecuting, status, result, execute, cancel }
}
