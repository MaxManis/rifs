# RIFS - Real-time Integration and Functional Simulation

[![npm version](https://badge.fury.io/js/rifs.svg)](https://badge.fury.io/js/rifs)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

RIFS is a lightweight and powerful tool designed to simplify local development of microservices architectures. Instead of running multiple dependent services, RIFS allows you to easily mock and virtualize them, saving you time and effort.

## ⚠️ Warning: Early Access ⚠️

**This NPM package is currently in early access. It may still contain bugs, undergo significant changes, and lack some features. Use it at your own risk and please provide feedback to help us improve it.**

## Features

- **REST Support:** Easily mock REST services.
- **Customizable Responses:** Define static or dynamic responses for your mock endpoints.
- **Delay Simulation:** Simulate network latency to test your service's resilience.
- **Middlewares Support:** RIFS fully supports Express middleware functions. Simply pass an array of your middleware functions to `RouteConfig.middlewares`.

## Installation

Install RIFS:

```bash
npm install rifs
```

## Configuration Options

The configuration for RIFS is an array of server configurations (`ServerConfig[]`). Each server configuration object includes:

- `serviceName`: (Optional) A name for the mock service.
- `port`: The port number on which the mock service will run.
- `routes`: An object defining the routes for the mock service. Each route is defined by:
- - `method`: The HTTP method in Lower case (e.g., get, post).
- - `response`: A function defining the response. The function receives the request object, the next function, and a utility object (rifsUtils).
- - `responseDelay`: (Optional) Value in milliseconds, a period of time that your route need to wait before beginning of the response.
- - `statusCode`: (Optional) The HTTP status code for the response.
- - `responseHeaders`: (Optional) An object representing the headers for the response.
- - `middlewares`: (Optional) An array of middleware functions to be executed before the response.

## Configuration Execution

```typescript
const { RIFS } = require('rifs');
// OR
import { RIFS } from 'rifs';

new RIFS(config).start();
```

## Rifs Utils:

Each route response handler in RIFS receives a RifsUtils object, which provides useful functions to manipulate the response status code or to retrieve data from other RIFS instances.

### Example Usage

```typescript
response: async (req, next, { rif, setStatusCode }) => {
  const dataFromOtherRif = await rif(3030).get('/api')
  setStatusCode(400)

  return dataFromOtherRif
},
```

### Available Functions

- `setStatusCode`
  This function allows you to change the status code of the response in runtime, if you want to send a different one from what you specified in `routeConfig.statusCode`.

- `rif`
  This function provides access to a RIFS instances running on different (or the same one) ports, enabling you to make HTTP requests to them. It returns an object with methods corresponding to different HTTP request types and other handfull functions.

```typescript
rif(port: number): Rif | null;
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
        response: (req) => ({
          id: '10012',
          name: 'John Bull',
          email: 'john.bull@gmail.com',
          me: true,
          createdAt: '01-02-2021',
          dataFromReq: req.query.data,
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
        response: (req) => ({
          sent: true,
          isEmail: true,
          isSms: false,
          user: { id: req.query.id },
          message: req.body.msg,
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
      '/send-me-email': {
        method: 'get',
        response: async (req, _next, { rif }) => {
          // You can send requests from one Rif to another using RifsOptions object:
          const me = await rif(3012).get('/get-me', { dataType: 'json' });

          // You also can pass options to your requests like body, headers and data type.
          await rif(3001).post(`/send-email?userId=${me.id}`, { body: { msg: 'Hello!' }, dataType: 'json' });

          res.send({ success: true });
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
        middlewares: [(req) => console.log(req.headers)],
        responseDelay: 2000, // 2 sec
        statusCode: 201,
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
        responseHeaders: { 'X-App-Name': 'APP_NAME' },
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
        response: async (req, _next, { rif }) => {
          const id = req.query['id'];

          const user = {
            me: false,
            name: 'Patric Shift',
            id: '321',
            email: 'patric.shift@gmail.com',
            createdAt: '01-02-2010',
          };

          const me = await rif(3012).get('/get-me');
          return id ? user : me;
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

  if (targetYear < thisYear) {
    const sendEmail = await fetch('http://localhost:3001/send-email', {
      method: 'POST',
    });
    const email = await sendEmail.json();

    return res.send({ notification: email.sent });
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
