export class ApiError extends Error {
  constructor(status, message, fields = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ message: 'Send valid JSON.' });
  if (error.type === 'entity.too.large')
    return res.status(413).json({ message: 'Request is too large.' });
  if (error instanceof ApiError)
    return res.status(error.status).json({ message: error.message, fields: error.fields });
  console.error('Request failed:', {
    method: req.method,
    path: req.path,
    code: error.code || error.name,
  });
  res.status(500).json({ message: 'Something went wrong. Please try again.' });
}
