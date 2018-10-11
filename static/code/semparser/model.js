function Model(grammar, featureFn=(parse) => {}, weights={}, executor=null) {
    this.grammar = grammar;
    this.featureFn = featureFn;
    this.weights = weights;
    this.executor = executor;

    this.score = function(parse) {
        var run_sum = 0;
        var features = this.featureFn(parse);
        for (feat in features) {
            if (features.hasOwnProperty(feat)) {
                run_sum += (this.weights[feat] || 0.0) * features[feat];
            }
        }
        return run_sum;
    }

    this.parse_input = function(input) {
        parses = this.grammar.parse_input(input);
        for (parse of parses) {
            if (this.executor != null) {
                parse.denotation = this.executor(parse.semantics);
            }
            parse.score = this.score(parse);
        }
        parses.sort(function(a, b) {
            return b.score-a.score;
        })
        return parses;
    }

    this.learnWeights = async function(examples, metric="semantics", eta=0.1, T=20) {
        // Data Prep
        var featureNames = new Set();

        const evaluate = function(parse, example, metric) {
            if (metric==="denotation") {
                return (parse.denotation === example.denotation);
            } else if (metric==="semantics") {
                return sem_eq(parse.semantics, example.semantics);
            }
        }
        var seed=Math.floor(Math.random()*100);
        //let seed = 60;
        console.log("seed is " + seed);
        const random = function() {
            var x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        }

        for (epoch=0; epoch<T; epoch++) {
            let xObj={}, y={}, maxParses={};
            let drawn = new Set();
            for (i=0; i<examples.length; i++) {
                var j;
                while (drawn.has(j = Math.floor(random()*examples.length)));
                drawn.add(j);
                let example = examples[j];
                let parses = this.parse_input(example.input);
                let target = true;
                let maxCrit   = -100000;
                maxParses[i] = [];
                for (parse of parses) {
                    
                    // We don't really know all the set features ahead
                    // of time so we update our list as we go along
                    features = this.featureFn(parse);

                    if (epoch == 0) {
                        for(featureName of Object.keys(features)) {
                            featureNames.add(featureName);
                        }
                    }

                    let match = evaluate(parse, example, metric);
                    
                    let crit = parse.score;
                    if (target && match) {
                        // Assign a 1 if the parse was correct
                        y[i] = parse;
                        xObj[i] = features;
                        target = false;
                    } else {
                        crit += 1;
                    }
                    if (crit >= maxCrit) {
                        if (crit > maxCrit) {
                            maxParses[i] = [];
                        }
                        maxCrit = crit;
                        maxParses[i].push([features, match]);
                    }
                }
            }
            
            if (epoch === 0) {
                featureNames = Array.from(featureNames);
            }
            
            let keys = Object.keys(xObj);
            let num_correct = 0;
            for (i of keys) {
                // Update the weights
                var chosen_features = maxParses[i][Math.floor(random()*maxParses[i].length)];
                if (chosen_features[1]) {num_correct++;}
                chosen_features = chosen_features[0];
                featureNames.map((name) => {
                    let target_feature = xObj[i][name] == null ? 0.0: xObj[i][name];
                    let chosen_feature = chosen_features[name] == null ? 0.0: chosen_features[name];
                    let update = target_feature - chosen_feature;
                    if (update !== 0.0) {
                        this.weights[name] = this.weights[name] || 0.0;
                        this.weights[name] += (eta * update);
                    }

                })
            }
            console.log("Epoch #" + epoch.toString() + " - Train Accuracy: " + (num_correct / examples.length).toFixed(3));
        }
        
        console.log("Feature weights:")
        
        let featNames = Object.keys(this.weights).sort((a,b) => {return this.weights[b] - this.weights[a];})
        for (feat of featNames) {
            console.log("\t" + this.weights[feat] + "\t" + feat);
        }
        
        console.log("");
    }
}