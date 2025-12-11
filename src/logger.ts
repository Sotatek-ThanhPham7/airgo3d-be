import * as winston from "winston"

const consoleOptions: winston.transports.ConsoleTransportOptions = {
  level: process.env.logLevel,
  handleExceptions: true
}

const transports: winston.transport[] = [
  new winston.transports.Console(consoleOptions),
]

// Only add file transport if logPath is configured
if (process.env.logPath) {
  const fileOptions: winston.transports.FileTransportOptions = {
    level: process.env.logLevel,
    filename: process.env.logPath,
    handleExceptions: true,
    maxFiles: 100,
    maxsize: 5242880, // 5MB
  }
  transports.push(new winston.transports.File(fileOptions))
}

const logger = winston.createLogger({
  level: process.env.logLevel,
  exitOnError: false,
  format: winston.format.json(),
  transports: transports
})

export default logger