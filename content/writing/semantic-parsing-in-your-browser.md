---
title: "Semantic Parsing in Your Browser"
date: 2018-10-08T15:57:49-04:00
draft: false
---
<style>
.term {
    margin:auto;
    margin-bottom:1em;
    width: 60%;
    border: 2px double #aaa;
    border-radius: 5px;
}
.editor {
    margin:auto;
    margin-bottom: 1em;
    width: 60%;
    border: 2px double #aaa;
    border-radius: 5px;
    height: inherit;
    font-size: 12px;
}
.column {
  width: 49%;
  margin: 0.5%;
  float: left;
}
.weights {
  width: 50%;
  font-size: 14px!important;
  max-height: 200px;
  overflow-y: scroll;
  margin:auto;
}
.row {
  margin: auto;
  width: 90%;
  height: 200px;
  margin-bottom: 1em;
}
.row:after {
  content: "";
  display: table;
  clear: both;
}
@media (max-width: 600px) {
  .weights {
    width: 90%;
  }
  .term .editor {
      width: 90%;
  }
  .column {
    width: 100%;
    margin:auto;
    margin-bottom: 1em;
  }
  .row {
    height: none;
  }
}
</style>
<script src="/code/semparser/vendor/js/jquery-1.7.1.min.js"></script>
<script src="/code/semparser/vendor/js/jquery.terminal-1.21.0.min.js"></script>
<script src="/code/semparser/vendor/js/jquery.mousewheel-min.js"></script>
<!-- <script src="vendor/js/tf.js"></script> -->
<script src='https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.5/MathJax.js?config=TeX-AMS_CHTML' async></script>
<link href="/code/semparser/vendor/css/jquery.terminal-1.21.0.min.css" rel="stylesheet"/>
<script src="/code/semparser/lisp.js"></script>
<script src="/code/semparser/model.js"></script>
<script src="/code/semparser/semparser.js"></script>
<script src="/code/semparser/experiment.js"></script>

<!--
For a while now, I've been drawn to the work being done in semantic parsing. Semantic parsing involves mapping natural language expressions into formal representations of their meaning. The idea of converting natural language expressions some structured form is a compeling one for a number of reasons:

1. First, I (and other engineers like me) are already used to thinking about and building systems that are predictable and deterministic. Talented people have put years of effort into crafting programming languages, data query languages and all sorts of software that work pretty efficiently.
-->
I think semantic parsing is an interesting topic! It involves mapping natural language expressions into formal representations of their meaning. These formal represenations can take a variety of forms, but are typically in some form that do not require knowledge of natural language to be understood. e.g. `one plus one → 2`, `一加三 → 4`, `the 45th president of the united states → Donald J. Trump`, `monkey → 🐒`<!-- &#x1f412; -->

I also think that semantic parsing could get more love, and I think that the web a great platform to spread the love. With that in mind, we're going to build a simple semantic parser that runs in **your** browser. If all goes well, this will be the first in a series of posts. They should become more interesting as I learn more. :)

