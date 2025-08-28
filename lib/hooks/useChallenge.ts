import { useCallback, type RefObject } from 'react'
import { v4 } from 'uuid'
import type { Authentication, IFrameEvents, Logger } from '../types'
import { useBase64Encoder } from './useBase64Encoder'

export enum ChallengeWindowSize {
  H400xW250 = '01',
  H400xW390 = '02',
  H600xW500 = '03',
  H400xW600 = '04',
  Fullscreen = '05',
}

export const useChallenge = (container: RefObject<HTMLDivElement>, logger: Logger, iframeEvents?: IFrameEvents) => {
  const { encode } = useBase64Encoder()

  const getChallengeWindowSize = useCallback(() => {
    return (
      (container.current.clientWidth <= 250 && ChallengeWindowSize.H400xW250) ||
      (container.current.clientWidth <= 390 && ChallengeWindowSize.H400xW390) ||
      (container.current.clientWidth <= 500 && ChallengeWindowSize.H600xW500) ||
      (container.current.clientWidth <= 600 && ChallengeWindowSize.H400xW600) ||
      ChallengeWindowSize.Fullscreen
    )
  }, [container])

  const executeChallenge = useCallback(async (authentication: Authentication, iFrame: HTMLIFrameElement, form: HTMLFormElement) => {
    if (!authentication.acsUrl || form.hasAttribute('data-submitted')) {
      logger('useChallenge.executeChallenge', 'skipped', authentication)
      return
    }

    container.current.style.position = 'relative'
    logger('useChallenge.executeChallenge', 'configured container', container.current)

    iFrame.name = v4()
    iFrame.style.width = '100%'
    iFrame.style.height = '100%'
    iFrame.style.position = 'absolute'
    iFrame.style.top = '0'
    iFrame.style.left = '0'
    logger('useChallenge.executeChallenge', 'configured iFrame', iFrame)

    form.style.visibility = 'hidden'
    form.name = v4()
    form.target = iFrame.name
    form.action = authentication.acsUrl
    form.method = 'POST'
    logger('useChallenge.executeChallenge', 'configured form', form)

    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = 'creq'
    logger('useChallenge.executeChallenge', 'configured input', input)

    const data = {
      threeDSServerTransID: authentication.transactionId,
      acsTransID: authentication.acsTransId,
      messageVersion: authentication.acsProtocolVersion,
      messageType: 'CReq',
      challengeWindowSize: getChallengeWindowSize(),
    }

    input.value = encode(data)

    form.appendChild(input)
    container.current.appendChild(form)
    container.current.appendChild(iFrame)
    iframeEvents?.onAppend?.(iFrame)
    logger('useChallenge.executeChallenge', 'appended form and iFrame', container.current)

    const submitForm = new Promise<void>((resolve, reject) => {
      iFrame.onload = () => {
        logger('useChallenge.executeChallenge', 'iFrame onload', iFrame)
        iframeEvents?.onLoad?.(iFrame)
        resolve()
      }

      iFrame.onerror = (_) => {
        logger('useChallenge.executeChallenge', 'iFrame onerror', iFrame)
        iframeEvents?.onError?.(iFrame)
        reject(new Error('Failed to execute challenge'))
      }

      form.submit()
      // Execute challenge only once, be resilient to PENDING_CHALLENGE event
      // being sent more than once, just do a no-op afterwards
      form.setAttribute('data-submitted', 'true')
    })

    await submitForm
  }, [container, encode, getChallengeWindowSize, logger, iframeEvents])

  return { executeChallenge }
}
