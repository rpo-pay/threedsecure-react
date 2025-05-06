import type { Authentication } from '../types'
import { useState, type RefObject } from 'react'
import { useBase64Encoder } from './useBase64Encoder'
import { v4 } from 'uuid'

export enum ChallengeWindowSize {
  H400xW250 = '01',
  H400xW390 = '02',
  H600xW500 = '03',
  H400xW600 = '04',
  Fullscreen = '05',
}

export const useChallenge = (container: RefObject<HTMLDivElement>) => {
  const [isExecuting, setIsExecuting] = useState(false)
  const { encode } = useBase64Encoder()

  const getChallengeWindowSize = () => {
    return (
      (container.current.clientWidth <= 250 && ChallengeWindowSize.H400xW250) ||
      (container.current.clientWidth <= 390 && ChallengeWindowSize.H400xW390) ||
      (container.current.clientWidth <= 500 && ChallengeWindowSize.H600xW500) ||
      (container.current.clientWidth <= 600 && ChallengeWindowSize.H400xW600) ||
      ChallengeWindowSize.Fullscreen
    )
  }

  const executeChallenge = async (authentication: Authentication) => {
    if (!authentication.acsUrl || isExecuting) {
      return
    }

    setIsExecuting(true)
    try {
      container.current.style.position = 'relative'

      const iFrame = document.createElement('iframe')
      iFrame.name = v4()
      iFrame.style.width = '100%'
      iFrame.style.height = '100%'
      iFrame.style.position = 'absolute'
      iFrame.style.top = '0'
      iFrame.style.left = '0'

      const form = document.createElement('form')
      form.style.visibility = 'hidden'
      form.name = v4()
      form.target = iFrame.name
      form.action = authentication.acsUrl
      form.method = 'POST'

      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = 'creq'
      form.appendChild(input)

      const data = {
        threeDSServerTransID: authentication.transactionId,
        acsTransID: authentication.acsTransId,
        messageVersion: authentication.acsProtocolVersion,
        messageType: 'CReq',
        challengeWindowSize: getChallengeWindowSize(),
      }

      input.value = encode(data)

      container.current.appendChild(form)
      container.current.appendChild(iFrame)

      const submitForm = new Promise<void>((resolve, reject) => {
        iFrame.onload = () => {
          resolve()
        }

        iFrame.onerror = (_) => {
          reject(new Error('Failed to execute challenge'))
        }

        form.submit()
      })

      await submitForm
    } finally {
      setIsExecuting(false)
    }
  }

  return { executeChallenge }
}
