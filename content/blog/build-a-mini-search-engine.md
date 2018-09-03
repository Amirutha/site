---
title: "Build yourself a Mini Search Engine"
date: 2018-08-28T09:57:25-04:00
draft: false
---

A research project [I spent time working on during my master's](http://www.academia.edu/37033880/Interactive_search_through_iterative_refinement) required me to scrape, index and rerank a largish number of websites. While Google would certainly offer better search results for most of the queries that concerned us, they no longer offer a cheap and convenient way of creating custom search engines.[*](https://enterprise.google.com/search/products/gss.html)

I therefore set about finding a workflow for retrieving decent results for search queries made against a predefined list of websites. That workflow is described here: Hopefully providing a useful reference for how to go about setting up a small search engine using fopen-source tools. 

<!-- insert description of crawling -->
## Setting up our Crawler<br><p>Source: [Nutch Tutorial](https://wiki.apache.org/nutch/NutchTutorial)<p>

[Apache Nutch](https://nutch.apache.org) is one of the more mature open-source crawlers currently available. Given a list of seed URLs, it will crawl through them following links until a specified crawl depth is reached.

<!-- insert diagram of crawl tree here -->

There are two major releases of Apache Nutch with their releases versioned as 1.x and 2.x respectively. The later is more modern, however, it breaks compatibility with some of the features this tuturial uses. It is therefore advised that readers stick to 1.x releases.

After crawling, we will want to index the contents of the pages we index. We will use [Apache Solr](https://solr.apache.org) for this purpose, and at the time of writing the latest version of Nutch that is compatible with Solr is v1.14. See [blahblahblah]() for the most recent Solr-Nutch compatibility table.

You'll therefore want to proceed to download Apache Nutch 1.14 and Solr 6.6.\*
```
wget http://mirror.dsrg.utoronto.ca/apache/lucene/solr/6.6.5/solr-6.6.5.tgz
wget http://apache.forsale.plus/nutch/1.14/apache-nutch-1.14-bin.tar.gz
tar xzf solr-6.6.5.tgz && rm solr-6.6.5.tgz && mv solr-6.6.5 solr
tar xzf apache-nutch-1.14-bin.tar.gz && rm apache-nutch-1.14-bin.tar.gz && mv apache-nutch-1.14 nutch
```

Add your agent name to `nutch/conf/nutch-site.xml`, and enable a bunch of plugins we'll need. The important addition is `indexer-solr`. It will allow us to automatically add documents to Solr's index as we crawl them.
```
<property>
 <name>http.agent.name</name>
 <value>CareCrawl</value>
</property>
<property>
 <name>plugin.includes</name>
 <value>protocol-http|urlfilter-(regex|validator)|parse-(html|tika)|index-(basic|anchor|more)|indexer-solr|scoring-opic|urlnormalizer-(pass|regex|basic)</value>  
</property>
```


Modify `nutch/conf/schema.xml` (To be used when setting up Solr), and set `indexed=true` on the `lastModified` field. This modification instructs Solr to index the `lastModified` field, allowing us to later rank results based on their recency.
```
<field name="lastModified" type="date" stored="true" indexed="true"/>
```

## Setting up our Indexer<br><p>Source: [Nutch's tutorial](https://wiki.apache.org/nutch/NutchTutorial#Setup_Solr_for_search)</p>

<!-- Insert paraphrase of Nutch's tutorial here -->
Setup solr as described in [Nutch's tutorial](https://wiki.apache.org/nutch/NutchTutorial#Setup_Solr_for_search).
Name your config appropriately. For the remainder of the document, it's assumed you named it `nutch`.

Enable LTR by adding the following lines in between `<config>` and `</config>` in `solr/server/solr/configsets/nutch/conf/solrconfig.xml`:
```
  <lib dir="${solr.install.dir:../../../..}/contrib/ltr/lib/" regex=".*\.jar" />
  <lib dir="${solr.install.dir:../../../..}/dist/" regex="solr-ltr-\d.*\.jar" />

  <queryParser name="ltr" class="org.apache.solr.ltr.search.LTRQParserPlugin"/>

  <cache name="QUERY_DOC_FV"
          class="solr.search.LRUCache"
          size="4096"
          initialSize="2048"
          autowarmCount="4096"
          regenerator="solr.search.NoOpRegenerator" />

  <transformer name="features" class="org.apache.solr.ltr.response.transform.LTRFeatureLoggerTransformerFactory">
    <str name="fvCacheName">QUERY_DOC_FV</str>
  </transformer>
```
While you're editing `solrconfig.xml`, make sure to change all instances of `_text_` to `text`.

Start it with ltr enabled:
```
solr/bin/solr start -Dsolr.ltr.enabled=true
```

## Crawl!

Fortunately, Nutch provides a script (`nutch/bin/crawl`) that let's us crawl and index the results into Solr simultaneously.
```
export JAVA_HOME=/usr/java/latest/
nutch/bin/crawl -i -D solr.server.url=http://localhost:8983/solr/nutch -s nutch/urls/ Crawl 2
```

Brief descriptions of each of the passed options are below:

1. `-i`: Index results into solr
2. `-D solr.server.url`: The URL of your solr index. You shouldn't need to change this if you are running Solr on the same machine as Nutch, on its standard port and you named your index `nutch`.
3. `-s nutch/urls/`: Where to look for text files with newline-delimited seed urls.
4. `Crawl`: Where to store contents of crawled pages.
5. `2`: The maximum crawl depth

It will take a while to finish the two rounds of crawling and indexing, after which you should be able to issue the following request to your Solr instance:
<!-- Insert appropriate command here -->

# Reranking
Now that we have a search engine setup, it's worth noting that we're still a far ways off from being at par with commercial search engines. <!-- Go on spiel about Google --> One of the reasons why Google was able to work it's way to the top of the search-engine foodchain is because they ranked search results in a far more intuitive way than their competition. Older readers might remember that Google initially allowed users to compare its search results to its competition. You can see it for yourself [here](https://web.archive.org/web/20001203011300/http://www.google.com:80/search?q=google).

![Search Engine Comparsion](/img/google_compare.png "Google was that much better")

This should prod us to ask the question of how we can go about improving the quality of our search results. Commercial search-engines such as Google do this by reranking their search results using a number of heuristics. Their original algorithm, page-rank, used statistics about a page's incoming and outgoing links to determine its 'popularity' in the network. They now use all sorts of features for ranking: such as the users' location, previous browsing histories... etc.

However, linguistic features still serve as good indicators of a documents relevance to the original query. Though we will only be using a number of simple features in this article, [this](https://www.microsoft.com/en-us/research/project/mslr/) list of features put together by Microsoft Research for a shared ranking task should serve as a good reference for appropriate features.

## Setup Reranker<br><p>Source: [Solr LTR Tutorial](https://lucene.apache.org/solr/guide/6_6/learning-to-rank.html)</p>
Upload feature def:
```
curl -XPUT 'http://localhost:8983/solr/nutch/schema/feature-store' --data-binary "@./data/features.json" -H 'Content-type:application/json'
```

If you're ever dissatisfied with your feature-set, they can be deleted by running the following line:
```
curl -XDELETE 'http://localhost:8983/solr/nutch/schema/feature-store/myfeature_store'
```

You can manually extract features for a certain query by making a curl request. For example, for the query 'dementia':
```
curl http://localhost:8983/solr/nutch/select?indent=on&q=dementia&wt=json&fl=title,score,[features%20efi.query=dementia]
```

You can also hit the `features` endpoint on rate_srv to generate a dump of training data in the format required by our classifier. It will append any Google results not present in the index to a seed file (`care-rate/src/rate_srv/seeds/temp_seeds.txt`) in `rate_srv`'s working directory. You can choose to crawl and index these urls at this point.
Make sure to save the generated features in `data/training.dat` to be used during training.
e.g.
```
# "+" is interpreted as " ". Alternatively use "%20"
curl "http://localhost:9000/features?q=dementia&q=dementia+toronto&q=dementia+money" -o data/training.data
```

Download and extract the classifier we'll be using (SVM_rank):
```
wget http://download.joachims.org/svm_rank/current/svm_rank.tar.gz && mkdir svm_rank && tar xzf svm_rank.tar.gz -C svm_rank && cd svm_rank && make
```
Alternatively, you can just download the appropriate precompiled binary from [the project website](https://www.cs.cornell.edu/people/tj/svm_light/svm_rank.html).

Run `construct_model.py` to generate a `data/model.json` file that you can then upload using:
```
curl -XPUT 'http://localhost:8983/solr/nutch/schema/model-store' --data-binary "@./data/model.json" -H 'Content-type:application/json'
```

You can now view the reranked results via:
```
curl http://192.168.0.9:8983/solr/nutch/query?q=dementia&rq={!ltr%20model=mymodel%20efi.query=dementia}&fl=url,title,[features]
```

It may be useful to contrast these to Solr's vanilla ranking and the Google results.
```
curl http://192.168.0.9:8983/solr/nutch/query?q=dementia&fl=url,title
curl https://www.googleapis.com/customsearch/v1?q=\%22dementia\%22&start=1&key=<your-api-key>&cx=<your-cx>
```
