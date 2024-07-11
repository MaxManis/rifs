import { RIFS, ServerConfig } from './';

const config: ServerConfig[] = [
  {
    serviceName: 'Service #1',
    port: 3001,
    routes: {
      '/data': {
        method: 'post',
        response: () => ({
          isResponse: true,
          data: { some: 123 },
          date: new Date().toISOString(),
        }),
      },
    },
  },
  {
    serviceName: 'Service #2',
    port: 3002,
    routes: {
      '/api': {
        method: 'get',
        statusCode: 201,
        response: async (req, next, { rif, changeStatusCode }) => {
          const data = await rif(3001)?.post('/data');

          changeStatusCode(400);

          return {
            isResponse: true,
            data,
            date: new Date().toISOString(),
          };
        },
      },
    },
  },
];

new RIFS(config).start();
