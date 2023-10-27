(function (exports) {
  const { logger } = require("log-instance");

  class ResourceMethod {
    constructor(
      method = "get",
      name,
      handler,
      mime = "application/json",
      options = {}
    ) {
      logger.logInstance(this);
      if (typeof name !== 'string') {
        throw new Error("ResourceMethod() expected: name");
      }
      if (typeof handler !== 'function') {
        throw new Error("ResourceMethod() expected: handler");
      }
      this.method = method.toUpperCase();
      this.path = name;
      this.name = `${method.toUpperCase()} ${name}`;
      this.handler = handler;
      this.mime = mime;
    }

    async processRequest(req, res, next) {
      const msg = "RestApi.processRequest() ";
      let { method, mime, handler } = this;
      let statusOk = 200;
      try {
        res.type(mime);
        let { statusCode } = res;
        //console.log("DANGER", msg, 'before', req.method, req.url);
        let value = await handler(req, res);
        //console.log("DANGER", msg, 'ok', req.method, req.url);
        if (!res.headersSent) {
          res.status(statusOk);
          res.send(value);
        }
      } catch(e) {
        console.log(msg, 'error1', req.method, req.url);
        this.warn(msg, `HTTP${res.statusCode}:`, e.message);
        if (!res.headersSent) {
          console.log(msg, 'error2', req.method, req.url);
          res.type("application/json");
          let { statusCode = statusOk } = res;
          console.log(msg, 'error2.1', req.method, req.url);
          statusCode === statusOk && res.status(500);
          console.log(msg, 'error2.2', req.method, req.url);
          res.send({error:e.message});
        }
        console.log(msg, 'error3', req.method, req.url);
      }
    }

    use(app) {
      let { path, method } = this;
      let that = this;
      if (method === "GET") {
        app.get(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "PUT") {
        app.put(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "POST") {
        app.post(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "DELETE") {
        app.delete(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else if (method === "HEAD") {
        app.get(`/${path}`, async (req,res,next)=> {
          await that.processRequest(req,res);
        });
      } else {
        throw new Error([
          `ResourceMethod.use() unsupported HTTP method:${method}`,
          `[${path}]`,
        ].join(' '));
      }
    }

  }

  module.exports = exports.ResourceMethod = ResourceMethod;
})(typeof exports === "object" ? exports : (exports = {}));
