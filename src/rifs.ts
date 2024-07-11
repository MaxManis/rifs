import express, { NextFunction, Request, Response, Express } from 'express';
import { RifsUtils, ServerConfig } from './types';
import { consoleColors, getRifsUtils, sleep } from './utils';
import { Server } from 'http';

export class RIFS {
  private readonly configs: ServerConfig[];

  private readonly express: typeof express;
  private readonly expressServers: Server[];
  private readonly expressApps: Express[];

  constructor(configs: ServerConfig[]) {
    this.configs = configs;

    this.express = express;
    this.expressServers = [];
    this.expressApps = [];
  }

  public start = this.startMockServers;
  public run = this.startMockServers;
  public simulate = this.startMockServers;
  public async startMockServers() {
    this.configs.forEach((config) => {
      if (!config.serviceType || config.serviceType === 'express') {
        this.runExpressService(config);
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

  private async logServiceData(
    context: string,
    data: string,
    color: keyof typeof consoleColors = 'green',
  ) {
    console.log(consoleColors[color], `[${context}]: ${data}`);
  }

  private async runExpressService(config: ServerConfig) {
    const mockApp = this.express();
    const serviceName = config.serviceName
      ? config.serviceName
      : `Unknown service on port ${config.port}`;

    Object.keys(config.routes).forEach((route: string) => {
      const routeConfig = config.routes[route];
      const initStatusCode = routeConfig.statusCode || 200;
      const routeConfigForRifsUtils = {
        statusCode: initStatusCode,
      };

      const rifsUtils: RifsUtils = getRifsUtils(
        this.configs,
        routeConfigForRifsUtils,
      );

      mockApp[routeConfig.method](
        route,
        async (req: Request, res: Response, next: NextFunction) => {
          const startTime = new Date().getTime();
          try {
            this.logServiceData(
              serviceName,
              `${req.method.toUpperCase()}:${req.path.toLowerCase()}${
                req.body ? ` | Body:${req.body}` : ''
              }`,
            );

            if (routeConfig.responseDelay) {
              await sleep(routeConfig.responseDelay);
            }

            const response =
              typeof routeConfig.response === 'function'
                ? await routeConfig.response(req, next, rifsUtils)
                : routeConfig.response;

            this.logServiceData(
              serviceName,
              `${req.method.toUpperCase()}:${req.path.toLowerCase()}${
                response
                  ? ` => ${routeConfigForRifsUtils.statusCode} ${JSON.stringify(
                      response,
                    )}`
                  : ''
              }`,
            );
            const endTime = new Date().getTime();
            this.logServiceData(
              serviceName,
              `${req.method.toUpperCase()}:${req.path.toLowerCase()} => Response Time:${
                endTime - startTime
              }ms`,
              'yellow',
            );

            res.statusCode = routeConfigForRifsUtils.statusCode;

            response
              ? res.send(response)
              : res.sendStatus(routeConfigForRifsUtils.statusCode);
          } catch (err) {
            const errorEndTime = new Date().getTime();
            this.logServiceData(
              serviceName,
              `ERROR: ${req.method.toUpperCase()}:${req.path.toLowerCase()} => 500 | After:${
                errorEndTime - startTime
              }ms`,
              'red',
            );
            console.error(consoleColors.red, err);
            res.sendStatus(500);
          }
        },
      );
    });

    const expressServerInstance = mockApp.listen(config.port, () => {
      this.logServiceData(
        serviceName,
        `Mock server started on port ${config.port}`,
        'blue',
      );
    });

    this.expressServers.push(expressServerInstance);
  }
}
