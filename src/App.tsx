import { type RefObject, useRef, useState } from 'react'
import { useThreeDSecure } from '@sqala-threedsecure/library'
import './App.css'

function App() {
  const container = useRef<HTMLDivElement>(null)
  const [transactionId, setTransactionId] = useState('')
  const { status, isExecuting, result, execute } = useThreeDSecure({
    baseUrl: 'http://localhost:3000',
    publicKey: 'test',
    container: container as RefObject<HTMLDivElement>,
  })

  const handleExecute = () => {
    execute({
      id: transactionId,
    })
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem' }}>
        <input
          className="input"
          type="text"
          value={transactionId}
          onChange={(e) => setTransactionId(e.target.value)}
          placeholder="Enter Transaction ID"
        />
        {status && <p>{status}</p>}
        <button className="button" type="button" onClick={handleExecute}>
          Execute
        </button>
      </div>
      {result && <pre style={{ flex: 1 }}>{JSON.stringify(result)}</pre>}
      {isExecuting && <div style={{ flex: 1 }} ref={container} />}
    </div>
  )
}

export default App
