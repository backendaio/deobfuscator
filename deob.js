const esprima = require('esprima');
const escodegen = require('escodegen');
const fs = require('fs');

var source, new_source, node_source, variable, live_variable,argument, important_function, to_replace, data, conditional_type, for_statement, discriminant, return_case, starting_stage;
//esprima.parseScript(source);

var u2q = 827;

function Literal(node){

	return (node.type == 'Literal');

};

function VariableDeclarator(node){

	return (node.type == 'VariableDeclarator');

};

function CallExpression(node){

	return (node.type == 'CallExpression');

};

function FunctionExpression(node){

	return (node.type == 'FunctionExpression');

};

function FunctionDeclaration(node){

	return (node.type == 'FunctionDeclaration');

};

function AssignmentExpression(node){

	return (node.type == 'AssignmentExpression');

};

function ControlFlow(node){

	return (node.type == 'BlockStatement')
		&&(node.body.find(b => b.type == 'ForStatement'))
			&&(node.body.find(b => b.type == 'ForStatement').body.body.find(b => b.type == 'SwitchStatement'));

};

function read_source(done){

	if(done){

		console.log('read source successfully');
		return; 

	};

	console.log('reading source');

	try{

		source = fs.readFileSync('./source.js', 'utf8');
		done = true;

	} catch {

		console.log('error reading source');

	};

	read_source(done);

};

function write_file(done){

	if(done){

		console.log('wrote file successfully');
		return; 

	};

	console.log('writting file');

	try{	

		new_source = escodegen.generate(node_source);
		//console.log(new_source);
		fs.writeFileSync('./deobfuscated.js', new_source, 'utf8');
		done = true;

	} catch {

		console.log('error writting file');

	};

	write_file(done);

};

async function clean_literal(done){

	if(done){

		console.log('cleaned literal');
		return;

	};

	console.log('cleaning literal');

	try{

		await esprima.parse(source, {}, (node,meta) => {

			if(Literal(node)){

				node.raw = node.value;

			};

			node_source = node; 

		});

		new_source = await escodegen.generate(node_source);
		done = true;

	} catch {

		console.log('error cleaning literal');

	};

	await clean_literal(done);

};

function collect_data(done){

	if(done){

		console.log('collected data successfully');
		return;

	};

	console.log('collecting data');

	try{

		variable = {};
		argument = {};
		important_function = {};
		live_variable = {};

		esprima.parse(new_source, { range : true }, (node,meta) => {

			try{

				if(VariableDeclarator(node)){

					try {

						variable[node.id.name] = JSON.parse(new_source.substring(node.init['range'][0],node.init['range'][1]));

					} catch {

						try{

							variable[node.id.name] = parseInt(new_source.substring(node.init['range'][0],node.init['range'][1]));

						} catch {};

					};

					if(!variable[node.id.name]){

						variable[node.id.name] = new_source.substring(node.init['range'][0],node.init['range'][1]);

					};

					if(node.init.type == 'FunctionExpression'){

						node.init.params.map(b => {

							if(!argument[b.name]){

								argument[b.name] = {}; 
								argument[b.name]['value'] = undefined; 
								argument[b.name]['function'] = node.id.name;

							};

						});

					};

				};

				if(FunctionDeclaration(node)){

					node.params.map(b => {

						if(!argument[b.name]){

							argument[b.name] = {}; 
							argument[b.name]['value'] = undefined; 
							argument[b.name]['function'] = node.id.name;

						};

					});

				};

				if(AssignmentExpression(node)){

					if(node.left.name){

						try {

							live_variable[node.left.name] = JSON.parse(new_source.substring(node.right.range[0], node.right.range[1]));

						} catch {

							try{

								live_variable[node.left.name] = parseInt(new_source.substring(node.right.range[0], node.right.range[1]));

							} catch {};

						};

						if(!live_variable[node.left.name] && live_variable[node.left.name] != 0){

							live_variable[node.left.name] = new_source.substring(node.right.range[0], node.right.range[1]);

						};

					};

				};

				if(!CallExpression(node) && FunctionExpression(node)){

					node.params.map(b => {

						if(!argument[b.name]){

							argument[b.name] = {};
							argument[b.name]['value'] = undefined;

						};

					});

				};

				if(CallExpression(node)){

					try {

						if(node.callee.type == 'FunctionExpression'){

							if(node.callee && node.callee.params){

								node.callee.params.forEach((element, index, array) => {

									if(node.arguments){

										argument[element.name] = {};

										try {

											argument[element.name]['value'] = JSON.parse(new_source.substring(node.arguments[index]['range'][0],node.arguments[index]['range'][1]));


										} catch {

											try{

												argument[element.name]['value'] = parseInt(new_source.substring(node.arguments[index]['range'][0],node.arguments[index]['range'][1]));

											} catch {};

										};

										if(!argument[element.name].value){

											argument[element.name]['value'] = new_source.substring(node.arguments[index]['range'][0],node.arguments[index]['range'][1]).replaceAll(`'`, ``);

										};

									};

								});

							};

						} else if(node.callee.type != 'FunctionExpression' && node.callee.type != 'MemberExpression' && node.callee.name && node.callee.name != 'setTimeout' &&  node.callee.name != 'decodeURI' && node.callee.name != 'require'){

							if(!important_function[node.callee.name]){

								important_function[node.callee.name] = 1; 

							} else {

								important_function[node.callee.name]++;

							};

						};

					} catch {};

				};

			} catch {};

		});

		Object.keys(variable).map(b => {

			live_variable[b] = variable[b];

		});

		Object.keys(argument).map(b => {

			live_variable[b] = argument[b]['value'];

		});

		Object.keys(important_function).forEach((element, index, array) => {

			if(important_function[element] > 1){

				delete important_function[element]; 

			};

		});

		try{


			esprima.parse(new_source, { range : true }, (node,meta) => {

				try{


					if(CallExpression(node)){

						if(node.callee.arguments){

							if(important_function[node.callee.callee.name]){

								node.callee.arguments.map(b => {

									Object.keys(argument).map(a => {

										if(argument[a]['function'] == node.callee.callee.name && !argument[a]['value']){

											try {

												argument[a]['value'] = JSON.parse(new_source.substring(b.range[0], b.range[1]));

											} catch {

												try{

													argument[a]['value'] = parseInt(new_source.substring(b.range[0], b.range[1]));

												} catch {};

											};

											if(!argument[a]['value']){

												argument[a]['value'] = new_source.substring(b.range[0], b.range[1]);

											};

										};

									});

								});

							};

						};

					};

				} catch {};

			});

		} catch {};

		done = true;

	} catch {

		console.log('error collecting data');

	};

	collect_data(done);

};

