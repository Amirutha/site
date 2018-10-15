var editor = ace.edit("examples");
editor.setTheme("ace/theme/xcode");
editor.session.setMode("ace/mode/javascript");

editor.setValue(`// I'd advise walking through the SippyCup notebook before reading this, because they do a
// great job of walking through the process step by step
// What we're doing here is defining a rule with all of its properties
numeral_rules = [
  new Rule('$E', 'one', 1),
  new Rule('$E', 'two', 2),
  new Rule('$E', 'three', 3),
  new Rule('$E', 'four', 4)
];

// You'll observe that we assign both the $UnOp and $BinOp versions of minus the same semantics
// TODO: Explain why this works for us
operator_rules = [
  new Rule('$UnOp',  'minus', '-'),
  new Rule('$BinOp', 'plus', '+'),
  new Rule('$BinOp', 'minus', '-'),
  new Rule('$BinOp', 'times', '*')
];

compositional_rules = [
  new Rule('$E', '$UnOp $E', (sems) => [sems[0], sems[1]]),
  new Rule('$EBO', '$E $BinOp', (sems) => [sems[1], sems[0]]),
  new Rule('$E', '$EBO $E', (sems) => [sems[0][0], sems[0][1], sems[1]])
];`)


$('#thingy_js').terminal(function(command) {
    if (command !== '') {
        try {
            var result = window.eval(command);
            if (result !== undefined) {
                this.echo(new String(result));
            }
        } catch(e) {
            this.error(new String(e));
        }
    } else {
       this.echo('');
    }
}, {
    greetings: 'JavaScript Interpreter',
    name: 'js_demo',
    height: 200,
    prompt: 'js> '
});
