/* demo.js: Boilerplate for running demos in blog post
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

/* ************************************** */
/* LispJS REPL                            */
/* ************************************** */
$('#lisp_js').terminal(function(command) {
    if (command !== '') {
        try {
            var val = lEval(lParse(command))
            if (val !== undefined) {
                this.echo("[[;white;black]" + lispstr(val) + "]");
            }
        } catch(e) {
            this.error(new String(e));
        }
    } else {
       this.echo('');
    }
}, {
    greetings: '[[b;;black]LispJS Interpreter]',
    name: 'lisp_js',
    height: 200,
    prompt: '> ',
    enabled: false
});

/* Some Examples */
$('#lisp_js').terminal()
$('#lisp_js').terminal().exec('(+ 1 (+ (* (* 4 5) 2) (- 5 4)))');
$('#lisp_js').terminal().exec('(sin (/ PI 2))');

/* ************************************** */
/* Grammar Sandbox                        */
/* ************************************** */
var grammarEditor = ace.edit("grammar");
grammarEditor.setTheme("ace/theme/xcode");
grammarEditor.session.setMode("ace/mode/javascript");

var defaultRules = `// Each Lexical Rule is instantiated with a token and the category it maps to
// We also specify the denotation corresponding to each token
numeral_rules = [
  new Rule('$E', 'one', 1), // $E → 'one'
  new Rule('$E', 'two', 2), // $E → 'two'
  new Rule('$E', 'three', 3),
  new Rule('$E', 'four', 4)
];

operator_rules = [
  new Rule('$UnOp',  'minus', '-'), // $UnOp → 'minus'
  new Rule('$BinOp', 'plus', '+'),  // $Binop → 'plus'
  new Rule('$BinOp', 'minus', '-'),
  new Rule('$BinOp', 'times', '*')
];

// The semantic representations of compositional rules are defined as functions
// that take the components in the right hand side as arguments
compositional_rules = [
  new Rule('$E', '$UnOp $E', (sems) => [sems[0], sems[1]]),     // $E → $UnOp $E
  new Rule('$EBO', '$E $BinOp', (sems) => [sems[1], sems[0]]),  // $EBO → $E $BinOp
  new Rule('$E', '$EBO $E', (sems) => [sems[0][0], sems[0][1], sems[1]])
];`

grammarEditor.setValue(defaultRules, -1);


$('#parser').terminal(function(command) {
    if (command !== '') {
        try {
            let rawRules = grammarEditor.getValue();
            try {
                let ruleDef = `(() => {
                    ${rawRules}
                    return [].concat(numeral_rules, operator_rules, compositional_rules)
                })()`;
                var rules = window.eval(ruleDef);
            } catch(error) {
                throw "Error loading rules.\n" + error;
            }
            let grammar = new Grammar(rules);
            let result = grammar.parse_input(command);
            if (result !== undefined) {
                // TODO: Pretty print the parses
                let cnt = 0;
                for (r of result) {
                    this.echo("[[b;aqua;black]" + cnt +  ":]\t[[;LightSalmon;black]" + r.toString().trim() + "], [[;white;black]" + JSON.stringify(r.semantics).replace(/\[/g, "(").replace(/\]/g,")") + "]");
                    cnt++;
                }
            }
        } catch(e) {
            this.error(new String(e));
        }
    } else {
       this.echo('');
    }
}, {
    greetings: 'Type Sentences here to see their [[;LightSalmon;black]parses] and [[;white;black]semantics]:',
    name: 'parser',
    height: 300,
    prompt: '> ',
    enabled: false
});
$('#parser').terminal().exec("one plus one");
$('#parser').terminal().exec("minus three plus two");

/* ************************************** */
/* Weight Sandbox                         */
/* ************************************** */
var weightEditor = ace.edit("weights");
weightEditor.setTheme("ace/theme/xcode");
weightEditor.session.setMode("ace/mode/javascript");

weightEditor.setValue(`weights = {};
// You can manually assign weights
// ~ is the unary 'minus' operator
// - is the binary 'minus' operator
weights['*,+'] = 1.0; // How many times does '*' come before '+'?
weights['*,-'] = 1.0;
weights['~,+'] = 1.0;
weights['~,-'] = 1.0;
weights['+,*'] = -1.0;
weights['-,*'] = -1.0;
weights['+,~'] = -1.0;
weights['-,~'] = -1.0;`, -1);

function precedenceFeatures(parse) { 
    this.collect_op_precedence_features = function(semantics, features) {
        if (semantics.constructor === Array) {
            for (var i=1; i < semantics.length; i++) {
                // Handle UnOp '-'
                var head = (semantics[0]==="-" && semantics.length == 2) ? "~": semantics[0];

                var child = semantics[i];
                this.collect_op_precedence_features(child, features);
                if (child.constructor === Array) {
                    var childhead = (child[0]==="-" && child.length == 2) ? "~": child[0];
                    if (childhead !== head) {
                        var feat = childhead + "," + head;
                        features[feat] = (features[feat] || 0.0) + 1.0;
                    }
                }
            }
        }
    }
    let features = {};
    this.collect_op_precedence_features(parse.semantics, features);
    return features;
}
var arithmetic_rules = window.eval(`(() => {
                    ${defaultRules}
                    return [].concat(numeral_rules, operator_rules, compositional_rules)
                })()`)

