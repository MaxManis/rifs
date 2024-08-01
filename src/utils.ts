import { RifsUtils, ServerConfig, RifHttpRequestOptions, Rif } from './types';
import fetch from 'node-fetch';

export const rifMakeRequest = async <T>(
  route: string,
  port: number,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete',
  rifOnPort: ServerConfig,
  options?: RifHttpRequestOptions,
) => {
  const { dataType, headers, body } = options || {};

  if (!rifOnPort.routes[route]) {
    throw new Error(
      `[RIFS_ERROR] Route ${route} does not exists in Rif on port ${port}`,
    );
  }
  if (rifOnPort.routes[route].method !== method) {
    throw new Error(
      `[RIFS_ERROR] Route ${route} does not support GET:${route} method; ${rifOnPort.routes[
        route
      ].method.toUpperCase()} only!`,
    );
  }
  const url = `http://localhost:${rifOnPort.port}${route}`;
  const responseObj = await fetch(url, { method, body, headers });
  const data = await responseObj[dataType || 'json']();
  return data as T;
};

export const getRifsUtils = (
  configs: ServerConfig[],
  initConfig: { statusCode: number },
  currentServiceName?: string,
): Omit<RifsUtils, 'rifsRedis'> => {
  return {
    log: (message: string): void => {
      const context = `[${currentServiceName}:::USER_LOG] =>`;
      console.log(colors.FgWhite, context, message, colors.Reset);
    },
    setStatusCode: (newStatusCode: number) =>
      (initConfig.statusCode = newStatusCode),
    rif(port: number): Rif | null {
      const rifOnPort = configs.find((r) => r.port === port);

      if (!rifOnPort) return null;

      return {
        getAllRoutes() {
          return Object.keys(rifOnPort.routes);
        },
        async get<T>(route: string, options?: RifHttpRequestOptions) {
          const responseData = await rifMakeRequest(
            route,
            port,
            'get',
            rifOnPort,
            options,
          );
          return responseData as T;
        },
        async post<T>(route: string, options?: RifHttpRequestOptions) {
          const responseData = await rifMakeRequest(
            route,
            port,
            'post',
            rifOnPort,
            options,
          );
          return responseData as T;
        },
        async put<T>(route: string, options?: RifHttpRequestOptions) {
          const responseData = await rifMakeRequest(
            route,
            port,
            'put',
            rifOnPort,
            options,
          );
          return responseData as T;
        },
        async patch<T>(route: string, options?: RifHttpRequestOptions) {
          const responseData = await rifMakeRequest(
            route,
            port,
            'patch',
            rifOnPort,
            options,
          );
          return responseData as T;
        },
        async delete<T>(route: string, options?: RifHttpRequestOptions) {
          const responseData = await rifMakeRequest(
            route,
            port,
            'delete',
            rifOnPort,
            options,
          );
          return responseData as T;
        },
      };
    },
  };
};

export const sleep = (ms: number) => {
  return new Promise((r) => setTimeout(() => r(true), ms));
};

export const colors = {
  Reset: '\x1b[0m',
  Bright: '\x1b[1m',
  Dim: '\x1b[2m',
  Underscore: '\x1b[4m',
  Blink: '\x1b[5m',
  Reverse: '\x1b[7m',
  Hidden: '\x1b[8m',

  FgBlack: '\x1b[30m',
  FgRed: '\x1b[31m',
  FgGreen: '\x1b[32m',
  FgYellow: '\x1b[33m',
  FgBlue: '\x1b[34m',
  FgMagenta: '\x1b[35m',
  FgCyan: '\x1b[36m',
  FgWhite: '\x1b[37m',
  FgGray: '\x1b[90m',

  BgBlack: '\x1b[40m',
  BgRed: '\x1b[41m',
  BgGreen: '\x1b[42m',
  BgYellow: '\x1b[43m',
  BgBlue: '\x1b[44m',
  BgMagenta: '\x1b[45m',
  BgCyan: '\x1b[46m',
  BgWhite: '\x1b[47m',
  BgGray: '\x1b[100m',
};

export const consoleColors = {
  red: colors.FgRed,
  blue: colors.FgBlue,
  green: colors.FgGreen,
  yellow: colors.FgYellow,
  cyan: colors.FgCyan,
  white: colors.FgWhite,
  purple: colors.FgMagenta,
};
