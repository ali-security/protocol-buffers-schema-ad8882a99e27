var tape = require('tape')
var path = require('path')
var fs = require('fs')
var schema = require('../')

var fixture = function (name) {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8')
}

tape('basic parse', function (t) {
  t.same(schema.parse(fixture('basic.proto')), require('./fixtures/basic.json'))
  t.end()
})

tape('basic parse + stringify', function (t) {
  var syntax = 'syntax = "proto3";\n\n'
  t.same(schema.stringify(schema.parse(fixture('basic.proto'))), syntax + fixture('basic.proto'))
  t.end()
})

tape('complex parse', function (t) {
  t.same(schema.parse(fixture('complex.proto')), require('./fixtures/complex.json'))
  t.end()
})

tape('complex parse + stringify', function (t) {
  var syntax = 'syntax = "proto3";\n\n'
  t.same(schema.stringify(schema.parse(fixture('complex.proto'))), syntax + fixture('complex.proto'))
  t.end()
})

tape('throws on invalid', function (t) {
  t.plan(2)
  try {
    schema.parse('hello world')
  } catch (err) {
    t.ok(true, 'should fail')
  }
  try {
    schema.parse('message Foo { lol }')
  } catch (err) {
    t.ok(true, 'should fail')
  }
})

tape('comments parse', function (t) {
  t.same(schema.parse(fixture('comments.proto')), require('./fixtures/comments.json'))
  t.end()
})

tape('schema with imports', function (t) {
  t.same(schema.parse(fixture('search.proto')), require('./fixtures/search.json'))
  t.end()
})

tape('schema with imports loaded by path', function (t) {
  t.same(schema.parse(fixture('search.proto')), require('./fixtures/search.json'))
  t.end()
})

tape('schema with extends', function (t) {
  t.same(schema.parse(fixture('extend.proto')), require('./fixtures/extend.json'))
  t.end()
})

tape('comparing extended and not extended schema', function (t) {
  var sch = schema.parse(fixture('extend.proto'))
  t.same(sch.messages.MsgNormal, sch.messages.MsgExtend)
  t.end()
})

tape('schema with oneof', function (t) {
  t.same(schema.parse(fixture('oneof.proto')), require('./fixtures/oneof.json'))
  t.end()
})

tape('schema with map', function (t) {
  t.same(schema.parse(fixture('map.proto')), require('./fixtures/map.json'))
  t.end()
})

tape('schema with syntax version', function (t) {
  t.same(schema.parse(fixture('version.proto')), require('./fixtures/version.json'))
  t.end()
})

tape('throws on misplaced syntax version', function (t) {
  t.plan(1)
  try {
    schema.parse('message Foo { required int32 a = 1; }\n syntax = "proto3"')
  } catch (err) {
    t.ok(true, 'should fail')
  }
})

tape('schema with reserved characters in options', function (t) {
  t.same(schema.parse(fixture('options.proto')), require('./fixtures/options.json'))
  t.end()
})

tape('service parse', function (t) {
  t.same(schema.parse(fixture('service.proto')), require('./fixtures/service.json'))
  t.end()
})

tape('service parse + stringify', function (t) {
  var syntax = 'syntax = "proto3";\n\n'
  t.same(schema.stringify(schema.parse(fixture('service.proto'))), syntax + fixture('service.proto'))
  t.end()
})

tape('enums with options', function (t) {
  t.same(schema.parse(fixture('enum.proto')), require('./fixtures/enum.json'))
  t.end()
})

tape('fail on no tags', function (t) {
  t.throws(function () {
    schema.parse(fixture('no-tags.proto'))
  })
  t.end()
})

tape('reserved', function (t) {
  t.same(schema.parse(fixture('reserved.proto')), require('./fixtures/reserved.json'))
  t.end()
})

tape('varint, 64-bit and 32-bit wire types can be packed', function (t) {
  t.doesNotThrow(function () {
    schema.parse(fixture('valid-packed.proto'))
  }, 'should not throw')
  t.end()
})

tape('non-primitive packed should throw', function (t) {
  t.throws(function () {
    schema.parse(fixture('pheromon-trajectories.proto'))
  }, 'should throw')
  t.end()
})

tape('custom options parse', function (t) {
  t.same(schema.parse(fixture('option.proto')), require('./fixtures/option.json'))
  t.end()
})

tape('escaped quotes in option value parse', function (t) {
  t.same(schema.parse(fixture('escaped-quotes.proto')), require('./fixtures/escaped-quotes.json'))
  t.end()
})

