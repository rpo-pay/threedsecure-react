import type { Authentication } from '../types'
import { useCallback, type RefObject } from 'react'
import { useBase64Encoder } from './useBase64Encoder'
import { v4 } from 'uuid'

export const useDsMethod = (container: RefObject<HTMLDivElement>) => {
  const { encode } = useBase64Encoder()

  const executeDsMethod = useCallback(async (authentication: Authentication, iFrame: HTMLIFrameElement, form: HTMLFormElement) => {
    if (!authentication.dsMethodUrl || form.hasAttribute('data-submitted')) {
      return
    }

    iFrame.name = v4()
    iFrame.style.visibility = 'hidden'
    iFrame.style.position = 'absolute'
    iFrame.style.top = '0'
    iFrame.style.left = '0'
    iFrame.width = '0'
    iFrame.height = '0'

    form.style.visibility = 'hidden'
    form.name = v4()
    form.target = iFrame.name
    form.action = authentication.dsMethodUrl
    form.method = 'POST'

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'threeDSMethodData'

    input.value = encode({
      threeDSServerTransID: authentication.transactionId,
      threeDSMethodNotificationURL: authentication.dsMethodCallbackUrl,
    })

    form.appendChild(input)

    container.current.appendChild(form)
    container.current.appendChild(iFrame)

    const submitForm = new Promise<void>((resolve, reject) => {
      iFrame.onload = () => {
        resolve()
      }

      iFrame.onerror = () => {
        reject(new Error('Failed to execute dsMethod'))
      }

      form.submit()
      form.setAttribute('data-submitted', 'true')
    })

    await submitForm
  }, [encode, container])

  return {
    executeDsMethod,
  }
}
