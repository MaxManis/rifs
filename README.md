# RIFS - Real-time Integration and Functional Simulation

[![npm version](https://badge.fury.io/js/rifs.svg)](https://badge.fury.io/js/rifs)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

RIFS is a lightweight and powerful tool designed to simplify local development of microservices architectures. Instead of running multiple dependent services, RIFS allows you to easily mock and virtualize them, saving you time and effort.

## Features

- **REST Support:** Easily mock REST services.
- **Customizable Responses:** Define static or dynamic responses for your mock endpoints.
- **Delay Simulation:** Simulate network latency to test your service's resilience.

## Installation

Install RIFS via npm:

```bash
npm install rifs
```

## Configuration Options

The configuration for RIFS is an array of server configurations (`ServerConfig[]`). Each server configuration object includes:

- `serviceName`: (Optional) A name for the mock service.
- `port`: The port number on which the mock service will run.
- `routes`: An object defining the routes for the mock service. Each route is defined by:
- - `method`: The HTTP method (e.g., get, post).
- - `response`: A function defining the response. A function is receives the request object and the response object.
- - `responseDelay`: (Optional) Value in milliseconds, a period of time that your route need to wait before beginning of the response.

## Configuration Execution

```typescript
const { RIFS } = require('rifs');
// OR
import { RIFS } from 'rifs';

new RIFS(config).startMockServers();
```

## Example Configuration

### One Service

```typescript
const config: ServerConfig[] = [
  {
    serviceName: 'Auth Service',
    port: 3001,
    routes: {
      '/me': {
        method: 'get',
        response: () => ({
          id: '10012',
          name: 'John Bull',
          email: 'john.bull@gmail.com',
          me: true,
          createdAt: '01-02-2021',
        }),
      },
    },
  },
];
```

### Two and more Services

```javascript
const configs = [
  {
    serviceName: 'Notification Service',
    port: 3001,
    routes: {
      '/send-email': {
        method: 'post',
        response: () => ({
          sent: true,
          isEmail: true,
          isSms: false,
          sentAt: new Date().toString(),
        }),
      },
    },
  },
  {
    serviceName: 'Auth Service',
    port: 3012,
    routes: {
      '/get-me': {
        method: 'get',
        response: () => ({
          me: true,
          name: 'John Bull',
          id: '123',
          email: 'john.bull@gmail.com',
          createdAt: '01-02-2024',
        }),
      },
      '/get-user': {
        method: 'get',
        response: async (_req, res) => {
          const id = _req.query['id'];

          const user = {
            me: false,
            name: 'Patric Shift',
            id: '321',
            email: 'patric.shift@gmail.com',
            createdAt: '01-02-2010',
          };

          const meRaw = await fetch('http://localhost:3012/get-me');
          const me = await meRaw.json();

          res.send(id ? user : me);
        },
      },
    },
  },
];
```

## Usage

### Basic Example

Here's a basic example demonstrating how to use RIFS to mock two services for local development.

```javascript
const express = require('express');
const { RIFS } = require('rifs');

const app = express();

// RIFS configuration
const config = [
  {
    serviceName: 'Notification Service',
    port: 3001,
    routes: {
      '/send-email': {
        method: 'post',
        response: () => ({
          sent: true,
          isEmail: true,
          isSms: false,
          sentAt: new Date().toString(),
        }),
      },
    },
  },
  {
    serviceName: 'Auth Service',
    port: 3012,
    routes: {
      '/get-me': {
        method: 'get',
        response: () => ({
          me: true,
          name: 'John Bull',
          id: '123',
          email: 'john.bull@gmail.com',
          createdAt: '01-02-2024',
        }),
      },
      '/get-user': {
        method: 'get',
        response: async (_req, res) => {
          const id = _req.query['id'];

          const user = {
            me: false,
            name: 'Patric Shift',
            id: '321',
            email: 'patric.shift@gmail.com',
            createdAt: '01-02-2010',
          };

          const meRaw = await fetch('http://localhost:3012/get-me');
          const me = await meRaw.json();

          res.send(id ? user : me);
        },
      },
    },
  },
];

// Initialize RIFS mock services
new RIFS(config).startMockServers();

// Example endpoint in your main service
app.get('/api', async (req, res) => {
  const userRaw = await fetch('http://localhost:3012/get-user?id=12');
  const user = await userRaw.json();

  const thisYear = new Date().getFullYear();
  const targetYear = new Date(user.createdAt).getFullYear();
  console.log(targetYear, thisYear);

  if (targetYear < thisYear) {
    const sendEmail = await fetch('http://localhost:3001/send-email', {
      method: 'POST',
    });
    const email = await sendEmail.json();

    res.send({ notification: email.sent });
    return;
  }

  res.send({ notification: false });
});

app.listen(3002, () => {
  console.log('Main server started on port 3002');
});
```

## Contributing

We welcome contributions to **RIFS**! If you have an idea for an improvement or have found a bug, please open an issue or submit a pull request.

### Steps to Contribute

1. Fork the repository.
2. Create a new branch (`git checkout -b feature-branch`).
3. Make your changes.
4. Commit your changes (`git commit -am 'Add new feature'`).
5. Push to the branch (`git push origin feature-branch`).
6. Open a pull request.

### Thank you for using RIFS! We hope it makes your development process easier and more efficient.