_**Note**: All the code used in the demonstrations here is free to use under the [AGPL v3](https://www.gnu.org/licenses/agpl-3.0.en.html) license. You can check it out on my [Github](https://github.com/Muuo/site/tree/master/static/code/semparser)._

### So we want to build a semantic parser? What will it do?

Let's make one that parses mathematical expressions. There's [other people](https://www.wolframalpha.com/) who already do this really well... so we won't try too hard. We'll start with really simple expressions. i.e. "one plus two" and not "What's the square root of one hundred and twenty eight point four two?". Some examples are listed below with their corresponding semantic representations:

1. `"one plus one" -> 2`
2. `"one plus two" -> 3`
3. `"three minus four" -> -1`

### Okeydoks... we sort of know what we want to build. Awesome! What next?

We need to figure out how to turn the natural language expressions into their semantic representations. There are a number of ways of doing this, and I'll enumerate the ones that immediately come to mind:

1. **Learn some magical function**  that turns natural language expressions into denotations.
   Why? It's 2018! The future is upon us... Just shove your data into the deepest neural net you can find, cross your fingers and hope for the best!
   *([Complementary XKCD](https://xkcd.com/1838/))*
2. Figure out a clever way of **mapping utterances to intermediate logical forms** that can be evaluated into our desired denotations.

Jokes aside, empirical methods are getting better at taking into account the structure of natural language with [neural network architectures that take into account syntactic sentence structure](https://www.aclweb.org/anthology/P15-1150) and methods that use [unsupervised pre-training on massive amounts of data](https://blog.openai.com/language-unsupervised/). However, there's a lot of reasons to want to ground our semantic representations in logical systems that act in a predictable and deterministic way:

1. First, converting natural language expressions to logical expressions allows us to leverage 3rd party code in resolving the desired denotations. e.g. `"What's the square root of 2?"` may be resolved to `Math.sqrt(2)` and then `1.4142`.
2. By the way of [compositional semantics](https://web.stanford.edu/~pnadath/handouts/ling1/ling1sec2_semantics.pdf), we can use intermediate semantic representations to learn the meaning of words and subphrases that we can reuse in later inference. e.g. We'll see later in the post that we can learn that `"moja"` means `1` in Swahili by first learning that `"moja ongeza moja" 🡒 2`.

In this post, I'll mostly just work through what I found interesting while implementing a semantic parser in Javascrtipt. If you're looking for a more complete guide on how to build a semantic parser, my work is loosely based off of Bill MacCartney's [SippyCup notebook](http://nbviewer.jupyter.org/github/wcmac/sippycup/blob/master/sippycup-unit-1.ipynb). If you're just looking for a robust implementation of a semantic parser, I'd recommend Percy Liang's [Sempre](https://github.com/percyliang/sempre).

## The Intermediate Logic (LispJS)

Ok. If this approach is going to work, we'll need a logical form that makes it easy to compose primitive semantic expressions into more complex ones. A really easy way of doing this is by the use of a functional programming language such as [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language)). A program written in a functional programming language is typically made up of a nested arrangement of functions that (in a [pure](https://en.wikipedia.org/wiki/Purely_functional_programming) implementation) each have no effect on the world, and are simply a black boxes that take an input and return an output. These functional programs work in much the same way that mathematical expressions do, differing primarily in the order of operators and their arguments. e.g.

1. `(+ 1 1)` ≡ `1 + 1`
2. `(+ (- 4 2) (* 8 5))` ≡ `(4 - 2) + 8 * 5`

Our functional programming language is relatively simple, and need only support a few simple operations (`-`, `+`, `*`) and numeric (`1`, `2`, `3`, `...`) arguments. However, since it was fun little exercise, I went ahead and implemented a mostly complete Scheme dialect using Javascript. It is based off of [Peter Norvig's execellent tutorial](http://norvig.com/lispy.html) on how to do the same thing in Python, and exposes all of the properties and methods in your browser's built-in [Math](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) object. The terminal below will let you play around with it.

<div class="term" id="lisp_js"></div>

I would definitely recommend Peter's tutorial to anyone who wants a better understanding of what's going on behind the scenes. You can also check out the source code for my implementation [here](https://github.com/Muuo/site/blob/master/static/code/semparser/lisp.js). Writing a Lisp interpreter was far simpler than I had imagined, and gave me a more informed appreciation of how interpreters and compilers go about the business of making my code run.

## Parsing to LispJS

Now that we've decided on an intermediate representation, we need to find a way of parsing our sentences into their corresponding semantic representations. That is, how do we parse a sentence like `"one plus one times two"` into `(+ 1 (* 1 2))`?

Parsing, in this case, involves recognizing a sentence and assigning a syntactic structure to it. This syntactic structure is most often encoded in the form of a [context free grammar (CFG)](https://en.wikipedia.org/wiki/Context-free_grammar), a formal grammar that consists of a set of **compositional rules** that express the way symbols of the language can be grouped and ordered together, and a **lexicon** of words and symbols.

A simple example of a grammar is one in which there are: i) Two categories `$Adjective` and `$Fruit` (prefixed with a dollar sign by convention), a lexicon of `$Adjective → Bad, $Adjective → Good, $Fruit → Orange, $Fruit → Apple` and a compositional rule `$Opinion → $Adjective $Fruit`. A parser using this grammar would then be able to determine whether or not `"Bad Apple"` qualifies as an `$Opinion`.

We will parse our inputs using the CKY Algorithm, a [chart parsing](https://en.wikipedia.org/wiki/Chart_parser) algorithm and dynamic-programming based approach to parsing. One constraint of this method is that the grammar must in [Chomsky Normal Form](https://en.wikipedia.org/wiki/Chomsky_normal_form) (or CNF). Rules in CNF are of the form:

<center>
&nbsp;\\( A \rightarrow BC \\),   <br>
or \\( A \rightarrow a \\)        <br>
or \\( S \rightarrow \epsilon \\),
</center>

where \\(A\\), \\(B\\), and \\(C\\) are categories (non-terminal symbols), \\(a\\) is a word (terminal symbol), \\(S\\) is the start symbol, and \\(\epsilon\\) denotes the empty string. This implies that in *lexical rules*, the right hand side (RHS) must consist of exactly one terminal symbol, and in *compositional rules*, the RHS must consist of exactly two categories (non-terminals).

This means that if we have numerals of category `$E` and binary operators of category `$BinOp`, we can not define rules like `$E → $E $BinOp $E`. Rather we must split it into two rules: `$EBO → $E $BinOp`, and `$E → $E $EBO`.

I won't go into the details of implementation here: So if you aren't already familiar with syntactic parsing, I would recommend reading through chapters 10 & 11 of [Jurafsky & Martin's Speech and Language Processing (3rd ed.)](https://web.stanford.edu/~jurafsky/slp3/) (or chapters 12 & 13 in the 2nd edition).

The rules we'll be using for most of this article are listed in the sandbox below. Feel free to play around with them and see the effect they have on the parser's results (The parser reloads the grammar from the editor each time you type in a sentence):

<div class="row" style="height:300px">
<div class="editor column" id="grammar"></div>
<div class="term column" id="parser"></div>
</div>

## Handling Ambiguity

Dealing with **ambiguity** is one of the biggest challenges of computational linguistics, and indeed, syntactic parsing is no exception. If you messed around with the sandbox above, you'll have noticed that certain sentences (like `"minus three plus two"` or `"four times two plus one"`) produce more than one valid parse. The problem is that many sentences in natural language have multiple grammatically correct but semantically unreasonable parses.

### So how do we figure out which parse is correct then?

One solution is to rank candidate parses with a linear scoing function. Each parse's score is calculated by finding the weighted sum of a number of real-valued features. These features should encode important characteristics of the candidate parses and allow us to differentiate the good from the bad.

Each candidate parse \\(y\\) and its input \\(x\\) is mapped to a \\(d\\)-dimensional feature vector, \\(\phi(x,y) \in {\mathbb{R}}^{d}\\), and a vector of weights, \\(\textbf{w}\\).

$$ Score\_{w}(x, y) = \textbf{w} \cdot \phi (x, y) = \sum\_{j=1}^{d}w\_{j} \phi {(x,y)}\_j $$

We must therefore define features that will allow us to pick out semantically correct parses. One feature (and probably the most obvious to most readers) is one that accounts for [operator precedence](https://en.wikipedia.org/wiki/Order_of_operations). We'll implement this feature by counting the number of times each possible pair of operators appear in sequence. e.g. `(+ (* 1 2))` would produce `{['+','*']: 1, ['*', '+']: 0, ...}`.

We can then adjust the values of the weights so that incorrect operator order is penalized. You can play around with the weights in the sandbox below and observe how they affect the parses' scores:

<div class="row">
<div class="editor column" id="weights"></div>
<div class="term column" id="dumb-model"></div>
</div>

## Learning Parse Scores

Obviously, it's rather tedious to manually assign weights to each feature, even for a smaller feature set as our own. We need some way of learning the weights automatically from training data rather than setting them ourselves.

In [their (2015) paper](https://web.stanford.edu/~cgpotts/manuscripts/liang-potts-semantics.pdf), Liang and Potts show us how we can use [supervised learning](https://en.wikipedia.org/wiki/Supervised_learning) to learn the weights in our scoring function. We'll be using the methodology they outline in their paper, and while I won't cover it in detail, it's worth noting that they use the multiclass hinge loss objective and optimize their weights using stochastic gradient descent (SGD). Their objective is provided below:

$$ min\_{\textbf{w} \in \mathbb{R}^{d}} \sum\_{(x, y) \in \mathcal{D}} max\_{y^{\prime} \in \mathcal{Y}} \left \[ Score\_{\textbf{w}}(x, y^{\prime}) + c(y, y^{\prime})  \right \] - Score\_{\textbf{w}}(x, y),$$

where each \\(x\\) is an input, each \\(y\\) is a parse and \\(y^{\prime}\\) is the model's chosen parse (parse that produces the correct denotation). \\(D\\) is a set of \\((x,y)\\) training examples and \\(c(y, y^{\prime})\\) is the cost for predicting \\(y^{\prime}\\) when the correct output is \\(y\\). Usually, \\(c(y, y^{\prime} = 0)\\) if \\(y = y^{\prime}\\), and 1 otherwise.
      Talk about semantic & denotation loss functions (and how much data)

The sandbox below lists out a number of training and test examples. Each example consists of a natural language input, its semantic representation and its denotation. Feel free to experiment and see how changes to the examples affect the parses' scores. Some stuff to try:

  1. Can you add an example that will result in the correct ranking for "minus three plus two"?
  2. How does using the examples provided in [`more_examples.js`](/code/semparser/more_examples.js) change the learned weights?

<div class="row" style="height:260px">
<div class="editor column" id="examples"></div>
<div class="term column" id="smart-model"></div>
</div>
<pre class="weights" id="smart-weights"></pre>

## Learning a Lexicon

Ok. Cool! Now we now know how to go from a natural language input like `"one plus one"` to its denotation `2`. However, we have to endure the tedium of defining a grammar for our parser. Ideally, we'd want to be able to learn the grammar automatically from examples.

[Grammar Induction](https://en.wikipedia.org/wiki/Grammar_induction) is an active area of research and inducing a complete grammar from scratch is still fairly difficult. However, we may be able to induce our lexicon from scratch. That is, if we have a set of examples in another language, say [Kiswahili](https://en.wikipedia.org/wiki/Swahili_language), can we induce lexical rules that map Kiswahili words to their semantics? i.e. {`"moja"`, `"mbili"`, `"ongeza"`, `"mara"`} → {`1`, `2`, `+`, `*`, `...`}

Let's work through the solution. Say we have a bunch of examples written in Swahili:

1. First, we'll tokenize the sentences and generate a vocabulary of words whose meanings we don't know. e.g. `("moja", "mbili", "ongeza", "toa", ...)`
2. We then need to assume that we know our target denotations and the categories their corresponding tokens would map to. e.g. `$E → (1, 2, 3, 4), ($UnOp, $BinOp) → ('-', '+', '*', '/')` because all numerals belong to the `$E` category and the operators either belong to `$UnOp` or `$BinOp`
3. Next, we can take the [cartesian product](https://en.wikipedia.org/wiki/Cartesian_product) of the categories and semantics to generate a set of new rules. e.g. `($E → "one", 1), ($E → "one", 2), ($E → "one", 3), ... ($UnOp → "one", "+"), ($UnOp → "one", "-"), ...`

We can now attempt to parse our sentences with this expanded grammar. However, you'll notice that most of the rules are garbage because terminals haven't been paired with the right non-terminals and denotations. This will result in the generation large number of candidate parses. We'll need to lean heavily on our scoring function to find the correct parses.

We'll also need a new set of features for our scoring function to work well though: **Rule features**, a default starting point for feature engineering. There is one feature for each rule in the grammar, and its value for any parse is the number of times the rule was applied to the parse. Take a look at the learned weights after testing a sentence. We now know that there's a high likelihood that `"moja"` is denoted by `1`, `"mbili"` is denoted by `2` and etcetera. **I think that's pretty cool!**.

Test some sentences in the sandbox below (e.g. `"moja toa nne ongeza tatu"`). If you have the patience, try listing examples in a new language. *(Note that our grammar is limited to the initial list of rules listed in the first sandbox)*

<div class="row" style="height:250px">
<div class="editor column" id="swahili"></div>
<div class="term column" id="slow-model"></div>
</div>
<pre class="weights" id="lexicon-weights"></pre>

**Performance Notes**:

* Grammar induction is CPU intensive (and I need to work on forking it off to a web worker), so your browser will hang up for a little bit when you input a sentence.
* I could speed things up by using beam search to limit the number of rules I attempt to apply to each parse.

I hope this was an informative post and that you're now just as enthusiastic about semantic parsing as I am :)
Feel free to submit any errata or thoughts to the email address provided at the bottom of the page.

<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.1/ace.js"></script>
<script src="/code/semparser/demo.js"></script>
