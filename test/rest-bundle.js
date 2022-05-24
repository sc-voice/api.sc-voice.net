const supertest = require("supertest");

typeof describe === "function" &&
  describe("RestBundle", function () {
    const should = require("should");
    const pkg = require("../package.json");
    const RestBundle = require("../src/rest-bundle");
    const supertest = require("supertest");
    const express = require("express");
    const fs = require("fs");
    const path = require("path");
    const { exec } = require("child_process");
    const util = require("util");
    //const app = require("./rb-server.js");
    const { logger } = require("log-instance");
    const RbHash = require("../src/rb-hash");
    const testApp = express();
    const APPDIR = path.join(__dirname, '..');
    logger.level = "warn";
    function testRb(app) {
      return app.locals.restBundles.filter((rb) => rb.name === "test")[0];
    }
    this.timeout(5 * 1000);

    it("TESTTESTdefault ctor", ()=>{
      let rb = new RestBundle();
      let appDir = APPDIR;
      should.deepEqual(Object.keys(rb).sort(), [
        "appDir",
        "name", 
      ]);
      should(rb.appDir).equal(appDir);
      should(rb.uribase).equal("/test");
    });
    it("TESTTESTRestBundle can be extended", async()=>{
      class TestBundle extends RestBundle {
        constructor(name, options = {}) {
          super(Object.assign({name}, options));
          Object.defineProperty(this, "handlers", {
            value: super.handlers.concat([
              this.resourceMethod("get", "color", this.getColor),
            ]),
          });
        }
        getColor(req, res, next) {
          return { color: "blue" };
        }
      }
      var app = express();
      var tb = new TestBundle("extended").bindExpress(app);
      let res = await supertest(app)
        .get("/extended/color")
        .expect(200);

      should.deepEqual(res.body, { color: "blue", });
    });
    it("RestBundle resources should be unique", ()=>{
      class TestBundle extends RestBundle {
        constructor(name, options = {}) {
          super(Object.assign({name}, options));
          Object.defineProperty(this, "handlers", {
            value: super.handlers.concat([
              this.resourceMethod("get", "state", this.getState), // duplicate
            ]),
          });
        }
      }
      var tb = new TestBundle("test");
      var app = express();
      should.throws(() => tb.bindExpress(app));
    });
    it("TESTTESTRestBundle returns 500 for bad responses", async()=>{
      class TestBundle extends RestBundle {
        constructor(name, options = {}) {
          super(Object.assign({name}, options));
          Object.defineProperty(this, "handlers", {
            value: super.handlers.concat([
              this.resourceMethod("get", "bad-json", this.getBadJson),
            ]),
          });
        }
        getBadJson(req, res, next) {
          var badJson = {
            name: "circular",
          };
          badJson.self = badJson;
          return badJson;
        }
      }
      var app = express();
      var tb = await (new TestBundle("testBadJSON").bindExpress(app));
      logger.warn("Expected error (BEGIN)");
      let logLevel = logger.level;
      logger.logLevel = "error";
      supertest(app)
        .get("/testBadJSON/bad-json")
        .expect((res) => {
          logger.warn("Expected error (END)");
          res.statusCode.should.equal(500);
          should(res.body.error).match(
            /Converting circular structure to JSON/
          );
        })
        .end((err, res) => {
          logger.logLevel = logLevel;
          if (err) throw err;
        });
    });
    /*
    it("TESTTESTdiskusage", async () => {
      var execPromise = util.promisify(exec);
      var cmd = "df --total -B 1 /";
      var execOpts = {
        cwd: __dirname,
      };
      var res = await execPromise(cmd, execOpts);
      var stdout = res.stdout.split("\n");
      var stats = stdout[2].split(/\s+/);
      let used = Number(stats[2]);
      let avail = Number(stats[3]);
      let total = used + avail;
      //console.log(`dbg diskusage`, {used, avail, total});

      let app = express();
      var rb = testRb(app);
      var res = await rb.getIdentity();
      should(res.diskavail).equal(avail);
      should(res.diskfree).equal(avail);
      should(res.disktotal).equal(total);
      //console.log(`dbg getIdientity`, res);
    });
    it("GET /identity generates HTTP200 response", function (done) {
      supertest(app)
        .get("/test/identity")
        .expect((res) => {
          res.statusCode.should.equal(200);
          res.headers["content-type"].should.match(/json/);
          res.headers["content-type"].should.match(/utf-8/);
          res.body.should.properties({
            name: "test",
            package: pkg.name,
          });
          res.body.should.properties([
            "version",
            "hostname",
            "uptime",
            "loadavg",
            "totalmem",
            "freemem",
            "diskfree",
            "diskavail",
            "disktotal",
          ]);
          should(res.body.diskavail).below(res.body.diskfree + 1);
          should(res.body.diskfree).below(res.body.disktotal);
          should(res.body.totalmem).below(res.body.disktotal);
          res.body.version.should.match(/\d+.\d+.\d+/);
        })
        .end((err, res) => {
          if (err) throw err;
          else done();
        });
    });
    it("POST /echo generates HTTP200 response with a Promise", function (done) {
      var service = testRb(app);
      service.taskBag.length.should.equal(0);
      service.taskBegin("testTask");
      service.taskBag.length.should.equal(1);
      supertest(app)
        .post("/test/echo")
        .send({ greeting: "smile" })
        .expect((res) => {
          res.statusCode.should.equal(200);
          res.headers["content-type"].should.match(/json/);
          res.headers["content-type"].should.match(/utf-8/);
          should.deepEqual(res.body, {
            greeting: "smile",
          });
          service.taskBag.length.should.equal(1);
          service.taskBag[0].should.equal("testTask");
        })
        .end((err, res) => {
          if (err) throw err;
          else done();
        });
    });
    it("POST generates HTTP500 response for thrown exception", function (done) {
      logger.warn("Expected error (BEGIN)");
      supertest(app)
        .post("/test/identity")
        .send({ greeting: "whoa" })
        .expect((res) => {
          logger.warn("Expected error (END)");
          res.statusCode.should.equal(500);
          res.headers["content-type"].should.match(/json/);
          res.headers["content-type"].should.match(/utf-8/);
          res.body.should.properties(["error"]);
          res.body.error.should.match(/POST not supported/);
          res.body.error.should.match(/{"greeting":"whoa"}/);
        })
        .end((err, res) => {
          if (err) throw err;
          else done();
        });
    });
    it("GET /ui redirects to service HTML", function (done) {
      supertest(app)
        .get("/test/ui")
        .expect((res) => {
          res.statusCode.should.equal(302); // redirect
          res.headers["content-type"].should.match(/text/);
          res.headers["content-type"].should.match(/utf-8/);
          res.headers["location"].should.equal("/test/ui/index-service");
          done();
        })
        .end((err, res) => {
          if (err) throw err;
        });
    });
    it("GET /ui/index-service returns service HTML", function (done) {
      supertest(app)
        .get("/test/ui/index-service")
        .expect((res) => {
          res.statusCode.should.equal(200);
          res.headers["content-type"].should.match(/text\/html/);
          res.text.should.match(/<title>test<\/title>/);
        })
        .end((err, res) => {
          if (err) throw err;
          else done();
        });
    });
    it("toKebabCase(id) does that", function () {
      var kebab = (id) =>
        id
          .replace(/([A-Z])/g, "-$1")
          .toLowerCase()
          .replace(/^-/, "");
      kebab("XFooBar").should.equal("x-foo-bar");
      kebab("xFooBar").should.equal("x-foo-bar");
      kebab("abc").should.equal("abc");
      kebab("aBC").should.equal("a-b-c");
    });
    it("apiModelPath() returns RestBundle api model path", function () {
      var rb = new RestBundle({
        name: "TestApiModelPath",
        srcPkg: {
          name: "testPackage",
          version: "1.0",
        },
      });
      var amp = rb.apiModelPath();
      should(amp).match(/.*\/api-model\/testPackage.TestApiModelPath.json/);
      var amp = rb.apiModelPath("MyRestBundle");
      should(amp).match(/.*\/api-model\/testPackage.MyRestBundle.json/);
    });
    it("loadApiModel() returns RestBundle apiModel Promise", function (done) {
      let async = (function* () {
        try {
          var rb = new RestBundle({name:"TestLoadApiModel"});
          var result = yield rb
            .loadApiModel("NoApiModel")
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          should.equal(result, null);
          done();
        } catch (err) {
          should.fail(err);
        }
      })();
      async.next();
    });
    it("saveApiModel(apiModel) saves RestBundle api model", function (done) {
      let async = (function* () {
        try {
          var rb = new RestBundle({name: "TestSaveApiModel"});
          var apiModel = {
            color: "purple",
          };
          var result = yield rb
            .saveApiModel(apiModel)
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          should.strictEqual(result, apiModel);
          var result = yield rb
            .loadApiModel()
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          should.deepEqual(result, apiModel);
          done();
        } catch (e) {
          done(e);
        }
      })();
      async.next();
    });
    it("putApiModel updates and saves api model", function (done) {
      var async = (function* () {
        try {
          const rbh = new RbHash();
          var name = "TestPutApiModel";
          var rb = new RestBundle({name});
          var fileName = `rest-bundle.${name}.json`;
          var filePath = path.join(__dirname, "..", "api-model", fileName);
          fs.existsSync(filePath) && fs.unlinkSync(filePath);

          // initialize api model
          var blankModel = {
            rbHash: rbh.hash({}),
          };
          var req = {
            body: {
              apiModel: {
                color: "purple",
                size: "large",
                rbHash: blankModel.rbHash,
              },
            },
          };
          var res = {
            locals: {},
          };
          var next = function () {};
          var result = yield rb
            .putApiModel(req, res, next, name)
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          var purpleHash = rbh.hash({
            color: "purple",
            size: "large",
          });
          should.deepEqual(result.apiModel, {
            color: "purple",
            size: "large",
            rbHash: purpleHash,
          });

          // change one field of api model
          var req = {
            body: {
              apiModel: {
                color: "red",
                rbHash: purpleHash,
              },
            },
          };
          var res = {
            locals: {},
          };
          var result = yield rb
            .putApiModel(req, res, next, name)
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          var redHash = rbh.hash({
            color: "red",
            size: "large",
          });
          should.deepEqual(result.apiModel, {
            color: "red",
            size: "large",
            rbHash: redHash,
          });

          done();
        } catch (err) {
          logger.error(err.stack);
          done(err);
        }
      })();
      async.next();
    });
    it("Promise test", function (done) {
      var x = 0;
      var p = new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve("resolved");
        }, 1);
      });
      p.then((r) => (x += 1));
      p.then((r) => (x += 10));
      p.then((r) => (x += 100));
      setTimeout(() => {
        x.should.equal(111);
        done();
      }, 2);
    });
    it("GET /app/stats/heap returns v8.getHeapSpaceStatistics", function (done) {
      var async = (function* () {
        try {
          var app = express();
          var rb = new RestBundle({name:"test"}).bindExpress(app);
          var response = yield supertest(app)
            .get("/test/app/stats/heap")
            .expect((res) => {
              res.statusCode.should.equal(200);
              var stats = res.body;
              should(stats instanceof Array);
              should(stats.length).above(5);
              res.body.forEach((b) => {
                var mb = b.space_used_size / 10e6;
                logger.info(`heap used ${mb.toFixed(1)}MB ${b.space_name}`);
              });
              should(res.headers["x-powered-by"]).equal(undefined);
            })
            .end((e, r) => (e ? async.throw(e) : async.next(r)));
          done();
        } catch (e) {
          done(e);
        }
      })();
      async.next();
    });
    it("initialize() loads apiModel", function (done) {
      var count = 0;
      var apiModels = [];
      class TestBundle extends RestBundle {
        constructor(name = "test", options = {}) {
          super(name, options);
        }
        onApiModelLoaded(apiModel) {
          // initialize #1
          apiModels.push(apiModel);
          count = 2 * count + 1;
        }
        onInitializeEvents(emitter, apiModel) {
          // initialize #2
          apiModels.push(apiModel);
          count = 2 * count + 2;
        }
      }
      var async = (function* () {
        try {
          var rb = new TestBundle({
            name: "testInitialize", 
            apiModelDir: __dirname,
          });
          should(count).equal(0);
          should(rb.initialized).equal(undefined);

          // initialize() yields the apiModel
          var init1 = rb.initialize();
          should(init1).instanceOf(Promise);
          should(rb.initialized).equal(false);

          // initialize can be called multiple times
          var apiModel = yield rb
            .initialize()
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          should(rb.initialized).equal(true);

          // all calls to initialize() yield the same apiModel
          var apiModel1 = yield init1
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          should(apiModel1).equal(apiModel);
          var apiModel2 = yield rb
            .initialize()
            .then((r) => async.next(r))
            .catch((e) => async.throw(e));
          should(apiModel2).equal(apiModel);

          should(apiModels.length).equal(2);
          should.deepEqual(apiModels[0], apiModel);
          should.deepEqual(apiModels[0], apiModels[1]);
          should.deepEqual(apiModels[0].color, "red");
          should(count).equal(4); // verify initialization order
          done();
        } catch (e) {
          done(e);
        }
      })();
      async.next();
    });
    it("Last TEST closes test suite for watch", function () {
      app.locals.rbServer.close();
    });
    */
  });
