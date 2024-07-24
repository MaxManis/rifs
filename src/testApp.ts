import { RIFS, ServerConfig } from './';
import { sleep } from './utils';

const config: ServerConfig[] = [
  {
    serviceName: 'Service #1',
    port: 3001,
    routes: {
      '/data': {
        method: 'post',
        middlewares: [
          (req, next) => {
            return req.headers;
          },
        ],
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
        middlewares: [(req, next) => next()],
        response: async (req, { rif, setStatusCode, log }) => {
          const data = await rif(3001)?.post('/data');
          await sleep(1000);

          const newCode = 202;
          setStatusCode(newCode);

          log(JSON.stringify(data));

          return { response: true, success: true, data };
        },
      },
    },
  },
];

new RIFS(config).start();
