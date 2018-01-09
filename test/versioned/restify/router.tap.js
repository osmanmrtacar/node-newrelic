'use strict'

var tap    = require('tap')
var request = require('request').defaults({json: true})
var helper  = require('../../lib/agent_helper')


tap.test("Restify router introspection", function(t) {
  t.plan(12)

  var agent  = helper.instrumentMockedAgent()
  var server = require('restify').createServer()


  t.tearDown(function cb_tearDown() {
    server.close(function cb_close() {
      helper.unloadAgent(agent)
    })
  })

  // need to capture parameters
  agent.config.capture_params = true

  agent.on('transactionFinished', function(transaction) {
    t.equal(transaction.name, 'WebTransaction/Restify/GET//test/:id',
            "transaction has expected name")
    t.equal(transaction.url, '/test/31337', "URL is left alone")
    t.equal(transaction.statusCode, 200, "status code is OK")
    t.equal(transaction.verb, 'GET', "HTTP method is GET")
    t.ok(transaction.trace, "transaction has trace")

    var web = transaction.trace.root.children[0]
    t.ok(web, "trace has web segment")
    t.equal(web.name, transaction.name, "segment name and transaction name match")
    t.equal(web.partialName, 'Restify/GET//test/:id',
            "should have partial name for apdex")
    t.equal(web.parameters.id, '31337', "namer gets parameters out of route")
  })

  server.get('/test/:id', function(req, res, next) {
    t.ok(agent.getTransaction(), "transaction is available")

    res.send({status : 'ok'})
    next()
  })

  server.listen(0, function() {
    var port = server.address().port
    request.get('http://localhost:' + port + '/test/31337', function(error, res, body) {
      t.equal(res.statusCode, 200, "nothing exploded")
      t.deepEqual(body, {status : 'ok'}, "got expected respose")
    })
  })
})