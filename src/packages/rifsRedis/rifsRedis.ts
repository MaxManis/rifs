import { createServer, Server, Socket } from 'net';
import { config as globalConfig } from '../../config';
import { ParsedData, ResponseData } from './types';
import { colors, consoleColors } from '../../utils';

const APP_NAME = 'RIFS_REDIS';

export class RifsRedis {
  private readonly context: string;
  private readonly port: number;
  private readonly dataStorage: Map<string, string>;

  private server: Server | null;

  constructor(port: number) {
    this.port = port;
    this.server = null;
    this.dataStorage = new Map();

    this.context = `[${APP_NAME}:${this.port}]:`;
  }

  public init() {
    const server = createServer((socket: Socket) => {
      socket.on('data', (data) => {
        const message = this.parseIncomingData(data.toString());
        this.logData(`${message.action}:<${message.key}>`, 'yellow');

        let res: ResponseData;
        switch (message.action) {
          case 'SET':
            res = {
              action: 'SET',
              response: JSON.stringify({ [message.key]: message.value }),
              success: this.handleSET(message.key, message.value),
              messageId: message.messageId,
            };
            break;
          case 'GET':
            res = {
              action: 'GET',
              response: this.handleGET(message.key),
              success: !!this.handleGET(message.key),
              messageId: message.messageId,
            };
            break;
          default:
            res = {
              action: 'GET',
              response: null,
              success: false,
              messageId: message.messageId,
            };
            break;
        }

        this.logData(
          `${message.action}:${res.success ? 'Success' : 'Failed'} => ${res.response}`,
          'green',
        );
        socket.write(this.encodeResponseData(res));
      });
    });

    server.listen(this.port, globalConfig.LOCAL_HOST, () => {
      this.logData(`${APP_NAME} started on port ${this.port}`, 'blue');
    });

    this.server = server;
  }

  public terminate() {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.logData(`${APP_NAME} terminated!`, 'red');
    }

    return null;
  }
  private handleGET(key: string) {
    return this.dataStorage.get(key) || null;
  }
  private handleSET(key: string, value: string) {
    this.dataStorage.set(key, value);
    return true;
  }

  private logData(
    message: string,
    color: keyof typeof consoleColors = 'green',
  ) {
    console.log(
      consoleColors.purple,
      this.context,
      colors.Reset,
      consoleColors[color],
      message,
      colors.Reset,
    );
  }

  private parseIncomingData(rawData: string) {
    return JSON.parse(rawData) as ParsedData;
  }
  private encodeResponseData(data: ResponseData) {
    return JSON.stringify(data);
  }
}
