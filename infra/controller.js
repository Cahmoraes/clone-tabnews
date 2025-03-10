const {
  MethodNotAllowedError,
  InternalServerError,
  ValidationError,
} = require("./errors");

function onNoMatchHandler(request, response) {
  const publicErrorObject = new MethodNotAllowedError();
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

function onErrorHandler(error, request, response) {
  if (error instanceof ValidationError) {
    return response.status(error.statusCode).json(error);
  }
  const publicErrorObject = new InternalServerError({
    statusCode: error.statusCode,
    cause: error,
  });
  console.log("\n Error dentro do catch do next-connect:");
  console.error(publicErrorObject);
  response.status(publicErrorObject.statusCode).json(publicErrorObject);
}

export const controller = {
  errorHandlers: {
    onNoMatch: onNoMatchHandler,
    onError: onErrorHandler,
  },
};