function solve_conditional_statement(node, true_case, false_case){

	try{

		data = new_source.substring(node.right.range[0], node.right.range[1]);
		//console.log(data);

		if(!conditional_type[node.right.test.type] && node.right.test.type != 'LogicalExpression' && node.right.test.type != 'Literal' && node.right.test.type != 'BinaryExpression' && node.right.test.type != 'UnaryExpression' && node.right.test.type != 'Identifier'){

			//console.log(node.right.test.type);
			//console.log(new_source.substring(node.right.range[0], node.right.range[1]));
			//conditional_type[node.right.test.type] = node.right.test.type;

		};

		if(node.right.test.type == 'LogicalExpression'){

			if(node.right.test.right.operator == '!=='){

				//console.log(false);
				return false;

			} else {

				Object.keys(live_variable).map(b => {

					data = data.replaceAll(b, live_variable[b]);

				});

				Object.keys(live_variable).map(b => {

					data = data.replaceAll(b, live_variable[b]);

				});

				try {

					if(eval(data) == true_case){

						//console.log(true);
						return true; 

					} else {

						//console.log(false);
						return false;

					};

				} catch {

					//console.log(false);
					return false;

				};

			};

		} else if(node.right.test.type == 'Literal'){

			try {

				if(eval(data) == true_case){

					//console.log(true);
					return true; 

				} else {

					//console.log(false);
					return false;

				};

			} catch {

				//console.log(false);
				return false;

			};

		} else if(node.right.test.type == 'BinaryExpression'){

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			try {

				if(eval(data) == true_case){

					//console.log(true);
					return true; 

				} else {

					//console.log(false);
					return false;

				};

			} catch {

				//console.log(false);
				return false;

			};

		} else if(node.right.test.type == 'UnaryExpression'){

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			try {

				if(eval(data) == true_case){

					//console.log(true);
					return true; 

				} else {

					//console.log(false);
					return false;

				};

			} catch {

				//console.log(false);
				return false;

			};

		} else if(node.right.test.type == 'Identifier'){

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			try {

				if(eval(data) == true_case){

					//console.log(true);
					return true; 

				} else {

					//console.log(false);
					return false;

				};

			} catch {

				//console.log(false);
				return false;

			};

		} else if(node.right.test.type == 'MemberExpression'){

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			try {

				if(eval(data) == true_case){

					//console.log(true);
					return true; 

				} else {

					//console.log(false);
					return false;

				};

			} catch {

				//console.log(false);
				return false;

			};

		} else {

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			Object.keys(live_variable).map(b => {

				data = data.replaceAll(b, live_variable[b]);

			});

			try {

				if(eval(data) == true_case){

					//console.log(true);
					return true; 

				} else {

					//console.log(false);
					return false;

				};

			} catch {

				//console.log(false);
				return false;

			};

		};

	} catch {

		//console.log(data);
		return false;

	};

};