$('#dumb-model').terminal(function(command) {
    if (command !== '') {
        try {
            let rawWeights = weightEditor.getValue();
            try {
                let weightDef = `(() => {
                    ${rawWeights}
                    return weights;
                })()`
                let weights = window.eval(weightDef);
            } catch(error) {
                throw "Error loading weights!\n" + error;
            }
            let grammar = new Grammar(arithmetic_rules);
            let model = new Model(grammar, precedenceFeatures, weights, lEval);
            let result = model.parse_input(command);
            if (result !== undefined) {
                // TODO: Pretty print the parses
                let cnt = 0;
                for (r of result) {
                    this.echo("[[b;aqua;black]" + cnt + " ([[;chartreuse;black]" + r.score + "]" + "):]\t[[;white;black]" + JSON.stringify(r.semantics).replace(/\[/g, "(").replace(/\]/g,")") + " → " + r.denotation + "]");
                    cnt++;
                }
            }
        } catch(e) {
            this.error(new String(e));
        }
    } else {
       this.echo('');
    }
}, {
    greetings: 'Type Sentences here to see their parses [[;chartreuse;black](And Scores)]:',
    name: 'parser',
    height: 200,
    prompt: '> ',
    enabled: false
});
$('#dumb-model').terminal().exec("minus three plus two");
$('#dumb-model').terminal().exec("four times two plus two");

/* ************************************** */
/* Learning Sandbox                         */
/* ************************************** */
var exampleEditor = ace.edit("examples");
exampleEditor.setTheme("ace/theme/xcode");
exampleEditor.session.setMode("ace/mode/javascript");

exampleEditor.setValue(`// Examples are annotated with correct semantics and denotations
/// However, we only use denotations to choose the correct parse
let arithmetic_examples = [
	new Example("one plus one",               ["+", 1, 1],            2),
	new Example("one plus two",               ["+", 1, 2],            3),
	new Example("one plus three",             ["+", 1, 3],            4),
	new Example("two plus two",               ["+", 2, 2],            4),
	new Example("two plus three",             ["+", 2, 3],            5),
	new Example("three plus one",             ["+", 3, 1],            4),
	new Example("three plus minus two",       ["+", 3, ["-", 2]],     1),
	new Example("two plus two",               ["+", 2, 2],            4),
	new Example("three minus two",            ["-", 3, 2],            1),
	new Example("minus three minus two",      ["-", ["-", 3], 2],    -5),
	new Example("two times two",              ["*", 2, 2],            4),
	new Example("two times three",            ["*", 2, 3],            6),
	new Example("three plus three minus two", ["-", ["+", 3, 3], 2],  4),
	new Example("minus three",                ["-", 3],              -3),
	new Example("three plus two",             ["+", 3, 2],            5),
	new Example("two times two plus three",   ["+", ["*", 2, 2], 3],  7),
	new Example("minus four",                 ["-", 4],              -4)
];`, -1);


$('#smart-model').terminal(async function(command) {
    if (command !== '') {
        try {
            let rawExamples = exampleEditor.getValue();
            try {
                let exampleDef = `(() => {
                    ${rawExamples}
                    return arithmetic_examples;
                })()`
                var examples = window.eval(exampleDef);
            } catch(error) {
                throw "Error loading examples!\n" + error
            }
            let grammar = new Grammar(arithmetic_rules);
            let weights = {};
            let model = new Model(grammar, precedenceFeatures, weights, lEval);
            await model.learnWeights(examples, metric="denotation");
            let result = model.parse_input(command);
            if (result !== undefined) {
                // TODO: Pretty print the parses
                let cnt = 0;
                for (r of result) {
                    this.echo("[[b;aqua;black]" + cnt + " ([[;chartreuse;black]" + r.score + "]" + "):]\t[[;white;black]" + JSON.stringify(r.semantics).replace(/\[/g, "(").replace(/\]/g,")") + " → " + r.denotation + "]");
                    cnt++;
                }
            }
        } catch(e) {
            this.error(new String(e));
        }
    } else {
       this.echo('');
    }
}, {
    greetings: 'Type Sentences here to see their parses [[;chartreuse;black](And Scores)]:',
    name: 'parser',
    height: 260,
    prompt: '> ',
    enabled: false
});
$('#smart-model').terminal().exec("four plus four minus one");
$('#smart-model').terminal().exec("minus three plus two");

