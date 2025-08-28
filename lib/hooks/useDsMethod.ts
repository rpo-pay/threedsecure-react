import { useCallback, type RefObject } from 'react'
import { v4 } from 'uuid'
import type { Authentication, IFrameEvents, Logger } from '../types'
import { useBase64Encoder } from './useBase64Encoder'

export const useDsMethod = (container: RefObject<HTMLDivElement>, logger: Logger, iframeEvents?: IFrameEvents) => {
  const { encode } = useBase64Encoder()

  const executeDsMethod = useCallback(async (authentication: Authentication, iFrame: HTMLIFrameElement, form: HTMLFormElement) => {
    if (!authentication.dsMethodUrl || form.hasAttribute('data-submitted')) {
      logger('useDsMethod.executeDsMethod', 'Skipped', authentication)
      return
    }

    iFrame.name = v4()
    iFrame.style.visibility = 'hidden'
    iFrame.style.position = 'absolute'
    iFrame.style.top = '0'
    iFrame.style.left = '0'
    iFrame.width = '0'
    iFrame.height = '0'
    logger('useDsMethod.executeDsMethod', 'configured iFrame', iFrame)

    form.style.visibility = 'hidden'
    form.name = v4()
    form.target = iFrame.name
    form.action = authentication.dsMethodUrl
    form.method = 'POST'
    logger('useDsMethod.executeDsMethod', 'configured form', form)

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'threeDSMethodData'
    logger('useDsMethod.executeDsMethod', 'configured input', input)

    input.value = encode({
      threeDSServerTransID: authentication.transactionId,
      threeDSMethodNotificationURL: authentication.dsMethodCallbackUrl,
    })

    form.appendChild(input)
    logger('useDsMethod.executeDsMethod', 'appended input', form)

    container.current.appendChild(form)
    container.current.appendChild(iFrame)
    iframeEvents?.onAppend?.(iFrame)
    logger('useDsMethod.executeDsMethod', 'appended form and iFrame', container.current)

    const submitForm = new Promise<void>((resolve, reject) => {
      iFrame.onload = () => {
        logger('useDsMethod.executeDsMethod', 'iFrame onload', iFrame)
        iframeEvents?.onLoad?.(iFrame)
        resolve()
      }

      iFrame.onerror = () => {
        logger('useDsMethod.executeDsMethod', 'iFrame onerror', iFrame)
        iframeEvents?.onError?.(iFrame)
        reject(new Error('Failed to execute dsMethod'))
      }

      form.submit()
      form.setAttribute('data-submitted', 'true')
    })

    await submitForm
  }, [encode, container, logger, iframeEvents])

  return {
    executeDsMethod,
  }
}
