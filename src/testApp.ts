import { RIFS, ServerConfig } from './';
import { sleep } from './utils';

const config: ServerConfig[] = [
  RIFS.Redis,
  {
    serviceName: 'Service #1',
    port: 3001,
    routes: {
      '/data': {
        method: 'post',
        middlewares: [
          (req, next) => {
            next();
          },
        ],
        response: () => ({
          id: '123-qwe-456-dfg',
          name: 'Rifs Dev',
          email: 'dev@test.com',
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
        statusCode: 200,
        middlewares: [(req, next) => next()],
        response: async (req, { rif, setStatusCode, log, rifsRedis }) => {
          const rc = rifsRedis;
          const data = await rif(3001)?.post('/data');

          const settied = rc?.set('key', JSON.stringify(data));
          log('SET to RIFS_REDIS: ' + String(settied));

          await sleep(2000);

          const response = (await rif(3002)?.get('/api2')) as { data: any };
          log(JSON.stringify(response));

          const getted2 = await rc?.get(Math.random().toString());
          log('GET_2 from RIFS_REDIS: ' + String(getted2));

          setStatusCode(req.headers ? 201 : 202);

          return { response: true, success: true, data: response.data };
        },
      },
      '/api2': {
        method: 'get',
        statusCode: 200,
        response: async (_req, { log, rifsRedis }) => {
          const getted = await rifsRedis?.get('key');
          log('GET from RIFS_REDIS: ' + String(getted));

          return {
            response: true,
            success: true,
            data: JSON.parse(getted || '{}'),
          };
        },
      },
    },
  },
];

new RIFS(config).start();
