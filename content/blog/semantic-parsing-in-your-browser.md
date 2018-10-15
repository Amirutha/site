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
@media (max-width: 600px) {
  .term {
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

We really only