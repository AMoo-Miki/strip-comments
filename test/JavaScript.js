/*!
 * strip-comments <https://github.com/jonschlinkert/strip-comments>
 *
 * Copyright (c) 2014-2018, Jon Schlinkert.
 * Released under the MIT license.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { strip } = require('../index');

const tests = path.join.bind(path, __dirname);
const read = src => fs.readFileSync(src, 'utf-8').replace(/\r*\n/g, '\n');;

describe('JavaScript comments', () => {
  it('should strip all comments', () => {
    const actual = strip("'foo'; // this is a comment\n/* me too */ var abc = 'xyz';");
    assert.strictEqual(actual, '\'foo\'; \n var abc = \'xyz\';');
  });

  it('should work on unclosed (invalid) blocks', () => {
    const actual = strip("'foo'; /* I am invalid ");
    assert.strictEqual(actual, '\'foo\'; ');
  });

  it('should strip line comments', () => {
    const actual = strip.line('foo // this is a comment\n/* me too */');
    const expected = 'foo \n/* me too */';
    assert.strictEqual(actual, expected);
  });

  it('should not mistake escaped slashes for comments', () => {
    // see https://github.com/jonschlinkert/extract-comments/issues/12
    const expected = "'foo/bar'.replace(/o\\//, 'g')";
    const actual = strip.line(expected);
    assert.deepEqual(actual, expected);
  });

  it('should strip block comments', () => {
    const actual = strip.block('foo // this is a comment\n/* me too */');
    const expected = 'foo // this is a comment\n';
    assert.strictEqual(actual, expected);
  });

  // see https://github.com/jonschlinkert/strip-comments/issues/21
  it('should not strip non-comments in quoted strings 2', () => {
    const expected = read(tests('fixtures/quoted-strings.js'));
    const actual = strip(expected);
    assert.equal(actual, expected);
  });

  // see https://github.com/jonschlinkert/strip-comments/issues/18
  it('should not hang on unclosed comments', () => {
    const expected = 'if (accept == \'video/*\') {';
    const actual = strip(expected);
    // fails because using `esprima` under the hood
    assert.equal(actual, expected);
  });

  it('should not mangle json', () => {
    const expected = read(path.join(__dirname, '..', 'package.json'));
    const before = JSON.parse(expected);
    const res = strip(expected);
    const after = JSON.parse(res);
    assert.deepEqual(before, after);
  });

  it('should strip all but not `/*/`', () => {
    const actual = strip("/* I will be stripped */\nvar path = '/this/should/*/not/be/stripped';");
    const expected = "var path = '/this/should/*/not/be/stripped';";
    assert.strictEqual(actual, expected);
  });

  it('should strip all but not globstars `/**/*` #1', () => {
    const actual = strip("var path = './do/not/strip/globs/**/*.js';");
    const expected = "var path = './do/not/strip/globs/**/*.js';";
    assert.strictEqual(actual, expected);
  });

  it('should strip all but not globstars `/**/` #2 and `//!` line comments', () => {
    const actual = strip('var partPath = \'./path/*/to/scripts/**/\'; //! line comment', { keepProtected: true });
    const expected = 'var partPath = \'./path/*/to/scripts/**/\'; //! line comment';
    assert.strictEqual(actual, expected);
  });

  it('should strip all but not `/*/*something` from anywhere', () => {
    const actual = strip('var partPath = \'./path/*/*something/test.txt\';');
    const expected = 'var partPath = \'./path/*/*something/test.txt\';';
    assert.strictEqual(actual, expected);
  });

  it('should strip all but not `/*/*something/*.js` from anywhere (globstar-like)', () => {
    const actual = strip('var partPath = \'./path/*/*something/*.js\';');
    const expected = "var partPath = './path/*/*something/*.js';";
    assert.strictEqual(actual, expected);
  });

  it('should leave alone code without any comments', () => {
    const fixture = read(tests('fixtures/no-comment.js'));
    const actual = strip(fixture);
    const expected = fixture;
    assert.strictEqual(actual, expected);
  });

  // see https://github.com/jonschlinkert/strip-comments/issues/27
  it('should not break on comments that are substrings of a later comment', () => {
    const actual = strip([
      '// this is a substring',
      '// this is a substring of a larger comment',
      'someCode();',
      'someMoreCode();'
    ].join('\n'));
    const expected = [
      '',
      '',
      'someCode();',
      'someMoreCode();'
    ].join('\n');
    assert.strictEqual(actual, expected);
  });
});

describe('error handling:', () => {
  it('should throw TypeError when a string is not passed', () => {
    const fixture = () => strip(123);
    assert.throws(fixture, TypeError);
    assert.throws(fixture, /expected input to be a string/i);
  });

  it('should throw TypeError when a string is not passed to `.block`', () => {
    const fixture = () => strip.block(123);
    assert.throws(fixture, TypeError);
    assert.throws(fixture, /expected input to be a string/i);
  });

  it('should throw TypeError when a string is not passed to `.line`', () => {
    const fixture = () => strip.line(123);
    assert.throws(fixture, TypeError);
    assert.throws(fixture, /expected input to be a string/i);
  });

  it('should not throw on empty string, returns empty string', () => {
    const actual = strip('');
    const expected = '';
    assert.strictEqual(typeof actual, 'string');
    assert.strictEqual(actual, expected, 'expect empty string on empty string passed');
  });
});

