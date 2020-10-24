const fs = require('fs');
const log = require('./log.js');

class Database {
	constructor(name, keys, data) { //Data shold be an array: index -> [value for key1, value for key2...];
		this.name = name.trim();
		this.keys = keys;
		this.data = data;
		this.data_modified = false;

		//indexing...
		this.indexing();
		//this.index should be: index = [(key1) {value : index into data, ...}, (key2)...];
	}

	indexing(){
		log.logMessage(`Indexing database ${this.name}`);
		this.index = [];
		for(let key of this.keys) {
			this.index.push({}); //value -> index;
		}
		for(let ind = 0; ind < this.data.length; ind++) {
			let values = this.data[ind];
			for(let i = 0; i < values.length; i++) {
				if(!(values[i] in this.index[i])){
					this.index[i][values[i]] = []; //declare
				}
				this.index[i /*key index*/][values[i]].push(ind); //also in index row, you can find that value; 
			}
		}
	}

	add_row(data_new) { // [key1_value, key2_value, ...]
		this.data_modified = true;
		let new_index = this.data.length;
		this.data.push(data_new);
		for(let i = 0; i < data_new.length; i++) {
			if(!(data_new[i] in this.index[i])){
				this.index[i][data_new[i]] = []; //declare
			}
			this.index[i][data_new[i]].push(new_index);
		}
		return new_index;
	}

	del_row(data_index) {
		this.data_modified = true;
		this.data.splice(data_index, 1); //hopefully this works
		//possibly need to re-index
		this.indexing();
		//alternative: overwrite with DELETED (then deleted would be a keyword)
	}

	lookup(which_key, value) { //returns a list of indices in which the value for the key is satisfied.
		let i = this.keys.indexOf(which_key);
		let data_indices = this.index[i][value];
		if(!data_indices || data_indices.length == 0) return 'error: key not in index or value not in database';
		return data_indices;
	}

	change_data(data_index, key, new_value) {
		this.data_modified = true;
		let i = this.keys.indexOf(key);
		let cache_i = this.index[i][this.data[data_index][i]].indexOf(data_index);
		this.index[i][this.data[data_index][i]].splice(cache_i, 1); //remove pointer to this row at index.
		if(this.index[i][this.data[data_index][i]].length === 0){
			delete this.index[i][this.data[data_index][i]];
		}
		
		this.data[data_index][i] = new_value;
		if(!(new_value in this.index[i])){
			this.index[i][new_value] = []; //declare
		}
		this.index[i][new_value].push(data_index);
	}

	write_data() {
		this.data_modified = false;
		let write_data = '';
		for (let key of this.keys) {
			write_data += key + ' ';
		}
		write_data += '\n';
		for (let key of this.keys) {
			write_data += typeof key + ' '; 
		}
		write_data += '\n';
		for (let row_i in this.data){
			for(let key_i in this.keys){
				write_data += this.data[row_i][key_i] + '\n';  
			}
		}

		fs.writeFile('./data/'+this.name, write_data, 'utf8', (err) => {
  			if (err) throw err;
  			log.logMessage(`The database ${this.name} has been saved!`);
		});
	}
}




let databases = {}; //highly inefficient lookup for each database could result in long clustered lookups.
let possible_databases = [];

function initialize() {
	//prepare common databases maybe. index at loadup, not when in use...
	if(!fs.existsSync('./data')){
		log.logMessage('Creating database folder...');
		fs.mkdirSync('./data');
	}

	let files = fs.readdirSync('./data'); 
	for (file of files) {
		possible_databases.push(file);
	}
	save_databases_interval();
}

function save_databases_interval(){
	let n = 0;
	for (database in databases){
		if(databases[database].data_modified === true){
			log.logMessage(`Saving database ${databases[database].name}`);
			databases[database].write_data();
			n++;
		}
	}
	if(n > 0) {
		log.logMessage(`Saved ${n} databases`);	
	}
	setTimeout(save_databases_interval, 50 * 1000);
}


function exists(database){
	return possible_databases.indexOf(database) > -1;
}

function database_row_add(database, data){
	if(!exists(database)) return 'error: always check yourself, if the database exists and then create one.';
	if (!(database in databases)) {
		load_database(database);
	}
	return databases[database].add_row(data);
}

function database_row_delete(database, index){
	if(!exists(database)) return 'error: always check yourself, if the database exists and then create one.';
	if (!(database in databases)) {
		load_database(database);
	}
	return databases[database].del_row(index);
}

function database_row_change(database, data_index, key, new_value){ //TODO: test
	if(!exists(database)) return 'error: always check yourself, if the database exists and then create one.';
	if (!(database in databases)) {
		load_database(database);
	}
	return databases[database].change_data(data_index, key, new_value);
}

/**
	returns a list of indices of the data in that database
**/
function lookup_key(database, key, value) { //what happens, when multiple modules acess the same database at the same time?!?!?
	//each database should have an index for each keytype, so lookups don't take much time
	if(!exists(database)) return 'error: always check yourself, if the database exists and then create one.';
	if (!(database in databases)) {
		load_database(database);
	}
	return databases[database].lookup(key, value);
}

function lookup_index(database, index) {
	if(!exists(database)) return 'error: always check yourself, if the database exists and then create one.';
	if (!(database in databases)) {
		load_database(database);
	}
	return databases[database].data[index];
}


function load_database(database) { //should always be checked first, if this database truly exists.
	/*structure:
	row1 = keys; separated by spaces
	row2 = key_type; number or string
	row2 (key1) = value_for_key1;
	row3 (key2) = value_for_key2;
	row4 (key1) = value2_for_key1;
	...
	*/ 
	log.logMessage(`Loading database ${database}`);
	let fi = fs.readFileSync('./data/' + database, "utf8"); //string
	let rows = fi.trim().split('\n');
	let keys = rows[0].trim().split(' ');
	let key_type = rows[1].trim().split(' ');
	let data = [];
	for(let i = 2; i < rows.length - 1; i+= keys.length) {
		let cache = [];
		for(let i_k = 0; i_k < keys.length; i_k++) {
			let row_index = i + i_k;
			if(key_type[i_k] === 'number'){
				cache.push(Number(rows[row_index]));
			}else{
				cache.push(rows[row_index]);
			}
		}
		data.push(cache);
	}

	databases[database] = new Database(database, keys, data);
}

function create_database(database, keys){
	if(database in databases){
		return 'database does already exist';
	}else{
		databases[database] = new Database(database, keys, []);
		databases[database].data_modified = true;
	}
}

module.exports = {
	'initialize' : initialize,
	'lookup_key' : lookup_key,
	'load_database' : load_database,
	'create_database' : create_database,
	'exists' : exists,
	'lookup_index' : lookup_index,
	'database_row_add' : database_row_add,
	'database_row_delete' : database_row_delete,
	'database_row_change' : database_row_change

}