function simplify_control_flow(stage, return_stage, node, done = false, body = []){

	try{

		if(done){

			//console.log(stage);
			//delete node.body;
			node.body = body;
			//console.log(node);
			return;

		};

		//console.log(stage);

		for_statement = node.body.find(b => b.type == 'ForStatement');
		for_statement = for_statement.body.body.find(b => b.type == 'SwitchStatement');
		current_case = for_statement.cases.find(b => b.test.value == stage);
		current_case = current_case.consequent;
		original_current_case = [];
		current_case.map(b => {

			original_current_case.push(b);

		});

		if(current_case.length == 0){

			//console.log(current_case);
			for_statement = node.body.find(b => b.type == 'ForStatement');
			for_statement = for_statement.body.body.find(b => b.type == 'SwitchStatement');
			current_case = for_statement.cases.find(b => b.test.value == stage);
			current_case = current_case.consequent;

		};

		has_return = Boolean(current_case.find(b => b.type == 'ReturnStatement'));
		break_location = null;
		set_case_location = null;
		status = null;

		if(has_return){

			current_case.forEach((element, index, array) => {

				if(element.type == 'BreakStatement'){

					break_location = index;

				};

			});

			if(break_location){

				current_case.splice(break_location, 1);

			};

			current_case.map(b => {

				body.push(b);

			});

			done = true;
			//node.body = body;

		} else if(current_case.length == 0){

			//console.log(current_case);
			//for_statement = node.body.find(b => b.type == 'ForStatement');
			//for_statement = for_statement.body.body.find(b => b.type == 'SwitchStatement');
			//current_case = for_statement.cases.find(b => b.test.value == stage);
			//console.log(current_case);
			//console.log(stage);
			//console.log(for_statement.cases);
			done = true; 
			//node.body = body;
			//console.log(3012);

		} else {

			original_current_case.forEach((element, index, array) => {

				if(element.type == 'BreakStatement'){

					break_location = index;

				};

			});

			if(break_location){

				original_current_case.splice(break_location, 1);

			};

			set_case_location = original_current_case[original_current_case.length - 1];

			original_current_case.splice(original_current_case.length - 1, 1);

			original_current_case.map(b => {

				body.push(b);

			});

			original_current_case.forEach((element, index, array) => {

				try{

					try{

						if(element.expression.type == 'AssignmentExpression' && element.expression.operator == '='){

							//console.log(element.expression.left.name);
							//console.log(element.expression.right.value);

							if(true){

								try {

									live_variable[element.expression.left.name]  = null;
									live_variable[element.expression.left.name] = JSON.parse(new_source.substring(element.expression.right.range[0], element.expression.right.range[1]));

								} catch {

									if(typeof parseInt(new_source.substring(element.expression.right.range[0], element.expression.right.range[1])) == 'Number'){

										live_variable[element.expression.left.name] = parseInt(new_source.substring(element.expression.right.range[0], element.expression.right.range[1]));

									};

								};

								if(!live_variable[element.expression.left.name] && live_variable[element.expression.left.name] != 0){

									live_variable[element.expression.left.name] = new_source.substring(element.expression.right.range[0], element.expression.right.range[1]);

								};

							};

							//console.log(live_variable[element.expression.left.name]);

						}

					} catch {};

					try{

						if(element.expression.type == 'UpdateExpression' || element.expression.operator != '='){

							try{

								//console.log(element.expression.operator);

								if(element.expression.operator){	

									//console.log(element.expression.operator);

									if(element.expression.operator == '++'){

										//console.log(live_variable[element.expression.argument.name]);
										live_variable[element.expression.argument.name]++;
										//eval(`live_variable${element.expression.argument.name}${element.expression.operator}`);
										//console.log(live_variable[element.expression.argument.name]);

									} else if(element.expression.operator == '+=' && element.expression.left.type != 'MemberExpression' && element.expression.right.type == 'Literal'){

										//console.log(element.expression.left.name);
										//console.log(live_variable['n2q']);

										live_variable[element.expression.left.name] = parseInt(live_variable[element.expression.left.name]); 
										//console.log(live_variable[element.expression.left.name]);
										//console.log(new_source.substring(element.expression.range[0], element.expression.range[1]));
										//console.log(live_variable[element.expression.left.name]);
										//console.log(element.expression.right.value);
										live_variable[element.expression.left.name] += element.expression.right.value; 
										//console.log(live_variable[element.expression.left.name]);

									} else if(element.expression.operator == '-=' && element.expression.left.type != 'MemberExpression' && element.expression.right.type == 'Literal'){

										
										//live_variable[element.expression.left.name] = parseInt(live_variable[element.expression.left.name]); 
										//console.log(live_variable[element.expression.left.name]);
										//console.log(new_source.substring(element.expression.range[0], element.expression.range[1]));
										//console.log(live_variable[element.expression.left.name]);
										//console.log(element.expression.right.value);
										//live_variable[element.expression.left.name] -= element.expression.right.value; 
										//console.log(live_variable[element.expression.left.name]);
										u2q -= element.expression.right.value; 
										live_variable[element.expression.left.name] = u2q;

									};

								};

							} catch {

								//console.log('error');
							};

						};

					} catch {};

				} catch {

				};

			});

			if(set_case_location.expression.right.type == 'Literal'){

				stage = set_case_location.expression.right.value;

			} else {

				stage = null;

				if(set_case_location.expression.right.consequent.value == return_stage){

					stage = set_case_location.expression.right.alternate.value;

				} else if(set_case_location.expression.right.alternate.value == return_stage){

					stage = set_case_location.expression.right.consequent.value;

				} else if(set_case_location.expression.right.alternate.value == set_case_location.expression.right.consequent.value){

					stage = set_case_location.expression.right.consequent.value;

				};

				if(status == null && !stage){

					status = solve_conditional_statement(set_case_location.expression, set_case_location.expression.right.consequent.value, set_case_location.expression.right.alternate.value);

				};

				if(status == true){

					stage = set_case_location.expression.right.consequent.value;

				}else if(status == false){

					stage = set_case_location.expression.right.alternate.value; 

				};

			};

			if(stage == return_stage){

				done = true; 
				//node.body = body; 

			};

		};

	} catch (error){

		done = true;

	};

	//console.log(stage);

	simplify_control_flow(stage, return_stage, node, done, body);

};

