function evaluate_grammar(grammar, executor, examples) {
	evaluate_model(new Model(grammar, executor=executor), examples);
}

sem_eq = function(sem1, sem2) {
	if (sem1 == null || sem2 == null)
		return false;
	if (sem1 === sem2)
		return true;
	else if (sem1.constructor === Array && sem2.constructor === Array && sem1.length === sem2.length) {
		return [...Array(sem1.length).keys()].map(
			(i) => sem_eq(sem1[i],sem2[i])
		).every((t) => t);
	}
}

function evaluate_model(model, examples, verbose=false) {
	// Totals
	var example_cnt = examples.length;
	var sem_acc_t = 0;
	var sem_orc_acc_t = 0;
	var den_acc_t = 0;
	var den_orc_acc_t = 0;
	var parse_cnt_t = 0;

	console.log("==================================================");
	console.log("Evaluating on " + example_cnt + " examples.");
	for (example of examples) {
		var parses = model.parse_input(example.input);
		if (verbose) {
			console.log("------------------------------------------------------------");
			console.log("input\t\t\t\t\t" + example.input);
			console.log("target semantics\t\t" + JSON.stringify(example.semantics));
			console.log("target denotation\t\t" + example.denotation);
			console.log("");
		}
		var parse_cnt = parses.length;
		var sem_acc = 0;	 // semantic accuracy
		var sem_orc_acc = 0; // semantic oracle accuracy
		var den_acc = 0;	 // denotation accuracy
		var den_orc_acc = 0; // denotation oracle accuracy
		
		var p = 0;
		for (parse of parses) {
			var sem = parse.semantics;
			var mark_sem = sem_eq(sem, example.semantics);
			if (mark_sem) {
				sem_orc_acc = 1;
				if (p === 0)
					sem_acc = 1;
			}

			var den = model.executor(sem);
			var mark_den = den === example.denotation;
			if (mark_den) {
				den_orc_acc = 1;
				if (p === 0)
					den_acc = 1;
			}
			var symBool = (b) => b ? "+": "-"; // Convert booleans to symbols
			if (verbose) {
				console.log(p + "\t" + parse.score.toFixed(2) + "\tsemantics\t" + symBool(mark_sem) + "\t" + JSON.stringify(sem));
				console.log("\t\t\tdenotation\t" + symBool(mark_den) + "\t" + den);
			}
			
			p++;
		}
		
		sem_acc_t += sem_acc;
		sem_orc_acc_t += sem_orc_acc;
		den_acc_t += den_acc;
		den_orc_acc_t += den_orc_acc;
		parse_cnt_t += parse_cnt;
		if (verbose) {
			console.log("");
			console.log("semantics accuracy\t\t\t" + sem_acc);
			console.log("semantics oracle accuracy\t" + sem_orc_acc);
			console.log("denotation accuracy\t\t\t" + den_acc);
			console.log("denotation oracle accuracy\t" + den_orc_acc);
			console.log("number of parses\t\t\t" + parse_cnt);
			console.log("");
		}
	}
	console.log("Over " + example_cnt + " examples:");
	console.log("");
	console.log("semantics accuracy\t\t\t" + sem_acc_t/example_cnt);
	console.log("semantics oracle accuracy\t" + sem_orc_acc_t/example_cnt);
	console.log("denotation accuracy\t\t\t" + den_acc_t/example_cnt);
	console.log("denotation oracle accuracy\t" + den_orc_acc_t/example_cnt);
	console.log("number of parses\t\t\t" + parse_cnt_t/example_cnt);
	console.log("");
}