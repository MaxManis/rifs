import { RIFS, ServerConfig } from './';

const config: ServerConfig[] = [
  {
    serviceName: 'Service #1',
    port: 3001,
    routes: {
      '/data': {
        method: 'post',
        middlewares: [
          (req, next) => {
            console.log(req.headers);
            next();
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
        response: async (req, next, { rif, setStatusCode }) => {
          const data = await rif(3001)?.post('/data');

          setStatusCode(400);

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
