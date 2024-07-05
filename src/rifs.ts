import express, { Request, Response } from 'express';
import { ServerConfig } from './types';
import { consoleColors, sleep } from './utils';

export class RIFS {
  private readonly configs: ServerConfig[];

  private readonly express: typeof express;

  constructor(configs: ServerConfig[]) {
    this.configs = configs;

    this.express = express;
  }

  private async logServiceData(
    context: string,
    data: string,
    color: keyof typeof consoleColors = 'green',
  ) {
    console.log(consoleColors[color], `[${context}]: ${data}`);
  }

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

  private async runExpressService(config: ServerConfig) {
    const mockApp = this.express();
    const serviceName = config.serviceName
      ? config.serviceName
      : `Unknown service on port ${config.port}`;

    Object.keys(config.routes).forEach((route: string) => {
      const routeConfig = config.routes[route];

      mockApp[routeConfig.method](
        route,
        async (req: Request, res: Response) => {
          const startTime = new Date().getTime();
          try {
            this.logServiceData(
              serviceName,
              `${req.method.toUpperCase()}:${req.path.toLowerCase()}${req.body ? ` | Body:${req.body}` : ''}`,
            );

            if (routeConfig.responseDelay) {
              await sleep(routeConfig.responseDelay);
            }

            const response =
              typeof routeConfig.response === 'function'
                ? await routeConfig.response(req, res)
                : routeConfig.response;

            this.logServiceData(
              serviceName,
              `${req.method.toUpperCase()}:${req.path.toLowerCase()}${response ? ` => ${JSON.stringify(response)}` : ''}`,
            );
            const endTime = new Date().getTime();
            this.logServiceData(
              serviceName,
              `${req.method.toUpperCase()}:${req.path.toLowerCase()} => Response Time:${endTime - startTime}ms`,
              'yellow',
            );

            res.json(response);
          } catch (err) {
            const errorEndTime = new Date().getTime();
            this.logServiceData(
              serviceName,
              `ERROR: ${req.method.toUpperCase()}:${req.path.toLowerCase()} => After:${errorEndTime - startTime}ms`,
              'red',
            );
            console.error(consoleColors.red, err);
            res.sendStatus(500);
          }
        },
      );
    });

    mockApp.listen(config.port, () => {
      this.logServiceData(
        serviceName,
        `Mock server started on port ${config.port}`,
        'yellow',
      );
    });
  }
}