function transform_control_flow(done){

	if(done){

		console.log('simplified control flow');
		return;
	};

	Object.keys(argument).map(b => {

		try{

			Object.keys(argument).map(a => {

				if(argument[argument[a]['value']]){

					argument[a]['value'] = argument[argument[a]['value']]['value'];

				};

			});

		} catch {};

	});

	Object.keys(live_variable).map(b => {

		try{

			if(live_variable[live_variable[b]]){

				live_variable[b] = live_variable[live_variable[b]];

			};

		} catch {};

	});

	Object.keys(live_variable).map(b => {

		Object.keys(argument).map(a => {

			try {


				if(parseInt(argument[a]['value'])){

					live_variable[b] = live_variable[b].replaceAll(a, argument[a]['value']);

					try{

						live_variable[b] = eval(live_variable[b]);

					} catch {};

				};

			} catch {};

		});

	});

	console.log('simplifying control flow');

	conditional_type = {};

	try{

		esprima.parse(new_source, { range : true }, (node,meta) => {

			if(ControlFlow(node)){

				//console.log(new_source.substring(node.range[0], node.range[1]));

				for_statement = node.body.find(b => b.type == 'ForStatement');
				discriminant = for_statement.test.left.name; 
				//console.log(discriminant);
				return_case = for_statement.test.right.value;
				starting_stage = node.body.find(b => b.type == 'VariableDeclaration');
				starting_stage = starting_stage.declarations.find(b => b.id.name == discriminant);
				starting_stage = starting_stage.init.value;
				
				simplify_control_flow(starting_stage, return_case, node, false, []);

			};

			node_source = node;

		});

		done = true;

	} catch (error){

		console.log('error simplifying control flow');

	};

	transform_control_flow(done);

};

async function deob(){

	await read_source(); 
	await clean_literal();
	await collect_data();
	await transform_control_flow();
	await write_file();

	console.log(live_variable);
};

deob();