---
title: "Semantic Parsing in Your Browser"
date: 2018-10-08T15:57:49-04:00
draft: true
---
<style>
.term {
    margin:auto;
    width: 50%;
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

For a while now, I've been drawn to the work being done in semantic parsing. Semantic parsing involves mapping natural language expressions into formal representations of their meaning. The idea of converting natural language expressions some structured form is a compeling one for a number of reasons:

1. First, I (and other engineers like me) are already used to thinking about and building systems that are predictable and deterministic. Talented people have put years of effort into crafting programming languages, data query languages and all sorts of software that work efficient

<div class="term" id="lisp_js"></div>
