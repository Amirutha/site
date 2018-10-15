---
title: "Semantic Parsing in Your Browser"
date: 2018-10-08T15:57:49-04:00
draft: true
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
    margin-bottom:1em;
    width: 60%;
    border: 2px double #aaa;
    border-radius: 5px;
    font-size: 12px;
    height: inherit;
}
.column {
  width: 50%;
  float: left;
}
.row {
  height: 200px;
}
.row:after {
  content: "";
  display: table;
  clear: both;
}
@media (max-width: 600px) {
  .term .editor {
      width: 90%;
  }
}
</style>
<script src="/code/semparser/vendor/js/jquery-1.7.1.min.js"></script>
<script src="/code/semparser/vendor/js/jquery.terminal-1.21.0.min.js"></script>
<script src="/code/semparser/vendor/js/jquery.mousewheel-min.js"></script>
<!-- <script src="vendor/js/tf.js"></script> -->
<link href="/code/semparser/vendor/css/jquery.terminal-1.21.0.min.css" rel="stylesheet"/>
<script src="/code/semparser/lisp.js"></script>
<script src="/code/semparser/model.js"></script>
<script src="/code/semparser/semparser.js"></script>
<script src="/code/semparser/experiment.js"></script>

<!--
For a while now, I've been drawn to the work being done in semantic parsing. Semantic parsing involves mapping natural language expressions into formal representations of their meaning. The idea of converting natural language expressions some structured form is a compeling one for a number of reasons:

1. First, I (and other engineers like me) are already used to thinking about and building systems that are predictable and deterministic. Talented people have put years of effort into crafting programming languages, data query languages and all sorts of software that work pretty efficiently.
-->

For a while now, I've been drawn to the work being done in semantic parsing. Semantic parsing involves mapping natural language expressions into formal representations of their meaning. These formal represenations can take a variety of forms, but are typically in some form that do not require knowledge of natural language to be understood. e.g. `one plus one → 2`, `一加三 → 4`, `the 45th president of the united states → Donald J. Trump`, `monkey → 🐒`<!-- &#x1f412; -->

**So we want to build a semantic parser? What will it do?**

Let's make one that parses mathematical expressions. This is a solved problem though... so we won't try too hard. We'll start with really simple expressions. i.e. "one plus two" and not "What's the square root of one hundred and twenty eight point four two?". Some examples are listed below with their corresponding semantics:

1. `"one plus one" -> 2`
2. `"one plus two" -> 3`
3. `"three minus four" -> -1`

**Okeydoks... we sort of know what we want to build. Awesome! What next?**

We need to figure out how to turn the natural language expressions into their denotations. There are a number of ways of doing this, and I'll enumerate the ones that immediately come to mind:

