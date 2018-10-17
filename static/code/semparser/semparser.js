/* semparser.js: Semantic Parser and associated utils
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

function Rule(lhs, rhs, sem=null) {
	this.lhs = lhs;
	this.rhs = typeof(rhs) === "string" ? rhs.split(/[\s]+/): rhs;
	this.sem = sem;
	
	this.is_cat = function(label) {
		return label.startsWith("$");
	}
	
	this.is_lexical = function() {
		return this.rhs.every((rhsi) => { return !this.is_cat(rhsi); });
	}
	
	this.is_binary = function() {
		return this.rhs.length === 2 && this.is_cat(this.rhs[0]) && this.is_cat(this.rhs[1]);
	}
	
	this.toString = function() {
		return 'Rule' + "(" + this.lhs.toString() + ", " + this.rhs.join(' ') + ", " + this.sem + ")";
	}
}

const fCart = (a, b) => [].concat(...a.map(d => b.map(e => [].concat(d, e))));
const cartesianProduct = (a, b, ...c) => (b != null ? cartesianProduct(fCart(a, b), ...c) : a);

function lexicalCartesianProduct(rules) {
	let lexicalRules = rules.filter((rule) => rule.is_lexical());
	let expandedRules = rules.filter((rule) => !rule.is_lexical());

	let lexicalByLHS = {};
	for (rule of lexicalRules) {
		lexicalByLHS[rule.lhs] = lexicalByLHS[rule.lhs] || [];
		lexicalByLHS[rule.lhs].push(rule)
	}
	for (key in lexicalByLHS) {
		if (lexicalByLHS.hasOwnProperty(key)) {
			let sems = new Set(lexicalByLHS[key].map((rule) => rule.sem));
			let pairs = cartesianProduct(lexicalByLHS[key], Array.from(sems));
			for (i=0; i < pairs.length; i++) {
				let rule = pairs[i][0];
				let sem = pairs[i][1];
				expandedRules.push(new Rule(rule.lhs, rule.rhs, sem));
			}
		}
	}
	return expandedRules;
}

function generateLexicon(tokens, target_semantics, cats, executor) {
	let rules = [];

	// Only pair op sems with op cats
	let op_cats = [], op_sems = [];
	let tok_cats = [], tok_sems = [];
	for (cat of cats) {
		if (cat.endsWith("Op"))
			op_cats.push(cat);
		else
			tok_cats.push(cat);
	}
	for (sem of target_semantics) {
		if (typeof(executor(sem)) === "function")
			op_sems.push(sem);
		else
			tok_sems.push(sem);
	}
	
	let op_triples = cartesianProduct(tokens, op_sems, op_cats);
	let tok_triples = cartesianProduct(tokens, tok_sems, tok_cats);
	let triples = op_triples.concat(tok_triples);
	for (i=0; i < triples.length; i++) {
		rules.push(new Rule(triples[i][2], triples[i][0], triples[i][1]));
	}
	return rules;
}

function gatherTokens(examples) {
	// Gather Unigrams from examples
	let tokens = new Set();
	for (example of examples) {
		example.input.split(/[\s]+/).forEach((tok) => tokens.add(tok))
	}
	return Array.from(tokens);
}

function Example(input, semantics=null, denotation=null) {
    this.input = input;
    this.semantics = semantics;
    this.denotation = denotation;
}

function DefaultDict(defaultVal) {	
	return new Proxy({}, {
		get: (target, name) => {
			if (name in target)
				return target[name];
			else {
				target[name] = defaultVal.constructor();
				return target[name];
			}
		}
	});
}

// This is the class that will hold our Parses
function Parse(rule, children) {
	this.rule = rule;
	this.children = children.slice(0);
	this.denotation = null;

	this.compute_semantics = function() {
		if (this.rule.is_lexical() || typeof(this.rule.sem) !== "function")
			return this.rule.sem;
		else
			return this.rule.sem(this.children.map((child) => child.semantics));
	}

	this.semantics = this.compute_semantics();

	this.score = 0.0;

	this.toString = function() {
		return '(' + this.rule.lhs + ', ' + this.children.map(c => c.toString()).join(' ') + ')';
	}
}

function Grammar(rules=[]) {
	this.add_rule = function(rule) {
		if (rule.is_lexical()) {
			this.lexical_rules[rule.rhs].push(rule);
		} else if (rule.is_binary()) {
			this.binary_rules[rule.rhs].push(rule);
		} else {
			throw 'Cannot accept rule ' + rule.toString();
		}
	}
	
	this.lexical_rules = DefaultDict([])
	this.binary_rules = DefaultDict([])
	
	for (rule of rules) {
		this.add_rule(rule);
	}
	
	this.parse_input = function(input) {
		// Do the CYK
		var chart = [] // keys: (l + s + p)
		var tokens = input.split(/[\s]+/);
		
		// Apply Lexical Rules
		for (var i=0; i < tokens.length; i++) {
			chart.push([]);
			for (var ii=0; ii < tokens.length-i; ii++)
				chart[chart.length-1].push({});
			token = tokens[i];
			if (this.lexical_rules.hasOwnProperty(token)) {
				for (rule of this.lexical_rules[token]) {
					if (!(rule.lhs in chart[0][i])) {chart[0][i][rule.lhs] = []}
					chart[0][i][rule.lhs].push(new Parse(rule, [rule.rhs]))
				}
			}
		}
		
		// Apply Binary Rules
		for (l=2; l <= tokens.length; l++) {
			for (s=0; s < (tokens.length - l + 1); s++) {
				for (p=1; p <= (l - 1); p++) {
					// In the future, we probably only want to do this for stuff
					// that's already in the chart. (Rather than testing all our
					// binary rules)
					// Implement itertools.product here (Definitely more efficient for large charts... I think)
					for (ruleSet of Object.keys(this.binary_rules)) {
						for (rule of this.binary_rules[ruleSet]) {
							if (rule.rhs[0] in chart[p-1][s] && rule.rhs[1] in chart[l-p-1][s+p]) {
								if (!(rule.lhs in chart[l-1][s])) {chart[l-1][s][rule.lhs] = [];} // Hacky Default-dict. (The other one impedes readability)
								for (rule0 of chart[p-1][s][rule.rhs[0]]) {
									for (rule1 of chart[l-p-1][s+p][rule.rhs[1]]) {
										chart[l-1][s][rule.lhs].push(new Parse(rule, [rule0, rule1]));
									}
								}
							}
						}
					}
				}
			}
		}
		return chart[tokens.length-1][0]['$E'];
	}
}