// Some old engines (e.g. node 0.10) treat __proto__ as a magic property even on
// objects without a prototype, so per-object __proto__ checks only run where it is a plain key
var PROTO = '__proto__'
var protoIsPlainKey = (function () {
  var obj = Object.create(null)
  obj[PROTO] = { x: 1 }
  return obj.x === undefined
})()

tape('field option paths do not pollute Object.prototype', function (t) {
  var proto = [
    'syntax = "proto3";',
    'message Exploit {',
    '  string a = 1 [(__proto__).polluted = "HACKED"];',
    '}'
  ].join('\n')
  try {
    schema.parse(proto)
  } catch (err) {
    // rejecting the input is fine, polluting Object.prototype is not
  }
  t.equal(({}).polluted, undefined, 'Object.prototype is not polluted')
  delete Object.prototype.polluted
  t.end()
})

tape('options are parsed into objects without a prototype', function (t) {
  var sch = schema.parse([
    'option java_package = "foo";',
    'enum E {',
    '  option allow_alias = true;',
    '  A = 1 [deprecated = true];',
    '}',
    'message M {',
    '  option deprecated = true;',
    '  optional string a = 1 [deprecated = true];',
    '}',
    'service S {',
    '  option deprecated = true;',
    '  rpc Get (M) returns (M) {',
    '    option (my_opt) = { a: 1 };',
    '  }',
    '}'
  ].join('\n'))
  t.equal(Object.getPrototypeOf(sch.options), null, 'schema options')
  t.equal(Object.getPrototypeOf(sch.enums[0].options), null, 'enum options')
  t.equal(Object.getPrototypeOf(sch.enums[0].values.A.options), null, 'enum value options')
  t.equal(Object.getPrototypeOf(sch.messages[0].options), null, 'message options')
  t.equal(Object.getPrototypeOf(sch.messages[0].fields[0].options), null, 'field options')
  t.equal(Object.getPrototypeOf(sch.services[0].options), null, 'service options')
  t.equal(Object.getPrototypeOf(sch.services[0].methods[0].options), null, 'rpc options')
  t.equal(Object.getPrototypeOf(sch.services[0].methods[0].options.my_opt), null, 'option map')
  t.end()
})

tape('__proto__ options do not replace the prototype of option objects', function (t) {
  var sch = schema.parse([
    'enum E {',
    '  option __proto__ = { polluted: "HACKED" };',
    '  A = 1 [__proto__ = "HACKED"];',
    '}',
    'message M {',
    '  optional string a = 1 [__proto__ = "HACKED"];',
    '}'
  ].join('\n'))
  t.equal(({}).polluted, undefined, 'Object.prototype is not polluted')
  if (protoIsPlainKey) {
    var e = sch.enums[0]
    t.equal(e.options.polluted, undefined, 'enum options keep a null prototype')
    t.equal(Object.getPrototypeOf(e.options), null, 'enum options prototype is not replaced')
    t.same(Object.keys(e.options), [PROTO], '__proto__ is kept as a plain enum option')
    t.same(Object.keys(e.values.A.options), [PROTO], '__proto__ is kept as a plain enum value option')
    t.same(Object.keys(sch.messages[0].fields[0].options), [PROTO], '__proto__ is kept as a plain field option')
  }
  delete Object.prototype.polluted
  t.end()
})

tape('__proto__ keys in option maps do not replace the prototype of option objects', function (t) {
  if (!protoIsPlainKey) {
    t.equal(({}).polluted, undefined, 'Object.prototype is not polluted')
    t.end()
    return
  }
  var sch = schema.parse([
    'option (file_opt) = { __proto__: { polluted: "HACKED" } };',
    'message M {',
    '  option __proto__ = { polluted: "HACKED" };',
    '  optional string a = 1;',
    '}',
    'service S {',
    '  option (svc_opt) = { __proto__ { polluted: "HACKED" } };',
    '  rpc Get (M) returns (M);',
    '}'
  ].join('\n'))
  t.equal(({}).polluted, undefined, 'Object.prototype is not polluted')
  t.equal(sch.options.file_opt.polluted, undefined, 'option map keeps a null prototype')
  t.equal(sch.options.file_opt[PROTO].polluted, 'HACKED', '__proto__ is kept as a plain option map key')
  t.equal(sch.messages[0].options.polluted, undefined, 'message options keep a null prototype')
  t.equal(sch.messages[0].options[PROTO].polluted, 'HACKED', '__proto__ is kept as a plain message option')
  t.equal(sch.services[0].options.svc_opt.polluted, undefined, 'repeated option map keeps a null prototype')
  t.ok(Array.isArray(sch.services[0].options.svc_opt[PROTO]), '__proto__ is kept as a plain repeated option map key')
  delete Object.prototype.polluted
  t.end()
})
