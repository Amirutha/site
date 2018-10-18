/* lisp.js: JavaScript implementation of Scheme dialect
    Copyright (C) 2018  Muuo Wambua

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>. */

var Symbol = String
var List = Array

function tokenize(chars) {
	// Convert a string of characters into a list of tokens
	return chars.replace(/[(]/g, " ( ").replace(/[)]/g, " ) ").trim().split(/[\s]+/)
}

function lParse(program) {
	// Read a Scheme expression from a string
	return read_from_tokens(tokenize(program))
}

function read_from_tokens(tokens) {
	// Read an expression from a sequence of tokens
	if (tokens.length === 0) {
		throw "unexpected EOF";
	}
	var token = tokens.shift();
	if (token === '(') {
		var L = [];
		while (tokens[0] !== ')') {
			L.push(read_from_tokens(tokens))
		}
		tokens.shift();
		return L
	} else if (token === ')') {
		throw "unexpected )"
	} else {
		return atom(token)
	}
}

function atom(token) {
	var maybeNum = parseInt(token);
	
	if (maybeNum && maybeNum.toString() === token) {
		return maybeNum;
	} else {
		maybeNum = parseFloat(token);
		if (maybeNum && maybeNum.toString() === token) {
			return maybeNum;
		} else {
			return Symbol(token);
		}
	}
}

function standard_env() {
	// An environment with some Scheme standard procedures
	var e = new Env(Object.create(Math));

	e.update({
		'+': (x,y) => {return x + y;},
		'-': (x,y) => {return y==null? -x: x - y;},
		'*': (x,y) => {return x * y;},
		'**': (x,y) => {return x**y;},
		'/': (x,y) => {return x / y;},
		'>': (x,y) => {return x > y;},
		'<': (x,y) => {return x < y;},
		'>=': (x,y) => {return x >= y;},
		'<=': (x,y) => {return x <= y;},
		'=': (x,y) => {return x === y},
		'append': (x,y) => {x.push(y); return x;},
		'apply': (proc, args) => {return proc(...args);},
		'begin': (...xs ) => {return xs.slice(-1)},
		'car': (xs) => {return xs[0];},
		'cdr': (xs) => {return xs.slice(1);},
		'cons': (x,y) => {return [x] + y;},
		'eq?': (x,y) => {return x === y;},
		'equal?': (x,y) => {return x === y;},
		'length': (xs) => {return xs.length;},
		'list': (...xs) => {return xs;},
		'map': (func,xs) => {return xs.map(func);},
		'not': (x) => {return !x},
		'null?': (x) => {return x===[]},
		'number?': (x) => {return typeof(x) === "number";},
		'procedure?': (x) => {return typeof(x) === "function";},
		'symbol?': (x) => {return typeof(x) === "string"}
	});
	
	return e;
}

Env = function(initObj={}, outer=null) {
	this.data = initObj;
	this.outer = outer;

	this.update = function(obj) {
		Object.assign(this.data, obj);
	}

	this.find = function(v) {
		// Find the innermost Env where var appears.
		if (!(v in this.data) && this.outer === null)
			throw v + ' not found in your Environment'
		return (v in this.data) ? this.data : this.outer.find(v);
	}
}

global_env = standard_env();

function lispstr(exp) {
	if (exp.constructor === List) {
		return '(' + exp.map(lispstr).join(' ') + ')';
	} else {
		return new String(exp);
	}
}

function Procedure(parms, body, env) {
	return function(...args) {
		var dObj = {};
		parms.forEach((key, i) => dObj[key] = args[i]);
		return lEval(body, new Env(dObj, env));
	}
}

function lEval(x, env=global_env) {
	// Evaluate an expression in an environment.
	if (x.constructor === Symbol) {
		return env.find(x)[x];
	} else if (x.constructor !== List) {
		return x;
	} else if (x[0] === 'quote') {
		[_, exp] = x;
		return exp;
	} else if (x[0] === 'if') {
		[_, test, conseq, alt] = x;
		exp = lEval(test, env) ? conseq : alt;
		return lEval(exp, env);
	} else if (x[0] === 'define') {
		[_, v, exp] = x;
		env.data[v] = lEval(exp, env);
	} else if (x[0] === "set!") {
		[_, v, exp] = x;
		env.find(v)[v] = lEval(exp, env);
	} else if (x[0] === "lambda") {
		[_, parms, body] = x;
		if (parms.constructor !== List) // e.g. (lambda x (x*2))
			parms = [parms];
		return Procedure(parms, body, env)
	} else {
		var proc = lEval(x[0], env);
		var args = [];
		var exps = x.slice(1);
		exps.forEach((exp, i) => {
			args.push(
				lEval(exp, env)
			);
		});
		return proc(...args);
	}
}