import type { Authentication } from '../types'
import { useState, type RefObject } from 'react'
import { useBase64Encoder } from './useBase64Encoder'
import { v4 } from 'uuid'

export const useDsMethod = (container: RefObject<HTMLDivElement>) => {
  const [isExecuting, setIsExecuting] = useState(false)
  const { encode } = useBase64Encoder()

  const executeDsMethod = async (authentication: Authentication) => {
    if (!authentication.dsMethodUrl || isExecuting) {
      return
    }

    setIsExecuting(true)
    try {
      const iFrame = document.createElement('iframe')
      iFrame.name = v4()
      iFrame.style.visibility = 'hidden'
      iFrame.style.position = 'absolute'
      iFrame.style.top = '0'
      iFrame.style.left = '0'
      iFrame.width = '0'
      iFrame.height = '0'

      const form = document.createElement('form')
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
      })

      await submitForm
    } finally {
      setIsExecuting(false)
    }
  }

  return {
    executeDsMethod,
  }
}