/* ************************************** */
/* Lexicon Learning Sandbox                         */
/* ************************************** */
var swahiliEditor = ace.edit("swahili");
swahiliEditor.setTheme("ace/theme/xcode");
swahiliEditor.session.setMode("ace/mode/javascript");

swahiliEditor.setValue(`let examples = [
    new Example("moja ongeza moja",             ["+", 1, 1],            2),
    new Example("moja ongeza mbili",            ["+", 1, 2],            3),
    new Example("moja ongeza tatu",             ["+", 1, 3],            4),
    new Example("mbili ongeza mbili",           ["+", 2, 2],            4),
    new Example("mbili ongeza mbili",           ["+", 2, 3],            5),
    new Example("tatu ongeza moja",             ["+", 3, 1],            4),
    new Example("tatu toa hasi mbili",          ["+", 3, ["-", 2]],     1),
    new Example("mbili ongeza mbili",           ["+", 2, 2],            4),
    new Example("tatu toa mbili",               ["-", 3, 2],            1),
    new Example("hasi tatu toa mbili",          ["-", ["-", 3], 2],    -5),
    new Example("mbili mara mbili",             ["*", 2, 2],            4),
    new Example("mbili mara tatu",              ["*", 2, 3],            6),
    new Example("tatu ongeza tatu toa mbili",   ["-", ["+", 3, 3], 2],  4),
    new Example("hasi tatu",                    ["-", 3],              -3),
    new Example("tatu ongeza mbili",            ["+", 3, 2],            5),
    new Example("mbili mara mbili ongeza tatu", ["+", ["*", 2, 2], 3],  7),
    new Example("hasi nne",                     ["-", 4],              -4)
];`, -1);

function lotsaFeatures(parse) {
    this.collect_rule_features = function(parse, features) {
        var feat = parse.rule.toString();
        features[feat] = (features[feat] || 0.0) + 1.0;
        for (child of parse.children) {
            if (child.constructor === Parse) {
                this.collect_rule_features(child, features);
            }
        }
    }
    this.collect_op_precedence_features = function(semantics, features) {
        if (semantics.constructor === Array) {
            for (var i=1; i < semantics.length; i++) {
                // Handle UnOp '-'
                var head = (semantics[0]==="-" && semantics.length == 2) ? "~": semantics[0];

                var child = semantics[i];
                this.collect_op_precedence_features(child, features);
                if (child.constructor === Array) {
                    var childhead = (child[0]==="-" && child.length == 2) ? "~": child[0];
                    if (childhead !== head) {
                        var feat = childhead + "," + head;
                        features[feat] = (features[feat] || 0.0) + 1.0;
                    }
                }
            }
        }
    }
    let features = {};
    this.collect_rule_features(parse, features);
    this.collect_op_precedence_features(parse.semantics, features);
    return features;
}

var compositional_rules = window.eval(`(() => {
                    ${defaultRules}
                    return compositional_rules;
                })()`)

$('#slow-model').terminal(async function(command, term) {
    if (command !== '') {
        try {
            let rawExamples = swahiliEditor.getValue();
            try {
                let exampleDef = `(() => {
                    ${rawExamples}
                    return examples;
                })()`
                var examples = window.eval(exampleDef);
            } catch(error) {
                throw "Error loading examples!\n" + error
            }
            let grammar = new Grammar(arithmetic_rules);
            let weights = {};

            let tokens = gatherTokens(examples);
            let expanded_lexicon = generateLexicon(tokens, [1,2,3,4, '-', '+', '*'], ['$E', '$UnOp', '$BinOp'], lEval);
            let more_arithmetic_rules = expanded_lexicon.concat(compositional_rules);
            console.log("Synthesised " + more_arithmetic_rules.length + " rules\n");

            let big_arithmetic_grammar = new Grammar(more_arithmetic_rules);
            let model = new Model(big_arithmetic_grammar, lotsaFeatures, weights, lEval);

            term.pause();
            await model.learnWeights(examples, metric="denotation");
            let result = model.parse_input(command);
            if (result !== undefined) {
                // TODO: Pretty print the parses
                let cnt = 0;
                for (r of result) {
                    term.echo("[[b;aqua;black]" + cnt + " ([[;chartreuse;black]" + r.score + "]" + "):]\t[[;white;black]" + JSON.stringify(r.semantics).replace(/\[/g, "(").replace(/\]/g,")") + " → " + r.denotation + "]");
                    cnt++;
                    if (cnt > 4) {
                        term.echo("[[b;aqua;black]... " + (result.length - 4) + " more parses ...]");
                        break;
                    }
                }
            }
            term.resume()
        } catch(e) {
            this.error(new String(e));
        }
    } else {
       this.echo('');
    }
}, {
    greetings: 'Type Sentences here to see their parses [[;chartreuse;black](And Scores)]:',
    name: 'parser',
    height: 250,
    prompt: '> ',
    enabled: false
});
//$('#slow-model').terminal().exec("moja ongeza moja");
