import express, {
  NextFunction,
  Request,
  Response,
  Express,
  RequestHandler,
} from 'express';
import { Server } from 'http';
import { colors, consoleColors, getRifsUtils, sleep } from './utils';
import { RifsMiddleware, RifsUtils, RouteConfig, ServerConfig } from './types';
import { RifsRedis, RifsRedisClient } from './packages';
import { config as globalConfig } from './config';

export class RIFS {
  private readonly configs: ServerConfig[];

  private readonly express: typeof express;
  private readonly expressServers: Server[];
  private readonly expressApps: Express[];

  private readonly rifsRedis: RifsRedis | null;

  constructor(configs: ServerConfig[]) {
    this.configs = configs;

    this.express = express;
    this.expressServers = [];
    this.expressApps = [];

    const rifsRedis = configs.find(
      (config) =>
        config.serviceType === 'redis' &&
        config.port === globalConfig.REDIS_PORT &&
        config.routes.ROOT,
    );
    if (rifsRedis) {
      this.rifsRedis = new RifsRedis(rifsRedis.port);
    } else {
      this.rifsRedis = null;
    }
  }

  static Redis: ServerConfig = {
    serviceType: 'redis',
    port: 6379,
    routes: { ROOT: { method: 'get', response: () => null } },
  };

  public start = this.startMockServers;
  public run = this.startMockServers;
  public simulate = this.startMockServers;
  public async startMockServers() {
    this.configs.forEach((config) => {
      if (!config.serviceType || config.serviceType === 'express') {
        if (config.port === 0) {
          return;
        }

        this.runExpressService(config);
      } else if (config.serviceType === 'redis' && this.rifsRedis) {
        this.rifsRedis.init();
      } else {
        throw new Error(
          `<RIFS-ERROR>: Unknown serviceType: ${config.serviceType}`,
        );
      }
    });
  }

  public async terminate() {
    this.expressServers.forEach((server: Server) => server.close());
  }

  private logServiceData(
    context: string,
    message: string,
    color: keyof typeof consoleColors = 'green',
  ) {
    console.log(
      consoleColors[color],
      `[${context}]: ${message}` + colors.Reset,
    );
  }

  private rifsMiddlewaresToExpressMiddlewares(
    routeConfig: RouteConfig,
    serviceName: string,
  ): RequestHandler[] {
    return routeConfig.middlewares
      ? routeConfig.middlewares.map(
        (middleware: RifsMiddleware, i: number): RequestHandler =>
          async (req: Request, _res: Response, next: NextFunction) => {
            const middlewareName = `${serviceName} MIDDLEWARE_#${i + 1}`;
            const middlewareRoute = `${req.method.toUpperCase()}:${req.path.toLowerCase()}`;
            let isNextFuncCalled = false;
            const rifsNext: NextFunction = () => {
              isNextFuncCalled = true;
              return next();
            };
            this.logServiceData(middlewareName, middlewareRoute, 'cyan');

            try {
              const data: unknown = await middleware(req, rifsNext);
              if (data !== undefined) {
                this.logServiceData(
                  middlewareName,
                  `${middlewareRoute} => Sent Response`,
                  'cyan',
                );
                return _res.send(data);
              }

              this.logServiceData(
                middlewareName,
                `${middlewareRoute} => Next Handler Called`,
                'cyan',
              );
              if (!isNextFuncCalled) {
                return next();
              }
            } catch (err) {
              this.logServiceData(
                middlewareName,
                `${middlewareRoute} => ERROR: ${err}`,
                'red',
              );
              return _res.status(500).send({ error: err });
            }
          },
      )
      : [];
  }

  private async runExpressService(config: ServerConfig) {
    const mockApp = this.express();
    const serviceName = config.serviceName
      ? config.serviceName
      : `Unknown RIF on port ${config.port}`;

    const rifsRedisClient = this.rifsRedis
      ? new RifsRedisClient(6379).init()
      : null;

    Object.keys(config.routes).forEach((route: string) => {
      const routeConfig = config.routes[route];
      const initStatusCode = routeConfig.statusCode || 200;
      const routeConfigForRifsUtils = {
        statusCode: initStatusCode,
      };

      const utils: Omit<RifsUtils, 'rifsRedis'> = getRifsUtils(
        this.configs,
        routeConfigForRifsUtils,
        serviceName,
      );
      const rifsUtils: RifsUtils = { ...utils, rifsRedis: rifsRedisClient };

      const routeMainHandler: RequestHandler = async (
        req: Request,
        res: Response,
        _next: NextFunction,
      ) => {
        const startTime = new Date().getTime();
        try {
          this.logServiceData(
            serviceName,
            `${req.method.toUpperCase()}:${req.path.toLowerCase()}${req.body ? ` | Body:${req.body}` : ''
            }`,
          );

          if (routeConfig.responseDelay) {
            await sleep(routeConfig.responseDelay);
          }

          const response =
            typeof routeConfig.response === 'function'
              ? await routeConfig.response(req, rifsUtils)
              : routeConfig.response;

          this.logServiceData(
            serviceName,
            `${req.method.toUpperCase()}:${req.path.toLowerCase()}${response
              ? ` => ${routeConfigForRifsUtils.statusCode} ${JSON.stringify(
                response,
              )}`
              : ` => ${routeConfigForRifsUtils.statusCode}`
            }`,
          );
          const endTime = new Date().getTime();
          this.logServiceData(
            serviceName,
            `${req.method.toUpperCase()}:${req.path.toLowerCase()} => Response Time:${endTime - startTime
            }ms`,
            'yellow',
          );

          res.statusCode = routeConfigForRifsUtils.statusCode;

          if (routeConfig.responseHeaders) {
            Object.entries(routeConfig.responseHeaders).forEach(
              ([key, value]) => res.setHeader(key, value),
            );
          }

          return response
            ? res.send(response)
            : res.sendStatus(routeConfigForRifsUtils.statusCode);
        } catch (err) {
          const errorEndTime = new Date().getTime();
          this.logServiceData(
            serviceName,
            `ERROR: ${req.method.toUpperCase()}:${req.path.toLowerCase()} => 500 | After:${errorEndTime - startTime
            }ms`,
            'red',
          );
          console.error(consoleColors.red, err);
          res.sendStatus(500);
        }
      };

      const middlewaresArray: RequestHandler[] =
        this.rifsMiddlewaresToExpressMiddlewares(routeConfig, serviceName);

      mockApp[routeConfig.method](route, [
        ...middlewaresArray,
        routeMainHandler,
      ]);
    });

    const expressServerInstance = mockApp.listen(config.port, () => {
      this.logServiceData(
        serviceName,
        `${serviceName} started on port ${config.port}`,
        'blue',
      );
    });

    this.expressServers.push(expressServerInstance);
  }
}
