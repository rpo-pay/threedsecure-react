![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![GitHub](https://img.shields.io/badge/github-%23121011.svg?style=for-the-badge&logo=github&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/github%20actions-%232671E5.svg?style=for-the-badge&logo=githubactions&logoColor=white)
![Visual Studio Code](https://img.shields.io/badge/Visual%20Studio%20Code-0078d7.svg?style=for-the-badge&logo=visual-studio-code&logoColor=white)


# 3D Secure React Library

A modern React library that simplifies the integration of 3D Secure (3DS) authentication for secure payment processing in web applications.

## Overview

This library provides a set of React hooks and utilities to implement 3D Secure authentication flows in your payment applications. It supports the full 3DS authentication lifecycle including directory server interactions, challenges, and result handling.

## Features

- Complete 3D Secure authentication flow
- React hooks-based API
- Handles the entire authentication lifecycle
- Type-safe implementation with TypeScript
- Responsive challenge rendering
- Cancellable authentication processes

## Installation

```bash
npm install @sqala/threedsecure-react
# or
yarn add @sqala/threedsecure-react
```

## Quick Start

```tsx
import { useRef } from 'react';
import { useThreeDSecure } from '@sqala/threedsecure-react';

function PaymentComponent() {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { isExecuting, status, result, execute, cancel } = useThreeDSecure({
    baseUrl: 'https://api.sqala.tech/threedsecure/v1',
    publicKey: 'your-public-key',
    container: containerRef
  });

  const handleAuthentication = async () => {
    await execute({
      id: 'authentication-id' // Unique identifier for the authentication
    });
  };

  return (
    <div>
      <button 
        onClick={handleAuthentication}
        disabled={isExecuting}
      >
        Process Payment
      </button>
      
      {isExecuting && <p>Processing payment authentication...</p>}
      {status && <p>Current status: {status}</p>}
      
      {/* Container for 3DS challenges */}
      <div ref={containerRef} style={{ width: '100%', height: '400px' }} />
      
      {isExecuting && (
        <button onClick={cancel}>Cancel</button>
      )}
      
      {result && (
        <div>
          <h3>Authentication Result</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

## Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Modern browser with DevTools for debugging

### Setting Up the Development Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/rpo-pay/threedsecure-react.git
   cd threedsecure-react
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn
   ```

3. Start the development server:
   ```bash
   npm run start:dev
   # or
   yarn start:dev
   ```

This will concurrently:
- Build the library TypeScript files
- Watch for changes in the lib folder
- Start Vite's development server

### Project Structure

```
threedsecure-react/
├── lib/                  # Library source code
│   ├── hooks/            # React hooks
│   ├── models/           # Data models
│   ├── types/            # TypeScript type definitions
│   └── main.ts           # Main entry point
├── src/                  # Demo application
├── dist/                 # Build output
├── .vscode/              # VS Code configuration
├── tsconfig.lib.json     # TypeScript config for the library
└── vite.config.ts        # Vite configuration
```

## Debugging

The project is configured with source maps for easy debugging. When using VS Code:

1. Open the project in VS Code
2. Set breakpoints in your code
3. Press F5 to start debugging (this launches Edge with the development server)
4. The debug session will automatically terminate the development server when stopped

## Running Tests

```bash
npm run test
# or
yarn test
```

## Building for Production

```bash
npm run build
# or
yarn build
```

This generates the library output in the `dist` directory.

## Contributing

We welcome contributions from the community! Here are some ways you can contribute:

### Reporting Issues

- Use the issue tracker to report bugs
- Include detailed steps to reproduce the issue
- Mention your environment (browser, OS, library version)

### Feature Requests

- Open an issue describing the feature
- Explain the use case and benefits
- Discuss implementation approaches

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and patterns
- Write unit tests for new features
- Update documentation for any API changes
- Keep commits focused and atomic
- Use semantic commit messages

## License

[MIT](LICENSE)

## Acknowledgements

- This library is developed and maintained by Sqala
- Special thanks to all the contributors who have helped improve this project