1. Straight up learn the magical function **`f`** that turns natural language expressions into denotations.
   Why? It's 2018! The future is upon us... Just shove your data into the deepest neural net you can find, clench your butt and hope for the best!
   *([Complementary XKCD](https://xkcd.com/1838/))*
2. Figure out a clever way of mapping constituent phrases of the natural language expressions to intermediate logical forms that can be composed and evaluated into our desired denotations.

I'll go right ahead and let you know that I'm partial towards the second approach. Empirical methods are getting better at taking into account the structure of natural language with nice things like recurrent and tree structured neural networks (Cite). However, there's a lot of reasons to want to ground our semantic representations in logical systems that act in a predictable and deterministic way. For one, humans have put a lot of effort into crafting complex software that works pretty efficiently. (Blah blah blah) (Flesh this out)

In this post, I'll mostly just work through what I found interesting while implementing a semantic parser that runs in your browser. If you're looking for a more complete guide on how to build a semantic parser, my work is loosely based off of [Bill MacCartney's SippyCup tutorial](http://nbviewer.jupyter.org/github/wcmac/sippycup/blob/master/sippycup-unit-1.ipynb). If you're just looking for a robust implementation of a semantic parser, I'd recommend Percy Liang's [Sempre](https://github.com/percyliang/sempre).

## The Intermediate Logic (LispJS)

Ok. If this approach is going to work, we'll need a logical form that makes it easy to compose primitive semantic expressions into more complex ones. A really easy way of doing this is by the use of a functional programming language such as [Scheme](https://en.wikipedia.org/wiki/Scheme_(programming_language)). A program written in a functional programming language is typically made up of a nested arrangement of functions that (in a pure implementation) each have no effect on the world, and are simply a black boxes that take an input and return an output. These functional programs work in much the same way that mathematical expressions do, differing primarily in the order of operators and their arguments. e.g.

1. `1 + 1` ≡ `(+ 1 1)`
2. `(+ (- 4 2) (* 8 5))` ≡ `(4 - 2) + 8 * 5`

Our functional programming language is a relatively simple, and need only support a few simple operations (`-`, `+`, `*`, `/`) and numeric (`1`, `2`, `3`, `...`) arguments. However, since it was fun little exercise, I went ahead and implemented a mostly complete Scheme dialect using Javascript. It is based off of [Peter Norvig's execellent tutorial](http://norvig.com/lispy.html) on how to do the same thing in Python, and exposes all of the properties and methods in your browser's built-in [`Math`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math) object. The terminal below will let you play around with it.

<div class="term" id="lisp_js"></div>

I would definitely recommend Peter's tutorial to anyone who wants a better understanding of what's going on behind the scenes. You can also check out the source code for my implementation here: (LINK HERE!). Writing a Lisp interpreter was far simpler than I had imagined, and gave me a more informed appreciation of how interpreters and compilers go about the business of making my code run.

## Parsing to LispJS

Now that we've decided on an intermediate representation, we need to find a way of parsing our sentences into their corresponding semantic representations. That is, how do we parse a sentence like `"one plus one times two"` into `(+ 1 (* 1 2))`?

Parsing, in this case, involves recognizing a sentence and assigning a syntactic structure to it. This syntactic structureis most often encoded in the form of a [context free grammar (CFG)](https://en.wikipedia.org/wiki/Context-free_grammar), a formal grammar that consists of a set of **compositional rules** that express the way symbols of the language can be grouped and ordered together, and a **lexicon** of words and symbols.

We will be parsing using the CKY Algorithm, a [chart parsing](https://en.wikipedia.org/wiki/Chart_parser) algorithm and dynamic-programming based approach to parsing. One constraint of this method is that the grammar be in [Chomsky Normal Form](https://en.wikipedia.org/wiki/Chomsky_normal_form) (or CNF). Rules in CNF are of the form:

1. `A → BC`, or
2. `A → a`, or
3. `S → ε`,

where `A`,`B`, and `C` are categories (non-terminal symbols), `a` is a word (terminal symbol), `S` is the start symbol, and `ε` denotes the empty string. This implies that in *lexical rules*, the right hand side (RHS) must consist of exactly one terminal symbol, and in *compositional rules*, the RHS must consist of exactly two categories (non-terminals).

I won't go into the details of implementation here: So if you aren't already familiar with syntactic parsing, I would recommend reading through chapters 10 & 11 of [Jurafsky & Martin's Speech and Language Processing (3rd ed.)](https://web.stanford.edu/~jurafsky/slp3/) (chapters 12 & 13 in the 2nd edition).

The rules we'll be using for the rest of this article are listed in the sandbox below. Feel free to play around with them and see the effect they have on the parser's results.

<div class="row">
<div class="editor column" id="examples"></div>
<div class="term column" id="thingy_js"></div>
</div>
<p>
## Handling Ambiguity

Dealing with **ambiguity** is one of the biggest challenges of computational linguistics, and indeed, syntactic parsing is no exception. If you messed around with the sandbox above, you'll have noticed that certain sentences (like `"minus three plus two"` or `"four times two plus one"`) produce more than one valid parse. The problem is that many sentences in natural language have multiple grammatically correct but semantically unreasonable parses.

**So how do we figure out which parse is correct?**

One solution is to rank candidate parses with a linear scoing function. Each parse's score is calculated by finding the weighted sum of a number of real-valued features. These features should encode important characteristics of the candidate parses and allow us to differentiate the good from the bad.

TODO: Add equation

We must therefore define features that will allow us to pick out semantically correct parses. One feature (and probably the most obvious to most readers) is one that accounts for [operator precedence](https://en.wikipedia.org/wiki/Order_of_operations). We'll implement this feature by counting the number of times each possible pair of operators appear in sequence. e.g. `(+ (* 1 2))` would produce `{['+','*']: 1, ['*', '+']: 0, ...}`.

We can then adjust the values of the weights so that incorrect operator order is penalized. You can play around with the weights in the sandbox below so that the correct parse is assigned the highest score.

TODO: Add weight sandbox

## Learning Parse Scores

Obviously, it's rather tedious to manually assign weights to each feature, even for a smaller feature set as our own. We should therefore devise some way of learning the weights automatically from training data rather than setting them ourselves.

In [their (2015) paper](https://web.stanford.edu/~cgpotts/manuscripts/liang-potts-semantics.pdf), Liang and Potts show us how we can use [supervised learning](https://en.wikipedia.org/wiki/Supervised_learning) to learn the weights in our scoring function. We'll be using the methodology they outline in their paper, and while I won't cover it in detail, it's worth noting that they use the multiclass hinge loss objective and optimize their weights using stochastic gradient descent (SGD). i.e.

TODO: Add Equation here
      Talk about semantic & denotation loss functions (and how much data)

TODO: Implement in tensorflow.js and brag about it

The sandbox below lists out a number of training and test examples. Each example consists of a natural language input, its semantic representation and its denotation. Feel free to experiment and see how changes to the training and test examples affect the trained model's performance. 

TODO: Add Sandbox here

## Learning a Lexicon

Ok. Cool! Now we now know how to go from a natural language input like `"one plus one"` to its denotation `2`. However, we have to endure the tedium of defining a grammar for our parser. Ideally, we'd want to be able to learn the grammar automatically from examples.

[Grammar Induction](https://en.wikipedia.org/wiki/Grammar_induction) is an active area of research and inducing a complete grammar from scratch is still fairly difficult. However, we may be able to induce our lexicon from scratch. That is, if we have a set of examples in another language, say [Kiswahili](https://en.wikipedia.org/wiki/Swahili_language), can we induce lexical rules that map Kiswahili words to their semantics (`1`, `2`, `+`, `*`, ...)?

TODO: Insert Description of methodology here

TODO: Insert Sandbox here

I hope this was an informative post and that you're now just as enthusiastic about semantic parsing as I am :)

<script src="https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.1/ace.js"></script>
<script src="/code/semparser/demo.js"></script>