describe('strip all or empty:', () => {
  it('should strip all multiline, singleline, block and line comments', () => {
    const fixture = read(tests('fixtures/strip-all.js'));
    const expected = read(tests('expected/strip-all.js'));
    const actual = strip(fixture, { safe: false });
    assert.strictEqual(actual, expected);
  });

  it('should hoist important comments', () => {
    const fixture = read(tests('fixtures/strip-safe.js'));
    const expected = read(tests('expected/strip-safe.js'));
    const actual = strip(fixture, { safe: true });
    assert.strictEqual(actual, expected);
  });

  it('should not strip !important block comments', () => {
    const fixture = read(tests('fixtures/strip-all.js'));
    const actual = strip.block(fixture, { keepProtected: true });
    const expected = read(tests('expected/strip-keep-block.js'));
    assert.strictEqual(actual, expected);
  });

  it('should strip only all line comments that not starts with `//!` (keepProtected:true)', () => {
    const fixture = read(tests('fixtures/strip-keep-line.js'));
    const actual = strip.line(fixture, { keepProtected: true });
    const expected = read(tests('expected/strip-keep-line.js'));
    assert.strictEqual(actual, expected);
  });
});

describe('block comments:', () => {
  it('should strip block comments from a function', () => {
    const actual = strip.block('var bar = function(/* this is a comment*/) {return;};');
    const expected = 'var bar = function() {return;};';
    assert.strictEqual(actual, expected);
  });

  it('should strip block comments before and from a function', () => {
    const actual = strip.block('/* this is a comment */\nvar bar = function(/*this is a comment*/) {return;};');
    const expected = 'var bar = function() {return;};';
    assert.strictEqual(actual, expected);
  });

  it('should strip block comments before, after and from a function', () => {
    const actual = strip.block('/* this is a comment */var bar = function(/*this is a comment*/) {return;};\n/* this is a comment*/');
    const expected = 'var bar = function() {return;};\n';
    assert.strictEqual(actual, expected);
  });
});

describe('line comments:', () => {
  it('should strip line comments', () => {
    const actual = strip.line('// this is a line comment\nvar bar = function(/*this is a comment*/) {return;};');
    const expected = '\nvar bar = function(/*this is a comment*/) {return;};';
    assert.strictEqual(actual, expected);
  });

  it('should strip line comments with leading whitespace', () => {
    const actual = strip.line(' //                           this should be stripped');
    const expected = ' ';
    assert.strictEqual(actual, expected);
  });

  it('should not strip line comments in quoted strings', () => {
    const actual = strip.line('var foo = "//this is not a comment";');
    const expected = 'var foo = "//this is not a comment";';
    assert.strictEqual(actual, expected);
  });

  it('should strip line comments after quoted strings', () => {
    const actual = strip.line('var foo = "//this is not a comment"; //this should be stripped');
    const expected = 'var foo = "//this is not a comment"; ';
    assert.strictEqual(actual, expected);
  });

  it('should not be whitespace sensitive', () => {
    const actual = strip.line('var foo = "//this is not a comment"; //                           this should be stripped');
    const expected = 'var foo = "//this is not a comment"; ';
    assert.strictEqual(actual, expected);
  });

  it('should not strip URLs in a quoted string', () => {
    const actual = strip.line('var foo = "http://github.com"; //                           this should be stripped');
    const expected = 'var foo = "http://github.com"; ';
    assert.strictEqual(actual, expected);
  });

  it('should strip URLs in a line comment', () => {
    const actual = strip.line('// http://github.com"');
    const expected = '';
    assert.strictEqual(actual, expected);
  });

  it('should strip URLs in a block comment', () => {
    const actual = strip.block('/**\n* http://github.com\n *\n */');
    const expected = '';
    assert.strictEqual(actual, expected);
  });

  it('should strip line comments before a function, and not block comments', () => {
    const actual = strip.line('/* this is a comment */\n//this is a comment\nvar bar = function(/*this is a comment*/) {return;};');
    const expected = '/* this is a comment */\n\nvar bar = function(/*this is a comment*/) {return;};';
    assert.strictEqual(actual, expected);
  });

  it('should strip line comments before and after a function, and not block comments', () => {
    const actual = strip.line('/* this is a comment */\n//this is a comment\nvar bar = function(/*this is a comment*/) {return;};\n//this is a line comment');
    const expected = '/* this is a comment */\n\nvar bar = function(/*this is a comment*/) {return;};\n';
    assert.strictEqual(actual, expected);
  });
});

describe('performance', () => {
  it('should not timeout', () => {
    const actual = strip(`
      console.log(tpl\`
        123
      \`);
      ${Array(10).fill('console.log(/^http:\\/\\//.test("1"));').join('\n')}\n
      ${Array(100).fill('console.log("1");').join('\n')}\n
    `);
    const expected = actual;
    assert.strictEqual(actual, expected);
  }).timeout(500)
});
